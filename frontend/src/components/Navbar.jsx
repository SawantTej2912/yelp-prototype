import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BACKEND = 'http://localhost:8000';

export default function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const navLink = (to, label) => (
        <Link
            to={to}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isActive(to)
                ? 'bg-red-600/20 text-red-400'
                : 'text-white/60 hover:text-white hover:bg-white/08'
                }`}
        >
            {label}
        </Link>
    );

    return (
        <nav className="sticky top-0 z-50 border-b border-white/08 bg-black/60 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 shrink-0">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-600 shadow-md shadow-red-600/30">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                        </svg>
                    </span>
                    <span className="font-bold text-white text-base tracking-tight">Yelp<span className="text-red-500">·</span></span>
                </Link>

                {/* Nav links */}
                {isAuthenticated && (
                    <div className="flex items-center gap-1">
                        {navLink('/', 'Explore')}
                        {navLink('/profile', 'Profile')}
                        {navLink('/preferences', 'Preferences')}
                    </div>
                )}

                {/* Right: user avatar + logout */}
                {isAuthenticated ? (
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:block text-xs text-white/40 max-w-[120px] truncate">
                            {user?.name}
                        </span>
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-red-600/30 flex items-center justify-center border border-white/10">
                            {user?.profile_pic ? (
                                <img
                                    src={`${BACKEND}${user.profile_pic}`}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xs font-semibold text-red-400">
                                    {user?.name?.[0]?.toUpperCase() ?? '?'}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-white/40 hover:text-red-400 transition-colors font-medium"
                        >
                            Sign out
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link to="/login" className="text-sm text-white/60 hover:text-white transition-colors">
                            Sign in
                        </Link>
                        <Link
                            to="/signup"
                            className="text-sm font-semibold bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-lg transition-colors"
                        >
                            Sign up
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
