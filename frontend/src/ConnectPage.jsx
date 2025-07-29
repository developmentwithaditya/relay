// frontend/src/ConnectPage.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import './ConnectPage.css';

function ConnectPage() {
  const { user, token, refreshUserData } = useContext(AuthContext);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [requestStatus, setRequestStatus] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    setRequestStatus('');
    try {
      const response = await fetch(`http://localhost:3001/api/users/search?email=${searchEmail}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to search');
      if (data) {
        setSearchResult(data);
      } else {
        setSearchError('No user found with that email.');
      }
    } catch (err) {
      setSearchError(err.message);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    try {
      const response = await fetch('http://localhost:3001/api/connect/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send request');
      setRequestStatus('Connection request sent!');
      setSearchResult(null); // Clear search result after sending
    } catch (err) {
      setRequestStatus(err.message);
    }
  };
  
  const handleAcceptRequest = async (requesterId) => {
    try {
      const response = await fetch('http://localhost:3001/api/connect/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requesterId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to accept request');
      // Refresh user data to get the new partner info
      refreshUserData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="connect-page-container">
      <div className="connect-wrapper">
        <header className="connect-header">
          <h1>Connect with your Partner</h1>
          <p>You need to link with your partner to start sending requests.</p>
        </header>

        {/* --- Pending Requests Section --- */}
        {user?.pendingRequests && user.pendingRequests.length > 0 && (
          <div className="card pending-requests-card">
            <h3>Incoming Requests</h3>
            {user.pendingRequests.map(req => (
              <div key={req._id} className="request-item">
                <span>{req.email} ({req.role}) wants to connect.</span>
                <button className="accept-btn" onClick={() => handleAcceptRequest(req._id)}>Accept</button>
              </div>
            ))}
          </div>
        )}

        {/* --- Search Section --- */}
        <div className="card search-card">
          <h3>Find your Partner by Email</h3>
          <form onSubmit={handleSearch}>
            <input
              type="email"
              placeholder="partner@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              required
            />
            <button type="submit">Search</button>
          </form>
          {searchError && <p className="error-text">{searchError}</p>}
          {requestStatus && <p className="success-text">{requestStatus}</p>}
          {searchResult && (
            <div className="search-result">
              <p>Found: {searchResult.email} (Role: {searchResult.role})</p>
              <button className="connect-btn" onClick={() => handleSendRequest(searchResult._id)}>Send Connect Request</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConnectPage;
