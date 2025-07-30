// backend/index.js

// --- 1. IMPORTS ---
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Order from "./models/Order.js";
import { parser } from "./config/cloudinary.js";
import { MENU_ITEMS } from "./menuItems.js";

// --- 2. INITIAL SETUP ---
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// --- Environment Variables ---
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "a-super-secret-key-for-now";

// --- 3. DATABASE CONNECTION ---
mongoose
  .connect(DATABASE_URL)
  .then(() => console.log("✅ DB Connected"))
  .catch((err) => console.error("DB Connection Error:", err));

// --- 4. AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ message: "Token is not valid." });
  }
};

// --- 5. REST API ENDPOINTS ---

// [POST] /api/register
app.post("/api/register", parser.single("profilePicture"), async (req, res) => {
  try {
    const { email, password, role, displayName } = req.body;
    if (!email || !password || !role || !displayName) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      role,
      displayName,
      profilePictureUrl: req.file ? req.file.path : "",
    });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error during registration." });
  }
});

// [POST] /api/login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials." });
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        profilePictureUrl: user.profilePictureUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during login." });
  }
});

// [GET] /api/me
app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password")
      .populate("partnerId", "email role displayName profilePictureUrl")
      .populate("pendingRequests", "email role displayName profilePictureUrl");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile." });
  }
});

// [PATCH] /api/profile
app.patch("/api/profile", authMiddleware, parser.single("profilePicture"), async (req, res) => {
    try {
      const { displayName, currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found." });

      const updates = {};
      if (displayName) updates.displayName = displayName;
      if (req.file) updates.profilePictureUrl = req.file.path;
      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ message: "Current password is required." });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect current password." });
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      const updatedUser = await User.findByIdAndUpdate(req.user.userId, updates, { new: true }).select("-password");
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Server error while updating profile." });
    }
});

// --- Connection Endpoints ---
app.get("/api/users/search", authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    const potentialPartner = await User.findOne({ email, _id: { $ne: req.user.userId } }).select("email role displayName");
    if (!potentialPartner) return res.status(404).json({ message: "User not found." });
    res.json(potentialPartner);
  } catch (error) {
    res.status(500).json({ message: "Error searching for user." });
  }
});
app.post("/api/connect/request", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.body.targetUserId, { $addToSet: { pendingRequests: req.user.userId } });
    res.json({ message: "Connection request sent." });
  } catch (error) {
    res.status(500).json({ message: "Error sending request." });
  }
});
app.post("/api/connect/accept", authMiddleware, async (req, res) => {
  try {
    const { requesterId } = req.body;
    const currentUserId = req.user.userId;
    await User.findByIdAndUpdate(currentUserId, { partnerId: requesterId, $pull: { pendingRequests: requesterId } });
    await User.findByIdAndUpdate(requesterId, { partnerId: currentUserId });
    res.json({ message: "Connection successful!" });
  } catch (error) {
    res.status(500).json({ message: "Error accepting request." });
  }
});

// --- Category & Preset Endpoints ---
app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user.userId);
    if (user.categories.length >= 5) return res.status(400).json({ message: 'Maximum of 5 categories reached.' });
    if (user.categories.includes(name)) return res.status(400).json({ message: 'Category already exists.' });
    user.categories.push(name);
    await user.save();
    res.status(201).json(user.categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding category.' });
  }
});
app.delete('/api/categories/:name', authMiddleware, async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);
    const user = await User.findById(req.user.userId);
    user.categories = user.categories.filter(c => c !== categoryName);
    user.presets = user.presets.filter(p => p.category !== categoryName);
    await user.save();
    res.json({ categories: user.categories, presets: user.presets });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting category.' });
  }
});
app.post('/api/presets', authMiddleware, async (req, res) => {
  try {
    const { name, customItems, category } = req.body;
    if (!name || !customItems || !category) return res.status(400).json({ message: 'Preset name, items, and category are required.' });
    const user = await User.findById(req.user.userId);
    if (user.presets.length >= 10) return res.status(400).json({ message: 'Maximum of 10 presets reached.' });
    if (!user.categories.includes(category)) return res.status(400).json({ message: 'Category does not exist.' });
    user.presets.push({ name, customItems, category });
    await user.save();
    res.status(201).json(user.presets);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: 'Server error adding preset.' });
  }
});
app.delete('/api/presets/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    user.presets.pull({ _id: req.params.id });
    await user.save();
    res.json(user.presets);
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting preset.' });
  }
});

// [GET] /api/pending-orders
app.get("/api/pending-orders", authMiddleware, async (req, res) => {
  try {
    const pendingOrder = await Order.findOne({ receiverId: req.user.userId, status: "pending" }).sort({ createdAt: -1 });
    res.json(pendingOrder);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending orders" });
  }
});

// --- 6. SOCKET.IO LOGIC ---
const userSockets = {};
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on("register_socket", (userId) => {
    userSockets[userId] = socket.id;
    console.log(`🔗 Registered socket ${socket.id} for user ${userId}`);
  });

  socket.on("send_order", async ({ items, senderId, tempId }) => {
    try {
      const sender = await User.findById(senderId);
      if (!sender || !sender.partnerId) return;

      let formattedItems = {};
      for (const key in items) {
        const predefinedItem = MENU_ITEMS.find(item => item.id == key);
        formattedItems[predefinedItem ? predefinedItem.name : key] = items[key];
      }
      
      const newOrder = new Order({ items: formattedItems, senderId, receiverId: sender.partnerId });
      await newOrder.save();
      
      socket.emit("order_saved", { tempId, dbId: newOrder._id });
      
      const partnerSocketId = userSockets[sender.partnerId.toString()];
      if (partnerSocketId) {
        io.to(partnerSocketId).emit("receive_order", newOrder);
        console.log(`📦 Order sent from ${senderId} to partner ${sender.partnerId}`);
      }
    } catch (error) {
      console.error("Error processing order:", error);
    }
  });

  socket.on("acknowledge_order", async ({ orderId, receiverId }) => {
    try {
      const order = await Order.findByIdAndUpdate(orderId, { status: "acknowledged" }, { new: true });
      if (!order) return;
      
      const senderSocketId = userSockets[order.senderId.toString()];
      if (senderSocketId) {
        io.to(senderSocketId).emit("order_acknowledged", orderId);
        console.log(`👍 Order ${orderId} acknowledged by ${receiverId}.`);
      }
    } catch (error) {
      console.error("Error acknowledging order:", error);
    }
  });

  socket.on("reject_order", async ({ orderId, receiverId }) => {
    try {
      const order = await Order.findByIdAndUpdate(orderId, { status: "rejected" }, { new: true });
      if (!order) return;

      const senderSocketId = userSockets[order.senderId.toString()];
      if (senderSocketId) {
        io.to(senderSocketId).emit("order_rejected", orderId);
        console.log(`👎 Order ${orderId} rejected by ${receiverId}.`);
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
    }
  });

  socket.on("disconnect", () => {
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        break;
      }
    }
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// --- 7. SERVER LISTEN ---
server.listen(PORT, () => {
  console.log(`🚀 Backend server ready at http://localhost:${PORT}`);
});
