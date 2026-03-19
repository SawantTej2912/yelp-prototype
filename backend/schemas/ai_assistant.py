from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    message: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_history: List[ConversationTurn] = Field(default_factory=list)


class RecommendedRestaurant(BaseModel):
    id: int
    name: str
    cuisine_type: Optional[str] = None
    avg_rating: Optional[float] = None
    pricing_tier: Optional[str] = None
    reason: str


class ChatResponse(BaseModel):
    assistant_message: str
    extracted_filters: Dict[str, Any] = Field(default_factory=dict)
    recommendations: List[RecommendedRestaurant] = Field(default_factory=list)
    web_context: Optional[str] = None

