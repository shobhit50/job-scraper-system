const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const Job = require('../models/Job');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// GET / (home page)
router.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('index');
});

// GET /dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        // Get user profile
        const profile = await Profile.findOne({ userId: req.session.userId });
        
        // Load jobs from MongoDB if profile exists
        let jobs = [];
        if (profile) {
            try {
                // Fetch active jobs from MongoDB, sorted by newest first
                jobs = await Job.findActiveJobs()
                                .limit(100) // Limit to recent 100 jobs for performance
                                .lean(); // Convert to plain objects for better performance
                
                // Transform jobs to match the expected frontend format
                jobs = jobs.map(job => ({
                    id: job._id,
                    jobTitle: job.title,
                    companyName: job.company,
                    location: job.location,
                    experience: job.experience,
                    profileDescription: job.description,
                    platform: job.source,
                    url: job.url,
                    scrapedAt: job.scraped_at,
                    salary: job.salary,
                    skills: job.skills,
                    employment_type: job.employment_type,
                    timeAgo: job.timeAgo
                }));
                
            } catch (error) {
                console.error('Error loading jobs from MongoDB:', error);
                // Fallback to empty array if database error
                jobs = [];
            }
        }
        const justLoggedIn =  req.session.justLoggedIn || req.query.from === 'login';
        console.log('User just logged in:', justLoggedIn);
        res.render('dashboard', { 
            user: req.session.user,
            hasProfile: !!profile,
            jobs: jobs,
            success: req.query.success,
            error: req.query.error,
            justLoggedIn:  req.query.from === 'login'
        });
        
        // Clear the justLoggedIn flag after rendering
        delete req.session.justLoggedIn;
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', { 
            user: req.session.user,
            hasProfile: false,
            jobs: [],
            justLoggedIn: req.session.justLoggedIn || req.query.from === 'login'
        });
        
        // Clear the justLoggedIn flag after rendering
        delete req.session.justLoggedIn;
    }
});

module.exports = router;