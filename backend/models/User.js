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
  // --- NEW FIELDS ---
  // Stores the ID of the connected partner
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This links to another document in the User collection
    default: null,
  },
  // Stores the IDs of users who have sent a connection request
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
});

const User = mongoose.model('User', userSchema);

export default User;
