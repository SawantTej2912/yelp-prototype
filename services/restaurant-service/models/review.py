from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, SmallInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(SmallInteger, nullable=False)          # 1–5
    comment = Column(Text, nullable=True)
    review_date = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    photos = relationship("ReviewPhoto", back_populates="review", cascade="all, delete-orphan")
    user = relationship("User", foreign_keys=[user_id])
    restaurant = relationship("Restaurant", foreign_keys=[restaurant_id])


class ReviewPhoto(Base):
    __tablename__ = "review_photos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_url = Column(String(255), nullable=False)

    review = relationship("Review", back_populates="photos")
