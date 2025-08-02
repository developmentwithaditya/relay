import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './AuthPage.css';

function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sender');
  const [displayName, setDisplayName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setPreviewUrl('');
    document.getElementById('profilePicture').value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (isLoginView) {
        const data = await apiRequest('/api/login', {
          method: 'POST',
          body: { email, password },
        });
        login(data.user, data.token);
      } else {
        const formData = new FormData();
        formData.append('displayName', displayName);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('role', role);
        if (profilePicture) {
          formData.append('profilePicture', profilePicture);
        }

        await apiRequest('/api/register', {
          method: 'POST',
          body: formData,
        });
        setMessage('Registration successful! Please log in.');
        setIsLoginView(true);
        // Clear form
        setDisplayName('');
        setEmail('');
        setPassword('');
        setRole('sender');
        removeProfilePicture();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-shape auth-shape-1"></div>
        <div className="auth-shape auth-shape-2"></div>
        <div className="auth-shape auth-shape-3"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <span className="logo-text">Relay</span>
          </div>
          <h1 className="auth-title">
            {isLoginView ? 'Welcome Back' : 'Join Relay'}
          </h1>
          <p className="auth-subtitle">
            {isLoginView 
              ? 'Sign in to continue your journey' 
              : 'Create your account to get started'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginView && (
            <>
              <div className="form-group">
                <label htmlFor="displayName" className="form-label">
                  <span className="label-text">Display Name</span>
                  <span className="label-required">*</span>
                </label>
                <div className="input-wrapper">
                  <input 
                    type="text" 
                    id="displayName" 
                    className="form-input"
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    required 
                    placeholder="e.g., Papa, Mom's Kitchen"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="profilePicture" className="form-label">
                  <span className="label-text">Profile Picture</span>
                  <span className="label-optional">Optional</span>
                </label>
                <div className="profile-upload-area">
                  {!previewUrl ? (
                    <label htmlFor="profilePicture" className="upload-zone">
                      <div className="upload-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                        </svg>
                      </div>
                      <p className="upload-text">Click to upload photo</p>
                      <p className="upload-hint">PNG, JPG, WEBP up to 5MB</p>
                      <input 
                        type="file" 
                        id="profilePicture" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handleFileChange}
                        hidden
                      />
                    </label>
                  ) : (
                    <div className="profile-preview-container">
                      <img src={previewUrl} alt="Profile Preview" className="profile-preview"/>
                      <button 
                        type="button" 
                        onClick={removeProfilePicture}
                        className="remove-photo-btn"
                        aria-label="Remove photo"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-text">I am a...</span>
                  <span className="label-required">*</span>
                </label>
                <div className="role-selector">
                  <button 
                    type="button" 
                    className={`role-option ${role === 'sender' ? 'active' : ''}`}
                    onClick={() => setRole('sender')}
                  >
                    <div className="role-icon">👨</div>
                    <span>Sender</span>
                    <small>Dad</small>
                  </button>
                  <button 
                    type="button" 
                    className={`role-option ${role === 'receiver' ? 'active' : ''}`}
                    onClick={() => setRole('receiver')}
                  >
                    <div className="role-icon">👩</div>
                    <span>Receiver</span>
                    <small>Mom</small>
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <span className="label-text">Email Address</span>
              <span className="label-required">*</span>
            </label>
            <div className="input-wrapper">
              <div className="input-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <input 
                type="email" 
                id="email" 
                className="form-input"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                autoComplete="email"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <span className="label-text">Password</span>
              <span className="label-required">*</span>
            </label>
            <div className="input-wrapper">
              <div className="input-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </div>
              <input 
                type="password" 
                id="password" 
                className="form-input"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                autoComplete={isLoginView ? "current-password" : "new-password"}
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="message error-message">
              <div className="message-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="message success-message">
              <div className="message-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span>{message}</span>
            </div>
          )}

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                <span>{isLoginView ? 'Signing In...' : 'Creating Account...'}</span>
              </>
            ) : (
              <span>{isLoginView ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p className="toggle-text">
            {isLoginView ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <button 
            type="button"
            onClick={() => { 
              setIsLoginView(!isLoginView); 
              setError(''); 
              setMessage(''); 
            }}
            className="toggle-button"
          >
            {isLoginView ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;