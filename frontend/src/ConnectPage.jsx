import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest, { socket } from './services/api';
import './ConnectPage.css';

function ConnectPage() {
  const { user, token, refreshUserData } = useContext(AuthContext);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Socket listeners for connection notifications
  useEffect(() => {
    const handleConnectionRequestReceived = ({ from, message }) => {
      setNotifications(prev => [...prev, { type: 'info', message, id: Date.now() }]);
      // Refresh user data to show new pending request
      setTimeout(() => refreshUserData(), 1000);
    };

    const handleConnectionRequestAccepted = ({ message }) => {
      setNotifications(prev => [...prev, { type: 'success', message, id: Date.now() }]);
      // Refresh user data to update partner status
      setTimeout(() => refreshUserData(), 1000);
    };

    const handleConnectionRequestRejected = ({ message }) => {
      setNotifications(prev => [...prev, { type: 'error', message, id: Date.now() }]);
    };

    socket.on('connection_request_received', handleConnectionRequestReceived);
    socket.on('connection_request_accepted', handleConnectionRequestAccepted);
    socket.on('connection_request_rejected', handleConnectionRequestRejected);

    return () => {
      socket.off('connection_request_received', handleConnectionRequestReceived);
      socket.off('connection_request_accepted', handleConnectionRequestAccepted);
      socket.off('connection_request_rejected', handleConnectionRequestRejected);
    };
  }, [refreshUserData]);

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

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
        setSearchError('No receiver found with that email.');
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
      setRequestStatus('Connection request sent to receiver successfully!');
      setSearchResult(null);
      setSearchEmail('');
    } catch (err) {
      setRequestStatus(`Error: ${err.message}`);
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

  const handleRejectRequest = async (requesterId) => {
    setIsLoading(true);
    try {
      await apiRequest('/api/connect/reject', {
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
        {/* Notification banner */}
        {notifications.map(notification => (
          <div key={notification.id} className={`notification-banner ${notification.type}`}>
            {notification.message}
          </div>
        ))}

        <header className="connect-header">
          <h1>Connect with Partner</h1>
          <p>
            {user.role === 'sender' 
              ? 'Find and connect with a receiver to start sending requests.'
              : 'Accept connection requests from senders to start receiving requests.'
            }
          </p>
        </header>

        {/* **NEW**: Only show pending requests for receivers */}
        {user.role === 'receiver' && user?.pendingRequests && user.pendingRequests.length > 0 && (
          <div className="card pending-requests-card">
            <h3>📨 Incoming Connection Requests</h3>
            {user.pendingRequests.map(req => (
              <div key={req._id} className="request-item">
                <div className="request-profile">
                  <img
                    src={
                      req.profilePictureUrl ||
                      `https://ui-avatars.com/api/?name=${req.displayName
                        .split(" ")
                        .join("+")}&background=667eea&color=fff`
                    }
                    alt={`${req.displayName}'s profile`}
                    className="request-avatar"
                  />
                  <div className="request-info">
                    <div className="request-name">{req.displayName}</div>
                    <div className="request-email">{req.email}</div>
                    <span className="request-role">Sender</span>
                  </div>
                </div>
                <div className="request-actions">
                  <button 
                    className={`reject-btn ${isLoading ? 'loading' : ''}`}
                    onClick={() => handleRejectRequest(req._id)}
                    disabled={isLoading}
                  >
                    Reject
                  </button>
                  <button 
                    className={`accept-btn ${isLoading ? 'loading' : ''}`}
                    onClick={() => handleAcceptRequest(req._id)}
                    disabled={isLoading}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* **NEW**: Only show search for senders */}
        {user.role === 'sender' && (
          <div className="card search-card">
            <h3>🔍 Find a Receiver</h3>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="email"
                className="search-input"
                placeholder="Enter receiver's email address"
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
              <div className={`status-message ${requestStatus.includes('Error') ? 'error-text' : 'success-text'}`}>
                {requestStatus.includes('Error') ? '❌' : '✅'} {requestStatus.replace('Error: ', '')}
              </div>
            )}
            
            {searchResult && (
              <div className="search-result">
                <div className="result-profile">
                  <img
                    src={
                      searchResult.profilePictureUrl ||
                      `https://ui-avatars.com/api/?name=${searchResult.displayName
                        .split(" ")
                        .join("+")}&background=805ad5&color=fff`
                    }
                    alt={`${searchResult.displayName}'s profile`}
                    className="result-avatar"
                  />
                  <div className="result-info">
                    <div className="result-name">{searchResult.displayName}</div>
                    <div className="result-email">{searchResult.email}</div>
                    <span className="result-role">Receiver</span>
                  </div>
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
        )}

        {/* **NEW**: Show waiting message for receivers without pending requests */}
        {user.role === 'receiver' && (!user?.pendingRequests || user.pendingRequests.length === 0) && (
          <div className="card">
            <h3>⏳ Waiting for Connection</h3>
            <p>You'll receive connection requests from senders here. Once you accept a request, you'll be connected and can start receiving their requests.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectPage;