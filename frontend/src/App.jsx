// frontend/src/App.jsx
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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

  // **NEW**: State and ref for rate limiting
  const [requestTimestamps, setRequestTimestamps] = useState([]);
  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldownIntervalRef = useRef(null);

  // **NEW**: Effect to manage the cooldown timer
  useEffect(() => {
    if (cooldownTime > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTime(prev => Math.max(0, prev - 1));
      }, 1000);
    } else {
      clearInterval(cooldownIntervalRef.current);
    }
    return () => clearInterval(cooldownIntervalRef.current);
  }, [cooldownTime]);


  const presetsByCategory = useMemo(() => {
    if (!user?.presets) return {};
    return user.presets.reduce((acc, preset) => {
      (acc[preset.category] = acc[preset.category] || []).push(preset);
      return acc;
    }, {});
  }, [user?.presets]);

  const availableItems = useMemo(() => {
    const userCustomItems = user.customItems?.map(name => ({
      id: name, name: name, icon: '📝', isCustom: true,
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

      // --- STEP 3: Listen for new individual item feedback events ---
    const handleItemAcknowledged = ({ orderId, itemName, receiverName }) => {
      setSentOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          const feedback = `${receiverName} acknowledged ${itemName}.`;
          return { ...o, itemFeedback: [...(o.itemFeedback || []), feedback] };
        }
        return o;
      }));
    };
    const handleItemRejected = ({ orderId, itemName, receiverName }) => {
      setSentOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          const feedback = `${receiverName} rejected ${itemName}.`;
          return { ...o, itemFeedback: [...(o.itemFeedback || []), feedback] };
        }
        return o;
      }));
    };

 // **NEW**: Listen for queue full event from server
    const handleQueueFull = () => {
        alert("Your partner's request queue is full. Please wait for them to clear some requests.");
    };
    socket.on('order_saved', handleOrderSaved);
    socket.on('order_acknowledged', handleOrderAcknowledged);
    socket.on('order_rejected', handleOrderRejected);
    socket.on('sender_item_acknowledged', handleItemAcknowledged);
    socket.on('sender_item_rejected', handleItemRejected);
    socket.on('queue_full', handleQueueFull);

    return () => {
      socket.off('order_saved', handleOrderSaved);
      socket.off('order_acknowledged', handleOrderAcknowledged);
      socket.off('order_rejected', handleOrderRejected);
      socket.off('sender_item_acknowledged', handleItemAcknowledged);
      socket.off('sender_item_rejected', handleItemRejected);
      socket.off('queue_full', handleQueueFull);
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
      // 1. Check if currently in cooldown
    if (cooldownTime > 0) {
      alert(`Please wait ${cooldownTime} more seconds before sending another request.`);
      return;
    }

    // 2. Check the rate limit (5 requests in 15 seconds)
    const now = Date.now();
    const fifteenSecondsAgo = now - 15000;
    const recentRequests = requestTimestamps.filter(ts => ts > fifteenSecondsAgo);

    if (recentRequests.length >= 5) {
      alert("You have sent too many requests. Please wait 15 seconds.");
      setCooldownTime(15);
      setRequestTimestamps(recentRequests); // Keep the recent ones for the next check
      return;
    }

     // 3. Proceed with sending the order
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
      setRequestTimestamps([...recentRequests, now]);
      setQuickRequestItems({});
    }
  };
  
  // **NEW**: Disable send button if in cooldown
  const isSendDisabled = cooldownTime > 0;

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
      {/* **NEW**: Cooldown Timer Display */}
     {isSendDisabled && (
        <div className="cooldown-banner">
            Rate limit reached. Please wait {cooldownTime}s.
        </div>
     )}

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
             {/* --- STEP 3: Display individual item feedback --- */}
             {ord.itemFeedback && ord.itemFeedback.length > 0 && (
              <div className="item-feedback-log">
                {ord.itemFeedback.map((msg, index) => (
                  <p key={index}>{msg}</p>
                ))}
              </div>
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
                      <button onClick={() => onEditPreset(preset._id)} className="preset-action-btn" disabled={isSendDisabled}>Edit</button>
                      <button onClick={() => sendOrder(preset.customItems)} className="preset-action-btn send" disabled={isSendDisabled}>Send</button>
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
        <button className="send-order-button" onClick={() => sendOrder(quickRequestItems)} disabled={Object.keys(quickRequestItems).length === 0 || isSendDisabled}>
          {isSendDisabled ? `Wait ${cooldownTime}s` : 'Send Quick Request'}
        </button>
      </div>
    </>
  );
}

// ...existing code...

