// frontend/src/EditProfilePage.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import apiRequest from './services/api';
import './EditProfilePage.css'; // We will create this next

// The 'onBack' prop is a function to return to the main app view
function EditProfilePage({ onBack }) {
  const { user, token, refreshUserData } = useContext(AuthContext);

  // Initialize state with the current user's data
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user.profilePictureUrl || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const formData = new FormData();
    
    // Only append fields if they have actually changed
    if (displayName !== user.displayName) {
        formData.append('displayName', displayName);
    }
    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }
    if (newPassword) {
      if (!currentPassword) {
        setError('Current password is required to set a new one.');
        return;
      }
      formData.append('currentPassword', currentPassword);
      formData.append('newPassword', newPassword);
    }

    // If no changes were made, don't submit
    if (Array.from(formData.keys()).length === 0) {
        setMessage("No changes to save.");
        return;
    }

    try {
      await apiRequest('/api/profile', {
        method: 'PATCH',
        token,
        body: formData,
      });
      setMessage('Profile updated successfully!');
      // Refresh the user data in the context to reflect changes everywhere
      await refreshUserData(); 
      // Clear password fields after submission
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-wrapper">
        <button onClick={onBack} className="back-button">← Back to App</button>
        <h2>Edit Your Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="profile-pic-section">
            <img 
              src={previewUrl || `https://ui-avatars.com/api/?name=${displayName.split(' ').join('+')}&background=random&color=fff`} 
              alt="Profile" 
              className="profile-avatar"
            />
            <input type="file" id="profilePicture" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} />
            <label htmlFor="profilePicture" className="upload-button">Change Picture</label>
          </div>

          <div className="input-group">
            <label htmlFor="displayName">Display Name</label>
            <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          
          <hr />
          
          <h4>Change Password (Optional)</h4>
          <div className="input-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="input-group">
            <label htmlFor="newPassword">New Password</label>
            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </div>

          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          <button type="submit" className="save-button">Save Changes</button>
        </form>
      </div>
    </div>
  );
}

export default EditProfilePage;
