import api from './axios';

export const searchRestaurants = (params = {}) =>
    api.get('/restaurants', { params });

export const getRestaurant = (id) =>
    api.get(`/restaurants/${id}`);

export const createRestaurant = (data) =>
    api.post('/restaurants', data);

export const updateRestaurant = (id, data) =>
    api.put(`/restaurants/${id}`, data);

export const uploadRestaurantPhoto = (restaurantId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/restaurants/${restaurantId}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
