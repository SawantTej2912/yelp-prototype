import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import engine, get_db
from models.chat_history import ChatHistory
from models.restaurant import Restaurant
from models.user import User
from models.user_preferences import UserPreferences
from schemas.ai_assistant import ChatRequest, ChatResponse, RecommendedRestaurant
from utils.jwt import get_current_user

load_dotenv()

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


def _ensure_chat_history_table():
    # Create only this table if missing; avoids global Base.metadata.create_all side effects.
    try:
        ChatHistory.__table__.create(bind=engine, checkfirst=True)
    except Exception:
        # If table creation fails (permissions / managed DB), we still allow the API to run
        # and simply won't persist history.
        pass


_ensure_chat_history_table()


def _safe_float(v) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except Exception:
        return None


def _load_user_prefs(db: Session, user_id: int) -> Dict[str, Any]:
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not prefs:
        return {
            "dietary_preferences": [],
            "fav_cuisines": [],
            "price_preference": None,
            "max_distance": None,
            "preferred_location": None,
            "ambiance_prefs": [],
        }

    # Map existing columns to the names specified in the assignment prompt.
    return {
        "dietary_preferences": prefs.dietary_needs or [],
        "fav_cuisines": prefs.cuisine_prefs or [],
        "price_preference": prefs.price_range,
        "max_distance": prefs.search_radius,
        "preferred_location": prefs.preferred_location,
        "ambiance_prefs": prefs.ambiance_prefs or [],
        "sort_preference": getattr(prefs, "sort_preference", None),
    }


def _get_tavily_context(query: str) -> Optional[str]:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return None
    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=api_key)
        res = client.search(query=query, search_depth="basic", max_results=5)
        results = res.get("results") or []
        if not results:
            return None
        snippets = []
        for r in results[:5]:
            title = (r.get("title") or "").strip()
            content = (r.get("content") or "").strip()
            url = (r.get("url") or "").strip()
            piece = " - ".join([p for p in [title, content, url] if p])
            if piece:
                snippets.append(piece)
        return "\n".join(snippets) if snippets else None
    except Exception:
        return None


def _gemini_extract_filters(
    message: str,
    conversation_history: List[Dict[str, str]],
    user_prefs: Dict[str, Any],
) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {}

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.2,
            google_api_key=api_key,
        )

        history_text = "\n".join(
            [f"{t['role']}: {t['message']}" for t in conversation_history[-10:]]
        )

        prompt = f"""
You are extracting restaurant search filters from a user's message.

Return ONLY valid JSON (no markdown) with these keys:
- cuisine: string|null
- city: string|null
- pricing_tier: one of "$","$$","$$$","$$$$", or null
- dietary_needs: array of strings (e.g. ["vegan","gluten-free"])
- occasion: string|null (e.g. "date night", "family dinner")
- ambiance: array of strings (e.g. ["romantic","casual","lively"])
- keywords: string|null (free text query terms)

Consider the user's saved preferences as defaults when the user is vague:
user_preferences = {json.dumps(user_prefs)}

Conversation so far:
{history_text}

Current message:
{message}
""".strip()

        resp = llm.invoke(prompt)
        text = (getattr(resp, "content", "") or "").strip()

        # Be resilient to common model formatting like ```json ... ```
        if text.startswith("```"):
            text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
            text = re.sub(r"\s*```$", "", text).strip()

        # If there's extra prose, try to grab the first JSON object.
        if not (text.startswith("{") and text.endswith("}")):
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                text = m.group(0).strip()

        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
        return {}
    except Exception:
        return {}

def _heuristic_extract_filters(message: str) -> Dict[str, Any]:
    """Fallback extraction when Gemini is unavailable or returns unusable output."""
    msg = (message or "").strip()
    lower = msg.lower()

    pricing_tier = None
    # Explicit tiers
    if "$$$$" in msg:
        pricing_tier = "$$$$"
    elif "$$$" in msg:
        pricing_tier = "$$$"
    elif "$$" in msg:
        pricing_tier = "$$"
    elif "$" in msg:
        pricing_tier = "$"
    # Word hints
    if pricing_tier is None:
        if any(w in lower for w in ["cheap", "budget", "inexpensive", "affordable", "low cost", "low-cost"]):
            pricing_tier = "$"
        elif any(w in lower for w in ["fine dining", "expensive", "high end", "high-end", "splurge"]):
            pricing_tier = "$$$"

    dietary = []
    for tag in ["vegan", "vegetarian", "gluten-free", "halal", "kosher"]:
        if tag in lower:
            dietary.append(tag)

    # Keep it simple: treat the full message as keywords so the DB query varies.
    return {
        "cuisine": None,
        "city": None,
        "pricing_tier": pricing_tier,
        "dietary_needs": dietary,
        "occasion": None,
        "ambiance": [],
        "keywords": msg or None,
    }

