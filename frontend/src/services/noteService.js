import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getNotes = () => api.get('/notes');

export const createNote = (content) => api.post('/notes', { content });

export const deleteNote = (id) => api.delete(`/notes/${id}`);

export default api;
