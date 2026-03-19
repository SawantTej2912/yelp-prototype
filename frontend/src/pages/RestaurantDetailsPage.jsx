import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    getRestaurant,
    updateRestaurant,
    deleteRestaurant,
    uploadRestaurantPhoto,
    deleteRestaurantPhoto,
} from '../api/restaurants';
import {
    getRestaurantReviews,
    getFavoriteStatus,
    addFavorite,
    removeFavorite,
    deleteReview,
    updateReview,
} from '../api/reviews';
import { useAuth } from '../context/AuthContext';

const BACKEND = 'http://localhost:8000';

const CUISINES = [
    'American', 'Italian', 'Japanese', 'Mexican', 'Indian', 'Thai',
    'Chinese', 'Mediterranean', 'French', 'Greek', 'Korean', 'Vietnamese',
    'Middle Eastern', 'Spanish', 'Caribbean', 'Ethiopian', 'Other',
];
const AMENITY_OPTIONS = [
    'WiFi', 'Outdoor Seating', 'Bar', 'Full Bar', 'Parking', 'Reservations',
    'Takeout', 'Delivery', 'Family-friendly', 'Romantic', 'Pet-friendly',
    'Wheelchair Accessible', 'Live Music', 'Happy Hour', 'Vegan Options',
    'Vegetarian-friendly', 'Halal', 'Gluten-free Options', 'Sports TV',
];

// ── Reusable sub-components ────────────────────────────────────────────────────

