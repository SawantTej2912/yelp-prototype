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
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={onChange}
                            placeholder="••••••••"
                            className={`input-base ${fieldErrors.password ? 'input-error' : ''}`}
                        />
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
