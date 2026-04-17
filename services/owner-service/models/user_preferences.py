from sqlalchemy import Column, Integer, String, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # JSON arrays stored as MySQL JSON columns
    cuisine_prefs = Column(JSON, nullable=True)       # e.g. ["Italian","Chinese"]
    dietary_needs = Column(JSON, nullable=True)       # e.g. ["vegan","gluten-free"]
    ambiance_prefs = Column(JSON, nullable=True)      # e.g. ["casual","romantic"]

    price_range = Column(String(10), nullable=True)   # "$" | "$$" | "$$$" | "$$$$"
    preferred_location = Column(String(255), nullable=True)
    search_radius = Column(Integer, default=10)
    sort_preference = Column(
        Enum("rating", "distance", "popularity", "price"),
        default="rating",
        nullable=True,
    )

    # Relationship back to user
    user = relationship("User", backref="preferences")
