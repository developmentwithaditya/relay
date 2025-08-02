import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './EditProfilePage.css';

function EditProfilePage({ onBack }) {
  // 1. Add 'logout' to the context destructuring
  const { user, token, refreshUserData, logout } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  // State management
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user.profilePictureUrl || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [validationErrors, setValidationErrors] = useState({});

  // Input change handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // File handling with drag & drop
  const handleFileSelect = (file) => {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      showNotification('error', 'Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    
    if (file.size > maxSize) {
      showNotification('error', 'Image size must be less than 5MB');
      return;
    }
    
    setProfilePicture(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    handleFileSelect(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    
    if (!formData.displayName.trim()) {
      errors.displayName = 'Display name is required';
    }
    
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        errors.currentPassword = 'Current password required to change password';
      }
      if (formData.newPassword.length < 6) {
        errors.newPassword = 'New password must be at least 6 characters';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Notification system
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    const submitData = new FormData();
    
    // Only include changed fields
    if (formData.displayName !== user.displayName) {
      submitData.append('displayName', formData.displayName);
    }
    if (profilePicture) {
      submitData.append('profilePicture', profilePicture);
    }
    if (formData.newPassword) {
      submitData.append('currentPassword', formData.currentPassword);
      submitData.append('newPassword', formData.newPassword);
    }

    if (Array.from(submitData.keys()).length === 0) {
      showNotification('info', 'No changes to save');
      setIsLoading(false);
      return;
    }

    try {
      await apiRequest('/api/profile', {
        method: 'PATCH',
        token,
        body: submitData,
      });
      
      showNotification('success', 'Profile updated successfully!');
      await refreshUserData();
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 2. Add the delete account handler
  const handleDeleteAccount = async () => {
    const confirmationMessage = 
      "Are you absolutely sure you want to delete your account?\n\n" +
      "This will permanently erase your profile, connection, and all order history.\n\n" +
      "THIS ACTION CANNOT BE UNDONE.";
      
    if (window.confirm(confirmationMessage)) {
      setIsLoading(true);
      try {
        await apiRequest('/api/profile', {
          method: 'DELETE',
          token,
        });
        showNotification('info', 'Account deleted. You will be logged out.');
        setTimeout(() => {
          logout(); // Log out and redirect to home
        }, 2500);
      } catch (err) {
        showNotification('error', `Failed to delete account: ${err.message}`);
        setIsLoading(false);
      }
    }
  };

  const getAvatarUrl = () => {
    return previewUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=6366f1&color=ffffff&size=200`;
  };

  return (
    <div className="edit-profile-page">
      {/* Header */}
      <header className="edit-profile-header">
        <button onClick={onBack} className="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Back</span>
        </button>
        <h1>Edit Profile</h1>
        <div></div>
      </header>

      {/* Notification */}
      {notification.message && (
        <div className={`notification notification-${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification({ type: '', message: '' })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      )}

      <div className="edit-profile-content">
        <form onSubmit={handleSubmit} className="profile-form">
          {/* Profile Picture Section */}
          <div className="profile-picture-section">
            <div 
              className={`avatar-upload ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="avatar-container">
                <img src={getAvatarUrl()} alt="Profile" className="avatar" />
                <div className="avatar-overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <div className="upload-text">
                <p>Click to upload or drag & drop</p>
                <p className="upload-hint">PNG, JPG or WebP (max. 5MB)</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="file-input"
            />
          </div>

          {/* Basic Info */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="input-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className={validationErrors.displayName ? 'error' : ''}
                placeholder="Enter your display name"
              />
              {validationErrors.displayName && (
                <span className="error-text">{validationErrors.displayName}</span>
              )}
            </div>
          </div>

          {/* Password Section */}
          <div className="form-section">
            <h3>Change Password</h3>
            <p className="section-description">Leave blank to keep your current password</p>
            
            <div className="input-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                className={validationErrors.currentPassword ? 'error' : ''}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              {validationErrors.currentPassword && (
                <span className="error-text">{validationErrors.currentPassword}</span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                className={validationErrors.newPassword ? 'error' : ''}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              {validationErrors.newPassword && (
                <span className="error-text">{validationErrors.newPassword}</span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={validationErrors.confirmPassword ? 'error' : ''}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              {validationErrors.confirmPassword && (
                <span className="error-text">{validationErrors.confirmPassword}</span>
              )}
            </div>
          </div>

          {/* 3. Add the Danger Zone section */}
          <div className="form-section delete-account-section">
            <h3>Danger Zone</h3>
            <p className="section-description">
              This action is permanent and cannot be undone. All your data, including your profile, partner connection, and order history, will be removed forever.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="btn btn-danger"
            >
              Delete My Account
            </button>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" onClick={onBack} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfilePage;