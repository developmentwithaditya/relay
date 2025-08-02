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
import webpush from "web-push"; // Import web-push
import User from "./models/User.js";
import Order from "./models/Order.js";
import { parser } from "./config/cloudinary.js";
import { MENU_ITEMS } from "./menuItems.js";

// --- 2. INITIAL SETUP ---
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// --- Environment Variables & Push Notification Setup ---
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "a-super-secret-key-for-now";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Setup web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com', // Replace with your email
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log("✅ Web Push VAPID keys configured.");
} else {
  console.warn("⚠️ VAPID keys not found in .env. Push notifications will be disabled.");
}


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

// [NEW] Endpoint to save push subscription
app.post('/api/save-subscription', authMiddleware, async (req, res) => {
    try {
        const subscription = req.body;
        await User.findByIdAndUpdate(req.user.userId, {
            $set: { pushSubscription: subscription }
        });
        res.status(200).json({ message: 'Subscription saved successfully.' });
    } catch (error) {
        console.error("Error saving subscription:", error);
        res.status(500).json({ message: 'Could not save subscription.' });
    }
});

// ... (rest of your existing API endpoints like /api/register, /api/login, etc.)
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

// [DELETE] /api/profile - New Route for Account Deletion
app.delete("/api/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 1. Disconnect the partner if one exists
    if (user.partnerId) {
      await User.findByIdAndUpdate(user.partnerId, { $set: { partnerId: null } });
    }

    // 2. Remove this user from anyone else's pending connection requests
    await User.updateMany(
      { 'pendingRequests': userId },
      { $pull: { 'pendingRequests': userId } }
    );

    // 3. Delete all orders associated with the user (as sender or receiver)
    await Order.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    // 4. Delete the user document
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account and all associated data deleted successfully." });

  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Server error while deleting account." });
  }
});

// --- Connection Endpoints ---
app.get("/api/users/search", authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    const currentUser = await User.findById(req.user.userId).select("role");
    
    if (currentUser.role !== 'sender') {
      return res.status(403).json({ message: "Only senders can search for partners." });
    }
    
    const potentialPartner = await User.findOne({ 
      email, 
      _id: { $ne: req.user.userId },
      role: 'receiver'
    }).select("email role displayName profilePictureUrl");
    
    if (!potentialPartner) return res.status(404).json({ message: "No receiver found with that email." });
    res.json(potentialPartner);
  } catch (error) {
    res.status(500).json({ message: "Error searching for user." });
  }
});

app.post("/api/connect/request", authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const sender = await User.findById(req.user.userId).select("email role displayName profilePictureUrl");
    
    if (sender.role !== 'sender') {
      return res.status(403).json({ message: "Only senders can send connection requests." });
    }
    
    const target = await User.findById(targetUserId).select("role");
    if (!target || target.role !== 'receiver') {
      return res.status(400).json({ message: "Can only send requests to receivers." });
    }
    
    await User.findByIdAndUpdate(targetUserId, { 
      $addToSet: { 
        pendingRequests: {
          _id: req.user.userId,
          email: sender.email,
          role: sender.role,
          displayName: sender.displayName,
          profilePictureUrl: sender.profilePictureUrl,
          requestedAt: new Date()
        }
      } 
    });
    
    const targetSocketId = userSockets[targetUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit("connection_request_received", {
        from: sender,
        message: `${sender.displayName} wants to connect with you!`
      });
    }
    
    res.json({ message: "Connection request sent to receiver." });
  } catch (error) {
    res.status(500).json({ message: "Error sending request." });
  }
});

