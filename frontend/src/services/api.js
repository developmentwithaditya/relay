// frontend/src/services/api.js
import io from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
console.log(`API Service: Connecting to backend at: ${BACKEND_URL}`);

export const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling']
});

const apiRequest = async (endpoint, options = {}) => {
    const { body, token, ...customOptions } = options;

    const headers = { ...customOptions.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let requestBody = body;
    // --- NEW: Check if the body is FormData ---
    // If it's not FormData, stringify it as JSON.
    // If it is FormData, we leave it as is and don't set the Content-Type header.
    if (!(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(body);
    }

    const config = {
        ...customOptions,
        headers,
        body: requestBody,
    };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'An error occurred on the server.');
    }

    return data;
};

export default apiRequest;
