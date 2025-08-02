import React, { useState, useEffect } from 'react';
import './HomePage.css';

// Enhanced Logo Component
const RelayLogo = ({ className = "" }) => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4f46e5" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path 
      d="M12 32V8H22C26.4183 8 30 11.5817 30 16C30 20.4183 26.4183 24 22 24H12" 
      stroke="url(#logoGradient)" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M20 24L28 32" 
      stroke="url(#logoGradient)" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="34" cy="12" r="3" fill="url(#logoGradient)" opacity="0.8" />
  </svg>
);

// Mobile Menu Component
const MobileMenu = ({ isOpen, onClose, onGetStarted }) => (
  <>
    <div 
      className={`mobile-menu-overlay ${isOpen ? 'open' : ''}`}
      onClick={onClose}
      aria-hidden={!isOpen}
    />
    <nav className={`mobile-menu ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
      <div className="mobile-nav-links">
        <a href="#features" className="mobile-nav-link" onClick={onClose}>
          Features
        </a>
        <a href="#how-it-works" className="mobile-nav-link" onClick={onClose}>
          How It Works
        </a>
        <a href="#pricing" className="mobile-nav-link" onClick={onClose}>
          Pricing
        </a>
      </div>
      <button 
        onClick={() => { onGetStarted(); onClose(); }} 
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
      >
        Get Started Free
      </button>
    </nav>
  </>
);

// Enhanced Feature Preview Component
const FeaturePreview = () => (
  <div className="feature-preview">
    <div className="preview-container">
      <div className="app-showcase">
        {/* Left Phone - Sender */}
        <div className="phone-illustration phone-left">
          <svg viewBox="0 0 300 600" className="phone-svg">
            {/* Phone Frame */}
            <rect x="10" y="10" width="280" height="580" rx="40" ry="40" 
                  fill="var(--surface-bg)" stroke="var(--border-medium)" strokeWidth="2"/>
            {/* Screen */}
            <rect x="25" y="60" width="250" height="520" rx="20" ry="20" 
                  fill="var(--secondary-bg)"/>
            
            {/* Status Bar */}
            <rect x="40" y="75" width="220" height="20" rx="10" ry="10" 
                  fill="var(--border-light)"/>
            <circle cx="50" cy="85" r="3" fill="var(--accent-success)"/>
            <rect x="240" y="80" width="20" height="10" rx="2" ry="2" 
                  fill="var(--accent-primary)"/>
            
            {/* Header */}
            <rect x="40" y="110" width="220" height="40" rx="8" ry="8" 
                  fill="var(--surface-bg)" opacity="0.8"/>
            <circle cx="60" cy="130" r="12" fill="var(--accent-primary)" opacity="0.3"/>
            <rect x="80" y="125" width="80" height="4" rx="2" ry="2" 
                  fill="var(--secondary-text)" opacity="0.6"/>
            <rect x="80" y="135" width="60" height="3" rx="1.5" ry="1.5" 
                  fill="var(--muted-text)" opacity="0.4"/>
            
            {/* Message Bubbles - Sent */}
            <g className="message-group-sent">
              <rect x="120" y="180" width="120" height="35" rx="17.5" ry="17.5" 
                    fill="var(--accent-primary)" className="message-bubble-1">
                <animate attributeName="opacity" values="0;1" dur="0.8s" begin="0.5s" fill="freeze"/>
                <animateTransform attributeName="transform" type="translate" 
                                values="0,20; 0,0" dur="0.6s" begin="0.5s" fill="freeze"/>
              </rect>
              <rect x="100" y="225" width="140" height="35" rx="17.5" ry="17.5" 
                    fill="var(--accent-primary)" className="message-bubble-2">
                <animate attributeName="opacity" values="0;1" dur="0.8s" begin="1s" fill="freeze"/>
                <animateTransform attributeName="transform" type="translate" 
                                values="0,20; 0,0" dur="0.6s" begin="1s" fill="freeze"/>
              </rect>
              <rect x="150" y="270" width="90" height="35" rx="17.5" ry="17.5" 
                    fill="var(--accent-primary)" className="message-bubble-3">
                <animate attributeName="opacity" values="0;1" dur="0.8s" begin="1.5s" fill="freeze"/>
                <animateTransform attributeName="transform" type="translate" 
                                values="0,20; 0,0" dur="0.6s" begin="1.5s" fill="freeze"/>
              </rect>
            </g>
            
            {/* Emoji Icons */}
            <circle cx="180" cy="197" r="8" fill="white" opacity="0.9">
              <animate attributeName="opacity" values="0;0.9" dur="0.3s" begin="0.8s" fill="freeze"/>
            </circle>
            <circle cx="170" cy="242" r="8" fill="white" opacity="0.9">
              <animate attributeName="opacity" values="0;0.9" dur="0.3s" begin="1.3s" fill="freeze"/>
            </circle>
            <circle cx="195" cy="287" r="8" fill="white" opacity="0.9">
              <animate attributeName="opacity" values="0;0.9" dur="0.3s" begin="1.8s" fill="freeze"/>
            </circle>
            
            {/* Input Area */}
            <rect x="40" y="520" width="220" height="40" rx="20" ry="20" 
                  fill="var(--surface-bg)" stroke="var(--border-light)" strokeWidth="1"/>
            <circle cx="240" cy="540" r="15" fill="var(--accent-primary)">
              <animate attributeName="scale" values="1;1.1;1" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        
        {/* Connection Animation */}
        <div className="connection-visualization">
          <svg viewBox="0 0 100 100" className="connection-svg">
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--accent-primary)"/>
                <stop offset="50%" stopColor="var(--accent-secondary)"/>
                <stop offset="100%" stopColor="var(--accent-primary)"/>
              </linearGradient>
            </defs>
            
            {/* Animated Connection Line */}
            <line x1="10" y1="50" x2="90" y2="50" 
                  stroke="url(#connectionGradient)" strokeWidth="3" strokeLinecap="round">
              <animate attributeName="stroke-dasharray" 
                       values="0,80;40,40;80,0;0,80" dur="3s" repeatCount="indefinite"/>
            </line>
            
            {/* Pulse Dots */}
            <circle cx="20" cy="50" r="4" fill="var(--accent-primary)">
              <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="50" cy="50" r="3" fill="white">
              <animate attributeName="r" values="3;6;3" dur="2s" begin="0.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0.5;1" dur="2s" begin="0.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="80" cy="50" r="4" fill="var(--accent-primary)">
              <animate attributeName="r" values="4;8;4" dur="2s" begin="1s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0.3;1" dur="2s" begin="1s" repeatCount="indefinite"/>
            </circle>
            
            {/* Data Particles */}
            <circle cx="30" cy="45" r="2" fill="var(--accent-secondary)" opacity="0.7">
              <animateMotion dur="4s" repeatCount="indefinite">
                <mpath href="#connectionPath"/>
              </animateMotion>
            </circle>
            <circle cx="30" cy="55" r="1.5" fill="var(--accent-primary)" opacity="0.5">
              <animateMotion dur="3s" begin="1s" repeatCount="indefinite">
                <mpath href="#connectionPath"/>
              </animateMotion>
            </circle>
            
            {/* Hidden path for animation */}
            <path id="connectionPath" d="M 10,50 Q 50,30 90,50" fill="none" opacity="0"/>
          </svg>
        </div>
        
        {/* Right Phone - Receiver */}
        <div className="phone-illustration phone-right">
          <svg viewBox="0 0 300 600" className="phone-svg">
            {/* Phone Frame */}
            <rect x="10" y="10" width="280" height="580" rx="40" ry="40" 
                  fill="var(--surface-bg)" stroke="var(--border-medium)" strokeWidth="2"/>
            {/* Screen */}
            <rect x="25" y="60" width="250" height="520" rx="20" ry="20" 
                  fill="var(--secondary-bg)"/>
            
            {/* Status Bar */}
            <rect x="40" y="75" width="220" height="20" rx="10" ry="10" 
                  fill="var(--border-light)"/>
            <circle cx="50" cy="85" r="3" fill="var(--accent-success)"/>
            <rect x="240" y="80" width="20" height="10" rx="2" ry="2" 
                  fill="var(--accent-primary)"/>
            
            {/* Header */}
            <rect x="40" y="110" width="220" height="40" rx="8" ry="8" 
                  fill="var(--surface-bg)" opacity="0.8"/>
            <circle cx="60" cy="130" r="12" fill="var(--accent-success)" opacity="0.3"/>
            <rect x="80" y="125" width="80" height="4" rx="2" ry="2" 
                  fill="var(--secondary-text)" opacity="0.6"/>
            <rect x="80" y="135" width="60" height="3" rx="1.5" ry="1.5" 
                  fill="var(--muted-text)" opacity="0.4"/>
            
            {/* Notification Badge */}
            <circle cx="240" cy="120" r="8" fill="var(--accent-error)">
              <animate attributeName="opacity" values="0;1" dur="0.3s" begin="2s" fill="freeze"/>
              <animate attributeName="r" values="0;8" dur="0.4s" begin="2s" fill="freeze"/>
            </circle>
            <text x="240" y="125" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">
              3
              <animate attributeName="opacity" values="0;1" dur="0.3s" begin="2.2s" fill="freeze"/>
            </text>
            
            {/* Message Bubbles - Received */}
            <g className="message-group-received">
              <rect x="60" y="180" width="100" height="35" rx="17.5" ry="17.5" 
                    fill="var(--surface-bg)" stroke="var(--border-light)" strokeWidth="1" 
                    className="message-bubble-received-1">
                <animate attributeName="opacity" values="0;1" dur="0.8s" begin="2s" fill="freeze"/>
                <animateTransform attributeName="transform" type="translate" 
                                values="0,20; 0,0" dur="0.6s" begin="2s" fill="freeze"/>
              </rect>
              <rect x="60" y="225" width="130" height="35" rx="17.5" ry="17.5" 
                    fill="var(--surface-bg)" stroke="var(--border-light)" strokeWidth="1" 
                    className="message-bubble-received-2">
                <animate attributeName="opacity" values="0;1" dur="0.8s" begin="2.5s" fill="freeze"/>
                <animateTransform attributeName="transform" type="translate" 
                                values="0,20; 0,0" dur="0.6s" begin="2.5s" fill="freeze"/>
              </rect>
              <rect x="60" y="270" width="110" height="35" rx="17.5" ry="17.5" 
                    fill="var(--surface-bg)" stroke="var(--border-light)" strokeWidth="1" 
                    className="message-bubble-received-3">
                <animate attributeName="opacity" values="0;1" dur="0.8s" begin="3s" fill="freeze"/>
                <animateTransform attributeName="transform" type="translate" 
                                values="0,20; 0,0" dur="0.6s" begin="3s" fill="freeze"/>
              </rect>
            </g>
            
            {/* Status Icons */}
            <circle cx="110" cy="197" r="6" fill="var(--accent-success)" opacity="0.8">
              <animate attributeName="opacity" values="0;0.8" dur="0.3s" begin="2.3s" fill="freeze"/>
            </circle>
            <circle cx="125" cy="242" r="6" fill="var(--accent-warning)" opacity="0.8">
              <animate attributeName="opacity" values="0;0.8" dur="0.3s" begin="2.8s" fill="freeze"/>
            </circle>
            <circle cx="115" cy="287" r="6" fill="var(--accent-primary)" opacity="0.8">
              <animate attributeName="opacity" values="0;0.8" dur="0.3s" begin="3.3s" fill="freeze"/>
            </circle>
            
            {/* Typing Indicator */}
            <rect x="60" y="320" width="80" height="25" rx="12.5" ry="12.5" 
                  fill="var(--border-light)" opacity="0.5">
              <animate attributeName="opacity" values="0;0.5;0" dur="2s" begin="3.5s" repeatCount="indefinite"/>
            </rect>
            <circle cx="80" cy="332.5" r="2" fill="var(--secondary-text)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>
            </circle>
            <circle cx="90" cy="332.5" r="2" fill="var(--secondary-text)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="100" cy="332.5" r="2" fill="var(--secondary-text)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.4s" repeatCount="indefinite"/>
            </circle>
            
            {/* Input Area */}
            <rect x="40" y="520" width="220" height="40" rx="20" ry="20" 
                  fill="var(--surface-bg)" stroke="var(--border-light)" strokeWidth="1"/>
            <circle cx="240" cy="540" r="15" fill="var(--accent-success)">
              <animate attributeName="scale" values="1;1.1;1" dur="2s" begin="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      </div>
      
      {/* Feature Highlights */}
      <div className="feature-highlights">
        <div className="highlight-item">
          <div className="highlight-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span>Instant Delivery</span>
        </div>
        <div className="highlight-item">
          <div className="highlight-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <span>Read Receipts</span>
        </div>
        <div className="highlight-item">
          <div className="highlight-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <circle cx="12" cy="16" r="1"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  </div>
);

// Scroll Animation Hook
const useScrollAnimation = () => {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe all elements with scroll-animate class
    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);
};

function HomePage({ onGetStarted }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Initialize scroll animations
  useScrollAnimation();

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const features = [
    {
      icon: '⚡',
      title: 'Instant Connection',
      description: 'Real-time sync between you and your partner with immediate push notifications and read receipts.'
    },
    {
      icon: '🎯',
      title: 'Smart Presets',
      description: 'Create custom request templates for your most common needs. Save time with one-tap requests.'
    },
    {
      icon: '🔒',
      title: 'Private & Secure',
      description: 'End-to-end encrypted conversations. Your personal requests stay between you and your partner.'
    },
    {
      icon: '📱',
      title: 'Cross-Platform',
      description: 'Works seamlessly across iOS, Android, and web. Stay connected anywhere, anytime.'
    }
  ];

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container">
          <div className="header-content">
            <a href="#" className="logo" aria-label="Relay - Home">
              <RelayLogo />
              <span>Relay</span>
            </a>
            
            <nav className="nav-desktop" aria-label="Main navigation">
              <div className="nav-links">
                <a href="#features" className="nav-link">Features</a>
                <a href="#how-it-works" className="nav-link">How It Works</a>
                <a href="#pricing" className="nav-link">Pricing</a>
              </div>
              <button onClick={onGetStarted} className="btn btn-primary">
                Get Started Free
              </button>
            </nav>
            
            <div className="mobile-nav-controls">
              <button 
                className="mobile-menu-button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onGetStarted={onGetStarted}
      />

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-bg-animation"></div>
          <div className="landing-container">
            <div className="hero-content">
              <h1 className="hero-title">
                The simplest way to say,<br />
                <span className="highlight">"I need this."</span>
              </h1>
              <p className="subtitle">
                Relay creates a direct, real-time connection between you and your partner 
                for clear household requests. No more missed texts or forgotten items.
              </p>
              <div className="hero-cta-group">
                <button onClick={onGetStarted} className="btn btn-lg hero-cta-primary">
                  <span>Start Free Today</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
                <button className="btn btn-lg hero-cta-secondary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>
          </div>
          <FeaturePreview />
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="how-it-works">
          <div className="landing-container">
            <div className="section-header scroll-animate">
              <h2>How Relay Works</h2>
              <p>Three simple steps to better communication</p>
            </div>
            
            <div className="steps-container">
              <div className="step-card scroll-animate" style={{ animationDelay: '0.1s' }}>
                <div className="step-icon">1</div>
                <h3>Connect Instantly</h3>
                <p>
                  Send a secure invite to your partner. Once accepted, 
                  you're connected and ready to start communicating better.
                </p>
              </div>
              
              <div className="step-card scroll-animate" style={{ animationDelay: '0.2s' }}>
                <div className="step-icon">2</div>
                <h3>Send Clear Requests</h3>
                <p>
                  Use custom presets or create new requests. Your partner 
                  gets instant notifications with all the details they need.
                </p>
              </div>
              
              <div className="step-card scroll-animate" style={{ animationDelay: '0.3s' }}>
                <div className="step-icon">3</div>
                <h3>Get Confirmation</h3>
                <p>
                  Receive immediate feedback when your partner sees and 
                  acknowledges your request. No more wondering if they got it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="features">
          <div className="landing-container">
            <div className="section-header scroll-animate">
              <h2>Everything You Need</h2>
              <p>Powerful features wrapped in a simple, beautiful interface</p>
            </div>
            
            <div className="features-grid">
              {features.map((feature, index) => (
                <article key={index} className="feature-card scroll-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="feature-icon" aria-hidden="true">
                    {feature.icon}
                  </div>
                  <div className="feature-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="landing-container">
            <div className="cta-content scroll-animate">
              <h2>Ready to simplify your communication?</h2>
              <p>Join thousands of couples who've already made their lives easier with Relay.</p>
              <button onClick={onGetStarted} className="btn btn-lg btn-primary cta-button">
                Get Started Free Today
              </button>
              <p className="cta-note">No credit card required • Free forever</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-logo">
              <RelayLogo />
              <span>Relay</span>
            </div>
            
            <nav className="footer-links" aria-label="Footer navigation">
              <a href="#privacy" className="footer-link">Privacy</a>
              <a href="#terms" className="footer-link">Terms</a>
              <a href="#support" className="footer-link">Support</a>
              <a href="#contact" className="footer-link">Contact</a>
            </nav>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Relay Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;