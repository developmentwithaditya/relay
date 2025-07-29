// frontend/src/App.jsx
import React, { useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './context/AuthContext';
import { MENU_ITEMS } from './menuItems';
import HomePage from './HomePage';
import AuthPage from './AuthPage';
import ConnectPage from './ConnectPage';
import './App.css';

const socket = io('http://localhost:3001');

// --- Main Application Component (For connected users) ---
function MainApp({ user, onLogout }) {
  const view = user.role;
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // --- FIX: Ensure user._id exists before emitting ---
    if (user?._id) {
      console.log(`Registering socket for user: ${user._id}`);
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
        <div className="status-bar">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{user?.email}</span>
        </div>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>
      {view === 'sender' ? <SenderView /> : <ReceiverView />}
    </div>
  );
}

// --- The App Component is the MASTER ROUTER ---
function App() {
  const { isLoggedIn, user, logout, authReady } = useContext(AuthContext);
  const [publicPage, setPublicPage] = useState('home');

  if (!authReady) {
    return <div className="loading-fullscreen"><h1>Loading Relay...</h1></div>;
  }

  if (isLoggedIn && user) {
    return user.partnerId ? <MainApp user={user} onLogout={logout} /> : <ConnectPage />;
  }

  if (publicPage === 'auth') {
    return <AuthPage />;
  }
  
  return <HomePage onNavigate={() => setPublicPage('auth')} />;
}

// --- Sender & Receiver components (FIXED to use user._id) ---

function SenderView() {
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState({});
  const [sentOrders, setSentOrders] = useState([]);

  useEffect(() => {
    const handleOrderAcknowledged = (acknowledgedOrderId) => {
      setSentOrders(prev => prev.filter(o => o.tempId !== acknowledgedOrderId));
    };
    socket.on('order_acknowledged', handleOrderAcknowledged);
    return () => socket.off('order_acknowledged', handleOrderAcknowledged);
  }, []);

  const sendOrder = () => {
    const itemsToSend = Object.entries(order).filter(([, qty]) => qty > 0).reduce((acc, [id, qty]) => ({ ...acc, [id]: qty }), {});
    if (Object.keys(itemsToSend).length > 0 && user?._id) { // Check for user._id
      const tempOrder = { tempId: `temp_${Date.now()}`, items: itemsToSend };
      setSentOrders(prev => [...prev, tempOrder]);
      socket.emit('send_order', { items: itemsToSend, senderId: user._id });
      setOrder({});
    }
  };
  
  const getOrderItemName = (itemId) => MENU_ITEMS.find(i => i.id == itemId)?.name || 'Unknown';
  
  return (
    <>
      <header className="app-header"><h1>Send Request</h1><p>Send to: {user.partnerId?.email || '...'}</p></header>
      <div className="status-card-container">{sentOrders.map(ord => (
          <div key={ord.tempId} className={`status-card pending`}>
            <h4>Order Sent...</h4>
            <ul>{Object.entries(ord.items).map(([id, qty]) => <li key={id}>{getOrderItemName(id)} (x{qty})</li>)}</ul>
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
  const { user } = useContext(AuthContext);
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    const handleReceiveOrder = (orderData) => setActiveOrder(orderData);
    socket.on('receive_order', handleReceiveOrder);
    return () => socket.off('receive_order', handleReceiveOrder);
  }, []);

  const handleAcknowledge = () => {
    if (activeOrder && user?._id) { // Check for user._id
      socket.emit('acknowledge_order', { orderId: activeOrder._id, receiverId: user._id });
      setActiveOrder(null);
    }
  };
  
  const getOrderItemName = (itemId) => MENU_ITEMS.find(i => i.id == itemId)?.name || 'Unknown';
  
  return (
    <>
      <header className="app-header"><h1>Incoming Orders</h1><p>From: {user.partnerId?.email || '...'}</p></header>
      <div className="order-display">{activeOrder ? (
          <div className="order-card animate-fade-in">
            <h3>New Order Received!</h3>
            <ul>{Object.entries(activeOrder.items).map(([itemId, quantity]) => (
                <li key={itemId}><span>{getOrderItemName(itemId)}</span><span className="order-quantity">x {quantity}</span></li>
              ))}</ul>
            <button className="acknowledge-button" onClick={handleAcknowledge}>Acknowledge & Clear</button>
          </div>) : (<p className="waiting-text">Waiting for new orders...</p>)}
      </div>
    </>
  );
}

export default App;
