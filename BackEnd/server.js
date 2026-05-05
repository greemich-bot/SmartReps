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

const MaxLiftLog = mongoose.model('MaxLiftLog', new mongoose.Schema({
    date:       { type: Date, required: true },
    squat:      { type: Number, default: null },
    deadlift:   { type: Number, default: null },
    benchpress: { type: Number, default: null },
    createdAt:  { type: Date, default: Date.now }
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
let weightTrendCache = null;
let weightTrendCacheUpdatedAt = 0;
const WEIGHT_TREND_CACHE_TTL = 30 * 60 * 1000;

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
    res.json({ heartRate: null, hrv: null, sleep: null, steps: null, weight: null, recentActivities: [], warning });
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
        const [stepsRes, hrRes, sleepRes, actsRes, hrvTrendRes, weightRes] = await Promise.allSettled([
            GCClient.getSteps(new Date()),
            GCClient.getHeartRate(new Date()),
            GCClient.getSleepData(new Date()),
            GCClient.getActivities(0, 5),
            computeHrvTrend(),
            GCClient.getDailyWeightInPounds(new Date())
        ]);

        const s        = stepsRes.status    === 'fulfilled' ? stepsRes.value    : {};
        const hr       = hrRes.status       === 'fulfilled' ? hrRes.value       : {};
        const sleep    = sleepRes.status    === 'fulfilled' ? sleepRes.value    : {};
        const acts     = actsRes.status     === 'fulfilled' ? actsRes.value     : [];
        const hrvTrend = hrvTrendRes.status === 'fulfilled' ? hrvTrendRes.value : { values: [], trend: null };
        const weightLbs = weightRes.status  === 'fulfilled' ? weightRes.value   : null;

        const sleepSecs = sleep?.dailySleepDTO?.sleepTimeSeconds ?? sleep?.sleepTimeSeconds ?? null;
        const latest = acts[0] || {};

        const response = {
            heartRate: asNum(hr?.restingHeartRate ?? hr?.dailyRestingHeartRate ?? hr?.heartRateValues?.[0]?.[1] ?? hr?.allMetrics?.metricsMap?.WELLNESS_RESTING_HEART_RATE?.value),
            hrv:       asNum(sleep?.avgOvernightHrv ?? null),
            hrvTrend:  hrvTrend.trend,
            hrvValues: hrvTrend.values,
            sleep:     sleepSecs != null ? +(sleepSecs / 3600).toFixed(1) : null,
            steps:     asNum(typeof s === 'number' ? s : s?.totalSteps ?? s?.steps ?? s?.dailySteps ?? s?.allMetrics?.metricsMap?.TOTAL_STEPS?.value ?? latest?.steps),
            weight:    asNum(typeof weightLbs === 'number' ? +weightLbs.toFixed(1) : null),
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

app.get('/api/max-lifts', async (req, res) => {
    try {
        const logs = await MaxLiftLog.find().sort({ date: 1, createdAt: 1 });
        if (!logs.length) return res.json({ entries: [], latest: { squat: null, deadlift: null, benchpress: null } });

        const entries = logs.map((l) => ({
            id: l._id,
            date: l.date,
            squat: l.squat,
            deadlift: l.deadlift,
            benchpress: l.benchpress
        }));

        const latest = entries[entries.length - 1];
        res.json({
            entries,
            latest: {
                squat: latest.squat,
                deadlift: latest.deadlift,
                benchpress: latest.benchpress,
                date: latest.date
            }
        });
    } catch {
        res.status(500).json({ error: 'Failed to fetch max lifts' });
    }
});

app.put('/api/max-lifts', async (req, res) => {
    const normalize = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? n : NaN;
    };

    const dateInput = req.body?.date;
    const date = dateInput ? new Date(dateInput) : new Date();
    const squat = normalize(req.body?.squat);
    const deadlift = normalize(req.body?.deadlift);
    const benchpress = normalize(req.body?.benchpress);

    if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: 'date must be a valid ISO date or yyyy-mm-dd string' });
    }

    if (Number.isNaN(squat) || Number.isNaN(deadlift) || Number.isNaN(benchpress)) {
        return res.status(400).json({ error: 'squat, deadlift, and benchpress must be non-negative numbers or null' });
    }

    if (squat === null && deadlift === null && benchpress === null) {
        return res.status(400).json({ error: 'At least one lift value is required' });
    }

    try {
        const doc = await MaxLiftLog.create({ date, squat, deadlift, benchpress });
        res.json({ id: doc._id, date: doc.date, squat: doc.squat, deadlift: doc.deadlift, benchpress: doc.benchpress });
    } catch {
        res.status(500).json({ error: 'Failed to save max lifts' });
    }
});

app.delete('/api/max-lifts/latest', async (req, res) => {
    try {
        const latest = await MaxLiftLog.findOne().sort({ date: -1, createdAt: -1 });
        if (!latest) return res.status(404).json({ error: 'No max-lift entries to delete' });

        await MaxLiftLog.deleteOne({ _id: latest._id });
        res.json({ deletedId: latest._id, deletedDate: latest.date });
    } catch {
        res.status(500).json({ error: 'Failed to delete latest max-lift entry' });
    }
});

app.get('/api/weight-trend', async (req, res) => {
    const daysRaw = Number(req.query.days);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(Math.floor(daysRaw), 365) : 90;

    if (!isGarminLoggedIn) {
        try { await GCClient.login(); isGarminLoggedIn = true; }
        catch { return res.status(503).json({ error: 'Garmin not connected' }); }
    }

    const now = Date.now();
    if (
        weightTrendCache
        && weightTrendCache.days === days
        && now - weightTrendCacheUpdatedAt < WEIGHT_TREND_CACHE_TTL
    ) {
        return res.json({ ...weightTrendCache, fromCache: true });
    }

    try {
        const today = new Date();
        const dates = Array.from({ length: days }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (days - 1 - i));
            return d;
        });

        const results = await Promise.allSettled(
            dates.map((d) => GCClient.getDailyWeightInPounds(d))
        );

        const entries = results
            .map((r, i) => {
                if (r.status !== 'fulfilled') return null;
                const value = r.value;
                if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return null;
                return {
                    date: dates[i].toISOString().slice(0, 10),
                    weight: +value.toFixed(1)
                };
            })
            .filter(Boolean);

        const response = {
            days,
            entries,
            latest: entries.length ? entries[entries.length - 1] : null
        };

        weightTrendCache = response;
        weightTrendCacheUpdatedAt = now;
        res.json(response);
    } catch {
        res.status(500).json({ error: 'Failed to fetch weight trend' });
    }
});

// --- Start ---
const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
