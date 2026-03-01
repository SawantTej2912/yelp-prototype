import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { searchRestaurants } from '../api/restaurants';
import RestaurantCard from '../components/RestaurantCard';

const CUISINES = ['All', 'American', 'Italian', 'Japanese', 'Mexican', 'Indian', 'Thai', 'Chinese', 'Mediterranean'];
const PRICES = ['Any', '$', '$$', '$$$', '$$$$'];
const SORTS = [
    { value: 'rating', label: '⭐ Top rated' },
    { value: 'review_count', label: '🔥 Most reviewed' },
    { value: 'newest', label: '🆕 Newest' },
];

export default function ExplorePage() {
    const [query, setQuery] = useState('');
    const [city, setCity] = useState('');
    const [cuisine, setCuisine] = useState('All');
    const [price, setPrice] = useState('Any');
    const [sort, setSort] = useState('rating');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searched, setSearched] = useState(false);

    const doSearch = useCallback(async (params) => {
        setLoading(true);
        try {
            const { data } = await searchRestaurants(params);
            setResults(data);
            setSearched(true);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load — show all restaurants
    useEffect(() => { doSearch({ sort: 'rating', limit: 20 }); }, [doSearch]);

    const onSearch = (e) => {
        e.preventDefault();
        const params = { sort, limit: 20 };
        if (query.trim()) params.q = query.trim();
        if (city.trim()) params.city = city.trim();
        if (cuisine !== 'All') params.cuisine = cuisine;
        if (price !== 'Any') params.pricing_tier = price;
        doSearch(params);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">

            {/* ── Hero search bar ── */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-1">Discover Restaurants</h1>
                <p className="text-white/40 text-sm mb-6">Find your next favourite spot</p>

                <form onSubmit={onSearch} className="glass-card p-4 flex flex-col sm:flex-row gap-3">
                    {/* Keyword */}
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="burger, sushi, romantic…"
                            className="input-base pl-9"
                        />
                    </div>
                    {/* City */}
                    <div className="relative sm:w-48">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        </svg>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City or zip…"
                            className="input-base pl-9"
                        />
                    </div>
                    <button type="submit" className="btn-primary sm:w-28">Search</button>
                </form>
            </div>

            {/* ── Filters row ── */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                {/* Cuisine chips */}
                <div className="flex flex-wrap gap-1.5">
                    {CUISINES.map((c) => (
                        <button
                            key={c}
                            onClick={() => { setCuisine(c); }}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${cuisine === c
                                    ? 'bg-red-600 border-red-600 text-white'
                                    : 'bg-white/04 border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-white/10 hidden sm:block" />

                {/* Price chips */}
                <div className="flex gap-1.5">
                    {PRICES.map((p) => (
                        <button
                            key={p}
                            onClick={() => setPrice(p)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${price === p
                                    ? 'bg-red-600 border-red-600 text-white'
                                    : 'bg-white/04 border-white/10 text-white/60 hover:border-white/25'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <div className="ml-auto flex items-center gap-2 text-sm text-white/40">
                    <span>Sort:</span>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="bg-white/06 border border-white/12 text-white/80 text-xs rounded-lg px-2 py-1.5 outline-none"
                    >
                        {SORTS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Add restaurant CTA ── */}
            <div className="flex items-center justify-between mb-5">
                <p className="text-white/40 text-sm">
                    {loading ? 'Searching…' : `${results.length} restaurant${results.length !== 1 ? 's' : ''} found`}
                </p>
                <Link
                    to="/restaurants/new"
                    className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 border border-red-600/30 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition-all"
                >
                    <span className="text-lg leading-none">+</span> Add Restaurant
                </Link>
            </div>

            {/* ── Results grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="glass-card h-64 animate-pulse">
                            <div className="h-44 bg-white/05 rounded-t-xl" />
                            <div className="p-4 space-y-2">
                                <div className="h-3 bg-white/08 rounded w-3/4" />
                                <div className="h-2 bg-white/05 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : results.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-4xl mb-3">🍽</p>
                    <p className="text-white/40 text-lg font-medium">No restaurants found</p>
                    <p className="text-white/25 text-sm mt-1">Try adjusting your filters or search terms</p>
                    <Link to="/restaurants/new" className="inline-block mt-5 btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>
                        Add the first one
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {results.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
                </div>
            )}
        </div>
    );
}
