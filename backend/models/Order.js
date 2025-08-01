import mongoose from 'mongoose';

// **NEW**: Schema for individual item feedback
const itemFeedbackSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  status: { type: String, enum: ['acknowledged', 'rejected'], required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  items: { type: Object, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'acknowledged', 'rejected'], 
    default: 'pending' 
  },
  // **NEW**: Track individual item statuses
  itemFeedback: [itemFeedbackSchema],
  createdAt: { type: Date, default: Date.now },
  // **NEW**: Track when order was completed (acknowledged/rejected)
  completedAt: { type: Date },
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