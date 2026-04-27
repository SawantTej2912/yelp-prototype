import os
import requests
import json
import argparse
import time
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func
from shared.database import SessionLocal
from shared.models.restaurant import Restaurant, RestaurantPhoto
from shared.models.user import User
from shared.models.review import Review
from shared.utils.jwt import hash_password

# Load environment variables
load_dotenv()

# Safely load the key from .env so it doesn't get pushed to GitHub
YELP_API_KEY = os.getenv("YELP_API_KEY")

HEADERS = {
    "Authorization": f"Bearer {YELP_API_KEY}",
    "accept": "application/json"
}

SEARCH_URL = "https://api.yelp.com/v3/businesses/search"
REVIEWS_URL_TEMPLATE = "https://api.yelp.com/v3/businesses/{business_id}/reviews"

# Target cities
CITIES = ["San Jose, CA", "Santa Clara, CA", "Sunnyvale, CA", "Fremont, CA"]
LIMIT_PER_CITY = 40  # 4 cities * 40 = 160 potential restaurants

def parse_hours(hours_list):
    """
    Parses the Yelp API hours array into a simple string schedule.
    Since the column is max 255 chars, we keep it concise.
    """
    if not hours_list or len(hours_list) == 0:
        return None
        
    days_map = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
    schedule = {}
    
    open_hours = hours_list[0].get("open", [])
    for entry in open_hours:
        day_idx = entry.get("day")
        day_name = days_map.get(day_idx, str(day_idx))
        
        start = entry.get("start", "")
        end = entry.get("end", "")
        
        # Format "1700" to "17:00"
        if len(start) == 4 and len(end) == 4:
            s_str = f"{start[:2]}:{start[2:]}"
            e_str = f"{end[:2]}:{end[2:]}"
            time_str = f"{s_str}-{e_str}"
            
            if day_name in schedule:
                schedule[day_name] += f", {time_str}"
            else:
                schedule[day_name] = time_str
                
    parts = []
    for day, times in schedule.items():
        parts.append(f"{day}: {times}")
        
    result = " | ".join(parts)
    return result[:255]  # fit within database limit

def fetch_restaurants(db: Session):
    total_inserted = 0
    total_skipped = 0
    
    for city in CITIES:
        print(f"\n--- Fetching restaurants for {city} ---")
        params = {
            "location": city,
            "term": "restaurants",
            "limit": LIMIT_PER_CITY,
            "categories": "food,restaurants"
        }
        
        response = requests.get(SEARCH_URL, headers=HEADERS, params=params)
        
        if response.status_code != 200:
            print(f"Error fetching from Yelp API: {response.status_code}")
            print(response.text)
            continue
            
        data = response.json()
        businesses = data.get("businesses", [])
        
        for biz in businesses:
            name = biz.get("name")
            location = biz.get("location", {})
            address = location.get("address1", "")
            city_str = location.get("city", "")
            state = location.get("state", "")
            zip_code = location.get("zip_code", "")
            
            # Skip if address is entirely missing and needed for dup check
            if not address:
                address = "Unknown"
                
            # Check for duplicates by name + address
            existing = db.query(Restaurant).filter(
                Restaurant.name == name,
                Restaurant.address == address
            ).first()
            
            if existing:
                print(f"Skipping duplicate: {name} ({address})")
                total_skipped += 1
                continue
                
            # Maps Yelp fields
            categories = biz.get("categories", [])
            cuisine_type = ", ".join([c.get("title") for c in categories if c.get("title")]) if categories else "General"
            
            phone = biz.get("display_phone") or biz.get("phone")
            
            price = biz.get("price")
            pricing_tier = None
            if price in ["$", "$$", "$$$", "$$$$"]:
                pricing_tier = price
                
            # We don't have a direct 'tagline' from the search endpoint.
            # We'll use the alias or a constructed description.
            alias = biz.get("alias", name)
            description = f"{name} is a {cuisine_type.lower()} restaurant in {city_str}."
            
            avg_rating = biz.get("rating", 0.0)
            review_count = biz.get("review_count", 0)
            
            # Let's fetch the detail endpoint for extra photos and hours if available
            biz_id = biz.get("id")
            hours_str = None
            photos = [biz.get("image_url")] if biz.get("image_url") else []
            
            if biz_id:
                try:
                    detail_url = f"https://api.yelp.com/v3/businesses/{biz_id}"
                    detail_response = requests.get(detail_url, headers=HEADERS)
                    if detail_response.status_code == 200:
                        detail_data = detail_response.json()
                        
                        if "photos" in detail_data and detail_data["photos"]:
                            # Override the main photo array with the more detailed one
                            photos = detail_data["photos"]
                            
                        # If the detail endpoint has 'hours' we can parse it
                        if "hours" in detail_data:
                            hours_str = parse_hours(detail_data["hours"])
                except Exception as e:
                    print(f"Failed to fetch details for {name}: {e}")
            
            # Retrieve Target User For Ownership once per run or default to ID: 3
            target_user = db.query(User).filter(User.email == "tejas@gmail.com").first()
            user_id = target_user.id if target_user else 3

            # Create Restaurant record
            new_restaurant = Restaurant(
                name=name,
                cuisine_type=cuisine_type,
                address=address,
                city=city_str,
                state=state,
                zip=zip_code,
                contact_info=phone,
                hours=hours_str,
                pricing_tier=pricing_tier,
                description=description,
                avg_rating=avg_rating,
                review_count=review_count,
                added_by=user_id,
                owner_id=user_id
            )
            
            db.add(new_restaurant)
            db.commit()
            db.refresh(new_restaurant)
            
            # Insert Photos
            for url in photos:
                if not url:
                    continue
                photo_entry = RestaurantPhoto(
                    restaurant_id=new_restaurant.id,
                    photo_url=url
                )
                db.add(photo_entry)
            
            db.commit()
            
            print(f"Inserted: {name} - {cuisine_type} (ID: {new_restaurant.id})")
            total_inserted += 1

    print("\n--- Seeding Summary ---")
    print(f"Restaurants successfully inserted: {total_inserted}")
    print(f"Duplicates skipped: {total_skipped}")


