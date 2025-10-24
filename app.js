const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import the animalRoutes router creator function
const createAnimalRouter = require('./routes/animalRoutes');

// --- 1. Initialization and Configuration ---

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. Database Connection ---

// Create a single database connection pool or connection instance
const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

// Attempt to connect to the database
connection.connect(err => {
    if (err) {
        // Log the error and exit or handle gracefully
        console.error('Fatal Error: Could not connect to MySQL:', err.stack);
        // In production, you might halt execution here: process.exit(1);
        return;
    }
    console.log('Successfully connected to MySQL database as ID', connection.threadId);
});

// --- 3. Middleware ---

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));

// Enable cookie parsing
app.use(cookieParser());

// Parse incoming request bodies
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// --- Custom Route for the Root Path (Homepage) ---
app.get('/', (req, res) => {
    // Serve the main index page
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/animalForm', (req, res) => {
    // This tells Express to send the add_animal_form.html file 
    // when the user navigates to http://localhost:3000/
    res.sendFile(path.join(__dirname, 'public', 'newAnimal.html'));
});

app.get('/editAnimal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'editAnimal.html'));
});

app.get('/dailyFeedCost', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dailyFeedCost.html'));
});

app.get('/dietComparison', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dietComparison.html'));
});

app.get('/feedNutrition', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'feedNutrition.html'));
});

app.get('/mapView', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mapView.html'));
});

app.get('/medical', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'medical.html'));
});
// Serve Static Frontend Files
// Serves files from the 'public' directory for all other paths (e.g., CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'img' directory
app.use('/img', express.static(path.join(__dirname, 'img')));


// --- 4. Router Mounting (API Endpoints) ---

const animalRouter = createAnimalRouter(connection);

app.use('/api', animalRouter);


// --- 5. Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

