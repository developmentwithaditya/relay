// backend/models/Order.js
import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  items: { type: Object, required: true },
  status: { type: String, enum: ['pending', 'acknowledged'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  // Link to the users who created and received the order
  // senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
