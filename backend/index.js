// backend/index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import Mongoose Models
import User from './models/User.js';
import Order from './models/Order.js';

dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your Vite frontend address
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'a-super-secret-key-for-now';

mongoose.connect(DATABASE_URL)
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection error:', err));

// --- AUTHENTICATION ROUTES ---

// Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Please provide email, password, and role.' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ email, password: hashedPassword, role });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.', error });
  }
});

// Login an existing user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error });
  }
});


// --- ORDER HANDLING ROUTES & SOCKET LOGIC ---

// Get any pending orders
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

  socket.on('send_order', async ({ items, tempId }) => {
    console.log(`📦 Order received from ${socket.id} with tempId ${tempId}:`, items);
    try {
      const newOrder = new Order({ items: items });
      await newOrder.save();
      console.log('💾 Order saved to database with new ID:', newOrder._id);
      socket.broadcast.emit('receive_order', newOrder);
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
  console.log(`🚀 Backend server with Auth running at http://localhost:${PORT}`);
});
