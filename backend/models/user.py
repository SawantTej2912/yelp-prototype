from sqlalchemy import Column, Integer, String, Text, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("user", "owner"), default="user", nullable=True)
    profile_pic = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    about_me = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(10), nullable=True)
    country = Column(String(100), nullable=True)
    languages = Column(String(255), nullable=True)
    gender = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships (expanded in later phases)
    # reviews = relationship("Review", back_populates="user")
    # favorites = relationship("Favorite", back_populates="user")
