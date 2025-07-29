// backend/index.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Order from './models/Order.js';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'a-super-secret-key-for-now';

mongoose.connect(DATABASE_URL).then(() => console.log('✅ DB Connected')).catch(err => console.error(err));

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied.' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ message: 'Token is not valid.' });
    }
};

// --- AUTH & CONNECTION ROUTES (Unchanged) ---
app.post('/api/register', async (req, res) => { try { const { email, password, role } = req.body; if (!email || !password || !role) { return res.status(400).json({ message: 'Please provide email, password, and role.' }); } const existingUser = await User.findOne({ email }); if (existingUser) { return res.status(400).json({ message: 'User with this email already exists.' }); } const salt = await bcrypt.genSalt(10); const hashedPassword = await bcrypt.hash(password, salt); const newUser = new User({ email, password: hashedPassword, role }); await newUser.save(); res.status(201).json({ message: 'User registered successfully!' }); } catch (error) { res.status(500).json({ message: 'Server error during registration.', error }); } });
app.post('/api/login', async (req, res) => { try { const { email, password } = req.body; const user = await User.findOne({ email }); if (!user) { return res.status(400).json({ message: 'Invalid credentials.' }); } const isMatch = await bcrypt.compare(password, user.password); if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials.' }); } const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' }); res.status(200).json({ token, user: { id: user._id, email: user.email, role: user.role }, }); } catch (error) { res.status(500).json({ message: 'Server error during login.', error }); } });
app.get('/api/me', authMiddleware, async (req, res) => { try { const user = await User.findById(req.user.userId).select('-password').populate('partnerId', 'email role').populate('pendingRequests', 'email role'); res.json(user); } catch (error) { res.status(500).json({ message: 'Error fetching user profile.' }); } });
app.get('/api/users/search', authMiddleware, async (req, res) => { try { const { email } = req.query; if (!email) { return res.status(400).json({ message: 'Email query is required.' }); } const potentialPartner = await User.findOne({ email, _id: { $ne: req.user.userId } }).select('email role'); res.json(potentialPartner); } catch (error) { res.status(500).json({ message: 'Error searching for user.' }); } });
app.post('/api/connect/request', authMiddleware, async (req, res) => { try { const { targetUserId } = req.body; await User.findByIdAndUpdate(targetUserId, { $addToSet: { pendingRequests: req.user.userId } }); res.json({ message: 'Connection request sent.' }); } catch (error) { res.status(500).json({ message: 'Error sending request.' }); } });
app.post('/api/connect/accept', authMiddleware, async (req, res) => { try { const { requesterId } = req.body; const currentUserId = req.user.userId; await User.findByIdAndUpdate(currentUserId, { partnerId: requesterId, $pull: { pendingRequests: requesterId } }); await User.findByIdAndUpdate(requesterId, { partnerId: currentUserId }); res.json({ message: 'Connection successful!' }); } catch (error) { res.status(500).json({ message: 'Error accepting request.' }); } });
app.get('/api/pending-orders', authMiddleware, async (req, res) => { try { const pendingOrder = await Order.findOne({ receiverId: req.user.userId, status: 'pending' }).sort({ createdAt: -1 }); res.json(pendingOrder); } catch (error) { res.status(500).json({ message: 'Error fetching pending orders' }); } });

// --- SOCKET.IO LOGIC ---
const userSockets = {};

io.on('connection', (socket) => {
  console.log('✅ A user connected:', socket.id);

  socket.on('register_socket', (userId) => {
    userSockets[userId] = socket.id;
    console.log(`🔗 Registered socket ${socket.id} for user ${userId}`);
  });

  socket.on('send_order', async ({ items, senderId, tempId }) => {
    if (!userSockets[senderId] || userSockets[senderId] !== socket.id) {
        userSockets[senderId] = socket.id;
        console.log(`🔗 JIT Registration for socket ${socket.id} for user ${senderId}`);
    }

    try {
      const sender = await User.findById(senderId);
      if (!sender || !sender.partnerId) return;
      
      const partnerSocketId = userSockets[sender.partnerId];
      // FIX: Ensure senderId and receiverId are correctly passed to the new Order
      const newOrder = new Order({ items, senderId: sender._id, receiverId: sender.partnerId });
      await newOrder.save();
      
      socket.emit('order_saved', { tempId, dbId: newOrder._id });

      if (partnerSocketId) {
        io.to(partnerSocketId).emit('receive_order', newOrder);
        console.log(`📦 Order sent from ${senderId} to partner ${sender.partnerId}`);
      }
    } catch (error) {
      console.error('Error processing order:', error);
    }
  });

  socket.on('acknowledge_order', async ({ orderId, receiverId }) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return console.log(`❌ Acknowledgment failed: Order with ID ${orderId} not found.`);
        }

        await Order.findByIdAndUpdate(orderId, { status: 'acknowledged' });
        console.log(`💾 Order ${orderId} status updated to acknowledged.`);

        const senderSocketId = userSockets[order.senderId];
        if (senderSocketId) {
            io.to(senderSocketId).emit('order_acknowledged', orderId);
            console.log(`👍 Order ${orderId} acknowledged by ${receiverId}. Sending confirmation to ${senderSocketId}`);
        } else {
            console.log(`❌ Could not find socket for sender ${order.senderId} to send acknowledgment.`);
        }
    } catch (error) {
        console.error('Error acknowledging order:', error);
    }
  });

  socket.on('disconnect', () => {
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log(`🔌 Un-registered socket for user ${userId}`);
        break;
      }
    }
    console.log('❌ User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Backend server ready at http://localhost:${PORT}`);
});
