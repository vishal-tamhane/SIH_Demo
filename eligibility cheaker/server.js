const express = require('express');
const pg = require('pg');
const app = express();

require('dotenv').config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

db.connect()
    .then(() => console.log("Connected to database"))
    .catch(err => console.error("Connection error", err));

module.exports = db;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Serve static files like HTML, CSS, and JS from the public directory
app.use(express.static('public'));

// Route to serve the main form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Route to check eligibility
app.post('/check-eligibility', async (req, res) => {
    const { name, age, ipc_section, criminal_record, flight_risk, income, anticipatory_bail } = req.body;

    try {
        // Fetch IPC section details from the database
        const ipcQuery = await db.query(
            `SELECT * FROM ipc_sections WHERE section_number = $1`,
            [ipc_section]
        );
        const ipcRule = ipcQuery.rows[0];

        // Check if IPC section exists
        if (!ipcRule) {
            return res.send(`<h1>Invalid IPC Section: ${ipc_section}</h1>`);
        }

        // Logic for bailable offenses
        if (ipcRule.bailable && income <= 100000 && criminal_record === 'false' && flight_risk === 'false') {
            return res.send(`<h1>${name} is eligible for bail under IPC Section ${ipc_section}!</h1>`);
        }

        // Logic for non-bailable offenses, check for anticipatory bail
        if (!ipcRule.bailable && anticipatory_bail === 'true') {
            return res.send(`<h1>${name} may apply for anticipatory bail under IPC Section ${ipc_section}.</h1>`);
        }

        // Default case when bail is not granted
        res.send(`<h1>${name} is not eligible for bail under IPC Section ${ipc_section}.</h1>`);
    } catch (error) {
        console.error(error);
        res.send('Error checking eligibility based on IPC section.');
    }
});

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
