import axios from 'axios';

export const API_URL = 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;
