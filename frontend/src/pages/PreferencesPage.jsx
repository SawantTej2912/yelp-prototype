import { useState, useEffect } from 'react';
import { getPreferences, updatePreferences } from '../api/users';

// ─── Option data ─────────────────────────────────────────────────────────────

const CUISINES = [
    'American', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian',
    'Thai', 'Mediterranean', 'French', 'Greek', 'Korean', 'Vietnamese',
    'Middle Eastern', 'Spanish', 'Caribbean', 'Ethiopian', 'Other',
];

const DIETARY = [
    'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher',
    'Dairy-free', 'Nut-free', 'Paleo', 'Keto', 'None',
];

const AMBIANCE = [
    'Casual', 'Fine Dining', 'Family-friendly', 'Romantic', 'Outdoor Seating',
    'Trendy', 'Quiet', 'Lively', 'Sports Bar', 'Rooftop',
];

const PRICE_OPTIONS = [
    { value: '$', label: '$ — Cheap eats', desc: 'Under $15 per person' },
    { value: '$$', label: '$$ — Mid-range', desc: '$15–$35 per person' },
    { value: '$$$', label: '$$$ — Upscale', desc: '$35–$60 per person' },
    { value: '$$$$', label: '$$$$ — Fine dining', desc: 'Over $60 per person' },
];

const SORT_OPTIONS = [
    { value: 'rating', label: '⭐ Best rated' },
    { value: 'distance', label: '📍 Closest' },
    { value: 'popularity', label: '🔥 Most popular' },
    { value: 'price', label: '💰 Lowest price' },
];

// ─── Toggle chip ─────────────────────────────────────────────────────────────

function Chip({ label, selected, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selected
                    ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/25'
                    : 'bg-white/04 border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                }`}
        >
            {label}
        </button>
    );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }) {
    return (
        <div className="glass-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {children}
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PreferencesPage() {
    const [prefs, setPrefs] = useState({
        cuisine_prefs: [],
        price_range: '',
        dietary_needs: [],
        ambiance_prefs: [],
        preferred_location: '',
        search_radius: 10,
        sort_preference: 'rating',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        getPreferences()
            .then(({ data }) => {
                setPrefs({
                    cuisine_prefs: data.cuisine_prefs ?? [],
                    price_range: data.price_range ?? '',
                    dietary_needs: data.dietary_needs ?? [],
                    ambiance_prefs: data.ambiance_prefs ?? [],
                    preferred_location: data.preferred_location ?? '',
                    search_radius: data.search_radius ?? 10,
                    sort_preference: data.sort_preference ?? 'rating',
                });
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    // Toggle an item in a list preference
    const toggleItem = (key, item) => {
        setPrefs((prev) => {
            const list = prev[key] ?? [];
            return {
                ...prev,
                [key]: list.includes(item)
                    ? list.filter((i) => i !== item)
                    : [...list, item],
            };
        });
        setSuccess('');
        setError('');
    };

    const onSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await updatePreferences(prefs);
            setSuccess('Preferences saved! The AI assistant will use these for recommendations.');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1">My Preferences</h1>
                <p className="text-white/40 text-sm">
                    These preferences are used by the AI assistant to personalise restaurant recommendations.
                </p>
            </div>

            {error && <div className="error-badge"><span className="mr-1.5">⚠</span>{error}</div>}
            {success && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 text-sm">
                    ✓ {success}
                </div>
            )}

            {/* ── Cuisine ── */}
            <Section title="🍽 Cuisine preferences">
                <div className="flex flex-wrap gap-2">
                    {CUISINES.map((c) => (
                        <Chip
                            key={c} label={c}
                            selected={prefs.cuisine_prefs.includes(c)}
                            onToggle={() => toggleItem('cuisine_prefs', c)}
                        />
                    ))}
                </div>
            </Section>

            {/* ── Price range ── */}
            <Section title="💰 Price range">
                <div className="grid grid-cols-2 gap-3">
                    {PRICE_OPTIONS.map(({ value, label, desc }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => { setPrefs((p) => ({ ...p, price_range: value })); setSuccess(''); }}
                            className={`text-left p-3 rounded-xl border transition-all ${prefs.price_range === value
                                    ? 'bg-red-600/15 border-red-600/50 text-white'
                                    : 'bg-white/04 border-white/08 text-white/60 hover:border-white/20'
                                }`}
                        >
                            <p className="font-semibold text-sm">{label}</p>
                            <p className="text-xs opacity-60 mt-0.5">{desc}</p>
                        </button>
                    ))}
                </div>
            </Section>

            {/* ── Dietary needs ── */}
            <Section title="🥗 Dietary needs">
                <div className="flex flex-wrap gap-2">
                    {DIETARY.map((d) => (
                        <Chip
                            key={d} label={d}
                            selected={prefs.dietary_needs.includes(d)}
                            onToggle={() => toggleItem('dietary_needs', d)}
                        />
                    ))}
                </div>
            </Section>

            {/* ── Ambiance ── */}
            <Section title="✨ Ambiance preferences">
                <div className="flex flex-wrap gap-2">
                    {AMBIANCE.map((a) => (
                        <Chip
                            key={a} label={a}
                            selected={prefs.ambiance_prefs.includes(a)}
                            onToggle={() => toggleItem('ambiance_prefs', a)}
                        />
                    ))}
                </div>
            </Section>

            {/* ── Location + Radius ── */}
            <Section title="📍 Location & search radius">
                <div>
                    <label className="block text-sm text-white/60 mb-1.5">Preferred location</label>
                    <input
                        type="text"
                        value={prefs.preferred_location}
                        onChange={(e) => { setPrefs((p) => ({ ...p, preferred_location: e.target.value })); setSuccess(''); }}
                        placeholder="e.g. San Francisco, CA"
                        className="input-base"
                    />
                </div>
                <div>
                    <label className="block text-sm text-white/60 mb-1.5">
                        Search radius: <span className="text-white font-semibold">{prefs.search_radius} mi</span>
                    </label>
                    <input
                        type="range" min={1} max={50} step={1}
                        value={prefs.search_radius}
                        onChange={(e) => { setPrefs((p) => ({ ...p, search_radius: Number(e.target.value) })); setSuccess(''); }}
                        className="w-full accent-red-500"
                    />
                    <div className="flex justify-between text-xs text-white/25 mt-1">
                        <span>1 mi</span><span>25 mi</span><span>50 mi</span>
                    </div>
                </div>
            </Section>

            {/* ── Sort preference ── */}
            <Section title="🔃 Default sort order">
                <div className="grid grid-cols-2 gap-3">
                    {SORT_OPTIONS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => { setPrefs((p) => ({ ...p, sort_preference: value })); setSuccess(''); }}
                            className={`text-left p-3 rounded-xl border text-sm font-medium transition-all ${prefs.sort_preference === value
                                    ? 'bg-red-600/15 border-red-600/50 text-white'
                                    : 'bg-white/04 border-white/08 text-white/60 hover:border-white/20'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </Section>

            {/* ── Save button ── */}
            <button onClick={onSave} disabled={saving} className="btn-primary">
                {saving ? <span><span className="spinner mr-2" />Saving…</span> : 'Save preferences'}
            </button>
        </div>
    );
}
