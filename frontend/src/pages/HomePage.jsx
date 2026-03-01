import { useAuth } from '../context/AuthContext';

export default function HomePage() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
            <div className="glass-card p-10 text-center max-w-md w-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 mb-5 shadow-lg shadow-red-600/40">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1">Welcome, {user?.name}! 🎉</h1>
                <p className="text-white/50 text-sm mb-6">You are successfully authenticated.</p>
                <p className="text-white/30 text-xs mb-8">
                    Phase 2 complete — restaurant discovery features coming next.
                </p>
                <button
                    onClick={logout}
                    className="btn-primary"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}
