import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  favorites: [],
  loading: false,
  error: null,
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    setFavorites: (state, action) => {
      state.favorites = action.payload;
    },
    addFavorite: (state, action) => {
      const exists = state.favorites.some(
        (favorite) => favorite.restaurant_id === action.payload.restaurant_id,
      );
      if (!exists) {
        state.favorites.unshift(action.payload);
      }
    },
    removeFavorite: (state, action) => {
      state.favorites = state.favorites.filter(
        (favorite) => favorite.restaurant_id !== action.payload,
      );
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setFavorites, addFavorite, removeFavorite, setLoading, setError } =
  favoritesSlice.actions;

export default favoritesSlice.reducer;
