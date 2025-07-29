// frontend/src/AuthPage.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import './AuthPage.css'; // We will create this file next

function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sender'); // Default role for registration
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const url = isLoginView ? '/api/login' : '/api/register';
    const payload = isLoginView ? { email, password } : { email, password, role };

    try {
      const response = await fetch(`http://localhost:3001${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (isLoginView) {
        // If login is successful, call the login function from AuthContext
        login(data.user, data.token);
      } else {
        // If registration is successful, show a message
        setMessage('Registration successful! Please log in.');
        setIsLoginView(true); // Switch to login view
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <h2>{isLoginView ? 'Login to Relay' : 'Register for Relay'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {!isLoginView && (
            <div className="input-group">
              <label>I am a...</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={role === 'sender' ? 'active' : ''}
                  onClick={() => setRole('sender')}
                >
                  Sender (Dad)
                </button>
                <button
                  type="button"
                  className={role === 'receiver' ? 'active' : ''}
                  onClick={() => setRole('receiver')}
                >
                  Receiver (Mom)
                </button>
              </div>
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          <button type="submit" className="auth-button">
            {isLoginView ? 'Login' : 'Register'}
          </button>
        </form>
        <p className="toggle-view">
          {isLoginView ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
