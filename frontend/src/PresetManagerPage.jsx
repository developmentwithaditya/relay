import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './PresetManagerPage.css';

function PresetManagerPage({ onBack, mode = 'add', presetId = null }) {
  const { user, token, refreshUserData } = useContext(AuthContext);

  // Core state
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [editingPreset, setEditingPreset] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    presetName: '',
    selectedCategory: '',
    customItems: [{ name: '', quantity: 1 }],
    newCategoryName: ''
  });

  // UI feedback state
  const [notifications, setNotifications] = useState([]);

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && presetId) {
      const presetToEdit = user.presets?.find(p => p._id === presetId);
      if (presetToEdit) {
        setIsEditing(true);
        setEditingPreset(presetToEdit);
        setFormData(prev => ({
          ...prev,
          presetName: presetToEdit.name,
          selectedCategory: presetToEdit.category,
          customItems: presetToEdit.customItems
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        selectedCategory: user.categories?.[0] || ''
      }));
    }
  }, [mode, presetId, user.presets, user.categories]);

  // Notification system
  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Form handlers
  const updateFormData = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      customItems: prev.customItems.map((item, i) => 
        i === index 
          ? { ...item, [field]: field === 'quantity' ? Math.max(1, parseInt(value) || 1) : value }
          : item
      )
    }));
  }, []);

  const addItemField = useCallback(() => {
    if (formData.customItems.length < 5) {
      setFormData(prev => ({
        ...prev,
        customItems: [...prev.customItems, { name: '', quantity: 1 }]
      }));
    }
  }, [formData.customItems.length]);

  const removeItemField = useCallback((index) => {
    if (formData.customItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        customItems: prev.customItems.filter((_, i) => i !== index)
      }));
    }
  }, [formData.customItems.length]);

  const resetForm = useCallback(() => {
    setFormData({
      presetName: '',
      selectedCategory: user.categories?.[0] || '',
      customItems: [{ name: '', quantity: 1 }],
      newCategoryName: ''
    });
    setIsEditing(false);
    setEditingPreset(null);
  }, [user.categories]);

  // API handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!formData.newCategoryName.trim()) return;
    
    setLoading(true);
    try {
      await apiRequest('/api/categories', { 
        method: 'POST', 
        token, 
        body: { name: formData.newCategoryName.trim() } 
      });
      addNotification(`Category "${formData.newCategoryName}" added successfully!`);
      await refreshUserData();
      updateFormData('newCategoryName', '');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}" and all its presets?`)) return;
    
    setLoading(true);
    try {
      await apiRequest(`/api/categories/${encodeURIComponent(categoryName)}`, { 
        method: 'DELETE', 
        token 
      });
      addNotification(`Category "${categoryName}" deleted successfully!`);
      await refreshUserData();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (id, name) => {
    if (!window.confirm(`Delete preset "${name}"?`)) return;
    
    setLoading(true);
    try {
      await apiRequest(`/api/presets/${id}`, { method: 'DELETE', token });
      addNotification(`Preset "${name}" deleted successfully!`);
      await refreshUserData();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPreset = async (e) => {
    e.preventDefault();
    
    const validItems = formData.customItems.filter(item => 
      item.name.trim() !== '' && item.quantity > 0
    );

    if (!formData.presetName.trim() || !formData.selectedCategory || validItems.length === 0) {
      addNotification('Please fill in all required fields and add at least one item.', 'error');
      return;
    }

    const payload = {
      name: formData.presetName.trim(),
      customItems: validItems,
      category: formData.selectedCategory
    };

    setLoading(true);
    try {
      if (isEditing) {
        await apiRequest(`/api/presets/${editingPreset._id}`, { 
          method: 'PATCH', 
          token, 
          body: payload 
        });
        addNotification(`Preset "${payload.name}" updated successfully!`);
        await refreshUserData();
        onBack();
      } else {
        await apiRequest('/api/presets', { 
          method: 'POST', 
          token, 
          body: payload 
        });
        addNotification(`Preset "${payload.name}" created successfully!`);
        await refreshUserData();
        resetForm();
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (preset) => {
    setIsEditing(true);
    setEditingPreset(preset);
    setFormData(prev => ({
      ...prev,
      presetName: preset.name,
      selectedCategory: preset.category,
      customItems: preset.customItems
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    resetForm();
    if (mode === 'edit') {
      onBack();
    }
  };

  return (
    <div className="preset-manager-container">
      {/* Status Messages */}
      <div className="status-messages">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`status-message ${notification.type}`}
            onClick={() => removeNotification(notification.id)}
          >
            <span>
              {notification.type === 'error' ? '⚠️' : '✅'}
            </span>
            {notification.message}
          </div>
        ))}
      </div>

      <div className="preset-manager-wrapper">
        {/* Header */}
        <div className="preset-header">
          <button onClick={onBack} className="back-button">
            <span>←</span>
            Back to App
          </button>
          <h1 className="preset-title">
            {isEditing ? 'Edit Preset' : 'Preset Manager'}
          </h1>
        </div>

        {/* Main Form Card */}
        <div className={`preset-card ${loading ? 'loading' : ''}`}>
          <div className="preset-card-header">
            <h2 className="preset-card-title">
              <span>📝</span>
              {isEditing ? `Editing: ${editingPreset?.name}` : 'Create New Preset'}
            </h2>
            <div className="preset-card-badge">
              {user.presets?.length || 0}/10
            </div>
          </div>

          {user.categories?.length > 0 ? (
            (user.presets?.length < 10 || isEditing) ? (
              <form onSubmit={handleSubmitPreset} className="preset-form">
                {/* Preset Name */}
                <div className="form-group">
                  <label className="form-label">Preset Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.presetName}
                    onChange={(e) => updateFormData('presetName', e.target.value)}
                    placeholder="Enter a memorable name for your preset..."
                    required
                  />
                </div>

                {/* Category Selection */}
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={formData.selectedCategory}
                    onChange={(e) => updateFormData('selectedCategory', e.target.value)}
                    required
                  >
                    {user.categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Items */}
                <div className="form-group">
                  <label className="form-label">Items * (up to 5)</label>
                  <div className="items-container">
                    <div className="items-list">
                      {formData.customItems.map((item, index) => (
                        <div key={index} className="item-row">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Item name..."
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                            required
                          />
                          {/* === NEW RESPONSIVE QUANTITY CONTROLLER === */}
                          <div className="quantity-control">
                            <button
                              type="button"
                              className="quantity-btn minus"
                              onClick={() => handleItemChange(index, 'quantity', item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              className="form-input quantity-input"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              required
                              aria-label="Item quantity"
                            />
                            <button
                              type="button"
                              className="quantity-btn plus"
                              onClick={() => handleItemChange(index, 'quantity', item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          {/* ========================================= */}
                          <button
                            type="button"
                            className="remove-item-btn"
                            onClick={() => removeItemField(index)}
                            disabled={formData.customItems.length <= 1}
                            title="Remove item"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    {formData.customItems.length < 5 && (
                      <button
                        type="button"
                        className="add-item-btn"
                        onClick={addItemField}
                      >
                        <span>+</span>
                        Add Another Item
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  {isEditing && (
                    <button type="button" onClick={cancelEditing} className="btn btn-secondary">
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : isEditing ? '💾 Save Changes' : '✨ Create Preset'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <h3 className="empty-state-title">Maximum Presets Reached</h3>
                <p className="empty-state-description">
                  You've reached the maximum of 10 presets. Delete some existing presets to create new ones.
                </p>
              </div>
            )
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📂</div>
              <h3 className="empty-state-title">No Categories Found</h3>
              <p className="empty-state-description">
                Create a category first before adding presets.
              </p>
            </div>
          )}
        </div>

        {/* Category Management */}
        {!isEditing && (
          <div className="preset-card">
            <div className="preset-card-header">
              <h2 className="preset-card-title">
                <span>🏷️</span>
                Categories
              </h2>
              <div className="preset-card-badge">
                {user.categories?.length || 0}/5
              </div>
            </div>

            <div className="categories-grid">
              {user.categories?.map(cat => (
                <div key={cat} className="category-chip">
                  {cat}
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="delete-btn"
                    title={`Delete ${cat}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {user.categories?.length < 5 && (
              <form onSubmit={handleAddCategory} className="category-form">
                <input
                  type="text"
                  className="form-input"
                  value={formData.newCategoryName}
                  onChange={(e) => updateFormData('newCategoryName', e.target.value)}
                  placeholder="New category name..."
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Add Category
                </button>
              </form>
            )}
          </div>
        )}

        {/* Presets List */}
        <div className="preset-card">
          <div className="preset-card-header">
            <h2 className="preset-card-title">
              <span>📋</span>
              Your Presets
            </h2>
          </div>

          {user.presets?.length > 0 ? (
            <div className="presets-grid">
              {user.presets.map(preset => (
                <div key={preset._id} className="preset-item">
                  <div className="preset-item-header">
                    <h3 className="preset-item-title">{preset.name}</h3>
                    <span className="preset-item-category">{preset.category}</span>
                  </div>
                  
                  <ul className="preset-items-list">
                    {preset.customItems.map((item, index) => (
                      <li key={index}>
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="preset-item-actions">
                    <button
                      onClick={() => startEditing(preset)}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset._id, preset.name)}
                      className="btn btn-danger"
                      disabled={loading}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3 className="empty-state-title">No Presets Yet</h3>
              <p className="empty-state-description">
                Create your first preset to get started with quick order management.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PresetManagerPage;
