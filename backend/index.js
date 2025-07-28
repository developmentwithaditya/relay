// backend/index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;

mongoose.connect(DATABASE_URL)
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection error:', err));

const orderSchema = new mongoose.Schema({
  items: { type: Object, required: true },
  status: { type: String, enum: ['pending', 'acknowledged'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

app.get('/api/pending-orders', async (req, res) => {
  try {
    const pendingOrders = await Order.findOne({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(pendingOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending orders' });
  }
});

io.on('connection', (socket) => {
  console.log('✅ A user connected:', socket.id);

  // MODIFIED: Now accepts an object with items and a temporary ID
  socket.on('send_order', async ({ items, tempId }) => {
    console.log(`📦 Order received from ${socket.id} with tempId ${tempId}:`, items);
    try {
      const newOrder = new Order({ items: items });
      await newOrder.save();
      console.log('💾 Order saved to database with new ID:', newOrder._id);

      // Broadcast the full order to receivers
      socket.broadcast.emit('receive_order', newOrder);
      
      // --- FIX: Emit back to the SENDER to confirm and provide the real ID ---
      socket.emit('order_sent_successfully', { tempId, newDbId: newOrder._id });
      
      console.log(`📣 Broadcasting order and confirming with sender.`);
    } catch (error) {
      console.error('Error saving order:', error);
    }
  });

  socket.on('acknowledge_order', async (orderId) => {
    console.log(`👍 Order ${orderId} acknowledged.`);
    try {
      await Order.findByIdAndUpdate(orderId, { status: 'acknowledged' });
      console.log(`💾 Order ${orderId} updated in database.`);
      socket.broadcast.emit('order_acknowledged', orderId);
      console.log(`📣 Broadcasting acknowledgment back to sender.`);
    } catch (error) {
      console.error('Error acknowledging order:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Backend server with DB running at http://localhost:${PORT}`);
});
