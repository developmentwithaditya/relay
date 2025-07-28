// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { MENU_ITEMS } from './menuItems';
import './App.css';

const socket = io('http://localhost:3001');

// --- Sender Component (Dad's View) ---
function SenderView() {
  const [order, setOrder] = useState({});
  const [sentOrders, setSentOrders] = useState([]);

  useEffect(() => {
    // --- FIX: Listen for the new confirmation event ---
    const handleOrderSentSuccessfully = ({ tempId, newDbId }) => {
      // Update the temporary order with the real ID from the database
      setSentOrders(prevOrders =>
        prevOrders.map(o => (o._id === tempId ? { ...o, _id: newDbId } : o))
      );
    };

    const handleOrderAcknowledged = (acknowledgedOrderId) => {
      setSentOrders(prevOrders =>
        prevOrders.map(o =>
          o._id === acknowledgedOrderId ? { ...o, status: 'acknowledged' } : o
        )
      );
      setTimeout(() => {
        setSentOrders(prevOrders => prevOrders.filter(o => o._id !== acknowledgedOrderId));
      }, 4000);
    };

    socket.on('order_sent_successfully', handleOrderSentSuccessfully);
    socket.on('order_acknowledged', handleOrderAcknowledged);

    return () => {
      socket.off('order_sent_successfully', handleOrderSentSuccessfully);
      socket.off('order_acknowledged', handleOrderAcknowledged);
    };
  }, []);

  const sendOrder = () => {
    const itemsToSend = Object.entries(order).filter(([, qty]) => qty > 0).reduce((acc, [id, qty]) => ({ ...acc, [id]: qty }), {});
    if (Object.keys(itemsToSend).length > 0) {
      const tempId = `temp_${Date.now()}`; // Create a unique temporary ID
      const tempOrder = { _id: tempId, items: itemsToSend, status: 'pending' };
      setSentOrders(prev => [...prev, tempOrder]);
      
      // MODIFIED: Send the items and the temporary ID
      socket.emit('send_order', { items: itemsToSend, tempId: tempId });
      setOrder({});
    }
  };

  const getOrderItemName = (itemId) => MENU_ITEMS.find(i => i.id == itemId)?.name || 'Unknown';

  return (
    <>
      <header className="app-header"><h1>Send Request</h1><p>Select items for the guests</p></header>
      <div className="status-card-container">{sentOrders.map(ord => (
          <div key={ord._id} className={`status-card ${ord.status}`}>
            <h4>Order Status: {ord.status === 'acknowledged' ? 'Seen ✅' : 'Sent...'}</h4>
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

// --- Receiver Component (No changes needed) ---
function ReceiverView() {
  const [activeOrder, setActiveOrder] = useState(null);
  useEffect(() => {
    async function fetchPendingOrder() {
      try {
        const response = await fetch('http://localhost:3001/api/pending-orders');
        const order = await response.json();
        if (order) setActiveOrder(order);
      } catch (error) { console.error("Failed to fetch pending orders:", error); }
    }
    fetchPendingOrder();
    const handleReceiveOrder = (orderData) => setActiveOrder(orderData);
    socket.on('receive_order', handleReceiveOrder);
    return () => socket.off('receive_order', handleReceiveOrder);
  }, []);
  const handleAcknowledge = () => {
    if (activeOrder) {
      socket.emit('acknowledge_order', activeOrder._id);
      setActiveOrder(null);
    }
  };
  const getOrderItemName = (itemId) => MENU_ITEMS.find(i => i.id == itemId)?.name || 'Unknown';
  return (
    <>
      <header className="app-header"><h1>Incoming Orders</h1><p>New requests will appear here automatically.</p></header>
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

// --- Main App Component (No changes needed) ---
function App() {
  const [view, setView] = useState('sender');
  const [isConnected, setIsConnected] = useState(socket.connected);
  useEffect(() => {
    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);
  return (
    <div className="app-container">
      <div className="status-bar">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="view-switcher">
        <button onClick={() => setView('sender')} className={view === 'sender' ? 'active' : ''}>Dad's View</button>
        <button onClick={() => setView('receiver')} className={view === 'receiver' ? 'active' : ''}>Mom's View</button>
      </div>
      {view === 'sender' ? <SenderView /> : <ReceiverView />}
    </div>
  );
}

export default App;
  