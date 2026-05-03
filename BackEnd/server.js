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

app.get('/api/health-metrics', async (req, res) => {
    if (!isGarminLoggedIn) return res.status(503).json({ error: "Garmin not connected" });
    
    try {
        const today = new Date();
        
        // 1. Fetch heart rate (restingHeartRate is usually here)
        const hrData = await GCClient.getHeartRate(today);
        
        // 2. Fetch sleep data (HRV and Readiness are deep in this object)
        const sleepData = await GCClient.getSleepDuration(today);

        // 3. Fetch weight using the built-in pound converter
        const weightLbs = await GCClient.getDailyWeightInPounds(today).catch(() => "N/A");

        res.json({
            weight: weightLbs !== "N/A" ? weightLbs.toFixed(1) : "N/A",
            heartRate: hrData?.restingHeartRate || "--",
            // Training Readiness and HRV are nested in the dailySleepDTO
            readiness: sleepData?.dailySleepDTO?.trainingReadinessValue || "N/A",
            hrv: sleepData?.dailySleepDTO?.hrvSummary?.lastNightAvg || "N/A",
            updatedAt: today.toISOString()
        });
    } catch (error) {
        console.error("Health Data Error:", error.message);
        res.status(500).json({ error: "Failed to fetch health metrics" });
    }
});


// --- START SERVER ---
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

