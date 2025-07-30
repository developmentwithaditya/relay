// backend/models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  items: { type: Object, required: true },
  // --- NEW: Added 'rejected' to the possible statuses ---
  status: { 
    type: String, 
    enum: ['pending', 'acknowledged', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
