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

// --- MainApp Component (For connected users) ---
function MainApp({ user, onLogout, onEditProfile }) {
  const { theme, toggleTheme } = useTheme();
  const view = user.role;
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  const [presetManagerState, setPresetManagerState] = useState({ 
    isOpen: false, 
    mode: 'add', 
    presetId: null 
  });

  useEffect(() => {
    const registerSocket = () => {
      if (user?._id) socket.emit('register_socket', user._id);
    };
    const onConnect = () => {
      setIsConnected(true);
      registerSocket();
    };
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) registerSocket();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [user]);

  if (view === 'sender' && presetManagerState.isOpen) {
    return (
      <PresetManagerPage
        onBack={() => setPresetManagerState({ isOpen: false, mode: 'add', presetId: null })}
        mode={presetManagerState.mode}
        presetId={presetManagerState.presetId}
      />
    );
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
          {view === 'sender' && (
            <button onClick={() => setPresetManagerState({ isOpen: true, mode: 'add', presetId: null })} className="manage-presets-button">
              Manage Presets
            </button>
          )}
          <button onClick={onEditProfile} className="edit-profile-button">Edit</button>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </div>
      {view === 'sender' ? (
        <SenderView onEditPreset={(presetId) => setPresetManagerState({ isOpen: true, mode: 'edit', presetId })} />
      ) : (
        <ReceiverView />
      )}
    </div>
  );
}

// --- App Component (The Master Router) ---
function App() {
  const { isLoggedIn, user, logout, authReady } = useContext(AuthContext);
  const [publicPage, setPublicPage] = useState('home');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  if (!authReady) return <div className="loading-fullscreen"><h1>Loading Relay...</h1></div>;
  if (isLoggedIn && isEditingProfile) return <EditProfilePage onBack={() => setIsEditingProfile(false)} />;
  if (isLoggedIn && user) return user.partnerId ? <MainApp user={user} onLogout={logout} onEditProfile={() => setIsEditingProfile(true)} /> : <ConnectPage />;
  if (publicPage === 'auth') return <AuthPage />;
  return <HomePage onGetStarted={() => setPublicPage('auth')} />;
}


