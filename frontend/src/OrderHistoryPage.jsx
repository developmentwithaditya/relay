import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './OrderHistoryPage.css';

function OrderHistoryPage({ onBack }) {
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('sent');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ sent: { acknowledged: 0, rejected: 0 }, received: { acknowledged: 0, rejected: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderHistory();
    fetchStats();
  }, [activeTab, token]);

  const fetchOrderHistory = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'sent' ? '/api/order-history/sent' : '/api/order-history/received';
      const data = await apiRequest(endpoint, { token });
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiRequest('/api/order-history/stats', { token });
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPartnerName = (order) => {
    if (activeTab === 'sent') {
      return order.receiverId?.displayName || 'Unknown Receiver';
    } else {
      return order.senderId?.displayName || 'Unknown Sender';
    }
  };

  const currentStats = stats[activeTab] || { acknowledged: 0, rejected: 0 };
  const total = currentStats.acknowledged + currentStats.rejected;

  return (
    <div className="app-container">
      <header className="app-header">
        <button onClick={onBack} className="back-button">← Back</button>
        <h1>Order History</h1>
        <p>Your past {activeTab} orders</p>
      </header>

      {/* Statistics Summary */}
      <div className="history-stats">
        <div className="stats-card">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{total}</span>
              <span className="stat-label">Total Orders</span>
            </div>
            <div className="stat-item acknowledged">
              <span className="stat-number">{currentStats.acknowledged}</span>
              <span className="stat-label">Accepted</span>
            </div>
            <div className="stat-item rejected">
              <span className="stat-number">{currentStats.rejected}</span>
              <span className="stat-label">Rejected</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {total > 0 ? Math.round((currentStats.acknowledged / total) * 100) : 0}%
              </span>
              <span className="stat-label">Accept Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="history-tabs">
        <button 
          className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent Orders
        </button>
        <button 
          className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received Orders
        </button>
      </div>

      {/* Order History List */}
      <div className="history-content">
        {loading ? (
          <div className="loading-state">Loading order history...</div>
        ) : orders.length > 0 ? (
          <div className="history-list">
            {orders.map((order) => (
              <div key={order._id} className={`history-card ${order.status}`}>
                <div className="history-card-header">
                  <div className="history-card-title">
                    <span className={`status-badge ${order.status}`}>
                      {order.status === 'acknowledged' ? '✅ Accepted' : '❌ Rejected'}
                    </span>
                    <span className="partner-name">
                      {activeTab === 'sent' ? 'To: ' : 'From: '}{getPartnerName(order)}
                    </span>
                  </div>
                  <div className="history-card-date">
                    {formatDate(order.completedAt || order.createdAt)}
                  </div>
                </div>
                
                <div className="history-card-items">
                  <h4>Items Ordered:</h4>
                  <ul className="history-item-list">
                    {Object.entries(order.items).map(([name, qty]) => {
                      // Find individual item feedback
                      const itemFeedback = order.itemFeedback?.find(fb => fb.itemName === name);
                      return (
                        <li key={name} className={`history-item ${itemFeedback?.status || ''}`}>
                          <span className="item-name">{name} (x{qty})</span>
                          {itemFeedback && (
                            <span className={`item-feedback ${itemFeedback.status}`}>
                              {itemFeedback.status === 'acknowledged' ? '✓' : '✗'}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {order.itemFeedback && order.itemFeedback.length > 0 && (
                  <div className="individual-feedback">
                    <h5>Individual Item Actions:</h5>
                    <div className="feedback-tags">
                      {order.itemFeedback.map((feedback, index) => (
                        <span 
                          key={index} 
                          className={`feedback-tag ${feedback.status}`}
                        >
                          {feedback.itemName} {feedback.status === 'acknowledged' ? '✓' : '✗'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No {activeTab} orders yet</h3>
            <p>Your completed orders will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistoryPage;