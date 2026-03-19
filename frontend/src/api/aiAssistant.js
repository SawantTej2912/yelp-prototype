import api from './axios';

export const chatWithAssistant = (data) =>
  api.post('/ai-assistant/chat', data);

export const clearAssistantHistory = () =>
  api.delete('/ai-assistant/chat/history');

