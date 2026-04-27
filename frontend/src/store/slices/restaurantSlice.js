import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  restaurants: [],
  currentRestaurant: null,
  loading: false,
  error: null,
  filters: {
    query: '',
    city: '',
    cuisine: 'All',
    price: 'Any',
    sort: 'rating',
    offset: 0,
  },
  totalCount: 0,
};

const restaurantSlice = createSlice({
  name: 'restaurants',
  initialState,
  reducers: {
    setRestaurants: (state, action) => {
      state.restaurants = action.payload;
      state.totalCount = action.payload.length;
    },
    setCurrentRestaurant: (state, action) => {
      state.currentRestaurant = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
});

export const { setRestaurants, setCurrentRestaurant, setLoading, setError, setFilters } =
  restaurantSlice.actions;

export default restaurantSlice.reducer;
