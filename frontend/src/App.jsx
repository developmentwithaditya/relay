// frontend/src/App.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import apiRequest, { socket } from './services/api';
import { MENU_ITEMS } from './menuItems';
import HomePage from './HomePage';
import AuthPage from './AuthPage';
import ConnectPage from './ConnectPage';
import EditProfilePage from './EditProfilePage';
import PresetManagerPage from './PresetManagerPage';
import './App.css';

function MainApp({ user, onLogout, onEditProfile }) {
  const { theme, toggleTheme } = useTheme();
  const view = user.role;
  const [isManagingPresets, setIsManagingPresets] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);

  // --- BUG FIX: Robust socket registration ---
  useEffect(() => {
    // This function registers the user with the backend
    const registerSocket = () => {
      if (user?._id) {
        socket.emit('register_socket', user._id);
      }
    };

    // Define handlers for connect and disconnect events
    const onConnect = () => {
      setIsConnected(true);
      registerSocket(); // Register the user as soon as connection is established
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };

    // Attach the event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If the socket is already connected when the component mounts, register immediately.
    if (socket.connected) {
      registerSocket();
    }

    // Cleanup function to remove listeners when the component unmounts or user changes
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [user]); // Re-run this logic if the user logs in or out

  if (view === 'sender' && isManagingPresets) {
    return <PresetManagerPage onBack={() => setIsManagingPresets(false)} />;
  }

  return (
    <div className="app-container">
      <div className="app-header-main">
        <div className="profile-section">
          <img src={user.profilePictureUrl || `https://ui-avatars.com/api/?name=${user.displayName.split(' ').join('+')}&background=random&color=fff`} alt="Profile" className="header-avatar" />
          <span>{user.displayName}</span>
        </div>
        <div className="header-actions">
          <button onClick={toggleTheme} className="theme-toggle-button" aria-label="Toggle theme">{theme === 'light' ? '🌙' : '☀️'}</button>
          {view === 'sender' && <button onClick={() => setIsManagingPresets(true)} className="manage-presets-button">Presets</button>}
          <button onClick={onEditProfile} className="edit-profile-button">Edit</button>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </div>
      {view === 'sender' ? <SenderView /> : <ReceiverView />}
    </div>
  );
}

function App() {
  const { isLoggedIn, user, logout, authReady } = useContext(AuthContext);
  const [publicPage, setPublicPage] = useState('home');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  if (!authReady) return <div className="loading-fullscreen"><h1>Loading Relay...</h1></div>;
  if (isLoggedIn && isEditingProfile) return <EditProfilePage onBack={() => setIsEditingProfile(false)} />;
  if (isLoggedIn && user) return user.partnerId ? <MainApp user={user} onLogout={logout} onEditProfile={() => setIsEditingProfile(true)} /> : <ConnectPage />;
  if (publicPage === 'auth') return <AuthPage />;
  return <HomePage onNavigate={() => setPublicPage('auth')} />;
}

