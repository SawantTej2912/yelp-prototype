from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    # Composite PK: no auto-increment — matches the DB schema
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    restaurant = relationship("Restaurant", foreign_keys=[restaurant_id])
    user = relationship("User", foreign_keys=[user_id])
