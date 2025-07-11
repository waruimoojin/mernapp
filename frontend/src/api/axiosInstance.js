import axios from 'axios';

const token = localStorage.getItem('token');

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    Authorization: token ? `Bearer ${token}` : '',
  },
});

export default axiosInstance;
