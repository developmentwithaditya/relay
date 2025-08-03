import React, { useState, useEffect, useRef, useCallback } from 'react';
import './HomePage.css';

// === MAGICAL COMPONENTS ===

const RelayLogo = () => (
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="50%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <path 
      d="M8 10 L8 30 L20 30 L20 26 L12 26 L12 22 L18 22 L18 18 L12 18 L12 14 L20 14 L20 10 L8 10 Z M22 14 L30 22 L22 30 L25 30 L32 23 L25 16 L22 14 Z" 
      fill="url(#logoGradient)"
    />
  </svg>
);

const MagicalCursor = () => {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const follower = followerRef.current;
    
    if (!cursor || !follower) return;

    const moveCursor = (e) => {
      cursor.style.left = e.clientX - 10 + 'px';
      cursor.style.top = e.clientY - 10 + 'px';
      
      setTimeout(() => {
        follower.style.left = e.clientX - 20 + 'px';
        follower.style.top = e.clientY - 20 + 'px';
      }, 100);
    };

    const handleMouseEnter = () => {
      cursor.style.transform = 'scale(1.5)';
      follower.style.transform = 'scale(1.5)';
    };

    const handleMouseLeave = () => {
      cursor.style.transform = 'scale(1)';
      follower.style.transform = 'scale(1)';
    };

    document.addEventListener('mousemove', moveCursor);
    
    const interactiveElements = document.querySelectorAll('button, a, .phone, .feature-card, .demo-card');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      document.removeEventListener('mousemove', moveCursor);
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  return (
    <>
      <div className="cursor" ref={cursorRef}></div>
      <div className="cursor-follower" ref={followerRef}></div>
    </>
  );
};

const FloatingParticles = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        delay: Math.random() * 6,
        duration: 3 + Math.random() * 3,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="floating-particles">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

