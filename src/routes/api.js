const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    next();
};

// GET /api/jobs - Get all jobs with filtering and pagination
router.get('/jobs', requireAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            source,
            company,
            location,
            experience,
            search,
            sortBy = 'scraped_at',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { status: 'active' };
        
        if (source) filter.source = source;
        if (company) filter.company = new RegExp(company, 'i');
        if (location) filter.location = new RegExp(location, 'i');
        if (experience) filter.experience = new RegExp(experience, 'i');
        
        // Add search functionality
        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { company: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { skills: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Calculate pagination
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute queries
        const [jobs, totalJobs] = await Promise.all([
            Job.find(filter)
               .sort(sort)
               .skip(skip)
               .limit(pageSize)
               .lean(),
            Job.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalJobs / pageSize);
        
        res.json({
            success: true,
            data: {
                jobs,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    totalJobs,
                    pageSize,
                    hasNext: pageNumber < totalPages,
                    hasPrev: pageNumber > 1
                }
            }
        });

    } catch (error) {
        console.error('API jobs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch jobs',
            error: error.message
        });
    }
});

// GET /api/jobs/stats - Get job statistics
router.get('/jobs/stats', requireAuth, async (req, res) => {
    try {
        const stats = await Job.getJobStats();
        
        // Get additional statistics
        const [totalJobs, recentJobs, topCompanies] = await Promise.all([
            Job.countDocuments({ status: 'active' }),
            Job.countDocuments({ 
                status: 'active',
                scraped_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }),
            Job.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$company', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ])
        ]);

        res.json({
            success: true,
            data: {
                bySource: stats,
                totalActive: totalJobs,
                recentWeek: recentJobs,
                topCompanies: topCompanies.map(item => ({
                    company: item._id,
                    jobCount: item.count
                }))
            }
        });

    } catch (error) {
        console.error('API stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});

// GET /api/jobs/:id - Get specific job details
router.get('/jobs/:id', requireAuth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        res.json({
            success: true,
            data: job
        });

    } catch (error) {
        console.error('API job detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch job details',
            error: error.message
        });
    }
});

// POST /api/jobs/:id/apply - Mark job as applied (for tracking)
router.post('/jobs/:id/apply', requireAuth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Add application tracking logic here
        // For now, just return success
        res.json({
            success: true,
            message: 'Application recorded successfully',
            data: { jobId: job._id, appliedAt: new Date() }
        });

    } catch (error) {
        console.error('API apply error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record application',
            error: error.message
        });
    }
});

// GET /api/jobs/search/suggestions - Get search suggestions
router.get('/jobs/search/suggestions', requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: { suggestions: [] }
            });
        }

        // Get suggestions from different fields
        const [titles, companies, skills] = await Promise.all([
            Job.distinct('title', { 
                title: new RegExp(q, 'i'),
                status: 'active'
            }).limit(5),
            Job.distinct('company', { 
                company: new RegExp(q, 'i'),
                status: 'active'
            }).limit(5),
            Job.distinct('skills', { 
                skills: new RegExp(q, 'i'),
                status: 'active'
            }).limit(5)
        ]);

        const suggestions = [
            ...titles.map(title => ({ type: 'title', value: title })),
            ...companies.map(company => ({ type: 'company', value: company })),
            ...skills.map(skill => ({ type: 'skill', value: skill }))
        ].slice(0, 10);

        res.json({
            success: true,
            data: { suggestions }
        });

    } catch (error) {
        console.error('API suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch suggestions',
            error: error.message
        });
    }
});

module.exports = router;