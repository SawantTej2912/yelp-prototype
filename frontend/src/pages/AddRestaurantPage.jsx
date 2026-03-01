import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRestaurant, uploadRestaurantPhoto } from '../api/restaurants';

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

export default function AddRestaurantPage() {
    const navigate = useNavigate();
    const photoInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '', cuisine_type: '', address: '', city: '', state: '', zip: '',
        description: '', contact_info: '', hours: '', pricing_tier: '',
        amenities: [],
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
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

    const onPhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Restaurant name is required'); return; }

        setSaving(true);
        setError('');

        try {
            const payload = Object.fromEntries(
                Object.entries(form).filter(([, v]) =>
                    v !== '' && !(Array.isArray(v) && v.length === 0)
                )
            );
            const { data: created } = await createRestaurant(payload);

            // Upload photo if one was selected
            if (photoFile) {
                await uploadRestaurantPhoto(created.id, photoFile);
            }

            navigate(`/restaurants/${created.id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold text-white mb-1">Add a Restaurant</h1>
            <p className="text-white/40 text-sm mb-8">Share a great spot with the community</p>

            {error && <div className="error-badge mb-5"><span className="mr-1.5">⚠</span>{error}</div>}

            <form onSubmit={onSubmit} className="space-y-6">

                {/* ── Cover photo ── */}
                <div className="glass-card p-5">
                    <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Cover Photo</h2>
                    <div
                        onClick={() => photoInputRef.current?.click()}
                        className={`relative h-44 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden ${photoPreview ? 'border-transparent' : 'border-white/15 hover:border-red-600/50'
                            }`}
                    >
                        {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center">
                                <p className="text-3xl mb-2">📷</p>
                                <p className="text-white/40 text-sm">Click to upload a photo</p>
                                <p className="text-white/25 text-xs mt-1">JPEG, PNG, WebP · max 10 MB</p>
                            </div>
                        )}
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoSelect} className="hidden" />
                    {photoPreview && (
                        <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                            className="mt-2 text-xs text-white/35 hover:text-red-400 transition-colors">
                            Remove photo
                        </button>
                    )}
                </div>

                {/* ── Basic info ── */}
                <div className="glass-card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Basic Info</h2>

                    <div>
                        <label className="field-label">Restaurant name <span className="text-red-500">*</span></label>
                        <input name="name" value={form.name} onChange={onChange} placeholder="e.g. Golden Gate Grill" className="input-base" />
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
                                {['$', '$$', '$$$', '$$$$'].map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="field-label">Description</label>
                        <textarea name="description" rows={3} value={form.description} onChange={onChange}
                            placeholder="What makes this place special?" className="input-base resize-none" />
                    </div>
                </div>

                {/* ── Location ── */}
                <div className="glass-card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Location</h2>

                    <div>
                        <label className="field-label">Street address</label>
                        <input name="address" value={form.address} onChange={onChange} placeholder="123 Main St" className="input-base" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="field-label">City</label>
                            <input name="city" value={form.city} onChange={onChange} placeholder="San Francisco" className="input-base" />
                        </div>
                        <div>
                            <label className="field-label">State</label>
                            <input name="state" value={form.state} onChange={onChange} placeholder="CA" maxLength={2} className="input-base uppercase" />
                        </div>
                        <div>
                            <label className="field-label">ZIP</label>
                            <input name="zip" value={form.zip} onChange={onChange} placeholder="94102" className="input-base" />
                        </div>
                    </div>
                </div>

                {/* ── Contact & hours ── */}
                <div className="glass-card p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Contact & Hours</h2>

                    <div>
                        <label className="field-label">Contact info</label>
                        <input name="contact_info" value={form.contact_info} onChange={onChange}
                            placeholder="(415) 555-0100 or info@restaurant.com" className="input-base" />
                    </div>

                    <div>
                        <label className="field-label">Hours of operation</label>
                        <input name="hours" value={form.hours} onChange={onChange}
                            placeholder="Mon–Fri 11am–10pm, Sat–Sun 10am–11pm" className="input-base" />
                    </div>
                </div>

                {/* ── Amenities ── */}
                <div className="glass-card p-5">
                    <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Amenities</h2>
                    <div className="flex flex-wrap gap-2">
                        {AMENITY_OPTIONS.map((a) => (
                            <button
                                key={a} type="button" onClick={() => toggleAmenity(a)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${form.amenities.includes(a)
                                        ? 'bg-red-600 border-red-600 text-white'
                                        : 'bg-white/04 border-white/10 text-white/60 hover:border-white/25'
                                    }`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Submit ── */}
                <div className="flex gap-3">
                    <button
                        type="button" onClick={() => navigate(-1)}
                        className="flex-1 py-3 rounded-xl border border-white/12 text-white/50 hover:text-white hover:border-white/25 transition-all text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary flex-1">
                        {saving ? <span><span className="spinner mr-2" />Adding…</span> : 'Add Restaurant'}
                    </button>
                </div>
            </form>
        </div>
    );
}
