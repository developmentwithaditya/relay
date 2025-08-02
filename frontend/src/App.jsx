import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from "react";
import { AuthContext } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import apiRequest, { socket } from "./services/api";
import { MENU_ITEMS } from "./menuItems";
import HomePage from "./HomePage";
import AuthPage from "./AuthPage";
import ConnectPage from "./ConnectPage";
import EditProfilePage from "./EditProfilePage";
import PresetManagerPage from "./PresetManagerPage";
import OrderHistoryPage from './OrderHistoryPage';
import "./App.css";

// --- Enhanced Loading Component ---
function LoadingScreen({ message = "Loading Relay..." }) {
  return (
    <div className="loading-screen">
      <div className="loading-container">
        <div className="loading-logo">
          <div className="relay-icon">
            <div className="pulse-rings">
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
              <div className="pulse-ring"></div>
            </div>
            <div className="relay-symbol">⚡</div>
          </div>
        </div>
        <h1 className="loading-title">{message}</h1>
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    </div>
  );
}

// --- Enhanced Status Badge Component ---
function StatusBadge({ status, className = "" }) {
  const statusConfig = {
    sending: { icon: "⏳", text: "Sending", class: "status-sending" },
    pending: { icon: "📤", text: "Sent", class: "status-pending" },
    acknowledged: { icon: "✅", text: "Seen", class: "status-acknowledged" },
    rejected: { icon: "❌", text: "Rejected", class: "status-rejected" }
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className={`status-badge ${config.class} ${className}`}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-text">{config.text}</span>
    </div>
  );
}

