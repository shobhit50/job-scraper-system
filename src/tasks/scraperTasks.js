const cron = require('node-cron');
const scraperService = require('../services/scraperService');
const scraperConfig = require('../config/scraperConfig');

class ScraperTasks {
    constructor() {
        this.tasks = new Map();
        this.isInitialized = false;
    }

    // Initialize all scheduled scraper tasks
    init() {
        if (this.isInitialized) {
            console.log('Scraper tasks already initialized');
            return;
        }

        console.log('Setting up automated scraping jobs...');
        
        try {
            this.setupLinkedInTask();
            this.setupNaukriTask();
            this.setupIndeedTask();
            
            this.isInitialized = true;
            console.log('Cron jobs scheduled successfully!');
            console.log('Active scheduled tasks:', Array.from(this.tasks.keys()));
            
        } catch (error) {
            console.error('Error setting up scraper tasks:', error);
        }
    }

    // Setup LinkedIn scraping task - every day at 9:00 AM
    setupLinkedInTask() {
        const taskName = 'linkedin-daily';
        const schedule = scraperConfig.schedules.linkedin || '0 9 * * *';
        
        const task = cron.schedule(schedule, async () => {
            console.log('🔄 Running automated LinkedIn scraping...');
            try {
                const result = await scraperService.startScraping('linkedin');
                if (result.success) {
                    console.log(`✅ Automated LinkedIn scraping completed - ${result.data.jobsScraped} jobs scraped`);
                } else {
                    console.log(`❌ Automated LinkedIn scraping failed: ${result.message}`);
                }
            } catch (error) {
                console.error('❌ Automated LinkedIn scraping failed:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });

        this.tasks.set(taskName, {
            task,
            schedule,
            platform: 'linkedin',
            description: 'Daily LinkedIn job scraping',
            isRunning: false
        });

        console.log(`📅 LinkedIn scraping scheduled: ${schedule} (Asia/Kolkata)`);
    }

    // Setup Naukri scraping task - every day at 2:00 PM
    setupNaukriTask() {
        const taskName = 'naukri-daily';
        const schedule = scraperConfig.schedules.naukri || '0 14 * * *';
        
        const task = cron.schedule(schedule, async () => {
            console.log('🔄 Running automated Naukri scraping...');
            try {
                const result = await scraperService.startScraping('naukri');
                if (result.success) {
                    console.log(`✅ Automated Naukri scraping completed - ${result.data.jobsScraped} jobs scraped`);
                } else {
                    console.log(`❌ Automated Naukri scraping failed: ${result.message}`);
                }
            } catch (error) {
                console.error('❌ Automated Naukri scraping failed:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });

        this.tasks.set(taskName, {
            task,
            schedule,
            platform: 'naukri',
            description: 'Daily Naukri job scraping',
            isRunning: false
        });

        console.log(`📅 Naukri scraping scheduled: ${schedule} (Asia/Kolkata)`);
    }

    // Setup Indeed scraping task - every day at 6:00 PM
    setupIndeedTask() {
        const taskName = 'indeed-daily';
        const schedule = scraperConfig.schedules.indeed || '0 18 * * *';
        
        const task = cron.schedule(schedule, async () => {
            console.log('🔄 Running automated Indeed scraping...');
            try {
                const result = await scraperService.startScraping('indeed');
                if (result.success) {
                    console.log(`✅ Automated Indeed scraping completed - ${result.data.jobsScraped} jobs scraped`);
                } else {
                    console.log(`❌ Automated Indeed scraping failed: ${result.message}`);
                }
            } catch (error) {
                console.error('❌ Automated Indeed scraping failed:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });

        this.tasks.set(taskName, {
            task,
            schedule,
            platform: 'indeed',
            description: 'Daily Indeed job scraping',
            isRunning: false
        });

        console.log(`📅 Indeed scraping scheduled: ${schedule} (Asia/Kolkata)`);
    }

    // Start a specific task
    startTask(taskName) {
        const taskInfo = this.tasks.get(taskName);
        if (taskInfo) {
            taskInfo.task.start();
            taskInfo.isRunning = true;
            console.log(`✅ Started task: ${taskName}`);
            return true;
        } else {
            console.log(`❌ Task not found: ${taskName}`);
            return false;
        }
    }

    // Stop a specific task
    stopTask(taskName) {
        const taskInfo = this.tasks.get(taskName);
        if (taskInfo) {
            taskInfo.task.stop();
            taskInfo.isRunning = false;
            console.log(`⏹️  Stopped task: ${taskName}`);
            return true;
        } else {
            console.log(`❌ Task not found: ${taskName}`);
            return false;
        }
    }

    // Get all task statuses
    getTaskStatuses() {
        const statuses = {};
        this.tasks.forEach((taskInfo, taskName) => {
            statuses[taskName] = {
                platform: taskInfo.platform,
                schedule: taskInfo.schedule,
                description: taskInfo.description,
                isRunning: taskInfo.isRunning,
                isScheduled: taskInfo.task ? true : false
            };
        });
        return statuses;
    }

    // Start all tasks
    startAllTasks() {
        console.log('🚀 Starting all scraper tasks...');
        this.tasks.forEach((taskInfo, taskName) => {
            this.startTask(taskName);
        });
    }

    // Stop all tasks
    stopAllTasks() {
        console.log('⏹️  Stopping all scraper tasks...');
        this.tasks.forEach((taskInfo, taskName) => {
            this.stopTask(taskName);
        });
    }

    // Destroy all tasks (cleanup)
    destroy() {
        console.log('🧹 Cleaning up scraper tasks...');
        this.tasks.forEach((taskInfo, taskName) => {
            if (taskInfo.task) {
                taskInfo.task.destroy();
            }
        });
        this.tasks.clear();
        this.isInitialized = false;
        console.log('✅ All scraper tasks cleaned up');
    }

    // Add a custom task
    addCustomTask(taskName, schedule, platform, callback) {
        try {
            const task = cron.schedule(schedule, callback, {
                scheduled: true,
                timezone: "Asia/Kolkata"
            });

            this.tasks.set(taskName, {
                task,
                schedule,
                platform,
                description: `Custom task for ${platform}`,
                isRunning: true
            });

            console.log(`📅 Custom task added: ${taskName} - ${schedule}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to add custom task ${taskName}:`, error.message);
            return false;
        }
    }

    // Remove a task
    removeTask(taskName) {
        const taskInfo = this.tasks.get(taskName);
        if (taskInfo) {
            taskInfo.task.destroy();
            this.tasks.delete(taskName);
            console.log(`🗑️  Removed task: ${taskName}`);
            return true;
        } else {
            console.log(`❌ Task not found: ${taskName}`);
            return false;
        }
    }

    // Run a task immediately (one-time execution)
    runTaskNow(platform) {
        console.log(`🚀 Running immediate ${platform} scraping...`);
        return new Promise(async (resolve, reject) => {
            try {
                const result = await scraperService.startScraping(platform);
                if (result.success) {
                    console.log(`✅ Immediate ${platform} scraping completed - ${result.data.jobsScraped} jobs scraped`);
                    resolve(result);
                } else {
                    console.log(`❌ Immediate ${platform} scraping failed: ${result.message}`);
                    reject(new Error(result.message));
                }
            } catch (error) {
                console.error(`❌ Immediate ${platform} scraping failed:`, error.message);
                reject(error);
            }
        });
    }
}

// Export singleton instance
module.exports = new ScraperTasks();