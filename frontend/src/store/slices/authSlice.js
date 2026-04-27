import { createSlice } from '@reduxjs/toolkit';
import api from '../../api/axios';

const TOKEN_KEY = 'yelp_token';
const USER_KEY = 'yelp_user';

const storedToken = localStorage.getItem(TOKEN_KEY);
const storedUser = localStorage.getItem(USER_KEY);
const parsedUser = storedUser ? JSON.parse(storedUser) : null;

if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

const initialState = {
  user: parsedUser,
  token: storedToken,
  isAuthenticated: Boolean(storedToken),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = Boolean(token);
      state.error = null;

      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      delete api.defaults.headers.common.Authorization;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading, setError } = authSlice.actions;

export default authSlice.reducer;
