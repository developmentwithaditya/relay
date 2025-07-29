// frontend/src/AuthPage.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import './AuthPage.css';

function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sender');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Get the login function from our AuthContext
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
        throw new Error(data.message || 'An error occurred.');
      }

      if (isLoginView) {
        // On successful login, call the context's login function.
        // This will update the global state and trigger the redirect in App.jsx
        login(data.user, data.token);
      } else {
        // On successful registration, show a message and switch to the login form
        setMessage('Registration successful! Please log in.');
        setIsLoginView(true);
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
              autoComplete="email"
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
              autoComplete={isLoginView ? "current-password" : "new-password"}
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
          <button onClick={() => { setIsLoginView(!isLoginView); setError(''); setMessage(''); }}>
            {isLoginView ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
