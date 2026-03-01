import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getRestaurant } from '../api/restaurants';

const BACKEND = 'http://localhost:8000';

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

export default function RestaurantDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activePhoto, setActivePhoto] = useState(0);

    useEffect(() => {
        getRestaurant(id)
            .then(({ data }) => setRestaurant(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

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
                        <img
                            src={`${BACKEND}${photos[activePhoto].photo_url}`}
                            alt={r.name}
                            className="w-full h-full object-cover"
                        />
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

                {/* Thumbnail strip */}
                {photos.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto">
                        {photos.map((p, i) => (
                            <button
                                key={p.id}
                                onClick={() => setActivePhoto(i)}
                                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activePhoto ? 'border-red-500' : 'border-transparent opacity-60 hover:opacity-90'
                                    }`}
                            >
                                <img src={`${BACKEND}${p.photo_url}`} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Header ── */}
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

                <Link
                    to={`/restaurants/${r.id}/review`}
                    className="shrink-0 btn-primary"
                    style={{ width: 'auto', padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
                >
                    ✍ Write a Review
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ── Left: description + amenities ── */}
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
                                    <span key={a} className="bg-white/06 border border-white/10 text-white/60 text-xs px-3 py-1 rounded-full">
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reviews placeholder — Phase 5 */}
                    <div className="glass-card p-5">
                        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Reviews</h2>
                        <p className="text-white/30 text-sm">Reviews coming in Phase 5 — be the first to write one!</p>
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
        </div>
    );
}
