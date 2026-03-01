from sqlalchemy import (
    Column, Integer, String, Text, Enum, JSON,
    ForeignKey, DateTime, DECIMAL
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, index=True)
    cuisine_type = Column(String(100), nullable=True, index=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True, index=True)
    state = Column(String(10), nullable=True)
    zip = Column(String(20), nullable=True, index=True)
    description = Column(Text, nullable=True)
    contact_info = Column(String(150), nullable=True)
    hours = Column(String(255), nullable=True)
    pricing_tier = Column(Enum("$", "$$", "$$$", "$$$$"), nullable=True)
    amenities = Column(JSON, nullable=True)       # e.g. ["wifi","outdoor seating"]
    added_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    avg_rating = Column(DECIMAL(3, 2), default=0.00)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    photos = relationship("RestaurantPhoto", back_populates="restaurant", cascade="all, delete-orphan")
    # reviews = relationship("Review", back_populates="restaurant")  # Phase 5


class RestaurantPhoto(Base):
    __tablename__ = "restaurant_photos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    photo_url = Column(String(255), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="photos")