// --- Enhanced Toast Notification Component ---
function ToastNotification({ message, type = "info", isVisible, onClose }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`toast-notification toast-${type} ${isVisible ? 'toast-show' : ''}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

// --- MainApp Component (Completely Redesigned) ---
function MainApp({ user, onLogout, onEditProfile }) {
  const { theme, toggleTheme } = useTheme();
  const view = user.role;
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  
  const [presetManagerState, setPresetManagerState] = useState({
    isOpen: false,
    mode: "add",
    presetId: null,
  });

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  useEffect(() => {
    const registerSocket = () => {
      if (user?._id) socket.emit("register_socket", user._id);
    };
    
    const onConnect = () => {
      setIsConnected(true);
      registerSocket();
      showToast("Connected to Relay", "success");
    };
    
    const onDisconnect = () => {
      setIsConnected(false);
      showToast("Connection lost. Reconnecting...", "warning");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) registerSocket();
    
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [user]);

  if (showOrderHistory) {
    return <OrderHistoryPage onBack={() => setShowOrderHistory(false)} />;
  }

  if (view === "sender" && presetManagerState.isOpen) {
    return (
      <PresetManagerPage
        onBack={() =>
          setPresetManagerState({ isOpen: false, mode: "add", presetId: null })
        }
        mode={presetManagerState.mode}
        presetId={presetManagerState.presetId}
      />
    );
  }

  return (
    <div className="relay-app">
      {/* Enhanced Header */}
      <header className="relay-header">
        <div className="header-container">
          {/* Connection Status Indicator */}
          <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="connection-dot"></div>
          </div>

          {/* Profile Section */}
          <div className="profile-section-new">
            <div className="profile-avatar-container">
              <img
                src={
                  user.profilePictureUrl ||
                  `https://ui-avatars.com/api/?name=${user.displayName
                    .split(" ")
                    .join("+")}&background=6366f1&color=fff&format=svg`
                }
                alt="Profile"
                className="profile-avatar-new"
              />
              <div className="avatar-ring"></div>
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{user.displayName}</h2>
              <p className="profile-role">{view === 'sender' ? 'Sender' : 'Receiver'}</p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="header-actions-new">
            <button
              onClick={toggleTheme}
              className="header-btn theme-btn"
              aria-label="Toggle theme"
            >
              <span className="btn-icon">{theme === "light" ? "🌙" : "☀️"}</span>
            </button>
            
            <button
              onClick={() => setShowOrderHistory(true)}
              className="header-btn history-btn"
              title="Order History"
            >
              <span className="btn-icon">📋</span>
            </button>
            
            {view === "sender" && (
              <button
                onClick={() =>
                  setPresetManagerState({
                    isOpen: true,
                    mode: "add",
                    presetId: null,
                  })
                }
                className="header-btn presets-btn"
              >
                <span className="btn-icon">⚙️</span>
                <span className="btn-text">Presets</span>
              </button>
            )}
            
            <button 
              onClick={onEditProfile} 
              className="header-btn edit-btn"
            >
              <span className="btn-icon">✏️</span>
              <span className="btn-text">Edit</span>
            </button>
            
            <button 
              onClick={onLogout} 
              className="header-btn logout-btn"
            >
              <span className="btn-icon">🚪</span>
              <span className="btn-text">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relay-main">
        {view === "sender" ? (
          <EnhancedSenderView
            onEditPreset={(presetId) =>
              setPresetManagerState({ isOpen: true, mode: "edit", presetId })
            }
            showToast={showToast}
          />
        ) : (
          <EnhancedReceiverView showToast={showToast} />
        )}
      </main>

      {/* Toast Notifications */}
      <ToastNotification
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}

// --- Enhanced Sender View ---
function EnhancedSenderView({ onEditPreset, showToast }) {
  const { user, token, refreshUserData } = useContext(AuthContext);
  const [sentOrders, setSentOrders] = useState([]);
  const [quickRequestItems, setQuickRequestItems] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [senderItemStatuses, setSenderItemStatuses] = useState({});
  const [requestTimestamps, setRequestTimestamps] = useState([]);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const cooldownIntervalRef = useRef(null);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTime > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTime((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      clearInterval(cooldownIntervalRef.current);
    }
    return () => clearInterval(cooldownIntervalRef.current);
  }, [cooldownTime]);

  // Fetch pending orders
  useEffect(() => {
    const fetchPendingOrders = async () => {
      if (!token) return;
      try {
        setIsLoadingOrders(true);
        const orders = await apiRequest("/api/pending-orders/sent", { token });
        if (orders && orders.length > 0) {
          const transformedOrders = orders.map(order => ({
            ...order,
            status: 'pending',
            itemFeedback: []
          }));
          setSentOrders(transformedOrders);
        }
      } catch (error) {
        console.error("Failed to fetch pending orders:", error);
        showToast("Failed to load orders", "error");
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchPendingOrders();
  }, [token, showToast]);

  const presetsByCategory = useMemo(() => {
    if (!user?.presets) return {};
    return user.presets.reduce((acc, preset) => {
      (acc[preset.category] = acc[preset.category] || []).push(preset);
      return acc;
    }, {});
  }, [user?.presets]);

  const availableItems = useMemo(() => {
    const userCustomItems =
      user.customItems?.map((name) => ({
        id: name,
        name: name,
        icon: "📝",
        isCustom: true,
      })) || [];
    return [...MENU_ITEMS, ...userCustomItems];
  }, [user.customItems]);

  // Socket event handlers
  useEffect(() => {
    const handleOrderSaved = ({ tempId, dbId }) => {
      setSentOrders((prev) =>
        prev.map((o) =>
          o.tempId === tempId ? { ...o, _id: dbId, status: "pending" } : o
        )
      );
      showToast("Order sent successfully!", "success");
    };

    const handleOrderAcknowledged = (id) => {
      setSentOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: "acknowledged" } : o))
      );
      setSenderItemStatuses((prev) => {
        const newStatuses = { ...prev };
        Object.keys(newStatuses).forEach((key) => {
          if (key.startsWith(`${id}-`)) {
            delete newStatuses[key];
          }
        });
        return newStatuses;
      });
      showToast("Order acknowledged!", "success");
      setTimeout(
        () => setSentOrders((prev) => prev.filter((o) => o._id !== id)),
        2000
      );
    };

    const handleOrderRejected = (id) => {
      setSentOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: "rejected" } : o))
      );
      setSenderItemStatuses((prev) => {
        const newStatuses = { ...prev };
        Object.keys(newStatuses).forEach((key) => {
          if (key.startsWith(`${id}-`)) {
            delete newStatuses[key];
          }
        });
        return newStatuses;
      });
      showToast("Order was rejected", "error");
      setTimeout(
        () => setSentOrders((prev) => prev.filter((o) => o._id !== id)),
        5000
      );
    };

    const handleItemAcknowledged = ({ orderId, itemName, receiverName }) => {
      setSentOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            const feedback = `${receiverName} acknowledged ${itemName}.`;
            return {
              ...o,
              itemFeedback: [...(o.itemFeedback || []), feedback],
            };
          }
          return o;
        })
      );
      setSenderItemStatuses((prev) => ({
        ...prev,
        [`${orderId}-${itemName}`]: "acknowledged",
      }));
    };

    const handleItemRejected = ({ orderId, itemName, receiverName }) => {
      setSentOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            const feedback = `${receiverName} rejected ${itemName}.`;
            return {
              ...o,
              itemFeedback: [...(o.itemFeedback || []), feedback],
            };
          }
          return o;
        })
      );
      setSenderItemStatuses((prev) => ({
        ...prev,
        [`${orderId}-${itemName}`]: "rejected",
      }));
    };

    const handleQueueFull = () => {
      showToast("Receiver's queue is full. Please wait.", "warning");
    };

    socket.on("order_saved", handleOrderSaved);
    socket.on("order_acknowledged", handleOrderAcknowledged);
    socket.on("order_rejected", handleOrderRejected);
    socket.on("sender_item_acknowledged", handleItemAcknowledged);
    socket.on("sender_item_rejected", handleItemRejected);
    socket.on("queue_full", handleQueueFull);

    return () => {
      socket.off("order_saved", handleOrderSaved);
      socket.off("order_acknowledged", handleOrderAcknowledged);
      socket.off("order_rejected", handleOrderRejected);
      socket.off("sender_item_acknowledged", handleItemAcknowledged);
      socket.off("sender_item_rejected", handleItemRejected);
      socket.off("queue_full", handleQueueFull);
    };
  }, [user, showToast]);

  const handleQuickItemChange = (itemId, newQuantity) => {
    const qty = Math.max(0, newQuantity);
    if (qty === 0) {
      const { [itemId]: _, ...rest } = quickRequestItems;
      setQuickRequestItems(rest);
    } else {
      setQuickRequestItems((prev) => ({ ...prev, [itemId]: qty }));
    }
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (customItemName && customItemName.trim() !== "") {
      const trimmedName = customItemName.trim();
      setQuickRequestItems((prev) => ({
        ...prev,
        [trimmedName]: (prev[trimmedName] || 0) + 1,
      }));
      setCustomItemName("");
      setIsModalOpen(false);
      showToast("Custom item added!", "success");
    }
  };

  const handleSaveItem = async (itemName) => {
    try {
      await apiRequest("/api/custom-items", {
        method: "POST",
        token,
        body: { itemName },
      });
      await refreshUserData();
      showToast("Item saved to your collection!", "success");
    } catch (error) {
      console.error("Failed to save item:", error);
      showToast("Failed to save item", "error");
    }
  };

  const handleDeleteSavedItem = async (itemName) => {
    if (
      !window.confirm(`Remove "${itemName}" from your saved items?`)
    )
      return;
    try {
      await apiRequest(`/api/custom-items/${encodeURIComponent(itemName)}`, {
        method: "DELETE",
        token,
      });
      await refreshUserData();
      showToast("Item removed", "info");
    } catch (error) {
      console.error("Failed to delete item:", error);
      showToast("Failed to remove item", "error");
    }
  };

  const sendOrder = (items) => {
    if (cooldownTime > 0) {
      showToast(`Please wait ${cooldownTime} more seconds`, "warning");
      return;
    }

    const now = Date.now();
    const fifteenSecondsAgo = now - 15000;
    const recentRequests = requestTimestamps.filter(
      (ts) => ts > fifteenSecondsAgo
    );

    if (recentRequests.length >= 5) {
      showToast("Too many requests. Please wait 15 seconds.", "warning");
      setCooldownTime(15);
      setRequestTimestamps(recentRequests);
      return;
    }

    let itemsToSend = {};
    if (Array.isArray(items)) {
      itemsToSend = items.reduce(
        (acc, item) => ({ ...acc, [item.name]: item.quantity }),
        {}
      );
    } else {
      itemsToSend = items;
    }
    
    if (Object.keys(itemsToSend).length > 0 && user?._id) {
      const tempId = `temp_${Date.now()}`;
      const tempOrder = { 
        tempId, 
        items: itemsToSend, 
        status: "sending",
        itemFeedback: [],
        createdAt: new Date().toISOString()
      };
      setSentOrders((prev) => [tempOrder, ...prev]);
      socket.emit("send_order", {
        items: itemsToSend,
        senderId: user._id,
        tempId,
      });
      setRequestTimestamps([...recentRequests, now]);
      setQuickRequestItems({});
    }
  };

  const formatOrderTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const isSendDisabled = cooldownTime > 0;

  return (
    <div className="sender-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Send Request</h1>
          <p className="page-subtitle">
            To: <span className="partner-name">{user.partnerId?.displayName || "Loading..."}</span>
          </p>
        </div>
        {cooldownTime > 0 && (
          <div className="cooldown-indicator">
            <div className="cooldown-timer">{cooldownTime}s</div>
            <div className="cooldown-text">Rate Limited</div>
          </div>
        )}
      </div>

      {/* Order Status Section */}
      <section className="orders-section">
        <div className="section-header">
          <h2 className="section-title">
            Your Orders
            {sentOrders.length > 0 && (
              <span className="orders-count">{sentOrders.length}</span>
            )}
          </h2>
        </div>
        
        <div className="orders-container">
          {isLoadingOrders ? (
            <div className="orders-loading">
              <div className="loading-spinner"></div>
              <p>Loading your orders...</p>
            </div>
          ) : sentOrders.length > 0 ? (
            <div className="orders-list">
              {sentOrders.map((order) => (
                <div
                  key={order.tempId || order._id}
                  className={`order-card-new ${order.status}`}
                >
                  <div className="order-header-new">
                    <StatusBadge status={order.status} />
                    <span className="order-timestamp">
                      {formatOrderTime(order.createdAt)}
                    </span>
                  </div>

                  {order.status !== "rejected" && (
                    <div className="order-items-list">
                      {Object.entries(order.items).map(([name, qty]) => {
                        const itemStatus = senderItemStatuses[`${order._id}-${name}`];
                        const menuItem = MENU_ITEMS.find((i) => i.id == name);
                        return (
                          <div
                            key={name}
                            className={`order-item ${itemStatus || ""}`}
                          >
                            <div className="item-info">
                              <span className="item-icon">
                                {menuItem?.icon || "📝"}
                              </span>
                              <span className="item-name">
                                {menuItem?.name || name}
                              </span>
                              <span className="item-quantity">×{qty}</span>
                            </div>
                            <div className="item-status">
                              {itemStatus === "acknowledged" && (
                                <div className="status-indicator-new acknowledged">✓</div>
                              )}
                              {itemStatus === "rejected" && (
                                <div className="status-indicator-new rejected">✗</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {order.itemFeedback && order.itemFeedback.length > 0 && (
                    <div className="feedback-section">
                      {order.itemFeedback.map((msg, index) => {
                        const isAcknowledged = msg.includes("acknowledged");
                        return (
                          <div
                            key={index}
                            className={`feedback-item ${isAcknowledged ? "positive" : "negative"}`}
                          >
                            <span className="feedback-icon">
                              {isAcknowledged ? "✅" : "❌"}
                            </span>
                            <span className="feedback-text">{msg}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📤</div>
              <h3>No Orders Yet</h3>
              <p>Send your first request below!</p>
            </div>
          )}
        </div>
      </section>

      {/* Presets Section */}
      <section className="presets-section-new">
        <div className="section-header">
          <h2 className="section-title">Quick Presets</h2>
        </div>
        
        {user.presets?.length > 0 ? (
          <div className="presets-container">
            {Object.keys(presetsByCategory).map((category) => (
              <div key={category} className="preset-category-new">
                <h3 className="category-title">{category}</h3>
                <div className="presets-grid">
                  {presetsByCategory[category].map((preset) => (
                    <div key={preset._id} className="preset-card-new">
                      <div className="preset-content">
                        <h4 className="preset-name-new">{preset.name}</h4>
                        <div className="preset-items-preview">
                          {preset.customItems.slice(0, 3).map((item, index) => (
                            <span key={index} className="preview-item">
                              {MENU_ITEMS.find(i => i.name === item.name)?.icon || "📝"}
                            </span>
                          ))}
                          {preset.customItems.length > 3 && (
                            <span className="more-items">+{preset.customItems.length - 3}</span>
                          )}
                        </div>
                      </div>
                      <div className="preset-actions">
                        <button
                          onClick={() => onEditPreset(preset._id)}
                          className="preset-btn edit-preset-btn"
                          disabled={isSendDisabled}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => sendOrder(preset.customItems)}
                          className="preset-btn send-preset-btn"
                          disabled={isSendDisabled}
                        >
                          🚀
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-presets">
            <div className="empty-icon">⚙️</div>
            <p>Create presets to send common orders quickly!</p>
          </div>
        )}
      </section>

      {/* Quick Request Builder */}
      <section className="quick-request-section">
        <div className="section-header">
          <h2 className="section-title">Quick Request</h2>
          <button
            className="add-custom-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <span className="btn-icon">➕</span>
            <span className="btn-text">Custom Item</span>
          </button>
        </div>

        {/* Available Items Grid */}
        <div className="items-grid">
          {availableItems.map((item) => (
            <div key={item.id} className="item-tile-container">
              <button
                className="item-tile"
                onClick={() =>
                  setQuickRequestItems((p) => ({
                    ...p,
                    [item.name]: (p[item.name] || 0) + 1,
                  }))
                }
              >
                <span className="tile-icon">{item.icon}</span>
                <span className="tile-name">{item.name}</span>
              </button>
              {item.isCustom && (
                <button
                  className="delete-item-btn"
                  onClick={() => handleDeleteSavedItem(item.name)}
                  title="Remove from saved items"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Current Request */}
        <div className="current-request">
          <h3 className="request-title">Current Request</h3>
          {Object.keys(quickRequestItems).length > 0 ? (
            <div className="request-items">
              {Object.entries(quickRequestItems).map(([name, qty]) => {
                const isSaved = user.customItems?.includes(name);
                const isPredefined = MENU_ITEMS.some((i) => i.name === name);
                const menuItem = MENU_ITEMS.find((i) => i.name === name);
                
                return (
                  <div key={name} className="request-item">
                    <div className="item-details">
                      <span className="item-icon-small">
                        {menuItem?.icon || "📝"}
                      </span>
                      <span className="item-name-small">{name}</span>
                    </div>
                    <div className="item-controls">
                      {!isSaved && !isPredefined && (
                        <button
                          className="save-item-btn"
                          onClick={() => handleSaveItem(name)}
                          title="Save for later"
                        >
                          💾
                        </button>
                      )}
                      <div className="quantity-controls">
                        <button
                          onClick={() => handleQuickItemChange(name, qty - 1)}
                          className="qty-btn minus"
                        >
                          −
                        </button>
                        <span className="qty-display">{qty}</span>
                        <button
                          onClick={() => handleQuickItemChange(name, qty + 1)}
                          className="qty-btn plus"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-request">
              <p>Tap items above to build your request</p>
            </div>
          )}
          
          <button
            className="send-request-btn"
            onClick={() => sendOrder(quickRequestItems)}
            disabled={
              Object.keys(quickRequestItems).length === 0 || isSendDisabled
            }
          >
            <span className="btn-icon">🚀</span>
            <span className="btn-text">
              {isSendDisabled ? `Wait ${cooldownTime}s` : "Send Request"}
            </span>
          </button>
        </div>
      </section>

      {/* Custom Item Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">Add Custom Item</h3>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddCustomItem} className="modal-form">
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Enter item name (e.g., Bread, Milk...)"
                className="modal-input"
                autoFocus
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="modal-btn cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn confirm">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Enhanced Receiver View ---
function EnhancedReceiverView({ showToast }) {
  const { user, token } = useContext(AuthContext);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [itemStatuses, setItemStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const formatTimestamp = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    async function fetchPendingOrders() {
      if (!token) return;
      try {
        setIsLoading(true);
        const orders = await apiRequest("/api/pending-orders", { token });
        if (orders) setPendingOrders(orders);
      } catch (error) {
        console.error("Failed to fetch pending orders:", error);
        showToast("Failed to load orders", "error");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPendingOrders();

    const handleOrderListUpdated = (ordersData) => {
      setPendingOrders(ordersData);
      setItemStatuses((prev) => {
        const newStatuses = { ...prev };
        const currentOrderIds = ordersData.map((order) => order._id);

        Object.keys(newStatuses).forEach((key) => {
          const orderId = key.split("-")[0];
          if (!currentOrderIds.includes(orderId)) {
            delete newStatuses[key];
          }
        });

        return newStatuses;
      });
    };

    socket.on("order_list_updated", handleOrderListUpdated);
    return () => socket.off("order_list_updated", handleOrderListUpdated);
  }, [token, showToast]);

  const handleAcknowledge = useCallback((orderId) => {
    if (orderId) {
      socket.emit("acknowledge_order", { orderId, receiverId: user._id });
      setPendingOrders((prev) => prev.filter((o) => o._id !== orderId));
      setItemStatuses((prev) => {
        const newStatuses = { ...prev };
        Object.keys(newStatuses).forEach((key) => {
          if (key.startsWith(`${orderId}-`)) {
            delete newStatuses[key];
          }
        });
        return newStatuses;
      });
      showToast("Order acknowledged!", "success");
    }
  }, [user?._id, showToast]);

  const handleReject = useCallback((orderId) => {
    if (orderId) {
      socket.emit("reject_order", { orderId, receiverId: user._id });
      setPendingOrders((prev) => prev.filter((o) => o._id !== orderId));
      setItemStatuses((prev) => {
        const newStatuses = { ...prev };
        Object.keys(newStatuses).forEach((key) => {
          if (key.startsWith(`${orderId}-`)) {
            delete newStatuses[key];
          }
        });
        return newStatuses;
      });
      showToast("Order rejected", "info");
    }
  }, [user?._id, showToast]);

  const handleItemAcknowledge = (orderId, itemName) => {
    socket.emit("item_acknowledged", {
      orderId: orderId,
      itemName: itemName,
      receiverId: user._id,
    });
    setItemStatuses((prev) => ({
      ...prev,
      [`${orderId}-${itemName}`]: "acknowledged",
    }));
    showToast(`✅ Acknowledged ${itemName}`, "success");
  };

  const handleItemReject = (orderId, itemName) => {
    socket.emit("item_rejected", {
      orderId: orderId,
      itemName: itemName,
      receiverId: user._id,
    });
    setItemStatuses((prev) => ({
      ...prev,
      [`${orderId}-${itemName}`]: "rejected",
    }));
    showToast(`❌ Rejected ${itemName}`, "error");
  };

  // Auto-process order when all items are actioned
  useEffect(() => {
    pendingOrders.forEach(order => {
      const orderItems = Object.keys(order.items);
      const actionedItems = orderItems.filter(itemName => !!itemStatuses[`${order._id}-${itemName}`]);

      if (orderItems.length > 0 && actionedItems.length === orderItems.length) {
        const hasRejection = actionedItems.some(itemName => itemStatuses[`${order._id}-${itemName}`] === 'rejected');
        
        setTimeout(() => {
          if (hasRejection) handleReject(order._id);
          else handleAcknowledge(order._id);
        }, 500); // Delay for better UX
      }
    });
  }, [pendingOrders, itemStatuses, handleAcknowledge, handleReject]);

  return (
    <div className="receiver-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Incoming Requests</h1>
          <p className="page-subtitle">
            From: <span className="partner-name">{user.partnerId?.displayName || "Loading..."}</span>
          </p>
        </div>
        {pendingOrders.length > 0 && (
          <div className="pending-indicator">
            <div className="pending-count">{pendingOrders.length}</div>
            <div className="pending-text">Pending</div>
          </div>
        )}
      </div>

      {/* Orders Display */}
      <div className="receiver-orders-container">
        {isLoading ? (
          <div className="orders-loading">
            <div className="loading-spinner"></div>
            <p>Loading requests...</p>
          </div>
        ) : pendingOrders.length > 0 ? (
          <div className="receiver-orders-list">
            {pendingOrders.map((order) => (
              <div key={order._id} className="receiver-order-card">
                <div className="order-header-receiver">
                  <div className="order-info">
                    <div className="order-pulse"></div>
                    <span className="order-label">New Request</span>
                  </div>
                  <span className="order-timestamp-receiver">
                    {formatTimestamp(order.createdAt)}
                  </span>
                </div>

                <div className="receiver-items-list">
                  {Object.entries(order.items).map(([name, quantity]) => {
                    const itemStatus = itemStatuses[`${order._id}-${name}`];
                    const menuItem = MENU_ITEMS.find(i => i.name === name);
                    
                    return (
                      <div
                        key={name}
                        className={`receiver-item-new ${itemStatus || ""}`}
                      >
                        <div className="item-details-receiver">
                          <span className="item-icon-receiver">
                            {menuItem?.icon || "📝"}
                          </span>
                          <div className="item-text">
                            <span className="item-name-receiver">{name}</span>
                            <span className="item-quantity-receiver">×{quantity}</span>
                          </div>
                        </div>
                        
                        <div className="item-actions-receiver">
                          {!itemStatus && (
                            <>
                              <button
                                onClick={() => handleItemReject(order._id, name)}
                                className="item-action-btn-new reject"
                              >
                                ✗
                              </button>
                              <button
                                onClick={() => handleItemAcknowledge(order._id, name)}
                                className="item-action-btn-new acknowledge"
                              >
                                ✓
                              </button>
                            </>
                          )}
                          {itemStatus === "acknowledged" && (
                            <div className="item-status-indicator acknowledged">✓</div>
                          )}
                          {itemStatus === "rejected" && (
                            <div className="item-status-indicator rejected">✗</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="order-actions-receiver">
                  <button
                    className="order-btn-new reject-all"
                    onClick={() => handleReject(order._id)}
                  >
                    <span className="btn-icon">❌</span>
                    <span className="btn-text">Reject All</span>
                  </button>
                  <button
                    className="order-btn-new acknowledge-all"
                    onClick={() => handleAcknowledge(order._id)}
                  >
                    <span className="btn-icon">✅</span>
                    <span className="btn-text">Accept All</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-receiver-state">
            <div className="empty-icon-large">📱</div>
            <h3>All Caught Up!</h3>
            <p>No pending requests. You'll be notified when new ones arrive.</p>
          </div>
        )}
      </div>
    </div>
  );
}
// --- App Component ---
function App() {
  const { isLoggedIn, user, logout, authReady } = useContext(AuthContext);
  const [publicPage, setPublicPage] = useState("home");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  if (!authReady) {
    return <LoadingScreen />;
  }
  
  if (isLoggedIn && isEditingProfile) {
    return <EditProfilePage onBack={() => setIsEditingProfile(false)} />;
  }
  
  if (isLoggedIn && user) {
    return user.partnerId ? (
      <MainApp
        user={user}
        onLogout={logout}
        onEditProfile={() => setIsEditingProfile(true)}
      />
    ) : (
      <ConnectPage />
    );
  }
  
  if (publicPage === "auth") {
    return <AuthPage />;
  }
  
  return <HomePage onGetStarted={() => setPublicPage("auth")} />;
}

export default App;