import api from './axios';

// ─── Reviews ──────────────────────────────────────────────────────────────────

/** Create a review for a restaurant. */
export const createReview = (restaurantId, data) =>
    api.post(`/reviews/${restaurantId}`, data);

/** List all reviews for a restaurant (public). */
export const getRestaurantReviews = (restaurantId) =>
    api.get(`/reviews/restaurant/${restaurantId}`);

/** Get the current logged-in user's review history. */
export const getMyReviews = () =>
    api.get('/reviews/me');

/** Update one of the current user's reviews. */
export const updateReview = (reviewId, data) =>
    api.put(`/reviews/${reviewId}`, data);

/** Delete one of the current user's reviews. */
export const deleteReview = (reviewId) =>
    api.delete(`/reviews/${reviewId}`);

/** Upload a photo to a review. */
export const uploadReviewPhoto = (reviewId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/reviews/${reviewId}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// ─── Favorites ────────────────────────────────────────────────────────────────

/** List the current user's favorite restaurants. */
export const getFavorites = () =>
    api.get('/favorites');

/** Add a restaurant to favorites. */
export const addFavorite = (restaurantId) =>
    api.post(`/favorites/${restaurantId}`);

/** Remove a restaurant from favorites. */
export const removeFavorite = (restaurantId) =>
    api.delete(`/favorites/${restaurantId}`);

/** Check if a restaurant is already favorited. */
export const getFavoriteStatus = (restaurantId) =>
    api.get(`/favorites/${restaurantId}/status`);

/** Get all reviews for restaurants owned by the current user. */
export const getOwnerReviews = (params = {}) =>
    api.get(`/owner/reviews`, { params });