// Enhanced Interactive Demo with actual Relay flow
const InteractiveDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  const demoFlow = [
    {
      type: 'selection',
      title: 'Select Items',
      subtitle: 'Building your request...',
      items: [
        { name: 'Milk', icon: '🥛', selected: false },
        { name: 'Bread', icon: '🍞', selected: false },
        { name: 'Eggs', icon: '🥚', selected: false }
      ]
    },
    {
      type: 'sending',
      title: 'Sending Request',
      subtitle: 'Instant sync to your partner...',
      status: 'sending'
    },
    {
      type: 'received',
      title: 'Request Received',
      subtitle: 'Partner can see your request instantly',
      items: ['🥛 Milk', '🍞 Bread', '🥚 Eggs']
    },
    {
      type: 'response',
      title: 'Real-time Response',
      subtitle: 'Getting instant feedback...',
      responses: [
        { item: 'Milk', status: 'acknowledged', icon: '✅' },
        { item: 'Bread', status: 'acknowledged', icon: '✅' },
        { item: 'Eggs', status: 'rejected', icon: '❌' }
      ]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      if (currentStep === 0) {
        // Auto-select items one by one
        if (selectedItems.length < 3) {
          setSelectedItems(prev => [...prev, prev.length]);
        } else {
          setTimeout(() => setCurrentStep(1), 1000);
        }
      } else if (currentStep < demoFlow.length - 1) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setCurrentStep(prev => prev + 1);
        }, 2000);
      } else {
        // Reset demo
        setTimeout(() => {
          setCurrentStep(0);
          setSelectedItems([]);
          setIsTyping(false);
        }, 3000);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [currentStep, selectedItems.length]);

  const currentDemo = demoFlow[currentStep];

  return (
    <div className="demo-showcase">
      <div className="phone-container">
        <div className="phone">
          <div className="phone-screen">
            <div className="demo-header">
              <div className="demo-status-bar">
                <span>9:41</span>
                <span className="demo-title">Relay</span>
                <span>🔋 100%</span>
              </div>
            </div>
            
            <div className="demo-content">
              <div className="demo-step-indicator">
                <div className="step-title">{currentDemo.title}</div>
                <div className="step-subtitle">{currentDemo.subtitle}</div>
              </div>

              {currentDemo.type === 'selection' && (
                <div className="item-selection-demo">
                  <div className="demo-items-grid">
                    {currentDemo.items.map((item, index) => (
                      <div 
                        key={item.name}
                        className={`demo-item-tile ${selectedItems.includes(index) ? 'selected' : ''}`}
                      >
                        <span className="demo-item-icon">{item.icon}</span>
                        <span className="demo-item-name">{item.name}</span>
                        {selectedItems.includes(index) && (
                          <div className="selection-pulse"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="demo-send-btn">
                    <span>🚀 Send Request</span>
                  </div>
                </div>
              )}

              {currentDemo.type === 'sending' && (
                <div className="sending-demo">
                  <div className="sending-animation">
                    <div className="sync-rings">
                      <div className="sync-ring"></div>
                      <div className="sync-ring"></div>
                      <div className="sync-ring"></div>
                    </div>
                    <div className="sync-icon">⚡</div>
                  </div>
                  <div className="sending-text">Syncing instantly...</div>
                </div>
              )}

              {currentDemo.type === 'received' && (
                <div className="received-demo">
                  <div className="notification-popup">
                    <div className="notification-icon">📬</div>
                    <div className="notification-text">New request from partner!</div>
                  </div>
                  <div className="received-items">
                    {currentDemo.items.map((item, index) => (
                      <div key={index} className="received-item">
                        <span>{item}</span>
                        <div className="item-actions">
                          <button className="action-btn reject">❌</button>
                          <button className="action-btn accept">✅</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentDemo.type === 'response' && (
                <div className="response-demo">
                  <div className="live-feedback">
                    <div className="feedback-header">Live Feedback</div>
                    {currentDemo.responses.map((response, index) => (
                      <div key={index} className="feedback-item">
                        <span className="feedback-icon">{response.icon}</span>
                        <span className="feedback-text">
                          {response.item} {response.status === 'acknowledged' ? 'added' : 'unavailable'}
                        </span>
                        <div className="feedback-animation"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Features Showcase
const FeaturesShowcase = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  
  const features = [
    {
      icon: "⚡",
      title: "Instant Sync",
      description: "Send requests and get responses in real-time. No delays, no confusion.",
      demo: "Your partner sees your request the moment you send it",
      color: "from-yellow-400 to-orange-500"
    },
    {
      icon: "🎯",
      title: "Smart Organization",
      description: "Create presets for common requests. One-tap ordering for frequent needs.",
      demo: "Weekly groceries, weekend supplies - all saved and ready",
      color: "from-blue-400 to-cyan-500"
    },
    {
      icon: "🔄",
      title: "Live Feedback",
      description: "Get instant responses on each item. Know exactly what's available.",
      demo: "See confirmations and alternatives as they happen",
      color: "from-green-400 to-emerald-500"
    },
    {
      icon: "🛡️",
      title: "Secure & Private",
      description: "End-to-end encrypted. Your coordination stays between you two.",
      demo: "Bank-level security for your daily coordination",
      color: "from-purple-400 to-pink-500"
    },
    {
      icon: "📱",
      title: "Always Connected",
      description: "Push notifications keep you in sync even when the app is closed.",
      demo: "Never miss a request or response, wherever you are",
      color: "from-indigo-400 to-purple-500"
    },
    {
      icon: "✨",
      title: "Effortless Experience",
      description: "Designed for speed and simplicity. Coordinate in seconds, not minutes.",
      demo: "From thought to coordination in under 10 seconds",
      color: "from-pink-400 to-rose-500"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="features-showcase">
      <div className="features-header">
        <h2 className="features-title">Built for Perfect Coordination</h2>
        <p className="features-subtitle">
          Every feature designed to make partner coordination effortless and instant
        </p>
      </div>
      
      <div className="features-container">
        <div className="features-list">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-item ${index === activeFeature ? 'active' : ''}`}
              onClick={() => setActiveFeature(index)}
            >
              <div className="feature-icon-container">
                <span className="feature-icon">{feature.icon}</span>
              </div>
              <div className="feature-content">
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-demo-text">{feature.demo}</div>
              </div>
              <div className="feature-progress">
                <div 
                  className="progress-bar"
                  style={{ 
                    width: index === activeFeature ? '100%' : '0%',
                    background: `linear-gradient(90deg, ${feature.color.split(' ').join(', ')})`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="feature-visualization">
          <div className={`feature-visual bg-gradient-to-br ${features[activeFeature].color}`}>
            <div className="visual-content">
              <div className="visual-icon">{features[activeFeature].icon}</div>
              <div className="visual-title">{features[activeFeature].title}</div>
              <div className="visual-demo">{features[activeFeature].demo}</div>
              
              {/* Dynamic visual based on active feature */}
              {activeFeature === 0 && (
                <div className="sync-visual">
                  <div className="sync-pulse"></div>
                  <div className="sync-wave"></div>
                </div>
              )}
              
              {activeFeature === 1 && (
                <div className="preset-visual">
                  <div className="preset-grid">
                    <div className="preset-item">🛒 Groceries</div>
                    <div className="preset-item">🏠 Home Supplies</div>
                    <div className="preset-item">🍕 Dinner</div>
                  </div>
                </div>
              )}
              
              {activeFeature === 2 && (
                <div className="feedback-visual">
                  <div className="feedback-stream">
                    <div className="feedback-bubble accepted">✅ Milk added</div>
                    <div className="feedback-bubble rejected">❌ Bread unavailable</div>
                    <div className="feedback-bubble accepted">✅ Eggs confirmed</div>
                  </div>
                </div>
              )}

              {activeFeature === 3 && (
                <div className="security-visual">
                  <div className="encryption-lock">🔒</div>
                  <div className="security-shield">🛡️</div>
                </div>
              )}

              {activeFeature === 4 && (
                <div className="notification-visual">
                  <div className="phone-notification">
                    <div className="notification-content">
                      <span className="notification-app">Relay</span>
                      <span className="notification-message">New request from partner</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === 5 && (
                <div className="speed-visual">
                  <div className="speed-meter">
                    <div className="speed-needle"></div>
                    <div className="speed-text">10s</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Use Cases Section
const UseCasesSection = () => {
  const useCases = [
    {
      title: "Shopping Together",
      subtitle: "Never forget anything again",
      description: "Send your shopping list instantly. Get real-time updates on what's available, what's out of stock, and suggested alternatives.",
      icon: "🛒",
      example: "Milk, bread, eggs → Partner confirms milk ✅, suggests whole grain bread, eggs out of stock ❌"
    },
    {
      title: "Home Coordination",
      subtitle: "Effortless household management",
      description: "Request supplies, coordinate tasks, share immediate needs. Perfect for busy couples and families.",
      icon: "🏠",
      example: "Need toilet paper, batteries → Partner picking up now, will grab extra batteries ✅"
    },
    {
      title: "Travel & Events",
      subtitle: "Stay coordinated anywhere",
      description: "Perfect for trips, events, or any time you need to coordinate from different locations.",
      icon: "✈️",
      example: "Forgot charger, need snacks → Partner found charger at airport shop, getting your favorites ✅"
    }
  ];

  return (
    <section className="use-cases-section">
      <div className="landing-container">
        <div className="section-header-center">
          <h2 className="section-title-large">Perfect for Every Coordination Need</h2>
          <p className="section-subtitle-large">
            Whether it's daily errands or special situations, Relay makes coordination effortless
          </p>
        </div>
        
        <div className="use-cases-grid">
          {useCases.map((useCase, index) => (
            <div key={index} className="use-case-card">
              <div className="use-case-icon">{useCase.icon}</div>
              <div className="use-case-content">
                <h3 className="use-case-title">{useCase.title}</h3>
                <p className="use-case-subtitle">{useCase.subtitle}</p>
                <p className="use-case-description">{useCase.description}</p>
                <div className="use-case-example">
                  <div className="example-label">Example:</div>
                  <div className="example-text">{useCase.example}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ScrollReveal = ({ children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${isVisible ? 'revealed' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

// === MAIN COMPONENT ===
function HomePage({ onGetStarted }) {
  const [isLoading, setIsLoading] = useState(true);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setHeaderScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

 // Replace the existing loading section (around line 400+) with this:

// === MAGICAL LOADING COMPONENT ===
const MagicalLoadingScreen = ({ message = "Loading Relay..." }) => {
  const [loadingStage, setLoadingStage] = useState(0);
  const [particles, setParticles] = useState([]);

  const loadingStages = [
    "Initializing connection...",
    "Syncing with your partner...",
    "Preparing perfect coordination...",
    "Almost ready for magic..."
  ];

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
    }));
    setParticles(newParticles);

    // Progress through loading stages
    const stageInterval = setInterval(() => {
      setLoadingStage(prev => (prev + 1) % loadingStages.length);
    }, 800);

    return () => clearInterval(stageInterval);
  }, []);

  return (
    <div className="magical-loading-overlay">
      {/* Floating particles */}
      <div className="loading-particles">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="loading-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Main loading content */}
      <div className="magical-loading-content">
        {/* Animated Relay logo */}
        <div className="loading-logo-container">
          <div className="loading-relay-rings">
            <div className="loading-ring loading-ring-1"></div>
            <div className="loading-ring loading-ring-2"></div>
            <div className="loading-ring loading-ring-3"></div>
          </div>
          <div className="loading-relay-icon">
            <RelayLogo />
          </div>
          <div className="loading-energy-pulses">
            <div className="energy-pulse energy-pulse-1"></div>
            <div className="energy-pulse energy-pulse-2"></div>
            <div className="energy-pulse energy-pulse-3"></div>
          </div>
        </div>

        {/* Dynamic loading text */}
        <div className="loading-text-container">
          <h1 className="loading-main-title">{message}</h1>
          <div className="loading-stage-container">
            <span className="loading-stage-text">
              {loadingStages[loadingStage]}
            </span>
            <div className="loading-dots">
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
            </div>
          </div>
        </div>

        {/* Progress bar with energy effect */}
        <div className="loading-progress-container">
          <div className="loading-progress-track">
            <div className="loading-progress-fill"></div>
            <div className="loading-progress-glow"></div>
          </div>
          <div className="loading-progress-sparks">
            <div className="progress-spark spark-1"></div>
            <div className="progress-spark spark-2"></div>
            <div className="progress-spark spark-3"></div>
          </div>
        </div>

        {/* Status indicators */}
        <div className="loading-status-grid">
          <div className="status-item">
            <div className="status-icon">⚡</div>
            <span>Real-time Sync</span>
          </div>
          <div className="status-item">
            <div className="status-icon">🔒</div>
            <span>Secure Connection</span>
          </div>
          <div className="status-item">
            <div className="status-icon">🎯</div>
            <span>Perfect Coordination</span>
          </div>
        </div>
      </div>

      {/* Background gradient animation */}
      <div className="loading-bg-gradient"></div>
    </div>
  );
};

  return (
    <div className="landing-page">
      <MagicalCursor />
      
      <header className={`landing-header ${headerScrolled ? 'scrolled' : ''}`}>
        <div className="landing-container">
          <div className="header-content">
            <a href="#" className="logo" aria-label="Relay - Home">
              <RelayLogo />
              <span>Relay</span>
            </a>
            <nav className="nav-desktop">
              <button onClick={onGetStarted} className="btn btn-primary">
                Start Coordinating
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* === HERO SECTION === */}
        <section className="hero">
          <FloatingParticles />
          
          <div className="floating-shapes">
            <div className="shape"></div>
            <div className="shape"></div>
            <div className="shape"></div>
          </div>

          <div className="hero-content">
            <h1 className="hero-title">
              <span className="word">Perfect</span>{' '}
              <span className="word gradient-text">Partner</span>{' '}
              <span className="word">Coordination</span>
            </h1>
            
            <p className="hero-subtitle">
              Send requests, get instant responses, stay perfectly in sync. 
              Relay transforms how partners coordinate their daily lives.
            </p>
            
            <div className="hero-cta">
              <button onClick={onGetStarted} className="btn btn-lg btn-primary">
                <span className="btn-icon">🚀</span>
                Start Your Perfect Sync
              </button>
              <div className="trust-indicator">
                <span className="trust-icon">🔒</span>
                Free forever • Private & secure • Real-time sync
              </div>
            </div>
          </div>
        </section>

        {/* === INTERACTIVE DEMO === */}
        <section className="demo-section">
          <div className="landing-container">
            <ScrollReveal>
              <div className="demo-header-section">
                <h2 className="demo-title">See Relay in Action</h2>
                <p className="demo-subtitle">
                  Watch how effortless partner coordination becomes with real-time sync
                </p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal>
              <InteractiveDemo />
            </ScrollReveal>
          </div>
        </section>

        {/* === FEATURES SHOWCASE === */}
        <section className="features-section">
          <div className="landing-container">
            <ScrollReveal>
              <FeaturesShowcase />
            </ScrollReveal>
          </div>
        </section>

        {/* === USE CASES === */}
        <ScrollReveal>
          <UseCasesSection />
        </ScrollReveal>

        {/* === HOW IT WORKS === */}
        <section className="how-it-works-section">
          <div className="landing-container">
            <ScrollReveal>
              <div className="section-header-center">
                <h2 className="section-title-large">How Relay Works</h2>
                <p className="section-subtitle-large">
                  Getting started is simple. Perfect coordination is just minutes away.
                </p>
              </div>
            </ScrollReveal>

            <div className="steps-container">
              <ScrollReveal>
                <div className="step-card">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h3 className="step-title">Connect with Your Partner</h3>
                    <p className="step-description">
                      One person creates an account and invites their partner. 
                      Secure connection established in seconds.
                    </p>
                    <div className="step-visual">👥 → 🔗</div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h3 className="step-title">Send Instant Requests</h3>
                    <p className="step-description">
                      Tap items, create custom requests, or use saved presets. 
                      Your partner sees everything instantly.
                    </p>
                    <div className="step-visual">📱 → ⚡ → 📱</div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3 className="step-title">Get Real-time Responses</h3>
                    <p className="step-description">
                      Receive instant confirmations, alternatives, or updates. 
                      Stay perfectly coordinated, always.
                    </p>
                    <div className="step-visual">✅ ❌ 🔄</div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* === FINAL CTA === */}
        <section className="final-cta">
          <div className="landing-container">
            <ScrollReveal>
              <div className="cta-content">
                <h2 className="cta-title">Ready for Perfect Coordination?</h2>
                <p className="cta-subtitle">
                  Join couples who've discovered the joy of effortless coordination. 
                  Your perfect sync starts now.
                </p>
                <button onClick={onGetStarted} className="btn btn-lg btn-primary">
                  <span className="btn-icon">✨</span>
                  Start Coordinating Now
                </button>
                <div className="cta-benefits">
                  <div className="benefit">🆓 Free forever</div>
                  <div className="benefit">⚡ Instant setup</div>
                  <div className="benefit">🔒 Private & secure</div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <a href="#" className="logo" style={{ marginBottom: '2rem', display: 'inline-flex' }}>
              <RelayLogo />
              <span>Relay</span>
            </a>
            <p>&copy; {new Date().getFullYear()} Relay. Making coordination effortless.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;