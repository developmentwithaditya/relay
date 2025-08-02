import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './ConnectPage.css';

function ConnectPage() {
  const { user, token, refreshUserData } = useContext(AuthContext);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchError('');
    setSearchResult(null);
    setRequestStatus('');
    
    try {
      const data = await apiRequest(`/api/users/search?email=${searchEmail}`, { token });
      if (data) {
        setSearchResult(data);
      } else {
        setSearchError('No user found with that email.');
      }
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    setIsLoading(true);
    try {
      await apiRequest('/api/connect/request', {
        method: 'POST',
        token,
        body: { targetUserId }
      });
      setRequestStatus('Connection request sent successfully!');
      setSearchResult(null);
      setSearchEmail('');
    } catch (err) {
      setRequestStatus(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAcceptRequest = async (requesterId) => {
    setIsLoading(true);
    try {
      await apiRequest('/api/connect/accept', {
        method: 'POST',
        token,
        body: { requesterId }
      });
      refreshUserData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="connect-page-container">
      <div className="connect-wrapper">
        <header className="connect-header">
          <h1>Connect with Partner</h1>
          <p>Link with your partner to start sharing location and sending requests seamlessly.</p>
        </header>

        {user?.pendingRequests && user.pendingRequests.length > 0 && (
          <div className="card pending-requests-card">
            <h3>📨 Incoming Requests</h3>
            {user.pendingRequests.map(req => (
              <div key={req._id} className="request-item">
                <div className="request-info">
                  <div className="request-email">{req.email}</div>
                  <span className="request-role">{req.role}</span>
                </div>
                <button 
                  className={`accept-btn ${isLoading ? 'loading' : ''}`}
                  onClick={() => handleAcceptRequest(req._id)}
                  disabled={isLoading}
                >
                  Accept Request
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card search-card">
          <h3>🔍 Find Your Partner</h3>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="email"
              className="search-input"
              placeholder="Enter partner's email address"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className={`search-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
          
          {searchError && (
            <div className="status-message error-text">
              ❌ {searchError}
            </div>
          )}
          
          {requestStatus && (
            <div className="status-message success-text">
              ✅ {requestStatus}
            </div>
          )}
          
          {searchResult && (
            <div className="search-result">
              <div className="result-info">
                <div className="result-email">{searchResult.email}</div>
                <span className="result-role">{searchResult.role}</span>
              </div>
              <button 
                className={`connect-btn ${isLoading ? 'loading' : ''}`}
                onClick={() => handleSendRequest(searchResult._id)}
                disabled={isLoading}
              >
                Send Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConnectPage;