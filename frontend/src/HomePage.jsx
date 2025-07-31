// frontend/src/HomePage.jsx
import React from 'react';
import './HomePage.css';

// --- NEW: A professional and minimal, Google-inspired SVG logo ---
const RelayLogo = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 32V8H22C26.4183 8 30 11.5817 30 16C30 20.4183 26.4183 24 22 24H12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 24L28 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function HomePage({ onGetStarted }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container">
          <div className="logo">
            <RelayLogo />
            <span>Relay</span>
          </div>
          <nav>
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <button onClick={onGetStarted} className="header-cta">Get Started</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="landing-container hero-layout">
            <div className="hero-content">
              <h1>The simplest way to say, "I need this."</h1>
              <p className="subtitle">
                Relay creates a direct, real-time link between you and your partner for clear household requests. No more missed texts or forgotten items.
              </p>
              <button onClick={onGetStarted} className="hero-cta">Connect for Free</button>
            </div>
            <div className="hero-image">
              <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" rx="20" fill="var(--secondary-bg)"/>
                <rect x="50" y="50" width="120" height="200" rx="10" fill="var(--card-bg)" stroke="var(--border-color)" strokeWidth="2"/>
                <rect x="65" y="70" width="90" height="10" rx="5" fill="var(--border-color)"/>
                <rect x="65" y="90" width="70" height="10" rx="5" fill="var(--border-color)"/>
                <rect x="230" y="50" width="120" height="200" rx="10" fill="var(--card-bg)" stroke="var(--border-color)" strokeWidth="2"/>
                <rect x="245" y="70" width="90" height="10" rx="5" fill="var(--primary-button-bg)"/>
                <rect x="245" y="90" width="70" height="10" rx="5" fill="var(--border-color)"/>
                <path d="M175 150 C 200 120, 200 180, 225 150" stroke="var(--primary-button-bg)" strokeWidth="4" strokeDasharray="8 8" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="how-it-works">
          <div className="landing-container">
            <h2>A simple, 3-step process</h2>
            <div className="steps">
              <div className="step">
                <div className="step-icon"><span>1</span></div>
                <h3>Connect with Partner</h3>
                <p>Link your accounts securely with an email invite. Once connected, you're ready to go.</p>
              </div>
              <div className="step">
                <div className="step-icon"><span>2</span></div>
                <h3>Send a Request</h3>
                <p>Build a list from scratch or use a custom preset to send your request in seconds.</p>
              </div>
              <div className="step">
                <div className="step-icon"><span>3</span></div>
                <h3>Get an Instant Reply</h3>
                <p>Receive immediate confirmation when your partner sees and acknowledges the request.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section id="features" className="features">
            <div className="landing-container">
                <h2>Everything you need, nothing you don't.</h2>
                <div className="feature-list">
                    <div className="feature-item">✓ Custom request presets</div>
                    <div className="feature-item">✓ Real-time confirmations</div>
                    <div className="feature-item">✓ Dark & Light themes</div>
                    <div className="feature-item">✓ Simple, focused design</div>
                </div>
            </div>
        </section>

      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="logo">
              <RelayLogo />
              <span>Relay</span>
            </div>
            <p>&copy; {new Date().getFullYear()} Relay Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
