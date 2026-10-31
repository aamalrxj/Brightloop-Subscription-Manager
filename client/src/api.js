import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// every failed call throws an Error whose message is the server's message
api.interceptors.response.use(r => r.data, err => {
  const e = new Error(err.response?.data?.message || 'Network error, is the server running?');
  e.status = err.response?.status;
  return Promise.reject(e);
});

export default api;