import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getOwnerReviews } from '../api/reviews';
import { searchRestaurants } from '../api/restaurants';
import { Link, useNavigate } from 'react-router-dom';

function StarRating({ rating }) {
    const r = rating ?? 0;
    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <svg
                    key={i}
                    className={`w-4 h-4 ${i <= Math.round(r) ? 'text-yellow-400' : 'text-white/15'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </span>
    );
}

export default function OwnerDashboardPage() {
    const user = useSelector((state) => state.auth.user);
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'analytics'
    const [reviews, setReviews] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters for reviews tab
    const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
    const [sortOrder, setSortOrder] = useState('date'); // 'date' or 'rating'

    useEffect(() => {
        if (!user || user.role !== 'owner') {
            navigate('/', { replace: true });
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch owned restaurants
                const resData = await searchRestaurants({ owner_id: user.id, limit: 100 });
                setRestaurants(resData.data);
                
                // Fetch all reviews for owned restaurants
                const revData = await getOwnerReviews({ sort: sortOrder });
                setReviews(revData.data);
            } catch (err) {
                setError(err.message || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, navigate]);

    // Apply filters and sort to reviews client-side or refetch
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const params = { sort: sortOrder };
                if (selectedRestaurantId) {
                    params.restaurant_id = selectedRestaurantId;
                }
                const { data } = await getOwnerReviews(params);
                setReviews(data);
            } catch (err) {
                console.error('Error fetching sorted reviews', err);
            }
        };
        fetchReviews();
    }, [sortOrder, selectedRestaurantId]);

    // Calculate Analytics
    const analytics = restaurants.map((r) => {
        const rReviews = reviews.filter((rev) => rev.restaurant_id === r.id);
        const distribution = [1, 2, 3, 4, 5].reduce((acc, star) => {
            acc[star] = rReviews.filter((rev) => rev.rating === star).length;
            return acc;
        }, {});

        return {
            ...r,
            total_reviews: rReviews.length,
            rating_distribution: distribution,
        };
    });

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8 text-center text-white/50">
                <span className="spinner mr-2" /> Loading Dashboard...
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="error-badge">{error}</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Owner Dashboard</h1>
                    <p className="text-white/50 mt-1 text-sm">Manage your restaurants and keep track of your performance.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 bg-white/04 p-1.5 rounded-xl w-max border border-white/06">
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        activeTab === 'reviews'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white/80'
                    }`}
                >
                    Reviews
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        activeTab === 'analytics'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-white/50 hover:text-white/80'
                    }`}
                >
                    Analytics
                </button>
            </div>

            {/* Content pane */}
            <div className="bg-white/05 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-xl">
                {activeTab === 'reviews' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="field-label mb-1">Filter by Restaurant</label>
                                <select
                                    value={selectedRestaurantId}
                                    onChange={(e) => setSelectedRestaurantId(e.target.value)}
                                    className="input-base"
                                >
                                    <option value="">All Restaurants</option>
                                    {restaurants.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="field-label mb-1">Sort By</label>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="input-base"
                                >
                                    <option value="date">Date (Newest First)</option>
                                    <option value="rating">Rating (Highest First)</option>
                                </select>
                            </div>
                        </div>

                        {reviews.length === 0 ? (
                            <div className="text-center py-10 text-white/40 bg-white/03 rounded-xl border border-white/05 font-medium">
                                No reviews found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-white/10">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/06 text-white/50 text-xs uppercase tracking-wider">
                                            <th className="px-4 py-3 font-semibold border-b border-white/10 whitespace-nowrap">Restaurant</th>
                                            <th className="px-4 py-3 font-semibold border-b border-white/10 whitespace-nowrap">Reviewer</th>
                                            <th className="px-4 py-3 font-semibold border-b border-white/10 whitespace-nowrap">Rating</th>
                                            <th className="px-4 py-3 font-semibold border-b border-white/10 min-w-[200px]">Comment</th>
                                            <th className="px-4 py-3 font-semibold border-b border-white/10 whitespace-nowrap whitespace-nowrap">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/06 text-sm">
                                        {reviews.map((rev) => (
                                            <tr key={rev.id} className="hover:bg-white/04 transition-colors">
                                                <td className="px-4 py-3 align-top whitespace-nowrap">
                                                    <Link to={`/restaurants/${rev.restaurant_id}`} className="text-red-400 hover:text-red-300 font-medium">
                                                        {rev.restaurant?.name || 'Unknown'}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-white/80 align-top whitespace-nowrap">{rev.user?.name || 'Anonymous'}</td>
                                                <td className="px-4 py-3 align-top whitespace-nowrap">
                                                    <StarRating rating={rev.rating} />
                                                </td>
                                                <td className="px-4 py-3 text-white/60 align-top max-w-sm xl:max-w-lg">
                                                    {rev.comment ? (
                                                        <div className="line-clamp-3 leading-relaxed">{rev.comment}</div>
                                                    ) : (
                                                        <span className="italic opacity-50">No comment</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-white/40 align-top whitespace-nowrap">
                                                    {new Date(rev.review_date).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-6">
                        {analytics.length === 0 ? (
                            <div className="text-center py-10 text-white/40 bg-white/03 rounded-xl border border-white/05 font-medium">
                                You don't own any restaurants yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {analytics.map((r) => (
                                    <div key={r.id} className="bg-black/30 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-white">
                                                    <Link to={`/restaurants/${r.id}`} className="hover:text-red-400 transition-colors">{r.name}</Link>
                                                </h3>
                                                <p className="text-white/50 text-xs font-medium uppercase tracking-widest mt-0.5">{r.city}, {r.state}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1.5 text-yellow-400 text-lg font-bold">
                                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    {r.avg_rating > 0 ? Number(r.avg_rating).toFixed(1) : 'No rating'}
                                                </div>
                                                <p className="text-white/40 text-xs">Overall average</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pb-4 border-b border-white/05">
                                            <div className="bg-white/05 rounded-lg p-3 text-center border border-white/05">
                                                <p className="text-2xl font-bold text-white mb-0.5">{r.view_count || 0}</p>
                                                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Total Views</p>
                                            </div>
                                            <div className="bg-white/05 rounded-lg p-3 text-center border border-white/05">
                                                <p className="text-2xl font-bold text-white mb-0.5">{r.total_reviews}</p>
                                                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Total Reviews</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Rating Distribution</h4>
                                            <div className="space-y-2">
                                                {[5, 4, 3, 2, 1].map((star) => {
                                                    const count = r.rating_distribution[star];
                                                    const percentage = r.total_reviews > 0 ? (count / r.total_reviews) * 100 : 0;
                                                    return (
                                                        <div key={star} className="flex items-center gap-3 text-sm">
                                                            <div className="flex items-center gap-1 w-8 shrink-0 text-white/60">
                                                                <span className="font-medium text-white/80">{star}</span>
                                                                <svg className="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-red-500 rounded-full transition-all duration-500 ease-out"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <div className="w-6 shrink-0 text-right text-xs text-white/60 font-medium">
                                                                {count}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