def _build_restaurant_query(db: Session, filters: Dict[str, Any], user_prefs: Dict[str, Any]):
    q = db.query(Restaurant)

    cuisine = (filters.get("cuisine") or "").strip()
    city = (filters.get("city") or "").strip()
    pricing = filters.get("pricing_tier")
    keywords = (filters.get("keywords") or "").strip()
    dietary = filters.get("dietary_needs") or []
    ambiance = filters.get("ambiance") or []

    if not cuisine and user_prefs.get("fav_cuisines"):
        # If user has favorites and query doesn't specify, bias toward them via keyword OR later ranking.
        cuisine = ""

    if city:
        term = f"%{city}%"
        q = q.filter(or_(Restaurant.city.ilike(term), Restaurant.zip.ilike(term)))
    elif user_prefs.get("preferred_location"):
        term = f"%{user_prefs['preferred_location']}%"
        q = q.filter(or_(Restaurant.city.ilike(term), Restaurant.zip.ilike(term)))

    if pricing:
        q = q.filter(Restaurant.pricing_tier == pricing)
    elif user_prefs.get("price_preference"):
        q = q.filter(Restaurant.pricing_tier == user_prefs["price_preference"])

    if cuisine:
        q = q.filter(Restaurant.cuisine_type.ilike(f"%{cuisine}%"))

    # Keywords across name, cuisine, description, city
    if keywords:
        # Tokenize so "cheap ramen in san jose" actually matches.
        tokens = [t for t in re.split(r"[^a-zA-Z0-9]+", keywords) if len(t) >= 3][:12]
        if tokens:
            ors = []
            for t in tokens:
                term = f"%{t}%"
                ors.extend([
                    Restaurant.name.ilike(term),
                    Restaurant.cuisine_type.ilike(term),
                    Restaurant.description.ilike(term),
                    Restaurant.city.ilike(term),
                ])
            q = q.filter(or_(*ors))
        else:
            term = f"%{keywords}%"
            q = q.filter(
                or_(
                    Restaurant.name.ilike(term),
                    Restaurant.cuisine_type.ilike(term),
                    Restaurant.description.ilike(term),
                    Restaurant.city.ilike(term),
                )
            )

    # Dietary / ambiance are best-effort matches against description + cuisine_type + amenities JSON stringification.
    # (Amenities is JSON; SQLAlchemy JSON comparisons vary by MySQL version, so keep it simple.)
    for d in dietary[:5]:
        if not isinstance(d, str) or not d.strip():
            continue
        term = f"%{d.strip()}%"
        q = q.filter(or_(Restaurant.description.ilike(term), Restaurant.cuisine_type.ilike(term)))

    for a in ambiance[:5]:
        if not isinstance(a, str) or not a.strip():
            continue
        term = f"%{a.strip()}%"
        q = q.filter(Restaurant.description.ilike(term))

    return q


def _score_restaurant(r: Restaurant, filters: Dict[str, Any], user_prefs: Dict[str, Any]) -> float:
    score = 0.0

    rating = _safe_float(r.avg_rating) or 0.0
    score += min(rating, 5.0) * 2.0
    score += min(float(r.review_count or 0), 200.0) / 200.0  # up to +1

    cuisine = (filters.get("cuisine") or "").strip().lower()
    if cuisine and (r.cuisine_type or "").lower().find(cuisine) >= 0:
        score += 2.0

    favs = [c.lower() for c in (user_prefs.get("fav_cuisines") or []) if isinstance(c, str)]
    if favs and (r.cuisine_type or ""):
        ct = (r.cuisine_type or "").lower()
        if any(f in ct for f in favs):
            score += 1.5

    pricing = filters.get("pricing_tier") or user_prefs.get("price_preference")
    if pricing and r.pricing_tier == pricing:
        score += 1.0

    keywords = (filters.get("keywords") or "").strip().lower()
    if keywords:
        hay = " ".join([(r.name or ""), (r.description or ""), (r.city or ""), (r.cuisine_type or "")]).lower()
        # crude relevance: count distinct keyword tokens present
        tokens = [t for t in keywords.replace(",", " ").split() if len(t) >= 3][:10]
        score += sum(1.0 for t in set(tokens) if t in hay) * 0.3

    return score


