import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Validation ──────────────────────────────────────────────────────────────

function validate(form) {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Full name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errors.email = 'Enter a valid email address';
    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 8)
        errors.password = 'Password must be at least 8 characters';
    if (form.confirm !== form.password) errors.confirm = 'Passwords do not match';
    return errors;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SignupPage() {
    const { signup, loading } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirm: '',
        // optional profile fields
        phone: '',
        about_me: '',
        city: '',
        state: '',
        country: '',
        languages: '',
        gender: '',
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [showOptional, setShowOptional] = useState(false);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
        setServerError('');
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const errors = validate(form);
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            return;
        }

        try {
            await signup(
                form.email,
                form.password,
                form.name,
                // optional fields — pass undefined if empty so they're omitted
                form.phone || undefined,
                form.about_me || undefined,
                form.city || undefined,
                form.state || undefined,
                form.country || undefined,
                form.languages || undefined,
                form.gender || undefined,
            );
            navigate('/', { replace: true });
        } catch (err) {
            setServerError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-red-600/20 blur-3xl" />
                <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-red-900/20 blur-3xl" />
            </div>

            <div className="glass-card w-full max-w-md p-8 relative z-10">
                {/* Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 mb-4 shadow-lg shadow-red-600/40">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
                    <p className="mt-1 text-sm text-white/50">Join to discover great restaurants</p>
                </div>

                {/* Server error */}
                {serverError && (
                    <div className="error-badge mb-5">
                        <span className="mr-1.5">⚠</span> {serverError}
                    </div>
                )}

                <form onSubmit={onSubmit} noValidate className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-1.5">
                            Full name
                        </label>
                        <input
                            id="name" name="name" type="text" autoComplete="name"
                            value={form.name} onChange={onChange} placeholder="Jane Doe"
                            className={`input-base ${fieldErrors.name ? 'input-error' : ''}`}
                        />
                        {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
                            Email address
                        </label>
                        <input
                            id="email" name="email" type="email" autoComplete="email"
                            value={form.email} onChange={onChange} placeholder="you@example.com"
                            className={`input-base ${fieldErrors.email ? 'input-error' : ''}`}
                        />
                        {fieldErrors.email && <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
                            Password
                        </label>
                        <input
                            id="password" name="password" type="password" autoComplete="new-password"
                            value={form.password} onChange={onChange} placeholder="Min 8 characters"
                            className={`input-base ${fieldErrors.password ? 'input-error' : ''}`}
                        />
                        {fieldErrors.password && <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label htmlFor="confirm" className="block text-sm font-medium text-white/70 mb-1.5">
                            Confirm password
                        </label>
                        <input
                            id="confirm" name="confirm" type="password" autoComplete="new-password"
                            value={form.confirm} onChange={onChange} placeholder="Re-enter password"
                            className={`input-base ${fieldErrors.confirm ? 'input-error' : ''}`}
                        />
                        {fieldErrors.confirm && <p className="mt-1 text-xs text-red-400">{fieldErrors.confirm}</p>}
                    </div>

                    {/* Optional profile fields toggle */}
                    <button
                        type="button"
                        onClick={() => setShowOptional((v) => !v)}
                        className="w-full text-left text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-1 pt-1"
                    >
                        <span>{showOptional ? '▾' : '▸'}</span>
                        {showOptional ? 'Hide' : 'Add'} optional profile details
                    </button>

                    {showOptional && (
                        <div className="space-y-4 pt-1">
                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-white/70 mb-1.5">
                                    Phone <span className="text-white/30">(optional)</span>
                                </label>
                                <input
                                    id="phone" name="phone" type="tel"
                                    value={form.phone} onChange={onChange} placeholder="+1 (555) 000-0000"
                                    className="input-base"
                                />
                            </div>

                            {/* City + State row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="city" className="block text-sm font-medium text-white/70 mb-1.5">
                                        City
                                    </label>
                                    <input
                                        id="city" name="city" type="text"
                                        value={form.city} onChange={onChange} placeholder="San Francisco"
                                        className="input-base"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="state" className="block text-sm font-medium text-white/70 mb-1.5">
                                        State
                                    </label>
                                    <input
                                        id="state" name="state" type="text" maxLength={2}
                                        value={form.state} onChange={onChange} placeholder="CA"
                                        className="input-base uppercase"
                                    />
                                </div>
                            </div>

                            {/* Country */}
                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-white/70 mb-1.5">
                                    Country
                                </label>
                                <select
                                    id="country" name="country"
                                    value={form.country} onChange={onChange}
                                    className="input-base"
                                >
                                    <option value="">Select country…</option>
                                    <option value="US">United States</option>
                                    <option value="CA">Canada</option>
                                    <option value="GB">United Kingdom</option>
                                    <option value="AU">Australia</option>
                                    <option value="IN">India</option>
                                    <option value="DE">Germany</option>
                                    <option value="FR">France</option>
                                    <option value="MX">Mexico</option>
                                    <option value="JP">Japan</option>
                                    <option value="CN">China</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Gender */}
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-white/70 mb-1.5">
                                    Gender
                                </label>
                                <select
                                    id="gender" name="gender"
                                    value={form.gender} onChange={onChange}
                                    className="input-base"
                                >
                                    <option value="">Prefer not to say</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Non-binary">Non-binary</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Languages */}
                            <div>
                                <label htmlFor="languages" className="block text-sm font-medium text-white/70 mb-1.5">
                                    Languages <span className="text-white/30">(comma-separated)</span>
                                </label>
                                <input
                                    id="languages" name="languages" type="text"
                                    value={form.languages} onChange={onChange} placeholder="English, Spanish"
                                    className="input-base"
                                />
                            </div>

                            {/* About Me */}
                            <div>
                                <label htmlFor="about_me" className="block text-sm font-medium text-white/70 mb-1.5">
                                    About me
                                </label>
                                <textarea
                                    id="about_me" name="about_me" rows={3}
                                    value={form.about_me} onChange={onChange}
                                    placeholder="Tell us a bit about yourself…"
                                    className="input-base resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button type="submit" disabled={loading} className="btn-primary mt-2">
                        {loading ? (
                            <span><span className="spinner mr-2" />Creating account…</span>
                        ) : (
                            'Create account'
                        )}
                    </button>
                </form>

                <div className="divider my-6">or</div>

                <p className="text-center text-sm text-white/40">
                    Already have an account?{' '}
                    <Link to="/login" className="text-red-400 font-medium hover:text-red-300 transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
