// backend/models/User.js
import mongoose from 'mongoose';

// --- NEW: Sub-schema for a single custom item within a preset ---
const customItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
}, {_id: false}); // We don't need a separate _id for each item.

// --- MODIFIED: The preset schema now holds custom items ---
const presetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // A preset now has an array of custom items.
  customItems: {
    type: [customItemSchema],
    // A preset can have a maximum of 5 custom items.
    validate: [
        (val) => val.length > 0 && val.length <= 5,
        'A preset must have between 1 and 5 custom items.'
    ]
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
});

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
  displayName: {
    type: String,
    trim: true,
    default: '',
  },
  profilePictureUrl: {
    type: String,
    default: '',
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  categories: {
    type: [{
      type: String,
      trim: true,
    }],
    validate: [
      (val) => val.length <= 5,
      'User can have a maximum of 5 categories.'
    ],
    default: [],
  },
  // The 'presets' field now uses the modified presetSchema.
  presets: {
    type: [presetSchema],
    validate: [
      (val) => val.length <= 10,
      'User can have a maximum of 10 presets.'
    ],
    default: [],
  },

  // --- NEW: Field to store saved custom items for the Quick Request section ---
  customItems: {
    type: [{
        type: String,
        trim: true,
    }],
    validate: [
        (val) => val.length <= 20, // Let's give them a generous limit
        'User can have a maximum of 20 saved custom items.'
    ],
    default: [],
  }
});

const User = mongoose.model('User', userSchema);

export default User;
