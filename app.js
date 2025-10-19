const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const path = require('path');
const scraperTasks = require('./src/tasks/scraperTasks');

// Fix mongoose deprecation warning
mongoose.set('strictQuery', false);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(cookieSession({
    name: 'session',
    keys: ['your-secret-key'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date(startTime + (5.5 * 60 * 60 * 1000)).toISOString();
    
    console.log(`[${timestamp}] ${req.method} ${req.get('host')}${req.originalUrl} - Request started`);
    
    const originalEnd = res.end;
    res.end = function(...args) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const completionTime = new Date(endTime + (5.5 * 60 * 60 * 1000)).toISOString();

        console.log(`[${completionTime}] ${req.method} ${req.get('host')}${req.originalUrl} - Status: ${res.statusCode} Completed in ${duration}ms`);

        originalEnd.apply(res, args);
    };
    
    next();
});



// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/jobscraper', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Import route modules
const mainRoutes = require('./src/routes/main');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const scraperRoutes = require('./src/routes/scraper');
const taskRoutes = require('./src/routes/tasks');
const apiRoutes = require('./src/routes/api');

// Use route modules
app.use('/', mainRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/scraper', scraperRoutes);
app.use('/tasks', taskRoutes);
app.use('/api', apiRoutes);

// Initialize automated scraping tasks
scraperTasks.init();

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});