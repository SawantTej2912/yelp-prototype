"""
Owner service: claim workflow and owner-only review listing.
(Extracted from restaurant and review routers in the monolith.)
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.kafka_producer import publish_event
from shared.kafka_topics import TOPIC_RESTAURANT_CLAIMED
from shared.models.restaurant import Restaurant
from shared.models.review import Review
from shared.models.user import User
from shared.schemas.restaurant import RestaurantResponse
from shared.schemas.review import ReviewResponse
from shared.utils.jwt import get_current_user

# POST /restaurants/{id}/claim
restaurant_claim_router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


@restaurant_claim_router.post("/{restaurant_id}/claim", response_model=RestaurantResponse)
def claim_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Claim a restaurant that has no owner. Any user can do this and they become an owner."""
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    if r.owner_id is not None:
        raise HTTPException(status_code=400, detail="Restaurant already has an owner")

    r.owner_id = current_user.id
    if current_user.role != "owner":
        current_user.role = "owner"

    db.commit()
    db.refresh(r)
    publish_event(
        TOPIC_RESTAURANT_CLAIMED,
        {
            "restaurant_id": r.id,
            "owner_id": r.owner_id,
            "claimed_by_user_id": current_user.id,
            "restaurant_name": r.name,
        },
    )

    result = RestaurantResponse.model_validate(r)
    result.avg_rating = float(r.avg_rating) if r.avg_rating is not None else None
    return result


# GET /owner/reviews
owner_router = APIRouter(prefix="/owner", tags=["Owner"])


@owner_router.get(
    "/reviews",
    response_model=List[ReviewResponse],
    summary="Get all reviews for restaurants owned by the current user",
)
def get_owner_reviews(
    restaurant_id: Optional[int] = None,
    sort: Optional[str] = "date",  # "date" or "rating"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all reviews for all restaurants owned by the authenticated user."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can access this endpoint")

    query = db.query(Review).join(Restaurant).filter(Restaurant.owner_id == current_user.id)

    if restaurant_id:
        query = query.filter(Review.restaurant_id == restaurant_id)

    if sort == "rating":
        query = query.order_by(Review.rating.desc(), Review.review_date.desc())
    else:
        query = query.order_by(Review.review_date.desc())

    reviews = query.all()
    return [ReviewResponse.model_validate(r) for r in reviews]
