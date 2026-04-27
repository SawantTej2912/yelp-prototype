# Import all models so SQLAlchemy can resolve string-based relationships
# and mappers are registered before any query.
from shared.models.user import User  # noqa: F401
from shared.models.user_preferences import UserPreferences  # noqa: F401
from shared.models.restaurant import Restaurant, RestaurantPhoto  # noqa: F401
from shared.models.review import Review, ReviewPhoto  # noqa: F401
from shared.models.favorite import Favorite  # noqa: F401
from shared.models.chat_history import ChatHistory  # noqa: F401
