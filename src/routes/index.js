// Routes module index file
// Centralizes all route exports for easy importing

const mainRoutes = require('./main');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const scraperRoutes = require('./scraper');
const taskRoutes = require('./tasks');

module.exports = {
    mainRoutes,
    authRoutes,
    userRoutes,
    scraperRoutes,
    taskRoutes
};