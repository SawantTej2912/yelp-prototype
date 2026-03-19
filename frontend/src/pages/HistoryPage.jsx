import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyReviews, deleteReview } from '../api/reviews';
import { searchRestaurants } from '../api/restaurants';
import { useAuth } from '../context/AuthContext';

const BACKEND = 'http://localhost:8000';

function StarRow({ rating }) {
    const r = rating ?? 0;
    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <svg
                    key={i}
                    className={`w-3.5 h-3.5 ${i <= Math.round(r) ? 'text-yellow-400' : 'text-white/15'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </span>
    );
}

function Tab({ label, active, onClick, count }) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                active
                    ? 'bg-red-600/20 text-red-400'
                    : 'text-white/50 hover:text-white hover:bg-white/08'
            }`}
        >
            {label}
            {count != null && (
                <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        active ? 'bg-red-600/30 text-red-300' : 'bg-white/10 text-white/40'
                    }`}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

// ── Edit Review Modal ────────────────────────────────────────────────────────

import { updateReview } from '../api/reviews';

function EditModal({ review, onClose, onSaved }) {
    const [rating, setRating] = useState(review.rating);
    const [comment, setComment] = useState(review.comment ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hovered, setHovered] = useState(0);

    const handleSave = async () => {
        setError('');
        if (rating < 1 || rating > 5) {
            setError('Please choose a star rating.');
            return;
        }
        setLoading(true);
        try {
            const { data } = await updateReview(review.id, { rating, comment: comment.trim() || null });
            onSaved(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="glass-card w-full max-w-lg p-7 space-y-5 relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div>
                    <h2 className="text-lg font-bold text-white">Edit Review</h2>
                    <p className="text-white/40 text-sm mt-0.5">Update your rating or thoughts.</p>
                </div>

                {error && <div className="error-badge">{error}</div>}

                {/* Star picker */}
                <div>
                    <label className="field-label mb-2">Rating</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHovered(star)}
                                onMouseLeave={() => setHovered(0)}
                                onClick={() => setRating(star)}
                                className="transition-transform hover:scale-110"
                            >
                                <svg
                                    className={`w-8 h-8 transition-colors ${
                                        star <= (hovered || rating) ? 'text-yellow-400' : 'text-white/20'
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Comment */}
                <div>
                    <label className="field-label">Comment</label>
                    <textarea
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="input-base resize-none"
                        placeholder="Update your thoughts…"
                    />
                </div>

                <div className="flex gap-3 pt-1">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-white/12 text-white/60 hover:text-white hover:bg-white/06 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        id="save-review-btn"
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 btn-primary"
                        style={{ padding: '0.65rem' }}
                    >
                        {loading ? <span className="spinner" /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function HistoryPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('reviews');

    // ── Reviews tab state ──
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewsError, setReviewsError] = useState('');
    const [editingReview, setEditingReview] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // ── Restaurants tab state ──
    const [myRestaurants, setMyRestaurants] = useState([]);
    const [restLoading, setRestLoading] = useState(false);
    const [restError, setRestError] = useState('');

    // Load reviews on mount
    useEffect(() => {
        getMyReviews()
            .then(({ data }) => setReviews(data))
            .catch((err) => setReviewsError(err.message))
            .finally(() => setReviewsLoading(false));
    }, []);

    // Load restaurants added by this user when tab switches
    useEffect(() => {
        if (activeTab !== 'restaurants') return;
        if (myRestaurants.length > 0) return; // already loaded
        setRestLoading(true);
        setRestError('');
        searchRestaurants({ added_by: user?.id })
            .then(({ data }) => setMyRestaurants(data))
            .catch((err) => setRestError(err.message))
            .finally(() => setRestLoading(false));
    }, [activeTab, user?.id]);

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return;
        setDeletingId(reviewId);
        try {
            await deleteReview(reviewId);
            setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        } catch (err) {
            setReviewsError(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleReviewSaved = (updated) => {
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setEditingReview(null);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">My History</h1>
                <p className="text-white/40 text-sm mt-0.5">Your reviews and restaurants you've added.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/08 pb-3">
                <Tab
                    label="My Reviews"
                    active={activeTab === 'reviews'}
                    onClick={() => setActiveTab('reviews')}
                    count={reviews.length || undefined}
                />
                <Tab
                    label="Restaurants I Added"
                    active={activeTab === 'restaurants'}
                    onClick={() => setActiveTab('restaurants')}
                    count={myRestaurants.length || undefined}
                />
            </div>

            {/* ── Reviews Tab ── */}
            {activeTab === 'reviews' && (
                <div className="space-y-4">
                    {reviewsError && <div className="error-badge">{reviewsError}</div>}

                    {reviewsLoading && (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="glass-card p-5 h-28 rounded-2xl bg-white/04" />
                            ))}
                        </div>
                    )}

                    {!reviewsLoading && reviews.length === 0 && (
                        <div className="glass-card p-12 text-center">
                            <div className="text-4xl mb-3">✍️</div>
                            <p className="text-white font-semibold mb-1">No reviews yet</p>
                            <p className="text-white/40 text-sm mb-5">
                                Visit a restaurant page and share your experience.
                            </p>
                            <Link
                                to="/"
                                className="btn-primary inline-block"
                                style={{ width: 'auto', padding: '0.65rem 1.5rem' }}
                            >
                                Explore Restaurants
                            </Link>
                        </div>
                    )}

                    {reviews.map((review) => (
                        <div key={review.id} className="glass-card p-5 hover:border-white/15 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <Link
                                        to={`/restaurants/${review.restaurant_id}`}
                                        className="text-white font-semibold hover:text-red-400 transition-colors"
                                    >
                                        View Restaurant #{review.restaurant_id}
                                    </Link>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StarRow rating={review.rating} />
                                        <span className="text-sm font-semibold text-white/80">{review.rating}/5</span>
                                    </div>
                                    {review.comment && (
                                        <p className="text-white/60 text-sm mt-2 leading-relaxed line-clamp-3">
                                            {review.comment}
                                        </p>
                                    )}
                                    {/* Photos */}
                                    {review.photos?.length > 0 && (
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            {review.photos.map((p) => (
                                                <img
                                                    key={p.id}
                                                    src={p.photo_url.startsWith('http') ? p.photo_url : `${BACKEND}${p.photo_url}`}
                                                    alt="Review photo"
                                                    className="w-14 h-14 rounded-lg object-cover border border-white/10"
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {review.review_date && (
                                        <p className="text-xs text-white/25 mt-2">
                                            {new Date(review.review_date).toLocaleDateString('en-US', {
                                                month: 'long', day: 'numeric', year: 'numeric',
                                            })}
                                            {review.updated_at && review.updated_at !== review.review_date && (
                                                <span className="ml-2 italic">(edited)</span>
                                            )}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        id={`edit-review-${review.id}`}
                                        onClick={() => setEditingReview(review)}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/12 text-white/60 hover:text-white hover:bg-white/08 transition-colors"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        id={`delete-review-${review.id}`}
                                        onClick={() => handleDeleteReview(review.id)}
                                        disabled={deletingId === review.id}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                                    >
                                        {deletingId === review.id ? <span className="spinner" /> : '🗑 Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Restaurants Added Tab ── */}
            {activeTab === 'restaurants' && (
                <div className="space-y-4">
                    {restError && <div className="error-badge">{restError}</div>}

                    {restLoading && (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="glass-card p-5 h-24 rounded-2xl bg-white/04" />
                            ))}
                        </div>
                    )}

                    {!restLoading && myRestaurants.length === 0 && (
                        <div className="glass-card p-12 text-center">
                            <div className="text-4xl mb-3">🍽️</div>
                            <p className="text-white font-semibold mb-1">You haven't added any restaurants</p>
                            <p className="text-white/40 text-sm mb-5">
                                Know a great spot that's not listed? Add it!
                            </p>
                            <Link
                                to="/restaurants/new"
                                className="btn-primary inline-block"
                                style={{ width: 'auto', padding: '0.65rem 1.5rem' }}
                            >
                                Add a Restaurant
                            </Link>
                        </div>
                    )}

                    {myRestaurants.map((r) => (
                        <Link
                            key={r.id}
                            to={`/restaurants/${r.id}`}
                            className="glass-card p-4 flex items-center gap-4 group hover:border-white/15 transition-colors block"
                        >
                            {r.cover_photo ? (
                                <img
                                    src={r.cover_photo.startsWith('http') ? r.cover_photo : `${BACKEND}${r.cover_photo}`}
                                    alt={r.name}
                                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-white/08 flex items-center justify-center text-2xl shrink-0">
                                    🍴
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate group-hover:text-red-400 transition-colors">
                                    {r.name}
                                </p>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                    {r.cuisine_type && <span className="text-xs text-white/40">{r.cuisine_type}</span>}
                                    {r.city && <span className="text-xs text-white/40">📍 {r.city}</span>}
                                    {r.pricing_tier && <span className="text-xs text-white/40">{r.pricing_tier}</span>}
                                </div>
                                {r.avg_rating > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <StarRow rating={r.avg_rating} />
                                        <span className="text-xs text-white/50">{Number(r.avg_rating).toFixed(1)}</span>
                                        {r.review_count > 0 && (
                                            <span className="text-xs text-white/30">({r.review_count})</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingReview && (
                <EditModal
                    review={editingReview}
                    onClose={() => setEditingReview(null)}
                    onSaved={handleReviewSaved}
                />
            )}
        </div>
    );
}