app.post("/api/connect/accept", authMiddleware, async (req, res) => {
  try {
    const { requesterId } = req.body;
    const currentUserId = req.user.userId;
    
    const accepter = await User.findById(currentUserId).select("displayName role");
    const requester = await User.findById(requesterId).select("displayName role");
    
    if (accepter.role !== 'receiver') {
      return res.status(403).json({ message: "Only receivers can accept connection requests." });
    }
    
    if (!requester || requester.role !== 'sender') {
      return res.status(400).json({ message: "Invalid request - requester must be a sender." });
    }
    
    await User.findByIdAndUpdate(currentUserId, { 
      partnerId: requesterId, 
      $pull: { pendingRequests: { _id: requesterId } }
    });
    await User.findByIdAndUpdate(requesterId, { partnerId: currentUserId });
    
    const requesterSocketId = userSockets[requesterId];
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("connection_request_accepted", {
        message: `${accepter.displayName} has accepted your connection request! 🎉`,
        partnerId: currentUserId
      });
    }
    
    res.json({ message: "Connection successful!" });
  } catch (error) {
    res.status(500).json({ message: "Error accepting request." });
  }
});

app.post("/api/connect/reject", authMiddleware, async (req, res) => {
  try {
    const { requesterId } = req.body;
    const currentUserId = req.user.userId;
    
    const rejecter = await User.findById(currentUserId).select("displayName role");
    const requester = await User.findById(requesterId).select("displayName role");
    
    if (rejecter.role !== 'receiver') {
      return res.status(403).json({ message: "Only receivers can reject connection requests." });
    }
    
    if (!requester || requester.role !== 'sender') {
      return res.status(400).json({ message: "Invalid request - requester must be a sender." });
    }
    
    await User.findByIdAndUpdate(currentUserId, { 
      $pull: { pendingRequests: { _id: requesterId } }
    });
    
    const requesterSocketId = userSockets[requesterId];
    if (requesterSocketId) {
      io.to(requesterSocketId).emit("connection_request_rejected", {
        message: `${rejecter.displayName} has rejected your connection request.`,
        requesterId: currentUserId
      });
    }
    
    res.json({ message: "Connection request rejected." });
  } catch (error) {
    res.status(500).json({ message: "Error rejecting request." });
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

app.patch('/api/presets/:id', authMiddleware, async (req, res) => {
    try {
        const { name, customItems, category } = req.body;
        const presetId = req.params.id;

        if (!name || !customItems || !category) {
            return res.status(400).json({ message: 'Preset name, items, and category are required.' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const preset = user.presets.id(presetId);
        if (!preset) return res.status(404).json({ message: 'Preset not found.' });

        preset.name = name;
        preset.customItems = customItems;
        preset.category = category;

        await user.save();
        res.json(user.presets);
    } catch (error) {
        if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
        res.status(500).json({ message: 'Server error updating preset.' });
    }
});

app.get("/api/pending-orders", authMiddleware, async (req, res) => {
  try {
    const pendingOrders = await Order.find({ receiverId: req.user.userId, status: "pending" })
      .sort({ createdAt: 1 })
      .limit(5);
    res.json(pendingOrders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending orders" });
  }
});

app.post('/api/custom-items', authMiddleware, async (req, res) => {
    try {
        const { itemName } = req.body;
        if (!itemName) {
            return res.status(400).json({ message: 'Item name is required.' });
        }
        const user = await User.findById(req.user.userId);
        if (user.customItems.length >= 20) {
            return res.status(400).json({ message: 'Maximum of 20 custom items reached.' });
        }
        await User.findByIdAndUpdate(req.user.userId, { $addToSet: { customItems: itemName } });
        res.status(201).json({ message: 'Item saved successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error saving item.' });
    }
});

app.delete('/api/custom-items/:name', authMiddleware, async (req, res) => {
    try {
        const itemName = decodeURIComponent(req.params.name);
        await User.findByIdAndUpdate(req.user.userId, { $pull: { customItems: itemName } });
        res.json({ message: 'Item deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting item.' });
    }
});

app.get("/api/order-history/sent", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ 
      senderId: req.user.userId, 
      status: { $in: ['acknowledged', 'rejected'] }
    })
    .populate('receiverId', 'displayName')
    .sort({ completedAt: -1 })
    .limit(10);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sent order history" });
  }
});

app.get("/api/order-history/received", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ 
      receiverId: req.user.userId, 
      status: { $in: ['acknowledged', 'rejected'] }
    })
    .populate('senderId', 'displayName')
    .sort({ completedAt: -1 })
    .limit(10);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching received order history" });
  }
});

