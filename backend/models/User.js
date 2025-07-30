// backend/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['sender', 'receiver'],
  },
  
  // --- NEW PROFILE FIELDS ---
  displayName: {
    type: String,
    trim: true,
    default: '', // Users will start with an empty display name
  },
  profilePictureUrl: {
    type: String,
    default: '', // Users will start with no profile picture
  },
  
  // --- Existing Connection Fields ---
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
});

const User = mongoose.model('User', userSchema);

export default User;
