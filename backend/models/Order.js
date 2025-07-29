// backend/models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  items: { type: Object, required: true },
  status: { type: String, enum: ['pending', 'acknowledged'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  // --- FIX: These fields are now correctly included in the schema ---
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
