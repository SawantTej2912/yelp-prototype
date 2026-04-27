import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  reviews: [],
  loading: false,
  error: null,
  submitting: false,
};

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    setReviews: (state, action) => {
      state.reviews = action.payload;
    },
    addReview: (state, action) => {
      state.reviews.unshift(action.payload);
    },
    updateReview: (state, action) => {
      const idx = state.reviews.findIndex((review) => review.id === action.payload.id);
      if (idx !== -1) state.reviews[idx] = action.payload;
    },
    removeReview: (state, action) => {
      state.reviews = state.reviews.filter((review) => review.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setSubmitting: (state, action) => {
      state.submitting = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setReviews,
  addReview,
  updateReview,
  removeReview,
  setLoading,
  setSubmitting,
  setError,
} = reviewSlice.actions;

export default reviewSlice.reducer;
