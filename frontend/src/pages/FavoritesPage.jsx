import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../api/reviews';

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

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(null); // restaurant_id being removed
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const loadFavorites = () => {
        setLoading(true);
        getFavorites()
            .then(({ data }) => setFavorites(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadFavorites();
    }, []);

    const handleRemove = async (restaurantId) => {
        setRemoving(restaurantId);
        try {
            await removeFavorite(restaurantId);
            setFavorites((prev) => prev.filter((f) => f.restaurant_id !== restaurantId));
        } catch (err) {
            setError(err.message);
        } finally {
            setRemoving(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">My Favorites</h1>
                    <p className="text-white/40 text-sm mt-0.5">
                        {favorites.length > 0 ? `${favorites.length} saved restaurant${favorites.length !== 1 ? 's' : ''}` : 'No favorites yet'}
                    </p>
                </div>
                <Link to="/" className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium">
                    + Explore More
                </Link>
            </div>

            {error && <div className="error-badge mb-4">{error}</div>}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass-card p-4 h-24 rounded-2xl bg-white/04" />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && favorites.length === 0 && (
                <div className="glass-card p-14 text-center">
                    <div className="text-5xl mb-4">🤍</div>
                    <p className="text-white font-semibold text-lg mb-2">No favorites saved yet</p>
                    <p className="text-white/40 text-sm mb-6">
                        Browse restaurants and tap the heart icon to save them here.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="btn-primary"
                        style={{ width: 'auto', padding: '0.65rem 1.5rem' }}
                    >
                        Start Exploring
                    </button>
                </div>
            )}

            {/* Favorites list */}
            {!loading && favorites.length > 0 && (
                <div className="space-y-3">
                    {favorites.map((fav) => (
                        <div
                            key={fav.restaurant_id}
                            className="glass-card p-4 flex items-center gap-4 group hover:border-white/15 transition-colors"
                        >
                            {/* Cover image */}
                            <Link to={`/restaurants/${fav.restaurant_id}`} className="shrink-0">
                                {fav.restaurant_cover ? (
                                    <img
                                        src={`${BACKEND}${fav.restaurant_cover}`}
                                        alt={fav.restaurant_name}
                                        className="w-16 h-16 rounded-xl object-cover"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-white/08 flex items-center justify-center text-2xl">
                                        🍴
                                    </div>
                                )}
                            </Link>

                            {/* Info */}
                            <Link to={`/restaurants/${fav.restaurant_id}`} className="flex-1 min-w-0">
                                <p className="text-white font-semibold truncate group-hover:text-red-400 transition-colors">
                                    {fav.restaurant_name ?? 'Unknown restaurant'}
                                </p>
                                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-0.5">
                                    {fav.restaurant_cuisine && (
                                        <span className="text-xs text-white/40">{fav.restaurant_cuisine}</span>
                                    )}
                                    {fav.restaurant_city && (
                                        <span className="text-xs text-white/40">📍 {fav.restaurant_city}</span>
                                    )}
                                    {fav.restaurant_rating != null && fav.restaurant_rating > 0 && (
                                        <span className="flex items-center gap-1">
                                            <StarRow rating={fav.restaurant_rating} />
                                            <span className="text-xs text-white/50">
                                                {Number(fav.restaurant_rating).toFixed(1)}
                                            </span>
                                        </span>
                                    )}
                                </div>
                                {fav.created_at && (
                                    <p className="text-xs text-white/25 mt-1">
                                        Saved {new Date(fav.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                )}
                            </Link>

                            {/* Remove button */}
                            <button
                                id={`remove-fav-${fav.restaurant_id}`}
                                onClick={() => handleRemove(fav.restaurant_id)}
                                disabled={removing === fav.restaurant_id}
                                title="Remove from favorites"
                                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                            >
                                {removing === fav.restaurant_id ? (
                                    <span className="spinner" />
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