app.get("/api/order-history/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const sentStats = await Order.aggregate([
      { $match: { senderId: new mongoose.Types.ObjectId(userId), status: { $in: ['acknowledged', 'rejected'] } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    const receivedStats = await Order.aggregate([
      { $match: { receiverId: new mongoose.Types.ObjectId(userId), status: { $in: ['acknowledged', 'rejected'] } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    const formatStats = (stats) => {
      const result = { acknowledged: 0, rejected: 0 };
      stats.forEach(stat => {
        result[stat._id] = stat.count;
      });
      return result;
    };
    
    res.json({
      sent: formatStats(sentStats),
      received: formatStats(receivedStats)
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching order statistics" });
  }
});

app.get("/api/pending-orders/sent", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ 
      senderId: req.user.userId, 
      status: 'pending'
    })
    .populate('receiverId', 'displayName')
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sent pending orders" });
  }
});

// --- 6. SOCKET.IO LOGIC ---
const userSockets = {};

// [NEW] Helper function to send a push notification
const sendPushNotification = async (userId, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return; // Don't run if keys aren't set

  try {
    const user = await User.findById(userId).select('pushSubscription');
    if (user && user.pushSubscription) {
      await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
      console.log(`🚀 Push notification sent to user ${userId}`);
    }
  } catch (error) {
    // This often happens if the subscription is expired.
    // You might want to remove the subscription from the DB here.
    console.error(`Error sending push notification to ${userId}:`, error.message);
  }
};

const emitUpdatedOrderList = async (receiverId) => {
    const partnerSocketId = userSockets[receiverId.toString()];
    if (partnerSocketId) {
        try {
            const pendingOrders = await Order.find({ receiverId: receiverId, status: "pending" })
                .sort({ createdAt: 1 })
                .limit(5);
            io.to(partnerSocketId).emit("order_list_updated", pendingOrders);
        } catch (error) {
            console.error("Error fetching and emitting order list:", error);
        }
    }
};

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

      const pendingCount = await Order.countDocuments({ receiverId: sender.partnerId, status: "pending" });
      if (pendingCount >= 5) {
        socket.emit("queue_full");
        console.log(`🚫 Order rejected: Queue full for receiver ${sender.partnerId}`);
        return;
      }

      let formattedItems = {};
      for (const key in items) {
        const predefinedItem = MENU_ITEMS.find(item => item.id == key);
        formattedItems[predefinedItem ? predefinedItem.name : key] = items[key];
      }
      
      const newOrder = new Order({ items: formattedItems, senderId, receiverId: sender.partnerId });
      await newOrder.save();
      
      socket.emit("order_saved", { tempId, dbId: newOrder._id });
      
      await emitUpdatedOrderList(sender.partnerId);
      console.log(`📦 Order sent from ${senderId} to partner ${sender.partnerId}. List updated.`);

      // [NEW] Send push notification to receiver
      const notificationPayload = {
        title: 'New Request Received!',
        body: `${sender.displayName} has sent you a new request.`,
        icon: '/favicon.ico', // Optional: Path to an icon
      };
      await sendPushNotification(sender.partnerId, notificationPayload);

    } catch (error) {
      console.error("Error processing order:", error);
      socket.emit("order_error", { message: "Could not process your request." });
    }
  });

