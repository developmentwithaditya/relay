// frontend/src/services/api.js
import io from 'socket.io-client';

// Use Vite's env variables to determine the backend URL.
// In development, it defaults to localhost. On Render, we will set this variable.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

console.log(`API Service: Connecting to backend at: ${BACKEND_URL}`);

// Export a single, configured socket instance for the whole app to use
export const socket = io(BACKEND_URL, {
    // This helps with potential connection issues
    transports: ['websocket', 'polling']
});

// Create a reusable helper function for making API requests
const apiRequest = async (endpoint, options = {}) => {
    const { body, token, ...customOptions } = options;

    const headers = {
        'Content-Type': 'application/json',
        ...customOptions.headers,
    };

    // Add the authentication token to the headers if it exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...customOptions,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        // If the server returns an error, throw it so we can catch it
        throw new Error(data.message || 'An error occurred on the server.');
    }

    return data;
};

export default apiRequest;