def _get_or_create_seeder_user(db: Session) -> User:
    seeder = db.query(User).filter(User.email == "seeder@yelp.com").first()
    if seeder:
        return seeder

    seeder = User(
        name="Seeder User",
        email="seeder@yelp.com",
        password_hash=hash_password("SeederPassword123!"),
        role="user",
    )
    db.add(seeder)
    db.commit()
    db.refresh(seeder)
    return seeder


def _resolve_yelp_business_id(restaurant: Restaurant) -> str | None:
    # If the schema has yelp_id and it is populated, prefer it directly.
    if hasattr(restaurant, "yelp_id"):
        direct_id = getattr(restaurant, "yelp_id", None)
        if direct_id:
            return str(direct_id)

    if not restaurant.name:
        return None

    location_parts = [restaurant.city, restaurant.state, restaurant.zip]
    location = ", ".join([p for p in location_parts if p]) or "California"
    params = {
        "term": restaurant.name,
        "location": location,
        "limit": 5,
        "categories": "restaurants,food",
    }
    resp = requests.get(SEARCH_URL, headers=HEADERS, params=params)
    if resp.status_code != 200:
        return None

    businesses = (resp.json() or {}).get("businesses", [])
    if not businesses:
        return None

    target_name = (restaurant.name or "").strip().lower()
    target_city = (restaurant.city or "").strip().lower()
    for biz in businesses:
        biz_name = (biz.get("name") or "").strip().lower()
        biz_city = ((biz.get("location") or {}).get("city") or "").strip().lower()
        if biz_name == target_name and (not target_city or biz_city == target_city):
            return biz.get("id")

    # Fallback: first result with same city, else first result.
    for biz in businesses:
        biz_city = ((biz.get("location") or {}).get("city") or "").strip().lower()
        if target_city and biz_city == target_city:
            return biz.get("id")
    return businesses[0].get("id")


def _parse_yelp_review_date(raw: str | None):
    if not raw:
        return None
    try:
        # Yelp commonly returns: "YYYY-MM-DD HH:MM:SS"
        return datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def _recompute_restaurant_review_stats(db: Session, restaurant_id: int) -> None:
    avg_rating, review_count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.restaurant_id == restaurant_id)
        .one()
    )
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        return
    restaurant.avg_rating = float(avg_rating) if avg_rating is not None else 0.0
    restaurant.review_count = int(review_count or 0)
    db.commit()


def seed_reviews(db: Session) -> None:
    print("\n--- Seeding Yelp Reviews ---")
    seeder_user = _get_or_create_seeder_user(db)
    restaurants = db.query(Restaurant).all()

    total_added = 0
    processed = 0

    for restaurant in restaurants:
        yelp_business_id = _resolve_yelp_business_id(restaurant)
        if not yelp_business_id:
            print(f"Skipping {restaurant.name}: no Yelp business match found")
            continue

        review_resp = requests.get(
            REVIEWS_URL_TEMPLATE.format(business_id=yelp_business_id),
            headers=HEADERS,
        )
        time.sleep(0.5)
        if review_resp.status_code != 200:
            print(
                f"Skipping {restaurant.name}: Yelp reviews API error {review_resp.status_code}"
            )
            continue

        payload = review_resp.json() or {}
        yelp_reviews = payload.get("reviews", []) or []
        added_for_restaurant = 0

        for yelp_review in yelp_reviews:
            comment = (yelp_review.get("text") or "").strip()
            if not comment:
                continue

            duplicate = (
                db.query(Review)
                .filter(
                    Review.restaurant_id == restaurant.id,
                    Review.comment == comment,
                )
                .first()
            )
            if duplicate:
                continue

            rating = int(yelp_review.get("rating") or 0)
            if rating < 1 or rating > 5:
                continue

            review_date = _parse_yelp_review_date(yelp_review.get("time_created"))
            new_review = Review(
                user_id=seeder_user.id,
                restaurant_id=restaurant.id,
                rating=rating,
                comment=comment,
                review_date=review_date,
            )
            db.add(new_review)
            added_for_restaurant += 1

        if added_for_restaurant > 0:
            db.commit()
            _recompute_restaurant_review_stats(db, restaurant.id)
        else:
            db.rollback()

        processed += 1
        total_added += added_for_restaurant
        print(f"{restaurant.name}: added {added_for_restaurant} reviews")

    print("\n--- Review Seeding Summary ---")
    print(f"Restaurants processed: {processed}")
    print(f"Reviews inserted: {total_added}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed restaurants and Yelp reviews")
    parser.add_argument(
        "--reviews-only",
        action="store_true",
        help="Only seed Yelp reviews for existing restaurants",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.reviews_only:
            seed_reviews(db)
        else:
            fetch_restaurants(db)
            seed_reviews(db)
    finally:
        db.close()