def _format_reason(r: Restaurant, filters: Dict[str, Any], user_prefs: Dict[str, Any]) -> str:
    parts = []

    if filters.get("cuisine") and r.cuisine_type and filters["cuisine"].lower() in r.cuisine_type.lower():
        parts.append(f"matches your {filters['cuisine']} craving")
    elif user_prefs.get("fav_cuisines") and r.cuisine_type:
        favs = [c.lower() for c in user_prefs["fav_cuisines"] if isinstance(c, str)]
        if any(f in r.cuisine_type.lower() for f in favs):
            parts.append("aligns with your favorite cuisines")

    if filters.get("pricing_tier") and r.pricing_tier == filters["pricing_tier"]:
        parts.append(f"fits your budget ({r.pricing_tier})")
    elif user_prefs.get("price_preference") and r.pricing_tier == user_prefs["price_preference"]:
        parts.append(f"fits your usual budget ({r.pricing_tier})")

    if _safe_float(r.avg_rating):
        parts.append(f"rated {float(r.avg_rating):.1f}★")

    if not parts:
        parts.append("a strong match based on your query and preferences")

    return ", ".join(parts[:3]) + "."


def _persist_turn(db: Session, user_id: int, role: str, message: str) -> None:
    try:
        db.add(ChatHistory(user_id=user_id, role=role, message=message))
        db.commit()
    except Exception:
        db.rollback()


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Conversational restaurant recommendation endpoint.
    Requires JWT auth (handled by get_current_user dependency).
    """
    # On first message (empty history), load preferences; we also load each time for stability.
    user_prefs = _load_user_prefs(db, current_user.id)

    # Persist user turn (best-effort)
    _persist_turn(db, current_user.id, "user", payload.message)

    history_dicts = [{"role": t.role, "message": t.message} for t in payload.conversation_history]
    extracted = _gemini_extract_filters(payload.message, history_dicts, user_prefs)
    if not extracted:
        extracted = _heuristic_extract_filters(payload.message)

    # If Gemini returned a partial object without keywords, default to the message
    if not (extracted.get("keywords") or "").strip():
        extracted["keywords"] = payload.message.strip()

    # Build + run DB query
    try:
        base_query = _build_restaurant_query(db, extracted, user_prefs)
        candidates = base_query.limit(50).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

    ranked = sorted(
        candidates,
        key=lambda r: _score_restaurant(r, extracted, user_prefs),
        reverse=True,
    )
    top = ranked[:6]

    # Tavily context (best-effort)
    tavily_query_parts = []
    if extracted.get("city"):
        tavily_query_parts.append(str(extracted["city"]))
    if extracted.get("cuisine"):
        tavily_query_parts.append(str(extracted["cuisine"]))
    if extracted.get("occasion"):
        tavily_query_parts.append(str(extracted["occasion"]))
    tavily_query_parts.append(payload.message)
    web_context = _get_tavily_context(" ".join([p for p in tavily_query_parts if p]).strip())

    # Compose assistant response (Gemini for natural language generation, but keep a safe fallback).
    assistant_message = ""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            from langchain_google_genai import ChatGoogleGenerativeAI

            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                temperature=0.6,
                google_api_key=api_key,
            )

            rec_lines = []
            for r in top:
                rec_lines.append(
                    f"- {r.name} ({r.cuisine_type or 'Cuisine unknown'}) "
                    f"{f'{float(r.avg_rating):.1f}★' if _safe_float(r.avg_rating) else ''} "
                    f"{r.pricing_tier or ''}".strip()
                )
            rec_block = "\n".join(rec_lines) if rec_lines else "- (No strong matches found in the database)"

            prompt = f"""
You are a friendly, helpful Yelp-style assistant.
You recommend restaurants from the app database and keep the tone conversational.
Be concise, but include brief reasoning.

User preferences:
{json.dumps(user_prefs)}

Extracted filters from the user message:
{json.dumps(extracted)}

Candidate top picks:
{rec_block}

Optional web context (may be empty):
{web_context or ""}

Now write a helpful response to the user message:
{payload.message}
""".strip()

            resp = llm.invoke(prompt)
            assistant_message = (getattr(resp, "content", "") or "").strip()
    except Exception:
        assistant_message = ""

    if not assistant_message:
        assistant_message = (
            "I can help with that. Here are a few options from our listings that fit your request — "
            "tell me your city and budget if you want me to narrow it down even more."
        )

    recommendations: List[RecommendedRestaurant] = []
    for r in top:
        recommendations.append(
            RecommendedRestaurant(
                id=r.id,
                name=r.name,
                cuisine_type=r.cuisine_type,
                avg_rating=_safe_float(r.avg_rating),
                pricing_tier=r.pricing_tier,
                reason=_format_reason(r, extracted, user_prefs),
            )
        )

    # Persist assistant turn (best-effort)
    _persist_turn(db, current_user.id, "assistant", assistant_message)

    return ChatResponse(
        assistant_message=assistant_message,
        extracted_filters=extracted or {},
        recommendations=recommendations,
        web_context=web_context,
    )


@router.delete("/chat/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to clear chat history")

