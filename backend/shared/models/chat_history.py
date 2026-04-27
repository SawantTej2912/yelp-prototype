from sqlalchemy import Column, Integer, Text, Enum, ForeignKey, DateTime, Index
from sqlalchemy.sql import func

from shared.database import Base


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum("user", "assistant"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_chat_history_user_created_at", "user_id", "created_at"),
    )

