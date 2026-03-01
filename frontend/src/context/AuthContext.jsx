import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

const TOKEN_KEY = 'yelp_token';
const USER_KEY = 'yelp_user';

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);

    // Sync axios default Authorization header whenever token changes
    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete api.defaults.headers.common['Authorization'];
        }
    }, [token]);

    /** Persist token + user and update state */
    const saveSession = useCallback((newToken, newUser) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    }, []);

    /** Clear all session data */
    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    /**
     * Sign in with email + password.
     * @throws Error with a user-friendly message on failure.
     */
    const login = useCallback(async (email, password) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            saveSession(data.access_token, data.user);
            return data.user;
        } finally {
            setLoading(false);
        }
    }, [saveSession]);

    /**
     * Create a new account.
     * @throws Error with a user-friendly message on failure.
     */
    const signup = useCallback(async (email, password, name, phone, about_me, city, state, country, languages, gender) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/signup', {
                email,
                password,
                name,
                phone: phone || undefined,
                about_me: about_me || undefined,
                city: city || undefined,
                state: state || undefined,
                country: country || undefined,
                languages: languages || undefined,
                gender: gender || undefined,
            });
            saveSession(data.access_token, data.user);
            return data.user;
        } finally {
            setLoading(false);
        }
    }, [saveSession]);

    const isAuthenticated = Boolean(token);

    return (
        <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
