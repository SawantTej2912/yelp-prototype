import os
import requests
import json
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal
from models.restaurant import Restaurant, RestaurantPhoto
from models.user import User

# Load environment variables
load_dotenv()

# Safely load the key from .env so it doesn't get pushed to GitHub
YELP_API_KEY = os.getenv("YELP_API_KEY")

HEADERS = {
    "Authorization": f"Bearer {YELP_API_KEY}",
    "accept": "application/json"
}

SEARCH_URL = "https://api.yelp.com/v3/businesses/search"

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

if __name__ == "__main__":
    db = SessionLocal()
    try:
        fetch_restaurants(db)
    finally:
        db.close()
