const express = require('express');
const { GarminConnect } = require('@flow-js/garmin-connect');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); // Allows your React app to call this API
app.use(express.json());

const GCClient = new GarminConnect({
    username: process.env.GARMIN_USERNAME,
    password: process.env.GARMIN_PASSWORD
});

// Login and fetch activities
app.get('/api/activities', async (req, res) => {
    try {
        await GCClient.login(); // Authenticate with Garmin
        const activities = await GCClient.getActivities(0, 10); // Get last 10 activities
        res.json(activities);
    } catch (error) {
        console.error('Login failed:', error);
        res.status(500).json({ error: 'Failed to fetch Garmin data' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
