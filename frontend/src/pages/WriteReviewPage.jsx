import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRestaurant } from '../api/restaurants';
import { createReview, uploadReviewPhoto } from '../api/reviews';

import { API_BASE } from '../config.js';

function StarPicker({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    const display = hovered || value;

    const labels = {
        1: 'Terrible',
        2: 'Poor',
        3: 'Average',
        4: 'Good',
        5: 'Excellent',
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => onChange(star)}
                        className="transition-transform hover:scale-110 active:scale-95"
                        title={labels[star]}
                    >
                        <svg
                            className={`w-10 h-10 transition-colors ${
                                star <= display ? 'text-yellow-400' : 'text-white/20'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </button>
                ))}
            </div>
            {display > 0 && (
                <span className="text-sm font-medium text-yellow-400 tracking-wide">
                    {labels[display]}
                </span>
            )}
        </div>
    );
}

export default function WriteReviewPage() {
    const { id } = useParams();  // restaurant id
    const navigate = useNavigate();

    const [restaurant, setRestaurant] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [photoFiles, setPhotoFiles] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restLoading, setRestLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        getRestaurant(id)
            .then(({ data }) => setRestaurant(data))
            .catch(() => setError('Could not load restaurant info.'))
            .finally(() => setRestLoading(false));
    }, [id]);

    const handlePhotoChange = (e) => {
        const files = Array.from(e.target.files);
        setPhotoFiles(files);
        setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
    };

    const removePhoto = (index) => {
        const updated = photoFiles.filter((_, i) => i !== index);
        setPhotoFiles(updated);
        setPhotoPreviews(updated.map((f) => URL.createObjectURL(f)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (rating === 0) {
            setError('Please select a star rating.');
            return;
        }
        setLoading(true);
        try {
            const { data: review } = await createReview(id, { rating, comment: comment.trim() || null });
            // Upload any attached photos sequentially
            for (const file of photoFiles) {
                await uploadReviewPhoto(review.id, file);
            }
            setSuccess(true);
            setTimeout(() => navigate(`/restaurants/${id}`), 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-xl mx-auto">

                {/* Back link */}
                <Link
                    to={`/restaurants/${id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to restaurant
                </Link>

                {/* Restaurant quick-info */}
                {!restLoading && restaurant && (
                    <div className="flex items-center gap-3 mb-6">
                        {restaurant.photos?.[0] ? (
                            <img
                                src={`${API_BASE}${restaurant.photos[0].photo_url}`}
                                alt={restaurant.name}
                                className="w-12 h-12 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/08 flex items-center justify-center text-white/20">
                                🍴
                            </div>
                        )}
                        <div>
                            <p className="text-white font-semibold">{restaurant.name}</p>
                            <p className="text-white/40 text-xs">{restaurant.cuisine_type} · {restaurant.city}</p>
                        </div>
                    </div>
                )}

                {/* Card */}
                <div className="glass-card p-7 space-y-6">
                    <div>
                        <h1 className="text-xl font-bold text-white mb-1">Write a Review</h1>
                        <p className="text-white/40 text-sm">Share your honest experience — it helps others decide.</p>
                    </div>

                    {success && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-4 text-sm text-center">
                            ✅ Review submitted! Redirecting…
                        </div>
                    )}
                    {error && <div className="error-badge">{error}</div>}

                    <form id="review-form" onSubmit={handleSubmit} className="space-y-5">
                        {/* Star rating */}
                        <div>
                            <label className="field-label mb-3">Your Rating *</label>
                            <StarPicker value={rating} onChange={setRating} />
                        </div>

                        {/* Comment */}
                        <div>
                            <label htmlFor="comment" className="field-label">Your Review</label>
                            <textarea
                                id="comment"
                                rows={5}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="What did you love (or not)? Food quality, service, ambiance…"
                                className="input-base resize-none leading-relaxed"
                            />
                            <p className="text-right text-xs text-white/25 mt-1">{comment.length} / 2000</p>
                        </div>

                        {/* Photo upload */}
                        <div>
                            <label className="field-label">Add Photos (optional)</label>
                            <label
                                htmlFor="photo-upload"
                                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/15 rounded-xl p-5 cursor-pointer hover:border-red-500/50 transition-colors"
                            >
                                <svg className="w-7 h-7 text-white/25" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                <span className="text-xs text-white/35">Click to upload JPEG, PNG or WebP · max 10 MB each</span>
                                <input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </label>

                            {photoPreviews.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {photoPreviews.map((src, i) => (
                                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                                            <img src={src} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(i)}
                                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            id="submit-review-btn"
                            type="submit"
                            disabled={loading || success}
                            className="btn-primary"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner" /> Submitting…
                                </span>
                            ) : 'Submit Review'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
