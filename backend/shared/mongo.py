"""
MongoDB client (pymongo) for Phase 3+ — sessions, chat history in Mongo, etc.
Set MONGO_URI in the environment, e.g.:
  Local:  mongodb://localhost:27017/yelp_prototype
  Docker: mongodb://mongodb:27017/yelp_prototype
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database

load_dotenv()

# Default matches docker-compose service name
DEFAULT_MONGO_URI = "mongodb://localhost:27017/yelp_prototype"


@lru_cache
def get_mongo_client() -> MongoClient:
    """Singleton MongoClient. Thread-safe for typical FastAPI / worker use."""
    uri = os.getenv("MONGO_URI", DEFAULT_MONGO_URI)
    return MongoClient(uri)


def get_mongo_db() -> Database[Any]:
    """Return the database named in the path of MONGO_URI (e.g. yelp_prototype)."""
    uri = os.getenv("MONGO_URI", DEFAULT_MONGO_URI)
    parsed = urlparse(uri)
    # Path is /dbname or /dbname?options
    path = unquote(parsed.path or "").strip("/")
    if not path:
        return get_mongo_client().get_default_database()  # type: ignore[return-value]
    return get_mongo_client()[path]
