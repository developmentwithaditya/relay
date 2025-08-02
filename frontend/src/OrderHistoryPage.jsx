import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './OrderHistoryPage.css';

function OrderHistoryPage({ onBack }) {
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('sent');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ 
    sent: { acknowledged: 0, rejected: 0, pending: 0 }, 
    received: { acknowledged: 0, rejected: 0, pending: 0 } 
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  // Move helper functions before useMemo
  const getPartnerName = (order) => {
    if (activeTab === 'sent') {
      return order.receiverId?.displayName || 'Unknown Receiver';
    } else {
      return order.senderId?.displayName || 'Unknown Sender';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'acknowledged': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '📋';
    }
  };

  // Helper function to safely calculate percentages
  const calculatePercentage = (value, total) => {
    if (!total || total === 0 || isNaN(value) || isNaN(total)) return 0;
    const percentage = Math.round((value / total) * 100);
    return isNaN(percentage) ? 0 : percentage;
  };

  // Helper function to safely format numbers
  const safeNumber = (value) => {
    return isNaN(value) || value === null || value === undefined ? 0 : value;
  };

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
      // Ensure all stats are valid numbers
      const cleanStats = {
        sent: {
          acknowledged: safeNumber(data?.sent?.acknowledged),
          rejected: safeNumber(data?.sent?.rejected),
          pending: safeNumber(data?.sent?.pending)
        },
        received: {
          acknowledged: safeNumber(data?.received?.acknowledged),
          rejected: safeNumber(data?.received?.rejected),
          pending: safeNumber(data?.received?.pending)
        }
      };
      setStats(cleanStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Set default stats with safe numbers
      setStats({
        sent: { acknowledged: 0, rejected: 0, pending: 0 },
        received: { acknowledged: 0, rejected: 0, pending: 0 }
      });
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const partnerName = getPartnerName(order).toLowerCase();
      const matchesSearch = partnerName.includes(searchTerm.toLowerCase()) ||
                           Object.keys(order.items || {}).some(item => 
                             item.toLowerCase().includes(searchTerm.toLowerCase())
                           );
      const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt);
        case 'partner':
          return getPartnerName(a).localeCompare(getPartnerName(b));
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [orders, searchTerm, sortBy, filterStatus, activeTab]);

  const currentStats = stats[activeTab] || { acknowledged: 0, rejected: 0, pending: 0 };
  const total = safeNumber(currentStats.acknowledged) + safeNumber(currentStats.rejected) + safeNumber(currentStats.pending);

  const StatCard = ({ title, value, subtitle, type }) => (
    <div className={`stat-card ${type}`}>
      <div className="stat-value">{safeNumber(value)}</div>
      <div className="stat-title">{title}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );

  const OrderCard = ({ order }) => {
    const [expanded, setExpanded] = useState(false);
    const partnerName = getPartnerName(order);
    const itemCount = Object.keys(order.items || {}).length;
    const totalQuantity = Object.values(order.items || {}).reduce((sum, qty) => sum + safeNumber(qty), 0);

    return (
      <div className={`order-card ${order.status} ${expanded ? 'expanded' : ''}`}>
        <div className="order-card-header" onClick={() => setExpanded(!expanded)}>
          <div className="order-info">
            <div className="order-status-row">
              <span className={`status-indicator ${order.status}`}>
                {getStatusIcon(order.status)}
              </span>
              <span className="partner-info">
                <span className="partner-label">{activeTab === 'sent' ? 'To' : 'From'}</span>
                <span className="partner-name">{partnerName}</span>
              </span>
            </div>
            <div className="order-meta">
              <span className="item-summary">{itemCount} items ({totalQuantity} total)</span>
              <span className="order-date">{formatDate(order.completedAt || order.createdAt)}</span>
            </div>
          </div>
          <div className="expand-icon">
            <svg className={`chevron ${expanded ? 'rotated' : ''}`} viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
            </svg>
          </div>
        </div>

        <div className="order-card-content">
          <div className="items-section">
            <h4>Items Ordered</h4>
            <div className="items-grid">
              {Object.entries(order.items || {}).map(([name, qty]) => {
                const itemFeedback = order.itemFeedback?.find(fb => fb.itemName === name);
                return (
                  <div key={name} className={`item-pill ${itemFeedback?.status || ''}`}>
                    <span className="item-name">{name}</span>
                    <span className="item-quantity">×{safeNumber(qty)}</span>
                    {itemFeedback && (
                      <span className={`item-status ${itemFeedback.status}`}>
                        {getStatusIcon(itemFeedback.status)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {order.itemFeedback && order.itemFeedback.length > 0 && (
            <div className="feedback-section">
              <h4>Individual Item Status</h4>
              <div className="feedback-summary">
                <div className="feedback-stats">
                  <span className="feedback-stat accepted">
                    {safeNumber(order.itemFeedback.filter(f => f.status === 'acknowledged').length)} accepted
                  </span>
                  <span className="feedback-stat rejected">
                    {safeNumber(order.itemFeedback.filter(f => f.status === 'rejected').length)} rejected
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="order-history-container">
      {/* Header */}
      <header className="page-header">
        <div className="header-top">
          <button onClick={onBack} className="back-btn">
            <svg viewBox="0 0 24 24">
              <path d="M19 12H5M12 19L5 12L12 5"/>
            </svg>
            Back
          </button>
          <div className="header-title">
            <h1>Order History</h1>
            <p>Track your {activeTab} orders and performance</p>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="stats-dashboard">
          <StatCard 
            title="Total Orders" 
            value={total} 
            type="primary"
          />
          <StatCard 
            title="Accepted" 
            value={safeNumber(currentStats.acknowledged)} 
            subtitle={`${calculatePercentage(currentStats.acknowledged, total)}%`}
            type="success"
          />
          <StatCard 
            title="Rejected" 
            value={safeNumber(currentStats.rejected)} 
            subtitle={`${calculatePercentage(currentStats.rejected, total)}%`}
            type="error"
          />
          <StatCard 
            title="Success Rate" 
            value={`${calculatePercentage(currentStats.acknowledged, total)}%`}
            subtitle="Overall performance"
            type="info"
          />
        </div>
      </header>

      {/* Controls */}
      <div className="controls-section">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z"/>
            </svg>
            Sent Orders
            <span className="tab-count">
              {safeNumber(stats.sent?.acknowledged) + safeNumber(stats.sent?.rejected) + safeNumber(stats.sent?.pending)}
            </span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M21 15V21H3V15H21M21 3V13H3V3H21Z"/>
            </svg>
            Received Orders
            <span className="tab-count">
              {safeNumber(stats.received?.acknowledged) + safeNumber(stats.received?.rejected) + safeNumber(stats.received?.pending)}
            </span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="filters-row">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21L16.65 16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search orders, partners, or items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="filter-select"
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="acknowledged">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>
          
          <select 
            className="sort-select"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="partner">Sort by Partner</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="content-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your order history...</p>
          </div>
        ) : filteredAndSortedOrders.length > 0 ? (
          <div className="orders-list">
            <div className="results-info">
              <span>Showing {filteredAndSortedOrders.length} of {orders.length} orders</span>
            </div>
            {filteredAndSortedOrders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {searchTerm || filterStatus !== 'all' ? (
              <>
                <div className="empty-icon">🔍</div>
                <h3>No matching orders found</h3>
                <p>Try adjusting your search or filter criteria</p>
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <div className="empty-icon">📦</div>
                <h3>No {activeTab} orders yet</h3>
                <p>Your completed orders will appear here once you start {activeTab === 'sent' ? 'sending' : 'receiving'} orders.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistoryPage;