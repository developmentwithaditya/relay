// frontend/src/App.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { socket } from './services/api';
import apiRequest from './services/api';
import { MENU_ITEMS } from './menuItems';
import HomePage from './HomePage';
import AuthPage from './AuthPage';
import ConnectPage from './ConnectPage';
import './App.css';

// --- MainApp and App components are unchanged ---
function MainApp({ user, onLogout }) {
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


// --- SenderView with DEFINITIVE FIX ---
function SenderView() {
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState({});
  const [sentOrders, setSentOrders] = useState([]); // This will hold objects like { tempId, _id, items, status }

  useEffect(() => {
    // This listener links the temporary card with the real order from the database
    const handleOrderSaved = ({ tempId, dbId }) => {
      setSentOrders(prevOrders =>
        prevOrders.map(o =>
          o.tempId === tempId ? { ...o, _id: dbId, status: 'pending' } : o
        )
      );
    };

    // This listener handles the final acknowledgment
    const handleOrderAcknowledged = (acknowledgedOrderId) => {
      // First, find the order and mark it as 'acknowledged'
      setSentOrders(prevOrders =>
        prevOrders.map(o =>
          o._id === acknowledgedOrderId ? { ...o, status: 'acknowledged' } : o
        )
      );

      // Then, set a timer to remove the "Seen" card after a few seconds for a clean UI
      setTimeout(() => {
        setSentOrders(prevOrders =>
          prevOrders.filter(o => o._id !== acknowledgedOrderId)
        );
      }, 3000); // Remove after 3 seconds
    };

    socket.on('order_saved', handleOrderSaved);
    socket.on('order_acknowledged', handleOrderAcknowledged);

    return () => {
      socket.off('order_saved', handleOrderSaved);
      socket.off('order_acknowledged', handleOrderAcknowledged);
    };
  }, []);

  const sendOrder = () => {
    const itemsToSend = Object.entries(order).filter(([, qty]) => qty > 0).reduce((acc, [id, qty]) => ({ ...acc, [id]: qty }), {});
    if (Object.keys(itemsToSend).length > 0 && user?._id) {
      const tempId = `temp_${Date.now()}`;
      // Immediately add a card to the UI with a 'sending' status
      const tempOrder = { tempId, items: itemsToSend, status: 'sending' };
      setSentOrders(prev => [...prev, tempOrder]);
      
      // Send the order to the backend with the temporary ID
      socket.emit('send_order', { items: itemsToSend, senderId: user._id, tempId });
      setOrder({});
    }
  };
  
  const getOrderItemName = (itemId) => MENU_ITEMS.find(i => i.id == itemId)?.name || 'Unknown';
  
  return (
    <>
      <header className="app-header"><h1>Send Request</h1><p>Send to: {user.partnerId?.email || '...'}</p></header>
      <div className="status-card-container">
        {sentOrders.map(ord => (
          // Use the tempId as the key because it's guaranteed to be unique and stable
          <div key={ord.tempId} className={`status-card ${ord.status}`}>
            <h4>
              {ord.status === 'sending' && 'Sending...'}
              {ord.status === 'pending' && 'Sent!'}
              {ord.status === 'acknowledged' && 'Seen ✅'}
            </h4>
            <ul>{Object.entries(ord.items).map(([id, qty]) => <li key={id}>{getOrderItemName(id)} (x{qty})</li>)}</ul>
          </div>
        ))}
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

// --- ReceiverView is unchanged ---
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
