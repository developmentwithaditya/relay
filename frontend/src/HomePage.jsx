// frontend/src/HomePage.jsx
import React from 'react';
import './HomePage.css'; // We will create this file next

// The 'onNavigate' prop is a function passed down from App.jsx
// to tell the main app to switch views.
function HomePage({ onNavigate }) {
  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <span className="homepage-logo">📡</span>
        <h1>Welcome to Relay</h1>
        <p>The simplest way to coordinate household requests in real-time.</p>
      </header>
      <main className="homepage-main">
        <div className="feature-box">
          <h3>For the Sender (Dad)</h3>
          <p>Quickly select items and send a request without shouting across the house.</p>
        </div>
        <div className="feature-box">
          <h3>For the Receiver (Mom)</h3>
          <p>Instantly see a clear list of what's needed on your phone or tablet.</p>
        </div>
      </main>
      <footer className="homepage-footer">
        <p>Get started by logging in or creating an account.</p>
        {/* This button will eventually navigate to the login/register page */}
        <button className="cta-button" onClick={() => onNavigate('login')}>
          Login / Register
        </button>
      </footer>
    </div>
  );
}

export default HomePage;
