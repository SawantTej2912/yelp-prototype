"""
Reviews & Favorites Router
==========================
Reviews:
  POST   /reviews/{restaurant_id}          — Create review (auth)
  GET    /reviews/restaurant/{restaurant_id} — List reviews for a restaurant
  GET    /reviews/me                        — Current user's review history
  PUT    /reviews/{review_id}               — Edit own review (auth)
  DELETE /reviews/{review_id}               — Delete own review (auth)
  POST   /reviews/{review_id}/photos        — Upload photo to a review (auth)

Favorites:
  GET    /favorites                         — List current user's favorites (auth)
  POST   /favorites/{restaurant_id}         — Add favorite (auth)
  DELETE /favorites/{restaurant_id}         — Remove favorite (auth)
  GET    /favorites/{restaurant_id}/status  — Check if favorited (auth)
"""
import uuid
from decimal import Decimal
from pathlib import Path
from typing import List

from fastapi import (
    APIRouter, Depends, File, HTTPException,
    UploadFile, status
)
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.favorite import Favorite
from models.restaurant import Restaurant, RestaurantPhoto
from models.review import Review, ReviewPhoto
from models.user import User
from schemas.review import (
    FavoriteRestaurantResponse,
    ReviewCreateRequest,
    ReviewResponse,
    ReviewUpdateRequest,
)
from utils.jwt import get_current_user

router = APIRouter(tags=["Reviews & Favorites"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "review_photos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _recalculate_rating(db: Session, restaurant_id: int) -> None:
    """Recalculate and persist avg_rating + review_count after any review change."""
    result = db.query(
        func.avg(Review.rating).label("avg"),
        func.count(Review.id).label("cnt"),
    ).filter(Review.restaurant_id == restaurant_id).one()

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if restaurant:
        restaurant.avg_rating = round(float(result.avg or 0), 2)
        restaurant.review_count = result.cnt or 0
        db.commit()


# ═══════════════════════════════════
# REVIEWS
# ═══════════════════════════════════

@router.post(
    "/reviews/{restaurant_id}",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a review for a restaurant",
)
def create_review(
    restaurant_id: int,
    payload: ReviewCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a 1–5 star review with an optional comment.
    A user may only submit one review per restaurant."""
    if not db.query(Restaurant).filter(Restaurant.id == restaurant_id).first():
        raise HTTPException(status_code=404, detail="Restaurant not found")

    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.restaurant_id == restaurant_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this restaurant. Use PUT to update your review.",
        )

    review = Review(
        user_id=current_user.id,
        restaurant_id=restaurant_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    _recalculate_rating(db, restaurant_id)
    db.refresh(review)
    return ReviewResponse.model_validate(review)


@router.get(
    "/reviews/restaurant/{restaurant_id}",
    response_model=List[ReviewResponse],
    summary="List all reviews for a restaurant",
)
def list_restaurant_reviews(restaurant_id: int, db: Session = Depends(get_db)):
    """Returns all reviews for a restaurant, newest first."""
    if not db.query(Restaurant).filter(Restaurant.id == restaurant_id).first():
        raise HTTPException(status_code=404, detail="Restaurant not found")

    reviews = (
        db.query(Review)
        .filter(Review.restaurant_id == restaurant_id)
        .order_by(Review.review_date.desc())
        .all()
    )
    return [ReviewResponse.model_validate(r) for r in reviews]


@router.get(
    "/reviews/me",
    response_model=List[ReviewResponse],
    summary="Get the current user's review history",
)
def my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all reviews written by the authenticated user, newest first."""
    reviews = (
        db.query(Review)
        .filter(Review.user_id == current_user.id)
        .order_by(Review.review_date.desc())
        .all()
    )
    return [ReviewResponse.model_validate(r) for r in reviews]


@router.put(
    "/reviews/{review_id}",
    response_model=ReviewResponse,
    summary="Update your own review",
)
def update_review(
    review_id: int,
    payload: ReviewUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit the rating and/or comment of a review you own."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own reviews")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(review, field, value)

    db.commit()
    db.refresh(review)
    _recalculate_rating(db, review.restaurant_id)
    db.refresh(review)
    return ReviewResponse.model_validate(review)


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete your own review",
)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a review you own. Also recalculates the restaurant's rating."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own reviews")

    restaurant_id = review.restaurant_id
    db.delete(review)
    db.commit()
    _recalculate_rating(db, restaurant_id)


@router.post(
    "/reviews/{review_id}/photos",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a photo to your review",
)
async def upload_review_photo(
    review_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a JPEG/PNG/WebP photo (max 10 MB) to one of your own reviews."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add photos to your own reviews")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP images are allowed")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{review_id}_{uuid.uuid4().hex}.{ext}"
    with open(UPLOAD_DIR / filename, "wb") as f:
        f.write(contents)

    photo = ReviewPhoto(review_id=review_id, photo_url=f"/uploads/review_photos/{filename}")
    db.add(photo)
    db.commit()
    db.refresh(review)
    return ReviewResponse.model_validate(review)


# ═══════════════════════════════════
# FAVORITES
# ═══════════════════════════════════

@router.get(
    "/favorites",
    response_model=List[FavoriteRestaurantResponse],
    summary="List the current user's favorite restaurants",
)
def list_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all restaurants the user has favorited, with slim restaurant info."""
    favs = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )
    result = []
    for fav in favs:
        r = fav.restaurant
        cover = r.photos[0].photo_url if r and r.photos else None
        result.append(FavoriteRestaurantResponse(
            restaurant_id=fav.restaurant_id,
            created_at=fav.created_at,
            restaurant_name=r.name if r else None,
            restaurant_cuisine=r.cuisine_type if r else None,
            restaurant_city=r.city if r else None,
            restaurant_rating=float(r.avg_rating) if r and r.avg_rating else None,
            restaurant_cover=cover,
        ))
    return result


@router.post(
    "/favorites/{restaurant_id}",
    status_code=status.HTTP_201_CREATED,
    summary="Add a restaurant to favorites",
)
def add_favorite(
    restaurant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a restaurant as a favorite. Idempotent — does not error if already favorited."""
    if not db.query(Restaurant).filter(Restaurant.id == restaurant_id).first():
        raise HTTPException(status_code=404, detail="Restaurant not found")

    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.restaurant_id == restaurant_id,
    ).first()
    if existing:
        return {"message": "Already in favorites"}

    fav = Favorite(user_id=current_user.id, restaurant_id=restaurant_id)
    db.add(fav)
    db.commit()
    return {"message": "Added to favorites"}


@router.delete(
    "/favorites/{restaurant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a restaurant from favorites",
)
def remove_favorite(
    restaurant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Un-favorite a restaurant."""
    fav = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.restaurant_id == restaurant_id,
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Not in your favorites")
    db.delete(fav)
    db.commit()


@router.get(
    "/favorites/{restaurant_id}/status",
    summary="Check if a restaurant is in the user's favorites",
)
def favorite_status(
    restaurant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns {is_favorite: true/false} — used to toggle the heart button."""
    exists = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.restaurant_id == restaurant_id,
    ).first()
    return {"is_favorite": exists is not None}
