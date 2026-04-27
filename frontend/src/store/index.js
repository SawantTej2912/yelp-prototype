import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import restaurantReducer from './slices/restaurantSlice';
import reviewReducer from './slices/reviewSlice';
import favoritesReducer from './slices/favoritesSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    restaurants: restaurantReducer,
    reviews: reviewReducer,
    favorites: favoritesReducer,
  },
});

export default store;
