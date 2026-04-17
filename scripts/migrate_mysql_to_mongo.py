import os
import pymysql
from pymongo import MongoClient
from datetime import datetime
from decimal import Decimal


MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "password")
MYSQL_DB = os.getenv("MYSQL_DB", "yelp_db")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "yelp_lab2")


def normalize_value(value):
    if isinstance(value, Decimal):
        return float(value)
    return value


def get_mysql_connection():
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor
    )


def get_mongo_db():
    client = MongoClient(MONGO_URL)
    return client[MONGO_DB_NAME]


def clear_target_collections(db):
    db.users.delete_many({})
    db.restaurants.delete_many({})
    db.reviews.delete_many({})
    db.favorites.delete_many({})
    db.restaurant_photos.delete_many({})
    db.activity_logs.delete_many({})


def migrate_users_and_preferences(mysql_conn, mongo_db):
    print("[migration] Migrating users and preferences...")

    user_id_map = {}

    with mysql_conn.cursor() as cursor:
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()

        try:
            cursor.execute("SELECT * FROM user_preferences")
            preferences = cursor.fetchall()
        except Exception:
            preferences = []

    pref_map = {}
    for pref in preferences:
        pref_map[pref["user_id"]] = {
            "cuisine_prefs": pref.get("cuisine_prefs", "").split(",") if pref.get("cuisine_prefs") else [],
            "price_range": pref.get("price_range", ""),
            "dietary_needs": pref.get("dietary_needs", "").split(",") if pref.get("dietary_needs") else [],
            "ambiance_prefs": pref.get("ambiance_prefs", "").split(",") if pref.get("ambiance_prefs") else [],
            "preferred_location": pref.get("preferred_location", ""),
            "search_radius": normalize_value(pref.get("search_radius", 10)),
            "sort_preference": pref.get("sort_preference", "rating")
        }

    for user in users:
        mysql_user_id = user["id"]

        user_doc = {
            "legacy_mysql_id": mysql_user_id,
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "password_hash": user.get("password_hash") or user.get("password", ""),
            "role": user.get("role", "user"),
            "phone": user.get("phone", ""),
            "profile_pic": user.get("profile_pic", ""),
            "about_me": user.get("about_me", ""),
            "city": user.get("city", ""),
            "state": user.get("state", ""),
            "country": user.get("country", ""),
            "preferences": pref_map.get(mysql_user_id, {
                "cuisine_prefs": [],
                "price_range": "",
                "dietary_needs": [],
                "ambiance_prefs": [],
                "preferred_location": "",
                "search_radius": 10,
                "sort_preference": "rating"
            }),
            "created_at": user.get("created_at") or datetime.utcnow(),
            "updated_at": user.get("updated_at")
        }

        result = mongo_db.users.insert_one(user_doc)
        user_id_map[mysql_user_id] = str(result.inserted_id)

    print(f"[migration] Migrated {len(users)} users")
    return user_id_map


def migrate_restaurants(mysql_conn, mongo_db):
    print("[migration] Migrating restaurants...")

    restaurant_id_map = {}

    with mysql_conn.cursor() as cursor:
        cursor.execute("SELECT * FROM restaurants")
        restaurants = cursor.fetchall()

    for restaurant in restaurants:
        mysql_restaurant_id = restaurant["id"]

        restaurant_doc = {
            "legacy_mysql_id": mysql_restaurant_id,
            "name": restaurant.get("name", ""),
            "description": restaurant.get("description", ""),
            "cuisine_type": restaurant.get("cuisine_type", ""),
            "address": restaurant.get("address", ""),
            "city": restaurant.get("city", ""),
            "state": restaurant.get("state", ""),
            "zip_code": restaurant.get("zip_code", ""),
            "contact_info": restaurant.get("contact_info", ""),
            "hours": restaurant.get("hours", ""),
            "pricing_tier": restaurant.get("pricing_tier", ""),
            "amenities": restaurant.get("amenities", "").split(",") if restaurant.get("amenities") else [],
            "owner_id": restaurant.get("owner_id", ""),
            "added_by": restaurant.get("added_by", ""),
            "avg_rating": normalize_value(restaurant.get("avg_rating", 0)),
            "review_count": normalize_value(restaurant.get("review_count", 0)),
            "view_count": normalize_value(restaurant.get("view_count", 0)),
            "photos": [],
            "activity_logs": [],
            "created_at": restaurant.get("created_at") or datetime.utcnow(),
            "updated_at": restaurant.get("updated_at")
        }

        result = mongo_db.restaurants.insert_one(restaurant_doc)
        restaurant_id_map[mysql_restaurant_id] = str(result.inserted_id)

    print(f"[migration] Migrated {len(restaurants)} restaurants")
    return restaurant_id_map


