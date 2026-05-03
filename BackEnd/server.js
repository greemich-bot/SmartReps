require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
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

// UserGoals Schema — stores the list of selected predefined goal IDs
const userGoalsSchema = new mongoose.Schema({
    goalIds: { type: [String], default: [] },
    updatedAt: { type: Date, default: Date.now }
});
const UserGoals = mongoose.model('UserGoals', userGoalsSchema);

// --- GARMIN SETUP ---
const GCClient = new GarminConnect({
    username: process.env.GARMIN_USERNAME,
    password: process.env.GARMIN_PASSWORD,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
});

let isGarminLoggedIn = false;
let dashboardCache = null;
let dashboardCacheUpdatedAt = 0;
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;
const GARMIN_EXPORT_PATH = process.env.GARMIN_EXPORT_PATH || path.join(__dirname, 'data', 'garmin-export.json');

const emptyDashboardData = () => ({
    heartRate: null,
    hrv: null,
    sleep: null,
    steps: null,
    calories: null,
    recentActivities: []
});

const asNumberOrNull = (value) => (typeof value === 'number' && !Number.isNaN(value) ? value : null);

const mapActivityForDashboard = (act) => ({
    id: act.activityId || act.id || `${act.startTimeLocal || act.startTimeGMT || Date.now()}-${act.activityName || act.name || 'activity'}`,
    date: act.startTimeLocal
        ? new Date(act.startTimeLocal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : (act.date || 'Unknown'),
    name: act.activityName || act.name || 'Workout',
    type: act.activityType?.typeKey || act.activityType || act.type || 'unknown',
    distance: act.distance
        ? +(Number(act.distance) > 100 ? Number(act.distance) / 1609.344 : Number(act.distance)).toFixed(2)
        : 0
});

const loadExportDashboardData = () => {
    if (!fs.existsSync(GARMIN_EXPORT_PATH)) return null;

    const raw = JSON.parse(fs.readFileSync(GARMIN_EXPORT_PATH, 'utf-8'));
    const activityListRaw = Array.isArray(raw)
        ? raw
        : (raw.recentActivities || raw.activities || raw.activityList || []);
    const recentActivities = Array.isArray(activityListRaw)
        ? activityListRaw.map(mapActivityForDashboard).slice(0, 10)
        : [];

    const latestActivity = Array.isArray(activityListRaw) ? activityListRaw[0] || {} : {};

    const response = {
        heartRate: asNumberOrNull(
            raw.heartRate ??
            raw.restingHeartRate ??
            raw.dailyRestingHeartRate ??
            raw?.wellness?.restingHeartRate ??
            latestActivity.averageHR
        ),
        hrv: asNumberOrNull(raw.hrv ?? raw?.wellness?.hrv ?? null),
        sleep: asNumberOrNull(raw.sleep ?? raw.sleepHours ?? raw?.wellness?.sleepHours ?? null),
        steps: asNumberOrNull(
            raw.steps ??
            raw.totalSteps ??
            raw?.wellness?.steps ??
            latestActivity.steps
        ),
        calories: asNumberOrNull(
            raw.calories ??
            raw.totalCalories ??
            raw?.wellness?.calories ??
            latestActivity.calories
        ),
        recentActivities
    };

    return response;
};

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

// 2. Garmin Dashboard Data (heart rate, HRV, sleep, steps, calories, recent activities)
app.get('/api/dashboard-data', async (req, res) => {
    const useExportSource = req.query.source === 'export';

    if (useExportSource) {
        try {
            const exportData = loadExportDashboardData();
            if (!exportData) {
                return res.status(404).json({
                    error: `Export file not found at ${GARMIN_EXPORT_PATH}`
                });
            }
            return res.json({
                ...exportData,
                fromExport: true,
                warning: 'Showing metrics from Garmin export file.'
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to parse Garmin export file' });
        }
    }

    if (!isGarminLoggedIn) {
        try {
            await GCClient.login();
            isGarminLoggedIn = true;
        } catch (error) {
            console.error('Garmin reconnect failed:', error.message);

            try {
                const exportData = loadExportDashboardData();
                if (exportData) {
                    return res.json({
                        ...exportData,
                        fromExport: true,
                        warning: 'Garmin login unavailable. Showing metrics from export file.'
                    });
                }
            } catch (parseError) {
                console.error('Export parse failed:', parseError.message);
            }

            if (dashboardCache) {
                return res.json({
                    ...dashboardCache,
                    fromCache: true,
                    warning: 'Garmin is temporarily unavailable. Showing cached dashboard data.'
                });
            }
            return res.status(200).json({
                ...emptyDashboardData(),
                fromCache: false,
                warning: 'Garmin is temporarily unavailable. Please try again in a few minutes.'
            });
        }
    }

    const now = Date.now();
    if (dashboardCache && now - dashboardCacheUpdatedAt < DASHBOARD_CACHE_TTL_MS) {
        return res.json({ ...dashboardCache, fromCache: true });
    }

    const today = new Date();

    try {
        const [stepsData, heartRateData, sleepData, activities] = await Promise.allSettled([
            GCClient.getSteps(today),
            GCClient.getHeartRate(today),
            GCClient.getSleepData(today),
            GCClient.getActivities(0, 5)
        ]);

        const s = stepsData.status === 'fulfilled' ? stepsData.value : {};
        const hr = heartRateData.status === 'fulfilled' ? heartRateData.value : {};
        const sleep = sleepData.status === 'fulfilled' ? sleepData.value : {};
        const acts = activities.status === 'fulfilled' ? activities.value : [];

        // Sleep in hours from seconds
        const sleepSeconds = sleep?.dailySleepDTO?.sleepTimeSeconds ?? sleep?.sleepTimeSeconds ?? null;
        const sleepHours = sleepSeconds != null ? +(sleepSeconds / 3600).toFixed(1) : null;

        const recentActivities = acts.map(act => ({
            id: act.activityId,
            date: act.startTimeLocal
                ? new Date(act.startTimeLocal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Unknown',
            name: act.activityName || 'Workout',
            type: act.activityType?.typeKey || act.activityType || 'unknown',
            distance: act.distance ? +(act.distance / 1609.344).toFixed(2) : 0
        }));

        const latestActivity = acts[0] || {};

        const response = {
            heartRate: asNumberOrNull(
                hr?.restingHeartRate ??
                hr?.dailyRestingHeartRate ??
                hr?.heartRateValues?.[0]?.[1] ??
                hr?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE?.value
            ),
            hrv: null,
            sleep: sleepHours,
            steps: asNumberOrNull(
                s?.totalSteps ??
                s?.steps ??
                s?.dailySteps ??
                s?.allMetrics?.metricsMap?.TOTAL_STEPS?.value ??
                latestActivity?.steps
            ),
            calories: asNumberOrNull(
                s?.totalKilocalories ??
                s?.calories ??
                s?.activeKilocalories ??
                s?.allMetrics?.metricsMap?.TOTAL_CALORIES?.value ??
                latestActivity?.calories
            ),
            recentActivities
        };

        const hasCoreMetrics =
            response.heartRate !== null ||
            response.sleep !== null ||
            response.steps !== null ||
            response.calories !== null;

        if (!hasCoreMetrics && dashboardCache) {
            const mergedResponse = {
                ...dashboardCache,
                recentActivities: response.recentActivities.length ? response.recentActivities : dashboardCache.recentActivities,
                fromCache: true,
                warning: 'Garmin returned partial data. Showing last known metrics.'
            };
            return res.json(mergedResponse);
        }

        if (hasCoreMetrics || !dashboardCache) {
            dashboardCache = response;
            dashboardCacheUpdatedAt = now;
        }

        res.json(response);
    } catch (error) {
        console.error("Dashboard data error:", error.message);

        const isRateLimited =
            error?.message?.includes('429') ||
            error?.message?.includes('1015') ||
            error?.message?.toLowerCase().includes('rate limited');

        if (dashboardCache) {
            return res.json({
                ...dashboardCache,
                fromCache: true,
                warning: isRateLimited
                    ? 'Garmin rate-limited this request. Showing recently cached data.'
                    : 'Using cached Garmin data due to a temporary sync issue.'
            });
        }

        if (isRateLimited) {
            try {
                const exportData = loadExportDashboardData();
                if (exportData) {
                    return res.status(200).json({
                        ...exportData,
                        fromExport: true,
                        warning: 'Garmin is rate-limited. Showing metrics from export file.'
                    });
                }
            } catch (parseError) {
                console.error('Export parse failed:', parseError.message);
            }

            return res.status(200).json({
                ...emptyDashboardData(),
                fromCache: false,
                warning: 'Garmin temporarily rate-limited requests. Wait a few minutes and try again.'
            });
        }

        res.status(500).json({ error: "Failed to fetch dashboard data" });
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













// 5. Get selected goal IDs
app.get('/api/user-goals', async (req, res) => {
    try {
        const doc = await UserGoals.findOne();
        res.json({ goalIds: doc ? doc.goalIds : [] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user goals' });
    }
});

// 6. Save selected goal IDs (upsert single document)
app.put('/api/user-goals', async (req, res) => {
    try {
        const { goalIds } = req.body;
        if (!Array.isArray(goalIds)) return res.status(400).json({ error: 'goalIds must be an array' });
        const doc = await UserGoals.findOneAndUpdate(
            {},
            { goalIds, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json({ goalIds: doc.goalIds });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save user goals' });
    }
});

// --- START SERVER ---
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

