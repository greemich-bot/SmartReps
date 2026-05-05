require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GarminConnect } = require('garmin-connect');

const app = express();
app.use(cors());
app.use(express.json());

// --- MongoDB ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const UserGoals = mongoose.model('UserGoals', new mongoose.Schema({
    goalIds:   { type: [String], default: [] },
    updatedAt: { type: Date,     default: Date.now }
}));

// --- Garmin ---
const GCClient = new GarminConnect({
    username:  process.env.GARMIN_USERNAME,
    password:  process.env.GARMIN_PASSWORD,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
});

let isGarminLoggedIn = false;
let dashboardCache = null;
let dashboardCacheUpdatedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

const asNum = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

// Returns { values: number[], trend: 'up'|'down'|'stable'|null }
const computeHrvTrend = async () => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        return d;
    });

    const results = await Promise.allSettled(dates.map(d => GCClient.getSleepData(d)));
    const values = results
        .map(r => r.status === 'fulfilled' ? asNum(r.value?.avgOvernightHrv) : null)
        .filter(v => v !== null);

    if (values.length < 2) return { values, trend: null };

    const recent = values.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const older  = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const diff = recent - older;
    const trend = diff > 2 ? 'up' : diff < -2 ? 'down' : 'stable';

    return { values, trend };
};

const mapActivity = (act) => ({
    id:       act.activityId || act.id || `${act.startTimeLocal || Date.now()}-${act.activityName || 'activity'}`,
    date:     act.startTimeLocal
                ? new Date(act.startTimeLocal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : (act.date || 'Unknown'),
    name:     act.activityName || act.name || 'Workout',
    type:     act.activityType?.typeKey || act.activityType || act.type || 'unknown',
    distance: act.distance
                ? +(Number(act.distance) > 100 ? Number(act.distance) / 1609.344 : Number(act.distance)).toFixed(2)
                : 0
});

// Fallback: cache → empty
const sendFallback = (res, warning) => {
    if (dashboardCache) return res.json({ ...dashboardCache, fromCache: true, warning });
    res.json({ heartRate: null, hrv: null, sleep: null, steps: null, recentActivities: [], warning });
};

(async () => {
    try {
        console.log('🚀 Logging into Garmin...');
        await GCClient.login();
        isGarminLoggedIn = true;
        console.log('✅ Garmin Login Successful!');
    } catch (err) {
        console.error('❌ Garmin Login Failed:', err.message);
    }
})();

// --- Routes ---

app.get('/api/activities', async (req, res) => {
    if (!isGarminLoggedIn) return res.status(503).json({ error: 'Garmin not connected' });
    try {
        res.json(await GCClient.getActivities(0, 10));
    } catch {
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

app.get('/api/dashboard-data', async (req, res) => {
    if (!isGarminLoggedIn) {
        try { await GCClient.login(); isGarminLoggedIn = true; }
        catch { return sendFallback(res, 'Garmin login unavailable. Showing cached data.'); }
    }

    const now = Date.now();
    if (dashboardCache && now - dashboardCacheUpdatedAt < CACHE_TTL) {
        return res.json({ ...dashboardCache, fromCache: true });
    }

    try {
        const [stepsRes, hrRes, sleepRes, actsRes, hrvTrendRes] = await Promise.allSettled([
            GCClient.getSteps(new Date()),
            GCClient.getHeartRate(new Date()),
            GCClient.getSleepData(new Date()),
            GCClient.getActivities(0, 5),
            computeHrvTrend()
        ]);

        const s        = stepsRes.status    === 'fulfilled' ? stepsRes.value    : {};
        const hr       = hrRes.status       === 'fulfilled' ? hrRes.value       : {};
        const sleep    = sleepRes.status    === 'fulfilled' ? sleepRes.value    : {};
        const acts     = actsRes.status     === 'fulfilled' ? actsRes.value     : [];
        const hrvTrend = hrvTrendRes.status === 'fulfilled' ? hrvTrendRes.value : { values: [], trend: null };

        const sleepSecs = sleep?.dailySleepDTO?.sleepTimeSeconds ?? sleep?.sleepTimeSeconds ?? null;
        const latest = acts[0] || {};

        const response = {
            heartRate: asNum(hr?.restingHeartRate ?? hr?.dailyRestingHeartRate ?? hr?.heartRateValues?.[0]?.[1] ?? hr?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE?.value),
            hrv:       asNum(sleep?.avgOvernightHrv ?? null),
            hrvTrend:  hrvTrend.trend,
            hrvValues: hrvTrend.values,
            sleep:     sleepSecs != null ? +(sleepSecs / 3600).toFixed(1) : null,
            steps:     asNum(typeof s === 'number' ? s : s?.totalSteps ?? s?.steps ?? s?.dailySteps ?? s?.allMetrics?.metricsMap?.TOTAL_STEPS?.value ?? latest?.steps),
            recentActivities: acts.map(act => ({
                id:       act.activityId,
                date:     act.startTimeLocal ? new Date(act.startTimeLocal).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
                name:     act.activityName || 'Workout',
                type:     act.activityType?.typeKey || act.activityType || 'unknown',
                distance: act.distance ? +(act.distance / 1609.344).toFixed(2) : 0
            }))
        };

        const hasData = response.heartRate !== null || response.sleep !== null || response.steps !== null;
        if (!hasData && dashboardCache) {
            return res.json({
                ...dashboardCache,
                recentActivities: response.recentActivities.length ? response.recentActivities : dashboardCache.recentActivities,
                fromCache: true,
                warning: 'Garmin returned partial data. Showing last known metrics.'
            });
        }

        dashboardCache = response;
        dashboardCacheUpdatedAt = now;
        res.json(response);
    } catch (err) {
        console.error('Dashboard data error:', err.message);
        const isRateLimited = err?.message?.includes('429') || err?.message?.includes('1015') || err?.message?.toLowerCase().includes('rate limited');
        sendFallback(res, isRateLimited ? 'Garmin rate-limited. Showing cached data.' : 'Temporary sync issue. Showing cached data.');
    }
});

app.get('/api/user-goals', async (req, res) => {
    try {
        const doc = await UserGoals.findOne();
        res.json({ goalIds: doc ? doc.goalIds : [] });
    } catch {
        res.status(500).json({ error: 'Failed to fetch user goals' });
    }
});

app.put('/api/user-goals', async (req, res) => {
    const { goalIds } = req.body;
    if (!Array.isArray(goalIds)) return res.status(400).json({ error: 'goalIds must be an array' });
    try {
        const doc = await UserGoals.findOneAndUpdate({}, { goalIds, updatedAt: new Date() }, { upsert: true, returnDocument: 'after' });
        res.json({ goalIds: doc.goalIds });
    } catch {
        res.status(500).json({ error: 'Failed to save user goals' });
    }
});

// --- Start ---
const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
