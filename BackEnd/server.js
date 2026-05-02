require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GarminConnect } = require('garmin-connect');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- MONGODB SETUP ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Goal Schema
const goalSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Goal = mongoose.model('Goal', goalSchema);

// --- GARMIN SETUP ---
const GCClient = new GarminConnect({
    username: process.env.GARMIN_USERNAME,
    password: process.env.GARMIN_PASSWORD,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

let isGarminLoggedIn = false;

const initializeGarmin = async () => {
    try {
        console.log("🚀 Logging into Garmin...");
        await GCClient.login();
        isGarminLoggedIn = true;
        console.log("✅ Garmin Login Successful!");
    } catch (error) {
        console.error("❌ Garmin Login Failed:", error.message);
    }
};
initializeGarmin();

// --- API ROUTES ---

// 1. Garmin Activities
app.get('/api/activities', async (req, res) => {
    if (!isGarminLoggedIn) return res.status(503).json({ error: "Garmin not connected" });
    try {
        const activities = await GCClient.getActivities(0, 10);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch activities" });
    }
});

// 2. Get All Goals (MongoDB)
app.get('/api/goals', async (req, res) => {
    try {
        const goals = await Goal.find().sort({ createdAt: -1 });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch goals" });
    }
});

// 3. Create New Goal (MongoDB)
app.post('/api/goals', async (req, res) => {
    try {
        const newGoal = new Goal({ text: req.body.text });
        await newGoal.save();
        res.json(newGoal);
    } catch (error) {
        res.status(500).json({ error: "Failed to save goal" });
    }
});

// 4. Delete a Goal (MongoDB)
app.delete('/api/goals/:id', async (req, res) => {
    try {
        await Goal.findByIdAndDelete(req.params.id);
        res.json({ message: "Goal deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete goal" });
    }
});

// --- START SERVER ---
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