function StarRating({ rating, size = 'md' }) {
    const r = rating ?? 0;
    const sz = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className={`${sz} ${i <= Math.round(r) ? 'text-yellow-400' : 'text-white/15'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </span>
    );
}

function InfoRow({ icon, text }) {
    if (!text) return null;
    return (
        <div className="flex items-start gap-3 text-sm text-white/60">
            <span className="text-white/30 mt-0.5 shrink-0">{icon}</span>
            <span>{text}</span>
        </div>
    );
}

// ── Review Edit Modal ──────────────────────────────────────────────────────────

function ReviewEditModal({ review, onClose, onSaved }) {
    const [rating, setRating] = useState(review.rating);
    const [comment, setComment] = useState(review.comment ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hovered, setHovered] = useState(0);

    const handleSave = async () => {
        setError('');
        if (rating < 1 || rating > 5) { setError('Choose a rating.'); return; }
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
            <div className="glass-card w-full max-w-lg p-7 space-y-5 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-lg font-bold text-white">Edit Your Review</h2>
                    <p className="text-white/40 text-sm mt-0.5">Update your rating or comment.</p>
                </div>
                {error && <div className="error-badge">{error}</div>}
                <div>
                    <label className="field-label mb-2">Rating</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button"
                                onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
                                onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                                <svg className={`w-8 h-8 transition-colors ${star <= (hovered || rating) ? 'text-yellow-400' : 'text-white/20'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="field-label">Comment</label>
                    <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
                        className="input-base resize-none" placeholder="Update your thoughts…" />
                </div>
                <div className="flex gap-3 pt-1">
                    <button onClick={onClose} disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-white/12 text-white/60 hover:text-white hover:bg-white/06 transition-colors text-sm font-medium">
                        Cancel
                    </button>
                    <button id="save-edit-review-btn" onClick={handleSave} disabled={loading}
                        className="flex-1 btn-primary" style={{ padding: '0.65rem' }}>
                        {loading ? <span className="spinner" /> : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Edit Restaurant Modal ──────────────────────────────────────────────────────

function EditRestaurantModal({ restaurant, onClose, onSaved }) {
    const photoInputRef = useRef(null);

    const [form, setForm] = useState({
        name: restaurant.name ?? '',
        cuisine_type: restaurant.cuisine_type ?? '',
        address: restaurant.address ?? '',
        city: restaurant.city ?? '',
        state: restaurant.state ?? '',
        zip: restaurant.zip ?? '',
        description: restaurant.description ?? '',
        contact_info: restaurant.contact_info ?? '',
        hours: restaurant.hours ?? '',
        pricing_tier: restaurant.pricing_tier ?? '',
        amenities: restaurant.amenities ?? [],
    });

    // Track existing photos so user can remove them
    const [existingPhotos, setExistingPhotos] = useState(restaurant.photos ?? []);
    const [deletingPhotoId, setDeletingPhotoId] = useState(null);

    // New photos to upload
    const [newPhotoFiles, setNewPhotoFiles] = useState([]);
    const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
        setError('');
    };

    const toggleAmenity = (a) => {
        setForm((p) => ({
            ...p,
            amenities: p.amenities.includes(a)
                ? p.amenities.filter((x) => x !== a)
                : [...p.amenities, a],
        }));
    };

    const onNewPhotoSelect = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setNewPhotoFiles((prev) => [...prev, ...files]);
        setNewPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    };

    const removeNewPhoto = (index) => {
        setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
        setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDeleteExistingPhoto = async (photoId) => {
        setDeletingPhotoId(photoId);
        try {
            await deleteRestaurantPhoto(restaurant.id, photoId);
            setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingPhotoId(null);
        }
    };

    const handleSave = async () => {
        setError('');
        if (!form.name.trim()) { setError('Restaurant name is required.'); return; }
        setSaving(true);
        try {
            // Build payload — omit empty strings, keep amenities even if empty array
            const payload = {};
            for (const [k, v] of Object.entries(form)) {
                if (k === 'amenities') {
                    payload[k] = v;
                } else if (v !== '') {
                    payload[k] = v;
                }
            }
            const { data: updated } = await updateRestaurant(restaurant.id, payload);

            // Upload any new photos sequentially
            for (const file of newPhotoFiles) {
                await uploadRestaurantPhoto(restaurant.id, file);
            }

            // Fetch the freshest restaurant data (includes newly uploaded photos)
            const { data: fresh } = await getRestaurant(restaurant.id);
            onSaved(fresh);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm px-4 py-8">
            <div className="glass-card w-full max-w-2xl mx-auto p-7 space-y-6 relative">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Edit Restaurant</h2>
                        <p className="text-white/40 text-sm mt-0.5">Update info for {restaurant.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors mt-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && <div className="error-badge">{error}</div>}

                {/* ── Photos management ── */}
                <div className="space-y-3">
                    <label className="field-label">Photos</label>

                    {/* Existing photos */}
                    {existingPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {existingPhotos.map((p) => (
                                <div key={p.id} className="relative w-20 h-20 group">
                                    <img src={p.photo_url.startsWith('http') ? p.photo_url : `${BACKEND}${p.photo_url}`} alt="" className="w-full h-full object-cover rounded-xl border border-white/10" />
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteExistingPhoto(p.id)}
                                        disabled={deletingPhotoId === p.id}
                                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-red-400 text-xs font-semibold"
                                    >
                                        {deletingPhotoId === p.id ? <span className="spinner" /> : 'Remove'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New photo upload */}
                    <label htmlFor="edit-photo-upload"
                        className="flex items-center gap-2 cursor-pointer text-xs text-white/40 hover:text-red-400 transition-colors border border-dashed border-white/15 hover:border-red-500/40 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add more photos (JPEG, PNG, WebP · max 10 MB)
                        <input id="edit-photo-upload" type="file" accept="image/jpeg,image/png,image/webp"
                            multiple className="hidden" onChange={onNewPhotoSelect} ref={photoInputRef} />
                    </label>

                    {newPhotoPreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {newPhotoPreviews.map((src, i) => (
                                <div key={i} className="relative w-20 h-20 group">
                                    <img src={src} alt="" className="w-full h-full object-cover rounded-xl border border-white/10 border-dashed" />
                                    <button type="button" onClick={() => removeNewPhoto(i)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-red-400 text-xs font-semibold">
                                        Cancel
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Basic info ── */}
                <div className="space-y-4">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Basic Info</p>

                    <div>
                        <label className="field-label">Restaurant name <span className="text-red-500">*</span></label>
                        <input name="name" value={form.name} onChange={onChange} className="input-base" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="field-label">Cuisine type</label>
                            <select name="cuisine_type" value={form.cuisine_type} onChange={onChange} className="input-base">
                                <option value="">Select cuisine…</option>
                                {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="field-label">Pricing tier</label>
                            <select name="pricing_tier" value={form.pricing_tier} onChange={onChange} className="input-base">
                                <option value="">Select price…</option>
                                {['$', '$$', '$$$', '$$$$'].map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="field-label">Description</label>
                        <textarea name="description" rows={3} value={form.description} onChange={onChange}
                            className="input-base resize-none" placeholder="What makes this place special?" />
                    </div>
                </div>

                {/* ── Location ── */}
                <div className="space-y-4">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Location</p>
                    <div>
                        <label className="field-label">Street address</label>
                        <input name="address" value={form.address} onChange={onChange} className="input-base" placeholder="123 Main St" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="field-label">City</label>
                            <input name="city" value={form.city} onChange={onChange} className="input-base" />
                        </div>
                        <div>
                            <label className="field-label">State</label>
                            <input name="state" value={form.state} onChange={onChange} maxLength={2} className="input-base uppercase" />
                        </div>
                        <div>
                            <label className="field-label">ZIP</label>
                            <input name="zip" value={form.zip} onChange={onChange} className="input-base" />
                        </div>
                    </div>
                </div>

                {/* ── Contact & Hours ── */}
                <div className="space-y-4">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Contact & Hours</p>
                    <div>
                        <label className="field-label">Contact info</label>
                        <input name="contact_info" value={form.contact_info} onChange={onChange} className="input-base"
                            placeholder="(415) 555-0100 or info@restaurant.com" />
                    </div>
                    <div>
                        <label className="field-label">Hours of operation</label>
                        <input name="hours" value={form.hours} onChange={onChange} className="input-base"
                            placeholder="Mon–Fri 11am–10pm, Sat–Sun 10am–11pm" />
                    </div>
                </div>

                {/* ── Amenities ── */}
                <div>
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                        {AMENITY_OPTIONS.map((a) => (
                            <button key={a} type="button" onClick={() => toggleAmenity(a)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                                    form.amenities.includes(a)
                                        ? 'bg-red-600 border-red-600 text-white'
                                        : 'bg-white/04 border-white/10 text-white/60 hover:border-white/25'
                                }`}>
                                {a}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Actions ── */}
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} disabled={saving}
                        className="flex-1 py-3 rounded-xl border border-white/12 text-white/50 hover:text-white hover:border-white/25 transition-all text-sm font-medium">
                        Cancel
                    </button>
                    <button id="save-restaurant-btn" onClick={handleSave} disabled={saving}
                        className="flex-1 btn-primary" style={{ padding: '0.75rem' }}>
                        {saving
                            ? <span className="flex items-center justify-center gap-2"><span className="spinner" /> Saving…</span>
                            : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Review Card ────────────────────────────────────────────────────────────────

function ReviewCard({ review, currentUserId, onEdit, onDelete, deleting }) {
    const isOwner = review.user_id === currentUserId;
    const initials = review.user?.name?.[0]?.toUpperCase() ?? '?';

    return (
        <div className="border-t border-white/06 pt-4 mt-4 first:border-0 first:mt-0 first:pt-0">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-red-600/25 flex items-center justify-center shrink-0 border border-white/08">
                        {review.user?.profile_pic ? (
                            <img src={`${BACKEND}${review.user.profile_pic}`} alt={review.user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs font-semibold text-red-400">{initials}</span>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white/80">{review.user?.name ?? 'Anonymous'}</p>
                        {review.review_date && (
                            <p className="text-xs text-white/30">
                                {new Date(review.review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>

                {isOwner && (
                    <div className="flex gap-1.5 shrink-0">
                        <button id={`edit-review-detail-${review.id}`} onClick={() => onEdit(review)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-white/12 text-white/50 hover:text-white hover:bg-white/08 transition-colors">
                            ✏️ Edit
                        </button>
                        <button id={`delete-review-detail-${review.id}`} onClick={() => onDelete(review.id)}
                            disabled={deleting === review.id}
                            className="px-2.5 py-1 text-xs rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40">
                            {deleting === review.id ? <span className="spinner" /> : '🗑'}
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-white/50 font-medium">{review.rating}/5</span>
                </div>
                {review.comment && (
                    <p className="text-sm text-white/65 leading-relaxed">{review.comment}</p>
                )}
                {review.photos?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                        {review.photos.map((p) => (
                            <img key={p.id} src={p.photo_url.startsWith('http') ? p.photo_url : `${BACKEND}${p.photo_url}`} alt="Review" className="w-full h-full object-cover rounded-lg border border-white/08" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RestaurantDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activePhoto, setActivePhoto] = useState(0);

    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewsError, setReviewsError] = useState('');
    const [editingReview, setEditingReview] = useState(null);
    const [deletingReviewId, setDeletingReviewId] = useState(null);

    const [isFavorited, setIsFavorited] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [deletingRestaurant, setDeletingRestaurant] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Load restaurant details
    useEffect(() => {
        getRestaurant(id)
            .then(({ data }) => setRestaurant(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    // Load reviews
    const loadReviews = useCallback(() => {
        setReviewsLoading(true);
        getRestaurantReviews(id)
            .then(({ data }) => setReviews(data))
            .catch((err) => setReviewsError(err.message))
            .finally(() => setReviewsLoading(false));
    }, [id]);

    useEffect(() => { loadReviews(); }, [loadReviews]);

    // Load favorite status
    useEffect(() => {
        getFavoriteStatus(id)
            .then(({ data }) => setIsFavorited(data.is_favorite))
            .catch(() => {});
    }, [id]);

    // Toggle favorite
    const handleFavoriteToggle = async () => {
        setFavLoading(true);
        try {
            if (isFavorited) {
                await removeFavorite(id);
                setIsFavorited(false);
            } else {
                await addFavorite(id);
                setIsFavorited(true);
            }
        } catch { /* silently fail */ } finally {
            setFavLoading(false);
        }
    };

    // Delete review
    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Delete this review? This cannot be undone.')) return;
        setDeletingReviewId(reviewId);
        try {
            await deleteReview(reviewId);
            setReviews((prev) => prev.filter((r) => r.id !== reviewId));
            getRestaurant(id).then(({ data }) => setRestaurant(data)).catch(() => {});
        } catch (err) {
            setReviewsError(err.message);
        } finally {
            setDeletingReviewId(null);
        }
    };

    // Save edited review
    const handleReviewSaved = (updated) => {
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setEditingReview(null);
    };

    // Delete restaurant
    const handleDeleteRestaurant = async () => {
        if (!window.confirm(`Delete "${restaurant.name}"? This will permanently remove the restaurant and all its photos. This cannot be undone.`)) return;
        setDeletingRestaurant(true);
        setDeleteError('');
        try {
            await deleteRestaurant(id);
            navigate('/', { replace: true });
        } catch (err) {
            setDeleteError(err.message);
            setDeletingRestaurant(false);
        }
    };

    // ── Loading skeleton ──
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-10 space-y-4 animate-pulse">
                <div className="h-72 bg-white/05 glass-card rounded-2xl" />
                <div className="h-8 bg-white/08 rounded w-1/2" />
                <div className="h-4 bg-white/05 rounded w-1/3" />
            </div>
        );
    }

    if (error || !restaurant) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                <p className="text-4xl mb-3">😕</p>
                <p className="text-white/50 text-lg">{error || 'Restaurant not found'}</p>
                <button onClick={() => navigate('/')} className="btn-primary mt-6" style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>
                    Back to Explore
                </button>
            </div>
        );
    }

    const r = restaurant;
    const photos = r.photos ?? [];
    const address = [r.address, r.city, r.state, r.zip].filter(Boolean).join(', ');
    const userAlreadyReviewed = reviews.some((rev) => rev.user_id === user?.id);
    const isRestaurantOwner = user && (r.added_by === user.id || r.owner_id === user.id);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">

            {/* ── Back ── */}
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to results
            </Link>

            {/* ── Photo gallery ── */}
            <div className="glass-card overflow-hidden mb-6">
                <div className="relative h-72 bg-gradient-to-br from-white/05 to-black/20">
                    {photos.length > 0 ? (
                        <img src={photos[activePhoto].photo_url.startsWith('http') ? photos[activePhoto].photo_url : `${BACKEND}${photos[activePhoto].photo_url}`} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10">
                            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            </svg>
                        </div>
                    )}
                    {r.pricing_tier && (
                        <span className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white font-bold px-3 py-1 rounded-xl text-sm">
                            {r.pricing_tier}
                        </span>
                    )}
                </div>

                {photos.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto">
                        {photos.map((p, i) => (
                            <button key={p.id} onClick={() => setActivePhoto(i)}
                                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                    i === activePhoto ? 'border-red-500' : 'border-transparent opacity-60 hover:opacity-90'
                                }`}>
                                <img src={p.photo_url.startsWith('http') ? p.photo_url : `${BACKEND}${p.photo_url}`} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Header: name + ratings + action buttons ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">{r.name}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        {r.cuisine_type && (
                            <span className="bg-white/08 border border-white/10 text-white/70 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                {r.cuisine_type}
                            </span>
                        )}
                        <div className="flex items-center gap-1.5">
                            <StarRating rating={r.avg_rating} size="lg" />
                            <span className="font-semibold text-white/90">
                                {r.avg_rating > 0 ? Number(r.avg_rating).toFixed(1) : '—'}
                            </span>
                            {r.review_count > 0 && (
                                <span className="text-white/40">({r.review_count} reviews)</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Favorite heart */}
                    <button id="favorite-btn" onClick={handleFavoriteToggle} disabled={favLoading}
                        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                            isFavorited
                                ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                                : 'bg-white/06 border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                        } disabled:opacity-40`}>
                        {favLoading ? (
                            <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                        ) : (
                            <svg className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                        )}
                    </button>

                    {/* Owner-only: Edit + Delete restaurant */}
                    {isRestaurantOwner && (
                        <>
                            <button
                                id="edit-restaurant-btn"
                                onClick={() => setShowEditModal(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/08 hover:border-white/25 transition-all"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                                Edit
                            </button>
                            <button
                                id="delete-restaurant-btn"
                                onClick={handleDeleteRestaurant}
                                disabled={deletingRestaurant}
                                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 transition-all disabled:opacity-40"
                            >
                                {deletingRestaurant ? (
                                    <span className="spinner" style={{ width: '0.85rem', height: '0.85rem' }} />
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                )}
                                Delete
                            </button>
                        </>
                    )}

                    {/* Write Review */}
                    {!userAlreadyReviewed ? (
                        <Link id="write-review-btn" to={`/restaurants/${r.id}/review`} className="btn-primary"
                            style={{ width: 'auto', padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}>
                            ✍ Write a Review
                        </Link>
                    ) : (
                        <span className="text-xs text-white/30 italic px-2">You've reviewed this</span>
                    )}
                </div>
            </div>

            {deleteError && <div className="error-badge mb-4">{deleteError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ── Left: description + amenities + reviews ── */}
                <div className="md:col-span-2 space-y-5">

                    {r.description && (
                        <div className="glass-card p-5">
                            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">About</h2>
                            <p className="text-white/70 text-sm leading-relaxed">{r.description}</p>
                        </div>
                    )}

                    {r.amenities && r.amenities.length > 0 && (
                        <div className="glass-card p-5">
                            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Amenities</h2>
                            <div className="flex flex-wrap gap-2">
                                {r.amenities.map((a) => (
                                    <span key={a} className="bg-white/06 border border-white/10 text-white/60 text-xs px-3 py-1 rounded-full">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Reviews section ── */}
                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                                Reviews {reviews.length > 0 && `(${reviews.length})`}
                            </h2>
                            {!userAlreadyReviewed && (
                                <Link to={`/restaurants/${r.id}/review`} className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium">
                                    + Write one
                                </Link>
                            )}
                        </div>

                        {reviewsError && <div className="error-badge mb-3">{reviewsError}</div>}

                        {reviewsLoading && (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2].map((i) => <div key={i} className="h-16 bg-white/04 rounded-xl" />)}
                            </div>
                        )}

                        {!reviewsLoading && reviews.length === 0 && (
                            <p className="text-white/30 text-sm">No reviews yet. Be the first to share your experience!</p>
                        )}

                        {!reviewsLoading && reviews.length > 0 && reviews.map((review) => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                currentUserId={user?.id}
                                onEdit={setEditingReview}
                                onDelete={handleDeleteReview}
                                deleting={deletingReviewId}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Right: info panel ── */}
                <div className="glass-card p-5 space-y-4 h-fit">
                    <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Info</h2>
                    <InfoRow icon="📍" text={address} />
                    <InfoRow icon="🕐" text={r.hours} />
                    <InfoRow icon="📞" text={r.contact_info} />
                    {r.pricing_tier && (
                        <div className="flex items-start gap-3 text-sm text-white/60">
                            <span className="text-white/30 mt-0.5">💰</span>
                            <span>{r.pricing_tier} — {
                                { '$': 'Under $15', '$$': '$15–35', '$$$': '$35–60', '$$$$': 'Over $60' }[r.pricing_tier]
                            } per person</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modals ── */}
            {editingReview && (
                <ReviewEditModal
                    review={editingReview}
                    onClose={() => setEditingReview(null)}
                    onSaved={handleReviewSaved}
                />
            )}

            {showEditModal && (
                <EditRestaurantModal
                    restaurant={r}
                    onClose={() => setShowEditModal(false)}
                    onSaved={(updated) => {
                        setRestaurant(updated);
                        setActivePhoto(0);
                        setShowEditModal(false);
                    }}
                />
            )}
        </div>
    );
}
