import api from './axios';

// ─── Profile ─────────────────────────────────────────────────────────────────

export const getProfile = () => api.get('/users/profile');

export const updateProfile = (data) => api.put('/users/profile', data);

export const uploadProfilePicture = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/profile/picture', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// ─── Preferences ─────────────────────────────────────────────────────────────

export const getPreferences = () => api.get('/users/preferences');

export const updatePreferences = (data) => api.put('/users/preferences', data);