socket.on("acknowledge_order", async ({ orderId, receiverId }) => {
  try {
    const order = await Order.findByIdAndUpdate(
      orderId, 
      { 
        status: "acknowledged",
        completedAt: new Date()
      }, 
      { new: true }
    ).populate('receiverId', 'displayName'); // Populate to get receiver's name
    if (!order) return;
    
    await maintainOrderHistoryLimit(order.senderId, 'sent');
    await maintainOrderHistoryLimit(order.receiverId, 'received');
    
    const senderSocketId = userSockets[order.senderId.toString()];
    if (senderSocketId) {
      io.to(senderSocketId).emit("order_acknowledged", orderId);
    }
    
    await emitUpdatedOrderList(receiverId);
    console.log(`👍 Order ${orderId} acknowledged by ${receiverId}. List updated.`);

    // [NEW] Send push notification to sender
    const notificationPayload = {
        title: 'Request Accepted!',
        body: `${order.receiverId.displayName} has accepted your request.`,
        icon: '/favicon.ico',
    };
    await sendPushNotification(order.senderId, notificationPayload);

  } catch (error) {
    console.error("Error acknowledging order:", error);
  }
});

 socket.on("reject_order", async ({ orderId, receiverId }) => {
  try {
    const order = await Order.findByIdAndUpdate(
      orderId, 
      { 
        status: "rejected",
        completedAt: new Date()
      }, 
      { new: true }
    ).populate('receiverId', 'displayName'); // Populate to get receiver's name
    if (!order) return;

    await maintainOrderHistoryLimit(order.senderId, 'sent');
    await maintainOrderHistoryLimit(order.receiverId, 'received');

    const senderSocketId = userSockets[order.senderId.toString()];
    if (senderSocketId) {
      io.to(senderSocketId).emit("order_rejected", orderId);
    }
    
    await emitUpdatedOrderList(receiverId);
    console.log(`👎 Order ${orderId} rejected by ${receiverId}. List updated.`);

    // [NEW] Send push notification to sender
    const notificationPayload = {
        title: 'Request Rejected',
        body: `${order.receiverId.displayName} has rejected your request.`,
        icon: '/favicon.ico',
    };
    await sendPushNotification(order.senderId, notificationPayload);

  } catch (error) {
    console.error("Error rejecting order:", error);
  }
});

const maintainOrderHistoryLimit = async (userId, type) => {
  try {
    const query = type === 'sent' 
      ? { senderId: userId, status: { $in: ['acknowledged', 'rejected'] } }
      : { receiverId: userId, status: { $in: ['acknowledged', 'rejected'] } };
    
    const orders = await Order.find(query).sort({ completedAt: -1 });
    
    if (orders.length > 10) {
      const ordersToDelete = orders.slice(10);
      const idsToDelete = ordersToDelete.map(order => order._id);
      await Order.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`🗑️ Cleaned up ${idsToDelete.length} old orders for user ${userId}`);
    }
  } catch (error) {
    console.error("Error maintaining order history limit:", error);
  }
};

socket.on("item_acknowledged", async ({ orderId, itemName, receiverId }) => {
  try {
    const receiver = await User.findById(receiverId);
    const order = await Order.findById(orderId);
    if (!order || !receiver) return;

    await Order.findByIdAndUpdate(orderId, {
      $push: {
        itemFeedback: {
          itemName,
          status: 'acknowledged',
          timestamp: new Date()
        }
      }
    });

    const senderSocketId = userSockets[order.senderId.toString()];
    if (senderSocketId) {
      io.to(senderSocketId).emit("sender_item_acknowledged", {
        orderId,
        itemName,
        receiverName: receiver.displayName,
      });
    }
  } catch (error) {
    console.error("Error relaying item acknowledgment:", error);
  }
});

socket.on("item_rejected", async ({ orderId, itemName, receiverId }) => {
  try {
    const receiver = await User.findById(receiverId);
    const order = await Order.findById(orderId);
    if (!order || !receiver) return;

    await Order.findByIdAndUpdate(orderId, {
      $push: {
        itemFeedback: {
          itemName,
          status: 'rejected',
          timestamp: new Date()
        }
      }
    });

    const senderSocketId = userSockets[order.senderId.toString()];
    if (senderSocketId) {
      io.to(senderSocketId).emit("sender_item_rejected", {
        orderId,
        itemName,
        receiverName: receiver.displayName,
      });
    }
  } catch (error) {
    console.error("Error relaying item rejection:", error);
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
