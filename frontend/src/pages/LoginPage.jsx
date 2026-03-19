import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Field-level validation ───────────────────────────────────────────────────

function validate(email, password) {
    const errors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    return errors;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
    const { login, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname ?? '/';

    const [form, setForm] = useState({ email: '', password: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
        setServerError('');
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const errors = validate(form.email, form.password);
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            return;
        }

        try {
            await login(form.email, form.password);
            navigate(from, { replace: true });
        } catch (err) {
            setServerError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-red-600/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-red-900/20 blur-3xl" />
            </div>

            <div className="glass-card w-full max-w-md p-8 relative z-10">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 mb-4 shadow-lg shadow-red-600/40">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
                    <p className="mt-1 text-sm text-white/50">Sign in to your Yelp account</p>
                </div>

                {/* Server error */}
                {serverError && (
                    <div className="error-badge mb-5">
                        <span className="mr-1.5">⚠</span> {serverError}
                    </div>
                )}

                <form onSubmit={onSubmit} noValidate className="space-y-5">
                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={onChange}
                            placeholder="you@example.com"
                            className={`input-base ${fieldErrors.email ? 'input-error' : ''}`}
                        />
                        {fieldErrors.email && (
                            <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={form.password}
                                onChange={onChange}
                                placeholder="••••••••"
                                className={`input-base pr-11 ${fieldErrors.password ? 'input-error' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg border border-white/10 bg-white/05 hover:bg-white/08 text-white/60 hover:text-white transition-colors flex items-center justify-center"
                                title={showPassword ? 'Hide password' : 'Show password'}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.477 10.48a3 3 0 104.243 4.243M9.88 5.09A9.956 9.956 0 0112 5c5.523 0 10 5 10 7 0 .72-.27 1.56-.76 2.43M6.23 6.23C3.86 7.94 2 10.17 2 12c0 2 4.477 7 10 7 1.5 0 2.92-.27 4.19-.73" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 110-6 3 3 0 010 6z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {fieldErrors.password && (
                            <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
                        )}
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={loading} className="btn-primary mt-2">
                        {loading ? (
                            <span><span className="spinner mr-2" />Signing in…</span>
                        ) : (
                            'Sign in'
                        )}
                    </button>
                </form>

                <div className="divider my-6">or</div>

                <p className="text-center text-sm text-white/40">
                    Don&apos;t have an account?{' '}
                    <Link to="/signup" className="text-red-400 font-medium hover:text-red-300 transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
