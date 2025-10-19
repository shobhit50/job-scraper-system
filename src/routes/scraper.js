const express = require('express');
const router = express.Router();
const scraperService = require('../services/scraperService');
const Profile = require('../models/Profile');

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

// GET /scraper/status - Get current scraper status
router.get('/status', requireAuth, async (req, res) => {
    try {
        const status = scraperService.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get scraper status',
            error: error.message
        });
    }
});

// POST /scraper/start/:platform - Start scraping for specific platform
router.post('/start/:platform', requireAuth, async (req, res) => {
    try {
        const { platform } = req.params;
        const userId = req.session.user.id;

        // Validate platform
        const supportedPlatforms = ['linkedin', 'naukri', 'indeed'];
        if (!supportedPlatforms.includes(platform.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Unsupported platform: ${platform}. Supported platforms: ${supportedPlatforms.join(', ')}`
            });
        }

        // Get user credentials for the platform
        let userCredentials = {};
        try {
            const profile = await Profile.findOne({ userId });
            if (profile && profile.platformCredentials) {
                const platformCreds = profile.platformCredentials.find(
                    cred => cred.platform.toLowerCase() === platform.toLowerCase()
                );
                
                if (platformCreds) {
                    userCredentials = {
                        username: platformCreds.username,
                        // Note: password would be decrypted here in production
                        platform: platform
                    };
                }
            }
        } catch (profileError) {
            console.log('Could not fetch user credentials:', profileError.message);
        }

        // Start scraping
        const result = await scraperService.startScraping(platform.toLowerCase(), userCredentials);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Scraper start error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start scraper',
            error: error.message
        });
    }
});

// POST /scraper/stop - Stop current scraping
router.post('/stop', requireAuth, async (req, res) => {
    try {
        const result = scraperService.stopScraping();
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop scraper',
            error: error.message
        });
    }
});

// GET /scraper/history - Get scraping history
router.get('/history', requireAuth, async (req, res) => {
    try {
        const history = scraperService.getScrapingHistory();
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get scraping history',
            error: error.message
        });
    }
});

// GET /scraper/platforms - Get supported platforms
router.get('/platforms', requireAuth, async (req, res) => {
    try {
        const platforms = [
            {
                name: 'LinkedIn',
                id: 'linkedin',
                description: 'Professional networking platform with job listings',
                status: 'active'
            },
            {
                name: 'Naukri.com',
                id: 'naukri',
                description: 'Leading job portal in India',
                status: 'active'
            },
            {
                name: 'Indeed',
                id: 'indeed',
                description: 'Global job search engine',
                status: 'active'
            }
        ];

        res.json({
            success: true,
            data: platforms
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get platforms',
            error: error.message
        });
    }
});

module.exports = router;