// --- SenderView ---
function SenderView({ onEditPreset }) {
  const { user, token, refreshUserData } = useContext(AuthContext);
  const [sentOrders, setSentOrders] = useState([]);
  const [quickRequestItems, setQuickRequestItems] = useState({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');

  const presetsByCategory = useMemo(() => {
    if (!user?.presets) return {};
    return user.presets.reduce((acc, preset) => {
      (acc[preset.category] = acc[preset.category] || []).push(preset);
      return acc;
    }, {});
  }, [user?.presets]);

  // Combine default menu items with user's saved custom items for the grid
  const availableItems = useMemo(() => {
    const userCustomItems = user.customItems?.map(name => ({
      id: name, // Use the name as a unique ID for React keys
      name: name,
      icon: '📝', // A generic icon for custom items
      isCustom: true,
    })) || [];
    return [...MENU_ITEMS, ...userCustomItems];
  }, [user.customItems]);

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

  const handleQuickItemChange = (itemId, newQuantity) => {
    const qty = Math.max(0, newQuantity);
    if (qty === 0) {
      const { [itemId]: _, ...rest } = quickRequestItems;
      setQuickRequestItems(rest);
    } else {
      setQuickRequestItems(prev => ({ ...prev, [itemId]: qty }));
    }
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (customItemName && customItemName.trim() !== "") {
      const trimmedName = customItemName.trim();
      setQuickRequestItems(prev => ({ ...prev, [trimmedName]: (prev[trimmedName] || 0) + 1 }));
      setCustomItemName('');
      setIsModalOpen(false);
    }
  };

  const handleSaveItem = async (itemName) => {
    try {
      await apiRequest('/api/custom-items', { method: 'POST', token, body: { itemName } });
      await refreshUserData();
    } catch (error) {
      console.error("Failed to save item:", error);
      alert(error.message);
    }
  };

  const handleDeleteSavedItem = async (itemName) => {
    if (!window.confirm(`Permanently delete "${itemName}" from your saved items?`)) return;
    try {
      await apiRequest(`/api/custom-items/${encodeURIComponent(itemName)}`, { method: 'DELETE', token });
      await refreshUserData();
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert(error.message);
    }
  };

  const sendOrder = (items) => {
    let itemsToSend = {};
    if (Array.isArray(items)) {
        itemsToSend = items.reduce((acc, item) => ({ ...acc, [item.name]: item.quantity }), {});
    } else {
        itemsToSend = items;
    }
    if (Object.keys(itemsToSend).length > 0 && user?._id) {
      const tempId = `temp_${Date.now()}`;
      const tempOrder = { tempId, items: itemsToSend, status: 'sending' };
      setSentOrders(prev => [...prev, tempOrder]);
      socket.emit('send_order', { items: itemsToSend, senderId: user._id, tempId });
      setQuickRequestItems({});
    }
  };
  
  return (
    <>
     {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Add Custom Item</h3>
            <form onSubmit={handleAddCustomItem}>
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="e.g., Bread, Milk..."
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

     <header className="app-header"><h1>Send Request</h1><p>Send to: {user.partnerId?.displayName || '...'}</p></header>
      <div className="status-card-container">
        {sentOrders.map(ord => (
          <div key={ord.tempId || ord._id} className={`status-card ${ord.status}`}>
            <h4>
              {ord.status === 'sending' && 'Sending...'}
              {ord.status === 'pending' && 'Sent!'}
              {ord.status === 'acknowledged' && 'Seen ✅'}
              {ord.status === 'rejected' && `Rejected by ${user.partnerId?.displayName || 'Receiver'} ❌`}
            </h4>
            {ord.status !== 'rejected' && (
                <ul>{Object.entries(ord.items).map(([name, qty]) => <li key={name}>{MENU_ITEMS.find(i => i.id == name)?.name || name} (x{qty})</li>)}</ul>
            )}
          </div>))}
      </div>

      <div className="presets-section">
        <h3>Your Presets</h3>
        {user.presets?.length > 0 ? (
          Object.keys(presetsByCategory).map(category => (
            <div key={category} className="preset-category">
              <h5>{category}</h5>
              <div className="preset-grid">
                {presetsByCategory[category].map(preset => (
                  <div key={preset._id} className="preset-card">
                    <span className="preset-name">{preset.name}</span>
                    <div className="preset-card-actions">
                      <button onClick={() => onEditPreset(preset._id)} className="preset-action-btn">Edit</button>
                      <button onClick={() => sendOrder(preset.customItems)} className="preset-action-btn send">Send</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : <p className="no-presets-text">Click 'Manage Presets' to create your first one!</p>}
      </div>

      <div className="custom-order-section">
        <h3>Quick Request</h3>
        <div className="quick-request-builder">
          <div className="available-items">
            <div className="available-items-header">
              <h4>Add an Item</h4>
              <button className="add-custom-item-btn" onClick={() => setIsModalOpen(true)}>+ Custom</button>
            </div>
            <div className="item-grid">
              {availableItems.map(item => (
                <div key={item.id} className="add-item-card-wrapper">
                  <button className="add-item-card" onClick={() => setQuickRequestItems(p => ({...p, [item.name]: (p[item.name] || 0) + 1}))}>
                    <span className="item-icon">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                  {item.isCustom && (
                    <button className="delete-saved-item-btn" onClick={() => handleDeleteSavedItem(item.name)}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="current-request">
            <h4>Current List</h4>
            {Object.keys(quickRequestItems).length > 0 ? (
              <div className="request-list">
                {Object.entries(quickRequestItems).map(([name, qty]) => {
                  const isSaved = user.customItems?.includes(name);
                  const isPredefined = MENU_ITEMS.some(i => i.name === name);
                  return (
                    <div key={name} className="menu-item quick-request-item">
                      <span className="item-name">{name}</span>
                      <div className="item-controls">
                        {!isSaved && !isPredefined && (
                          <button className="save-quick-item-btn" onClick={() => handleSaveItem(name)} title="Save for later">
                            +
                          </button>
                        )}
                        <div className="quantity-selector">
                          <button onClick={() => handleQuickItemChange(name, qty - 1)}>-</button>
                          <span>{qty}</span>
                          <button onClick={() => handleQuickItemChange(name, qty + 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="no-items-text">Click an item to add it.</p>}
          </div>
        </div>
        <button className="send-order-button" onClick={() => sendOrder(quickRequestItems)} disabled={Object.keys(quickRequestItems).length === 0}>
          Send Quick Request
        </button>
      </div>
    </>
  );
}

// --- ReceiverView ---
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