// --- ReceiverView ---
function ReceiverView() {
  const { user, token } = useContext(AuthContext);
  const [activeOrder, setActiveOrder] = useState(null);
  // --- STEP 1: State to track individual item statuses for UI feedback ---
  // **MODIFIED**: State now holds an array of orders, not just one
  const [pendingOrders, setPendingOrders] = useState([]);
  const [itemStatuses, setItemStatuses] = useState({});
  
  useEffect(() => {
    // **MODIFIED**: Fetch initial list of pending orders
    async function fetchPendingOrders() {
      if (!token) return;
      try {
        const orders = await apiRequest('/api/pending-orders', { token });
        if (orders) setPendingOrders(orders);
      } catch (error) { 
        console.error("Failed to fetch pending orders:", error); 
      }
    }
    fetchPendingOrders();

    // **MODIFIED**: Listen for the new event that sends the whole list
    const handleOrderListUpdated = (ordersData) => {
      setPendingOrders(ordersData);
      // **FIXED**: Reset item statuses for the new list, don't reference undefined variables
      setItemStatuses({});
    };
    
    socket.on('order_list_updated', handleOrderListUpdated);
    return () => socket.off('order_list_updated', handleOrderListUpdated);
  }, [token]);

  // --- STEP 1 & 2: Handlers for individual item actions ---
  const handleItemAcknowledge = (orderId, itemName) => {
    // **FIXED**: Use orderId parameter instead of activeOrder
    socket.emit('item_acknowledged', {
      orderId: orderId,
      itemName: itemName,
      receiverId: user._id
    });
    // Give instant visual feedback
    setItemStatuses(prev => ({ ...prev, [`${orderId}-${itemName}`]: 'acknowledged' }));
  };

  const handleItemReject = (orderId, itemName) => {
    // **FIXED**: Use orderId parameter instead of activeOrder
    socket.emit('item_rejected', {
      orderId: orderId,
      itemName: itemName,
      receiverId: user._id
    });
    // Give instant visual feedback
    setItemStatuses(prev => ({ ...prev, [`${orderId}-${itemName}`]: 'rejected' }));
  };

  // **MODIFIED**: Actions now need the specific orderId
  const handleAcknowledge = (orderId) => {
    if (orderId) {
      socket.emit('acknowledge_order', { orderId, receiverId: user._id });
      // Optimistic update: remove the order from the list immediately
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      // **FIXED**: Clear item statuses for this order when acknowledging
      setItemStatuses(prev => {
        const newStatuses = { ...prev };
        Object.keys(newStatuses).forEach(key => {
          if (key.startsWith(`${orderId}-`)) {
            delete newStatuses[key];
          }
        });
        return newStatuses;
      });
    }
  };

  const handleReject = (orderId) => {
    if (orderId) {
      socket.emit('reject_order', { orderId, receiverId: user._id });
      // Optimistic update
      setPendingOrders(prev => prev.filter(o => o._id !== orderId));
      // **FIXED**: Clear item statuses for this order when rejecting
      setItemStatuses(prev => {
        const newStatuses = { ...prev };
        Object.keys(newStatuses).forEach(key => {
          if (key.startsWith(`${orderId}-`)) {
            delete newStatuses[key];
          }
        });
        return newStatuses;
      });
    }
  };

  return (
    <>
      <header className="app-header"><h1>Incoming Requests</h1><p>From: {user.partnerId?.displayName || '...'}</p></header>
      <div className="order-display">
        {/* Check if there are any pending orders to display */}
        {pendingOrders.length > 0 ? (
          <div className="order-list-container">
            {/* Create a card for each order in the pendingOrders array */}
            {pendingOrders.map(order => (
              <div key={order._id} className="order-card animate-fade-in">
                
                <div className="order-timestamp">
                  Received: {new Date(order.createdAt).toLocaleTimeString()}
                </div>

                {/* --- Item list with individual action buttons --- */}
                <ul className="receiver-item-list">
                  {Object.entries(order.items).map(([name, quantity]) => (
                    // The className applies visual feedback (like line-through) based on the item's status
                    <li key={name} className={`receiver-item ${itemStatuses[`${order._id}-${name}`] || ''}`}>
                      <span className="receiver-item-name">{name} (x{quantity})</span>
                      <div className="receiver-item-actions">
                        {/* **FIXED**: Only show buttons if item hasn't been acted upon */}
                        {!itemStatuses[`${order._id}-${name}`] && (
                          <>
                            <button onClick={() => handleItemReject(order._id, name)} className="item-action-btn reject">✗</button>
                            <button onClick={() => handleItemAcknowledge(order._id, name)} className="item-action-btn acknowledge">✓</button>
                          </>
                        )}
                        {/* **FIXED**: Show status indicator when item has been acted upon */}
                        {itemStatuses[`${order._id}-${name}`] === 'acknowledged' && <span className="status-indicator acknowledged">✓</span>}
                        {itemStatuses[`${order._id}-${name}`] === 'rejected' && <span className="status-indicator rejected">✗</span>}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Main actions for the entire order */}
                <div className="order-actions">
                  <button className="reject-button" onClick={() => handleReject(order._id)}>Reject All</button>
                  <button className="acknowledge-button" onClick={() => handleAcknowledge(order._id)}>Acknowledge All</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Message to show when the order list is empty
          <p className="waiting-text">Waiting for new requests...</p>
        )}
      </div>
    </>
  );
}

// ...existing code...

export default App;
