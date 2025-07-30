// frontend/src/App.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { socket, apiRequest } from './services/api';
import { MENU_ITEMS } from './menuItems';
import HomePage from './HomePage';
import AuthPage from './AuthPage';
import ConnectPage from './ConnectPage';
import EditProfilePage from './EditProfilePage'; // Import the new page
import './App.css';

// --- MainApp Component (For connected users) ---
function MainApp({ user, onLogout, onEditProfile }) {
  const view = user.role;
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    if (user?._id) {
      socket.emit('register_socket', user._id);
    }
    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [user]);

  return (
    <div className="app-container">
      <div className="app-header-main">
        <div className="profile-section">
          <img 
            src={user.profilePictureUrl || `https://ui-avatars.com/api/?name=${user.displayName.split(' ').join('+')}&background=random&color=fff`} 
            alt="Profile" 
            className="header-avatar"
          />
          <span>{user.displayName}</span>
        </div>
        <div className="header-actions">
          <button onClick={onEditProfile} className="edit-profile-button">Edit</button>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </div>
      {view === 'sender' ? <SenderView /> : <ReceiverView />}
    </div>
  );
}

// --- App Component (The Master Router) ---
function App() {
  const { isLoggedIn, user, logout, authReady } = useContext(AuthContext);
  const [publicPage, setPublicPage] = useState('home');
  const [isEditingProfile, setIsEditingProfile] = useState(false); // New state for routing

  // If the initial auth check isn't done, show a loading screen
  if (!authReady) {
    return <div className="loading-fullscreen"><h1>Loading Relay...</h1></div>;
  }

  // If the user is logged in and wants to edit their profile, show that page
  if (isLoggedIn && isEditingProfile) {
    return <EditProfilePage onBack={() => setIsEditingProfile(false)} />;
  }

  // If the user is logged in, decide which main view to show
  if (isLoggedIn && user) {
    return user.partnerId 
      ? <MainApp user={user} onLogout={logout} onEditProfile={() => setIsEditingProfile(true)} /> 
      : <ConnectPage />;
  }
  
  // If not logged in, show public pages
  if (publicPage === 'auth') {
    return <AuthPage />;
  }
  
  return <HomePage onNavigate={() => setPublicPage('auth')} />;
}


// --- SenderView (Modified to handle rejections) ---
function SenderView() {
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState({});
  const [sentOrders, setSentOrders] = useState([]);

  useEffect(() => {
    const handleOrderSaved = ({ tempId, dbId }) => {
      setSentOrders(prev => 
        prev.map(o => (o.tempId === tempId ? { ...o, _id: dbId, status: 'pending' } : o))
      );
    };
    const handleOrderAcknowledged = (acknowledgedOrderId) => {
      setSentOrders(prev =>
        prev.map(o => (o._id === acknowledgedOrderId ? { ...o, status: 'acknowledged' } : o))
      );
      setTimeout(() => {
        setSentOrders(prev => prev.filter(o => o._id !== acknowledgedOrderId));
      }, 3000);
    };
    
    // --- NEW: Listen for the 'order_rejected' event ---
    const handleOrderRejected = (rejectedOrderId) => {
        setSentOrders(prev =>
            prev.map(o => (o._id === rejectedOrderId ? { ...o, status: 'rejected' } : o))
        );
        // Optional: Remove the rejected card after a longer period
        setTimeout(() => {
            setSentOrders(prev => prev.filter(o => o._id !== rejectedOrderId));
        }, 8000); // Remove after 8 seconds
    };

    socket.on('order_saved', handleOrderSaved);
    socket.on('order_acknowledged', handleOrderAcknowledged);
    socket.on('order_rejected', handleOrderRejected); // Add the new listener

    return () => {
      socket.off('order_saved', handleOrderSaved);
      socket.off('order_acknowledged', handleOrderAcknowledged);
      socket.off('order_rejected', handleOrderRejected); // Clean up the listener
    };
  }, []);

  const sendOrder = () => {
    const itemsToSend = Object.entries(order).filter(([, qty]) => qty > 0).reduce((acc, [id, qty]) => ({ ...acc, [id]: qty }), {});
    if (Object.keys(itemsToSend).length > 0 && user?._id) {
      const tempId = `temp_${Date.now()}`;
      const tempOrder = { tempId, items: itemsToSend, status: 'sending' };
      setSentOrders(prev => [...prev, tempOrder]);
      socket.emit('send_order', { items: itemsToSend, senderId: user._id, tempId });
      setOrder({});
    }
  };
  
  const getOrderItemName = (itemId) => MENU_ITEMS.find(i => i.id == itemId)?.name || 'Unknown';
  
  return (
    <>
     <header className="app-header"><h1>Send Request</h1><p>Send to: {user.partnerId?.displayName || '...'}</p></header>
      <div className="status-card-container">{sentOrders.map(ord => (
          <div key={ord.tempId || ord._id} className={`status-card ${ord.status}`}>
            <h4>
              {ord.status === 'sending' && 'Sending...'}
              {ord.status === 'pending' && 'Sent!'}
              {ord.status === 'acknowledged' && 'Seen ✅'}
              {/* --- NEW: Display for rejected status --- */}
              {ord.status === 'rejected' && `Rejected by ${user.partnerId?.displayName || 'Receiver'} ❌`}
            </h4>
            {/* Only show order items if not rejected */}
            {ord.status !== 'rejected' && (
                <ul>{Object.entries(ord.items).map(([id, qty]) => <li key={id}>{getOrderItemName(id)} (x{qty})</li>)}</ul>
            )}
          </div>))}
      </div>
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
      <button className="send-order-button" onClick={sendOrder}>Send Request</button>
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
      } catch (error) {
        console.error("Failed to fetch pending orders:", error);
      }
    }
    fetchPendingOrder();

    const handleReceiveOrder = (orderData) => setActiveOrder(orderData);
    socket.on('receive_order', handleReceiveOrder);
    return () => socket.off('receive_order', handleReceiveOrder);
  }, [token]);

  const handleAcknowledge = () => {
    if (activeOrder && user?._id) {
      socket.emit('acknowledge_order', { orderId: activeOrder._id, receiverId: user._id });
      setActiveOrder(null);
    }
  };
  
  // --- NEW: Function to handle rejecting an order ---
  const handleReject = () => {
    if (activeOrder && user?._id) {
        socket.emit('reject_order', { orderId: activeOrder._id, receiverId: user._id });
        setActiveOrder(null);
    }
  };

  const getOrderItemName = (itemId) => MENU_ITEMS.find(i => i.id == itemId)?.name || 'Unknown';
  
  return (
    <>
      <header className="app-header"><h1>Incoming Orders</h1><p>From: {user.partnerId?.displayName || '...'}</p></header>
      <div className="order-display">{activeOrder ? (
          <div className="order-card animate-fade-in">
            <h3>New Order Received!</h3>
            <ul>{Object.entries(activeOrder.items).map(([itemId, quantity]) => (
                <li key={itemId}><span>{getOrderItemName(itemId)}</span><span className="order-quantity">x {quantity}</span></li>
              ))}</ul>
            {/* --- NEW: Button container and Reject button --- */}
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