function SenderView() {
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState({});
  const [sentOrders, setSentOrders] = useState([]);

  const presetsByCategory = useMemo(() => {
    if (!user?.presets) return {};
    return user.presets.reduce((acc, preset) => {
      (acc[preset.category] = acc[preset.category] || []).push(preset);
      return acc;
    }, {});
  }, [user?.presets]);

  useEffect(() => {
    const handleOrderSaved = ({ tempId, dbId }) => setSentOrders(p => p.map(o => (o.tempId === tempId ? { ...o, _id: dbId, status: 'pending' } : o)));
    const handleOrderAcknowledged = (id) => {
      setSentOrders(p => p.map(o => (o._id === id ? { ...o, status: 'acknowledged' } : o)));
      setTimeout(() => setSentOrders(p => p.filter(o => o._id !== id)), 3000);
    };
    const handleOrderRejected = (id) => {
      setSentOrders(p => p.map(o => (o._id === id ? { ...o, status: 'rejected' } : o)));
      setTimeout(() => setSentOrders(p => p.filter(o => o._id !== id)), 8000);
    };
    
    socket.on('order_saved', handleOrderSaved);
    socket.on('order_acknowledged', handleOrderAcknowledged);
    socket.on('order_rejected', handleOrderRejected);
    
    return () => {
      socket.off('order_saved', handleOrderSaved);
      socket.off('order_acknowledged', handleOrderAcknowledged);
      socket.off('order_rejected', handleOrderRejected);
    };
  }, [user]);

  const sendOrder = (items) => {
    let itemsToSend = {};
    if (Array.isArray(items)) {
        itemsToSend = items.reduce((acc, item) => {
            acc[item.name] = item.quantity;
            return acc;
        }, {});
    } else {
        itemsToSend = Object.entries(order).filter(([, qty]) => qty > 0).reduce((acc, [id, qty]) => ({ ...acc, [id]: qty }), {});
    }
    if (Object.keys(itemsToSend).length > 0 && user?._id) {
      const tempId = `temp_${Date.now()}`;
      const tempOrder = { tempId, items: itemsToSend, status: 'sending' };
      setSentOrders(prev => [...prev, tempOrder]);
      socket.emit('send_order', { items: itemsToSend, senderId: user._id, tempId });
      setOrder({});
    }
  };
  
  return (
    <>
     <header className="app-header"><h1>Send Request</h1><p>Send to: {user.partnerId?.displayName || '...'}</p></header>
      <div className="status-card-container">{sentOrders.map(ord => (
          <div key={ord.tempId || ord._id} className={`status-card ${ord.status}`}>
            <h4>
              {ord.status === 'sending' && 'Sending...'}
              {ord.status === 'pending' && 'Sent!'}
              {ord.status === 'acknowledged' && 'Seen ✅'}
              {ord.status === 'rejected' && `Rejected by ${user.partnerId?.displayName || 'Receiver'} ❌`}
            </h4>
            {ord.status !== 'rejected' && (
                <ul>{Object.entries(ord.items).map(([name, qty]) => <li key={name}>{name} (x{qty})</li>)}</ul>
            )}
          </div>))}
      </div>
      <div className="presets-section">
        <h3>Your Presets</h3>
        {user.categories?.length > 0 ? (
          user.categories.map(category => (
            presetsByCategory[category] && (
              <div key={category} className="preset-category">
                <h5>{category}</h5>
                <div className="preset-buttons">
                  {presetsByCategory[category].map(preset => (
                    <button key={preset._id} className="preset-button" onClick={() => sendOrder(preset.customItems)}>
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )
          ))
        ) : (
          <p className="no-presets-text">You have no presets. Click 'Presets' in the header to create some!</p>
        )}
      </div>
      <div className="custom-order-section">
        <h3>Or, Send a Quick Request</h3>
        <div className="menu-container">{MENU_ITEMS.map(item => (
            <div key={item.id} className="menu-item">
              <span className="item-icon">{item.icon}</span><span className="item-name">{item.name}</span>
              <div className="quantity-selector">
                <button onClick={() => setOrder(p => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))}>-</button>
                <span>{order[item.id] || 0}</span>
                <button onClick={() => setOrder(p => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}>+</button>
              </div>
            </div>))}
        </div>
        <button className="send-order-button" onClick={() => sendOrder()}>Send Quick Request</button>
      </div>
    </>
  );
}

function ReceiverView() {
  const { user, token } = useContext(AuthContext);
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    async function fetchPendingOrder() {
      if (!token) return;
      try {
        const order = await apiRequest('/api/pending-orders', { token });
        if (order) setActiveOrder(order);
      } catch (error) { console.error("Failed to fetch pending orders:", error); }
    }
    fetchPendingOrder();
    const handleReceiveOrder = (orderData) => setActiveOrder(orderData);
    socket.on('receive_order', handleReceiveOrder);
    return () => socket.off('receive_order', handleReceiveOrder);
  }, [token]);

  const handleAcknowledge = () => {
    if (activeOrder) {
      socket.emit('acknowledge_order', { orderId: activeOrder._id, receiverId: user._id });
      setActiveOrder(null);
    }
  };
  const handleReject = () => {
    if (activeOrder) {
        socket.emit('reject_order', { orderId: activeOrder._id, receiverId: user._id });
        setActiveOrder(null);
    }
  };
  
  return (
    <>
      <header className="app-header"><h1>Incoming Orders</h1><p>From: {user.partnerId?.displayName || '...'}</p></header>
      <div className="order-display">{activeOrder ? (
          <div className="order-card animate-fade-in">
            <h3>New Order Received!</h3>
            <ul>{Object.entries(activeOrder.items).map(([name, quantity]) => (
                <li key={name}><span>{name}</span><span className="order-quantity">x {quantity}</span></li>
              ))}</ul>
            <div className="order-actions">
                <button className="reject-button" onClick={handleReject}>Reject</button>
                <button className="acknowledge-button" onClick={handleAcknowledge}>Acknowledge</button>
            </div>
          </div>) : (<p className="waiting-text">Waiting for new orders...</p>)}
      </div>
    </>
  );
}

export default App;
