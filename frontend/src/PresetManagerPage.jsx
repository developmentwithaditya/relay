// frontend/src/PresetManagerPage.jsx
import React from 'react';
import { useState, useContext, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './PresetManagerPage.css';

// Component receives props to determine its mode ('add' or 'edit') and which preset to edit
function PresetManagerPage({ onBack, mode = 'add', presetId = null }) {
  const { user, token, refreshUserData } = useContext(AuthContext);

  // State to track if we are in 'edit' mode
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  // State to hold the original preset data while editing
  const [editingPreset, setEditingPreset] = useState(null);

  // Form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [presetName, setPresetName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customItems, setCustomItems] = useState([{ name: '', quantity: 1 }]);
  
  // UI feedback state
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // This effect runs when the component loads or when the mode changes.
  // If in 'edit' mode, it finds the correct preset and populates the form fields.
  useEffect(() => {
    if (mode === 'edit' && presetId) {
      const presetToEdit = user.presets.find(p => p._id === presetId);
      if (presetToEdit) {
        setIsEditing(true);
        setEditingPreset(presetToEdit);
        setPresetName(presetToEdit.name);
        setSelectedCategory(presetToEdit.category);
        setCustomItems(presetToEdit.customItems);
      }
    } else {
      // If in 'add' mode, set the category to the first one available by default.
      setSelectedCategory(user.categories[0] || '');
    }
  }, [mode, presetId, user.presets, user.categories]);

  // Resets the form to its initial state, used after adding a preset or canceling an edit.
  const resetForm = () => {
    setPresetName('');
    setCustomItems([{ name: '', quantity: 1 }]);
    setSelectedCategory(user.categories[0] || '');
    setIsEditing(false);
    setEditingPreset(null);
    setMessage('');
    setError('');
  };

  // Handlers for the dynamic custom items form
  const handleItemChange = (index, field, value) => {
    const newItems = [...customItems];
    newItems[index][field] = field === 'quantity' ? parseInt(value, 10) || 1 : value;
    setCustomItems(newItems);
  };
  const addItemField = () => {
    if (customItems.length < 5) {
      setCustomItems([...customItems, { name: '', quantity: 1 }]);
    }
  };
  const removeItemField = (index) => {
    if (customItems.length > 1) {
      setCustomItems(customItems.filter((_, i) => i !== index));
    }
  };

  // API call handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    try {
      await apiRequest('/api/categories', { method: 'POST', token, body: { name: newCategoryName } });
      setMessage(`Category "${newCategoryName}" added!`);
      await refreshUserData();
      setNewCategoryName('');
    } catch (err) { setError(err.message); }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm(`Delete category "${categoryName}" and all its presets?`)) return;
    try {
      await apiRequest(`/api/categories/${encodeURIComponent(categoryName)}`, { method: 'DELETE', token });
      setMessage(`Category "${categoryName}" deleted.`);
      await refreshUserData();
    } catch (err) { setError(err.message); }
  };
  
  const handleDeletePreset = async (id, name) => {
    if (!window.confirm(`Delete preset "${name}"?`)) return;
    try {
      await apiRequest(`/api/presets/${id}`, { method: 'DELETE', token });
      setMessage(`Preset "${name}" deleted.`);
      await refreshUserData();
    } catch (err) { setError(err.message); }
  };

  // Main handler for submitting the preset form (handles both Add and Edit)
  const handleSubmitPreset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const finalItems = customItems.filter(item => item.name.trim() !== '' && item.quantity > 0);
    if (!presetName || !selectedCategory || finalItems.length === 0) {
      setError('A preset requires a name, category, and at least one item.');
      return;
    }

    const payload = { name: presetName, customItems: finalItems, category: selectedCategory };

    try {
      if (isEditing) {
        await apiRequest(`/api/presets/${editingPreset._id}`, { method: 'PATCH', token, body: payload });
        setMessage(`Preset "${presetName}" updated successfully!`);
        await refreshUserData();
        onBack(); // Go back to the main app after a successful edit
      } else {
        await apiRequest('/api/presets', { method: 'POST', token, body: payload });
        setMessage(`Preset "${presetName}" saved successfully!`);
        await refreshUserData();
        resetForm();
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Function to switch a preset into editing mode within this page
  const startEditing = (preset) => {
    setIsEditing(true);
    setEditingPreset(preset);
    setPresetName(preset.name);
    setSelectedCategory(preset.category);
    setCustomItems(preset.customItems);
    window.scrollTo(0, 0); // Scroll to the top to see the form
  };

  return (
    <div className="preset-manager-container">
      <div className="preset-manager-wrapper">
        <button onClick={onBack} className="back-button">← Back to App</button>
        <h2>{isEditing ? 'Edit Preset' : 'Manage Your Presets'}</h2>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <div className="card">
          <h3>{isEditing ? `Editing: ${editingPreset?.name}` : `Add New Preset (${user.presets?.length || 0}/10)`}</h3>
          {user.categories?.length > 0 ? (
             (user.presets?.length < 10 || isEditing) ? (
            <form onSubmit={handleSubmitPreset}>
              <div className="input-group">
                <label>Preset Name</label>
                <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Category</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} required>
                  {user.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Items (up to 5)</label>
                <div className="custom-item-form-list">
                  {customItems.map((item, index) => (
                    <div key={index} className="custom-item-form-row">
                      <input type="text" placeholder="Item Name" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} required />
                      <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required />
                      <button type="button" className="remove-item-btn" onClick={() => removeItemField(index)} disabled={customItems.length <= 1}>×</button>
                    </div>
                  ))}
                </div>
                {customItems.length < 5 && <button type="button" className="add-item-btn" onClick={addItemField}>+ Add Item</button>}
              </div>
              <div className="form-actions">
                {isEditing && <button type="button" onClick={onBack} className="cancel-button">Cancel</button>}
                <button type="submit" className="save-button">{isEditing ? 'Save Changes' : 'Save New Preset'}</button>
              </div>
            </form>
             ) : <p>You have reached the maximum of 10 presets.</p>
          ) : <p>You must create a category before you can add a preset.</p>}
        </div>

        {!isEditing && (
          <div className="card">
            <h3>Categories ({user.categories?.length || 0}/5)</h3>
            <div className="category-list">
              {user.categories?.map(cat => (
                <div key={cat} className="category-tag">{cat}<button onClick={() => handleDeleteCategory(cat)} className="delete-tag-btn">×</button></div>
              ))}
            </div>
            {user.categories?.length < 5 && (
              <form onSubmit={handleAddCategory} className="add-form">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name..." />
                <button type="submit">Add</button>
              </form>
            )}
          </div>
        )}
        
        <div className="card">
            <h3>Your Saved Presets</h3>
            <div className="preset-list">
                {user.presets?.length > 0 ? (
                    user.presets.map(preset => (
                        <div key={preset._id} className="preset-item">
                            <div className="preset-item-header">
                                <strong>{preset.name}</strong>
                                <span className="preset-item-category">{preset.category}</span>
                            </div>
                            <ul className="preset-item-list">
                                {preset.customItems.map((item, index) => <li key={index}>{item.name} (x{item.quantity})</li>)}
                            </ul>
                            <div className="preset-item-actions">
                                <button onClick={() => handleDeletePreset(preset._id, preset.name)} className="delete-preset-btn">Delete</button>
                                <button onClick={() => startEditing(preset)} className="edit-preset-btn">Edit</button>
                            </div>
                        </div>
                    ))
                ) : <p>No presets saved yet.</p>}
            </div>
        </div>
      </div>
    </div>
  );
}

export default PresetManagerPage;
