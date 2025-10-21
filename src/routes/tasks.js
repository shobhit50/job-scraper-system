const express = require('express');
const router = express.Router();
const axios = require('axios');

// Base URL of the FastAPI task controller
const TASKS_API_BASE = process.env.TASKS_API_BASE || 'http://127.0.0.1:8000';

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

// GET /tasks/status - Proxy to FastAPI tasks status
router.get('/status', requireAuth, async (req, res) => {
    try {
        const resp = await axios.get(`${TASKS_API_BASE}/tasks/status`);
        // Forward the FastAPI response body
        return res.json(resp.data);
    } catch (error) {
        console.error('Error fetching tasks status:', error.message);
        return res.status(502).json({
            success: false,
            message: 'Failed to fetch tasks status from task controller',
            error: error.message
        });
    }
});

// POST /tasks/start/:taskName - Start a specific task (proxy to FastAPI)
router.post('/start/:taskName', requireAuth, async (req, res) => {
    try {
        const { taskName } = req.params;
        // Call FastAPI task start endpoint
        const resp = await axios.post(`${TASKS_API_BASE}/tasks/start/${encodeURIComponent(taskName)}`);
        // Expected FastAPI response examples:
        // { message: 'started', task: 'scrape_linkedin' }
        // { message: 'alredy_started', task: 'scrape_linkedin' }
        return res.status(resp.status).json(resp.data);
    } catch (error) {
        // If FastAPI returns a non-2xx, axios throws - handle that
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        console.error('Failed to start task via task controller:', error.message);
        return res.status(502).json({
            success: false,
            message: 'Failed to start task via task controller',
            error: error.message
        });
    }
});

// POST /tasks/stop - Stop a specific task (proxy to FastAPI)
// Accepts either ?name=scrape_linkedin or ?platform=linkedin
router.post('/stop', requireAuth, async (req, res) => {
    try {
        let { name, platform } = req.query;
        if (!name && platform) {
            name = `scrape_${platform}`;
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Query parameter "name" or "platform" is required to stop a task'
            });
        }

        const resp = await axios.post(`${TASKS_API_BASE}/tasks/stop`, null, {
            params: { name }
        });

        return res.status(resp.status).json(resp.data);
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        console.error('Failed to stop task via task controller:', error.message);
        return res.status(502).json({
            success: false,
            message: 'Failed to stop task via task controller',
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