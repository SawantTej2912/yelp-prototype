import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, uploadProfilePicture } from '../api/users';

const BACKEND = 'http://localhost:8000';

const COUNTRIES = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'India',
    'Germany', 'France', 'Mexico', 'Japan', 'China', 'Brazil', 'Spain',
    'Italy', 'South Korea', 'Netherlands', 'Sweden', 'Norway', 'Denmark',
    'Singapore', 'New Zealand', 'Other',
];

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];

export default function ProfilePage() {
    const { user, saveSession, token } = useAuth();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '', email: '', phone: '', about_me: '',
        city: '', state: '', country: '', languages: '', gender: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [picPreview, setPicPreview] = useState(null);

    // Fetch fresh profile on mount
    useEffect(() => {
        getProfile()
            .then(({ data }) => {
                setForm({
                    name: data.name ?? '',
                    email: data.email ?? '',
                    phone: data.phone ?? '',
                    about_me: data.about_me ?? '',
                    city: data.city ?? '',
                    state: data.state ?? '',
                    country: data.country ?? '',
                    languages: data.languages ?? '',
                    gender: data.gender ?? '',
                });
                setProfilePic(data.profile_pic);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setSuccess('');
        setError('');
    };

    // ─── Profile picture selection ────────────────────────────────────────────

    const onFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPicPreview(URL.createObjectURL(file));
        handleUploadPic(file);
    };

    const handleUploadPic = async (file) => {
        setUploadingPic(true);
        setError('');
        try {
            const { data } = await uploadProfilePicture(file);
            setProfilePic(data.profile_pic);
            setSuccess('Profile picture updated!');
        } catch (err) {
            setError(err.message);
            setPicPreview(null);
        } finally {
            setUploadingPic(false);
        }
    };

    // ─── Save profile ────────────────────────────────────────────────────────

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('Name is required'); return; }

        setSaving(true);
        setError('');
        setSuccess('');

        // Build payload — omit empty strings so backend treats them as unchanged
        const payload = Object.fromEntries(
            Object.entries(form).filter(([, v]) => v !== '')
        );

        try {
            await updateProfile(payload);
            setSuccess('Profile saved successfully!');
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

    const avatarSrc = picPreview
        ? picPreview
        : profilePic
            ? `${BACKEND}${profilePic}`
            : null;

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold text-white mb-1">My Profile</h1>
            <p className="text-white/40 text-sm mb-8">Manage your personal information</p>

            {/* ── Avatar section ── */}
            <div className="glass-card p-6 mb-6 flex items-center gap-5">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-red-600/20 border border-white/10 flex items-center justify-center">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-bold text-red-400">
                                {form.name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                        )}
                    </div>
                    {uploadingPic && (
                        <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                            <span className="spinner" />
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-white font-semibold">{form.name || 'Your name'}</p>
                    <p className="text-white/40 text-xs mb-3">{form.email}</p>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPic}
                        className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors border border-red-600/30 hover:border-red-500/50 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                        {uploadingPic ? 'Uploading…' : 'Change photo'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={onFileSelect}
                        className="hidden"
                    />
                    <p className="text-white/25 text-xs mt-1.5">JPEG, PNG, WebP · max 5 MB</p>
                </div>
            </div>

            {/* ── Profile form ── */}
            <div className="glass-card p-6">
                {error && <div className="error-badge mb-5"><span className="mr-1.5">⚠</span>{error}</div>}
                {success && (
                    <div className="mb-5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-4 py-3 text-sm">
                        ✓ {success}
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-5">

                    {/* Name + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="field-label">Full name <span className="text-red-500">*</span></label>
                            <input name="name" value={form.name} onChange={onChange} placeholder="Jane Doe" className="input-base" />
                        </div>
                        <div>
                            <label className="field-label">Email address</label>
                            <input name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" className="input-base" />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="field-label">Phone number</label>
                        <input name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="+1 (555) 000-0000" className="input-base" />
                    </div>

                    {/* City + State */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="field-label">City</label>
                            <input name="city" value={form.city} onChange={onChange} placeholder="San Francisco" className="input-base" />
                        </div>
                        <div>
                            <label className="field-label">State <span className="text-white/30">(abbreviated)</span></label>
                            <input name="state" value={form.state} onChange={onChange} placeholder="CA" maxLength={2} className="input-base uppercase" />
                        </div>
                    </div>

                    {/* Country + Gender */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="field-label">Country</label>
                            <select name="country" value={form.country} onChange={onChange} className="input-base">
                                <option value="">Select country…</option>
                                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="field-label">Gender</label>
                            <select name="gender" value={form.gender} onChange={onChange} className="input-base">
                                <option value="">Prefer not to say</option>
                                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Languages */}
                    <div>
                        <label className="field-label">Languages <span className="text-white/30">(comma-separated)</span></label>
                        <input name="languages" value={form.languages} onChange={onChange} placeholder="English, Spanish, Mandarin" className="input-base" />
                    </div>

                    {/* About Me */}
                    <div>
                        <label className="field-label">About me</label>
                        <textarea
                            name="about_me" rows={4} value={form.about_me} onChange={onChange}
                            placeholder="Tell the community a bit about yourself…"
                            className="input-base resize-none"
                        />
                    </div>

                    <button type="submit" disabled={saving} className="btn-primary">
                        {saving ? <span><span className="spinner mr-2" />Saving…</span> : 'Save profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