def migrate_reviews(mysql_conn, mongo_db, user_id_map, restaurant_id_map):
    print("[migration] Migrating reviews...")

    with mysql_conn.cursor() as cursor:
        cursor.execute("SELECT * FROM reviews")
        reviews = cursor.fetchall()

    count = 0
    for review in reviews:
        mysql_user_id = review.get("user_id")
        mysql_restaurant_id = review.get("restaurant_id")

        review_doc = {
            "legacy_mysql_id": review.get("id"),
            "legacy_mysql_user_id": mysql_user_id,
            "legacy_mysql_restaurant_id": mysql_restaurant_id,
            "user_id": user_id_map.get(mysql_user_id, str(mysql_user_id)),
            "restaurant_id": restaurant_id_map.get(mysql_restaurant_id, str(mysql_restaurant_id)),
            "rating": normalize_value(review.get("rating", 0)),
            "comment": review.get("comment", ""),
            "status": "completed",
            "created_at": review.get("created_at") or datetime.utcnow(),
            "updated_at": review.get("updated_at")
        }

        mongo_db.reviews.insert_one(review_doc)
        count += 1

    print(f"[migration] Migrated {count} reviews")


def migrate_favorites(mysql_conn, mongo_db, user_id_map, restaurant_id_map):
    print("[migration] Migrating favorites...")

    with mysql_conn.cursor() as cursor:
        cursor.execute("SELECT * FROM favorites")
        favorites = cursor.fetchall()

    count = 0
    for favorite in favorites:
        mysql_user_id = favorite.get("user_id")
        mysql_restaurant_id = favorite.get("restaurant_id")

        favorite_doc = {
            "legacy_mysql_id": favorite.get("id"),
            "legacy_mysql_user_id": mysql_user_id,
            "legacy_mysql_restaurant_id": mysql_restaurant_id,
            "user_id": user_id_map.get(mysql_user_id, str(mysql_user_id)),
            "restaurant_id": restaurant_id_map.get(mysql_restaurant_id, str(mysql_restaurant_id)),
            "created_at": favorite.get("created_at") or datetime.utcnow()
        }

        mongo_db.favorites.insert_one(favorite_doc)
        count += 1

    print(f"[migration] Migrated {count} favorites")


def migrate_restaurant_photos(mysql_conn, mongo_db, restaurant_id_map):
    print("[migration] Migrating restaurant photos...")

    try:
        with mysql_conn.cursor() as cursor:
            cursor.execute("SELECT * FROM restaurant_photos")
            photos = cursor.fetchall()
    except Exception:
        photos = []

    count = 0
    for photo in photos:
        mysql_restaurant_id = photo.get("restaurant_id")

        photo_doc = {
            "legacy_mysql_id": photo.get("id"),
            "legacy_mysql_restaurant_id": mysql_restaurant_id,
            "restaurant_id": restaurant_id_map.get(mysql_restaurant_id, str(mysql_restaurant_id)),
            "url": photo.get("url") or photo.get("photo_url", ""),
            "caption": photo.get("caption", ""),
            "uploaded_at": photo.get("created_at") or datetime.utcnow()
        }

        mongo_db.restaurant_photos.insert_one(photo_doc)
        count += 1

    print(f"[migration] Migrated {count} restaurant photos")


def create_basic_activity_logs(mongo_db):
    print("[migration] Creating basic activity logs...")

    count = 0

    for restaurant in mongo_db.restaurants.find():
        mongo_db.activity_logs.insert_one({
            "restaurant_id": str(restaurant["_id"]),
            "action": "restaurant_migrated",
            "details": f"Restaurant '{restaurant.get('name', '')}' migrated from MySQL to MongoDB",
            "created_at": datetime.utcnow()
        })
        count += 1

    for photo in mongo_db.restaurant_photos.find():
        mongo_db.activity_logs.insert_one({
            "restaurant_id": photo.get("restaurant_id", ""),
            "action": "photo_migrated",
            "details": "Restaurant photo migrated from MySQL to MongoDB",
            "created_at": datetime.utcnow()
        })
        count += 1

    print(f"[migration] Created {count} activity logs")


def main():
    print("[migration] Starting MySQL to MongoDB migration...")

    mysql_conn = get_mysql_connection()
    mongo_db = get_mongo_db()

    clear_target_collections(mongo_db)

    user_id_map = migrate_users_and_preferences(mysql_conn, mongo_db)
    restaurant_id_map = migrate_restaurants(mysql_conn, mongo_db)
    migrate_reviews(mysql_conn, mongo_db, user_id_map, restaurant_id_map)
    migrate_favorites(mysql_conn, mongo_db, user_id_map, restaurant_id_map)
    migrate_restaurant_photos(mysql_conn, mongo_db, restaurant_id_map)
    create_basic_activity_logs(mongo_db)

    mysql_conn.close()

    print("[migration] Migration completed successfully.")


if __name__ == "__main__":
    main()
