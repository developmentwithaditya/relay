// frontend/src/AuthPage.jsx
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
  const [profilePicture, setProfilePicture] = useState(null); // State for the file
  const [previewUrl, setPreviewUrl] = useState(''); // State for the image preview
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useContext(AuthContext);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create a temporary URL for preview
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isLoginView) {
      // Login logic remains the same (sends JSON)
      try {
        const data = await apiRequest('/api/login', {
          method: 'POST',
          body: { email, password },
        });
        login(data.user, data.token);
      } catch (err) {
        setError(err.message);
      }
    } else {
      // --- REGISTRATION LOGIC (now uses FormData) ---
      const formData = new FormData();
      formData.append('displayName', displayName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('role', role);
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      try {
        // We use a different apiRequest call for FormData
        await apiRequest('/api/register', {
          method: 'POST',
          body: formData, // Send FormData instead of JSON
          // We DO NOT set Content-Type header here, the browser does it for us
        });
        setMessage('Registration successful! Please log in.');
        setIsLoginView(true);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <h2>{isLoginView ? 'Login to Relay' : 'Register for Relay'}</h2>
        <form onSubmit={handleSubmit}>
          {!isLoginView && (
            <>
              <div className="input-group">
                <label htmlFor="displayName">Display Name</label>
                <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="e.g., Papa, Mom's Kitchen"/>
              </div>
              {/* --- NEW: Profile Picture Input --- */}
              <div className="input-group">
                <label htmlFor="profilePicture">Profile Picture (Optional)</label>
                <input type="file" id="profilePicture" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} />
                {previewUrl && <img src={previewUrl} alt="Profile Preview" className="profile-preview"/>}
              </div>
            </>
          )}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/>
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isLoginView ? "current-password" : "new-password"}/>
          </div>
          {!isLoginView && (
            <div className="input-group">
              <label>I am a...</label>
              <div className="role-selector">
                <button type="button" className={role === 'sender' ? 'active' : ''} onClick={() => setRole('sender')}>Sender (Dad)</button>
                <button type="button" className={role === 'receiver' ? 'active' : ''} onClick={() => setRole('receiver')}>Receiver (Mom)</button>
              </div>
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          <button type="submit" className="auth-button">{isLoginView ? 'Login' : 'Register'}</button>
        </form>
        <p className="toggle-view">
          {isLoginView ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => { setIsLoginView(!isLoginView); setError(''); setMessage(''); }}>{isLoginView ? 'Register' : 'Login'}</button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
