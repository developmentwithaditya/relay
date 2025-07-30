// frontend/src/PresetManagerPage.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './PresetManagerPage.css';

function PresetManagerPage({ onBack }) {
  const { user, token, refreshUserData } = useContext(AuthContext);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(user.categories[0] || '');
  
  // --- MODIFIED: State now manages an array of custom item objects ---
  const [customItems, setCustomItems] = useState([{ name: '', quantity: 1 }]);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // --- Handlers for custom item form ---
  const handleItemChange = (index, field, value) => {
    const newItems = [...customItems];
    if (field === 'quantity') {
        newItems[index][field] = parseInt(value, 10) || 1;
    } else {
        newItems[index][field] = value;
    }
    setCustomItems(newItems);
  };

  const addItemField = () => {
    if (customItems.length < 5) {
        setCustomItems([...customItems, { name: '', quantity: 1 }]);
    }
  };

  const removeItemField = (index) => {
    if (customItems.length > 1) {
        const newItems = customItems.filter((_, i) => i !== index);
        setCustomItems(newItems);
    }
  };


  const handleAddCategory = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!newCategoryName) return;
    try {
      await apiRequest('/api/categories', { method: 'POST', token, body: { name: newCategoryName } });
      await refreshUserData();
      setNewCategoryName('');
      setMessage(`Category "${newCategoryName}" added!`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    setError('');
    setMessage('');
    if (!window.confirm(`Are you sure you want to delete the "${categoryName}" category and all its presets?`)) return;
    try {
      await apiRequest(`/api/categories/${encodeURIComponent(categoryName)}`, { method: 'DELETE', token });
      await refreshUserData();
      if (selectedCategory === categoryName) setSelectedCategory(user.categories[0] || '');
      setMessage(`Category "${categoryName}" deleted.`);
    } catch (err) {
      setError(err.message);
    }
  };

  // --- MODIFIED: Sends the 'customItems' array to the backend ---
  const handleAddPreset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const finalItems = customItems.filter(item => item.name.trim() !== '' && item.quantity > 0);

    if (!newPresetName || !selectedCategory || finalItems.length === 0) {
      setError('Please provide a preset name, select a category, and add at least one valid item.');
      return;
    }

    try {
      await apiRequest('/api/presets', {
        method: 'POST',
        token,
        body: {
          name: newPresetName,
          customItems: finalItems, // Send the array of custom items
          category: selectedCategory,
        },
      });
      await refreshUserData();
      setNewPresetName('');
      setCustomItems([{ name: '', quantity: 1 }]); // Reset the form
      setMessage(`Preset "${newPresetName}" saved!`);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDeletePreset = async (presetId) => {
    setError('');
    setMessage('');
    if (!window.confirm(`Are you sure you want to delete this preset?`)) return;
    try {
        await apiRequest(`/api/presets/${presetId}`, { method: 'DELETE', token });
        await refreshUserData();
        setMessage("Preset deleted.");
    } catch (err) {
        setError(err.message);
    }
  };

  return (
    <div className="preset-manager-container">
      <div className="preset-manager-wrapper">
        <button onClick={onBack} className="back-button">← Back to App</button>
        <h2>Manage Your Presets</h2>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <div className="card">
          <h3>Categories ({user.categories?.length || 0} / 5)</h3>
          <div className="category-list">
            {user.categories?.map(cat => (
              <div key={cat} className="category-tag">
                {cat}
                <button onClick={() => handleDeleteCategory(cat)} className="delete-tag-btn">×</button>
              </div>
            ))}
          </div>
          {user.categories?.length < 5 && (
            <form onSubmit={handleAddCategory} className="add-form">
              <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name..." maxLength="20" />
              <button type="submit">Add Category</button>
            </form>
          )}
        </div>

        {/* --- MODIFIED: The entire "Add Preset" form is new --- */}
        <div className="card">
          <h3>Add a New Preset ({user.presets?.length || 0} / 10)</h3>
          {user.categories?.length > 0 ? (
             user.presets?.length < 10 ? (
            <form onSubmit={handleAddPreset}>
              <div className="input-group">
                <label htmlFor="presetName">Preset Name</label>
                <input type="text" id="presetName" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="e.g., 'Morning Coffee Run'" required />
              </div>
              <div className="input-group">
                <label htmlFor="categorySelect">Category</label>
                <select id="categorySelect" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} required>
                  <option value="" disabled>Select a category</option>
                  {user.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Items (up to 5)</label>
                <div className="custom-item-form-list">
                    {customItems.map((item, index) => (
                        <div key={index} className="custom-item-form-row">
                            <input type="text" placeholder="Item Name (e.g., Bread)" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} required />
                            <input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required />
                            <button type="button" className="remove-item-btn" onClick={() => removeItemField(index)} disabled={customItems.length <= 1}>×</button>
                        </div>
                    ))}
                </div>
                {customItems.length < 5 && (
                    <button type="button" className="add-item-btn" onClick={addItemField}>+ Add Item</button>
                )}
              </div>
              <button type="submit" className="save-button">Save New Preset</button>
            </form>
             ) : (
                <p>You have reached the maximum of 10 presets.</p>
             )
          ) : (
            <p>You must create a category before you can add a preset.</p>
          )}
        </div>
        
        {/* --- MODIFIED: Now displays the custom items --- */}
        <div className="card">
            <h3>Your Saved Presets</h3>
            <div className="preset-list">
                {user.presets && user.presets.length > 0 ? (
                    user.presets.map(preset => (
                        <div key={preset._id} className="preset-item">
                            <div className="preset-item-header">
                                <strong>{preset.name}</strong>
                                <span className="preset-item-category">{preset.category}</span>
                            </div>
                            <ul className="preset-item-list">
                                {preset.customItems.map((item, index) => (
                                    <li key={index}>{item.name} (x{item.quantity})</li>
                                ))}
                            </ul>
                            <button onClick={() => handleDeletePreset(preset._id)} className="delete-preset-btn">Delete Preset</button>
                        </div>
                    ))
                ) : (
                    <p>No presets saved yet.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

export default PresetManagerPage;
