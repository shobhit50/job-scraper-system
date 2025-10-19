const express = require('express');
const router = express.Router();
const scraperTasks = require('../tasks/scraperTasks');

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

// GET /tasks/status - Get all task statuses
router.get('/status', requireAuth, async (req, res) => {
    try {
        const taskStatuses = scraperTasks.getTaskStatuses();
        res.json({
            success: true,
            data: taskStatuses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get task statuses',
            error: error.message
        });
    }
});

// POST /tasks/start/:taskName - Start a specific task
router.post('/start/:taskName', requireAuth, async (req, res) => {
    try {
        const { taskName } = req.params;
        const result = scraperTasks.startTask(taskName);
        
        if (result) {
            res.json({
                success: true,
                message: `Task ${taskName} started successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Task ${taskName} not found`
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to start task',
            error: error.message
        });
    }
});

// POST /tasks/stop/:taskName - Stop a specific task
router.post('/stop/:taskName', requireAuth, async (req, res) => {
    try {
        const { taskName } = req.params;
        const result = scraperTasks.stopTask(taskName);
        
        if (result) {
            res.json({
                success: true,
                message: `Task ${taskName} stopped successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Task ${taskName} not found`
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop task',
            error: error.message
        });
    }
});

// POST /tasks/run-now/:platform - Run a task immediately
router.post('/run-now/:platform', requireAuth, async (req, res) => {
    try {
        const { platform } = req.params;
        const result = await scraperTasks.runTaskNow(platform);
        
        res.json({
            success: true,
            message: `${platform} scraping completed successfully`,
            data: result.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to run ${platform} scraping`,
            error: error.message
        });
    }
});

// POST /tasks/start-all - Start all tasks
router.post('/start-all', requireAuth, async (req, res) => {
    try {
        scraperTasks.startAllTasks();
        res.json({
            success: true,
            message: 'All tasks started successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to start all tasks',
            error: error.message
        });
    }
});

// POST /tasks/stop-all - Stop all tasks
router.post('/stop-all', requireAuth, async (req, res) => {
    try {
        scraperTasks.stopAllTasks();
        res.json({
            success: true,
            message: 'All tasks stopped successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop all tasks',
            error: error.message
        });
    }
});

// POST /tasks/add-custom - Add a custom task
router.post('/add-custom', requireAuth, async (req, res) => {
    try {
        const { taskName, schedule, platform } = req.body;
        
        if (!taskName || !schedule || !platform) {
            return res.status(400).json({
                success: false,
                message: 'taskName, schedule, and platform are required'
            });
        }
        
        // Create callback function for the custom task
        const callback = async () => {
            console.log(`🔄 Running custom ${platform} scraping...`);
            try {
                await scraperTasks.runTaskNow(platform);
            } catch (error) {
                console.error(`❌ Custom ${platform} scraping failed:`, error.message);
            }
        };
        
        const result = scraperTasks.addCustomTask(taskName, schedule, platform, callback);
        
        if (result) {
            res.json({
                success: true,
                message: `Custom task ${taskName} added successfully`
            });
        } else {
            res.status(400).json({
                success: false,
                message: `Failed to add custom task ${taskName}`
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add custom task',
            error: error.message
        });
    }
});

// DELETE /tasks/:taskName - Remove a task
router.delete('/:taskName', requireAuth, async (req, res) => {
    try {
        const { taskName } = req.params;
        const result = scraperTasks.removeTask(taskName);
        
        if (result) {
            res.json({
                success: true,
                message: `Task ${taskName} removed successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Task ${taskName} not found`
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to remove task',
            error: error.message
        });
    }
});

module.exports = router;