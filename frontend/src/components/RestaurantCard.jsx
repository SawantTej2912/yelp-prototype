import { Link } from 'react-router-dom';

const BACKEND = 'http://localhost:8000';

const CUISINE_COLORS = {
    American: 'bg-blue-500/15 text-blue-400',
    Italian: 'bg-green-500/15 text-green-400',
    Japanese: 'bg-pink-500/15 text-pink-400',
    Mexican: 'bg-orange-500/15 text-orange-400',
    Indian: 'bg-yellow-500/15 text-yellow-400',
    Thai: 'bg-purple-500/15 text-purple-400',
    Chinese: 'bg-red-500/15 text-red-400',
    Mediterranean: 'bg-teal-500/15 text-teal-400',
};

function StarRating({ rating }) {
    const r = Math.round((rating ?? 0) * 2) / 2;
    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} className={`w-3.5 h-3.5 ${i <= r ? 'text-yellow-400' : 'text-white/15'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </span>
    );
}

export default function RestaurantCard({ restaurant }) {
    const { id, name, cuisine_type, city, state, pricing_tier, avg_rating, review_count, cover_photo } = restaurant;
    const cuisineColor = CUISINE_COLORS[cuisine_type] ?? 'bg-white/10 text-white/50';
    const rating = avg_rating ?? 0;

    return (
        <Link
            to={`/restaurants/${id}`}
            className="group block glass-card overflow-hidden hover:border-white/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30"
        >
            {/* Photo */}
            <div className="relative h-44 bg-gradient-to-br from-white/05 to-white/02 overflow-hidden">
                {cover_photo ? (
                    <img
                        src={`${BACKEND}${cover_photo}`}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                        </svg>
                    </div>
                )}
                {/* Pricing badge */}
                {pricing_tier && (
                    <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white/90 text-xs font-bold px-2 py-0.5 rounded-lg">
                        {pricing_tier}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
                <h3 className="font-semibold text-white text-base leading-snug group-hover:text-red-300 transition-colors line-clamp-1">
                    {name}
                </h3>

                {cuisine_type && (
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cuisineColor}`}>
                        {cuisine_type}
                    </span>
                )}

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                        <StarRating rating={rating} />
                        <span className="text-xs font-semibold text-white/80">{rating > 0 ? rating.toFixed(1) : '—'}</span>
                        {review_count > 0 && (
                            <span className="text-xs text-white/35">({review_count})</span>
                        )}
                    </div>
                    {(city || state) && (
                        <span className="text-xs text-white/35 truncate max-w-[100px]">
                            {[city, state].filter(Boolean).join(', ')}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
