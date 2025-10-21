const axios = require('axios');
const Job = require('../models/Job');

class ScraperService {
    constructor() {
        this.scraperStatus = {
            isRunning: false,
            lastRun: null,
            platform: null,
            jobsScraped: 0,
            status: 'idle',
            error: null
        };
        
        // Scraper endpoints (these would be actual scraper services in production)
        this.scraperEndpoints = {
            linkedin: 'http://localhost:3001/scrape',
            // naukri: 'http://localhost:3002/scrape',
            // indeed: 'http://localhost:3003/scrape'
        };
    }

    async init() {
        try {
            const response = await fetch('http://localhost:3001/tasks/status', {
                method: 'GET',
                headers: {
                    'accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch status: ${response.status}`);
            }

            const data = await response.json();

            const isRunning = data.count >= 1 && data.running.length > 0;

            this.scraperStatus.isRunning = isRunning;
            this.scraperStatus.status = isRunning ? 'running' : 'stopped';
        } catch (error) {
            this.scraperStatus.error = error.message;
        }
    }

    async getStatus() {
        return {
            ...this.scraperStatus,
            uptime: this.scraperStatus.lastRun ?
                new Date().getTime() - new Date(this.scraperStatus.lastRun).getTime() : 0
        };
    }

    // Start scraping for a specific platform
    async startScraping(platform, userCredentials = {}) {
        try {
            // Validate platform
            if (!this.scraperEndpoints[platform]) {
                throw new Error(`Unsupported platform: ${platform}`);
            }

            // Check if already running
            if (this.scraperStatus.isRunning) {
                throw new Error('Scraper is already running. Please wait for it to complete.');
            }

            // Update status
            this.scraperStatus = {
                isRunning: true,
                lastRun: new Date().toISOString(),
                platform: platform,
                jobsScraped: 0,
                status: 'running',
                error: null
            };

            console.log(`Starting ${platform} scraper...`);

                // Call task controller to start the scraper task (FastAPI)
                const result = await this.callScraperAPI(platform, userCredentials);

            // Update status on success
            this.scraperStatus = {
                ...this.scraperStatus,
                isRunning: false,
                jobsScraped: result.jobsScraped,
                status: 'completed',
                error: null
            };

            // Save scraped jobs to file
            await this.saveScrapedJobs(result.jobs);

            console.log(`${platform} scraping completed. Jobs scraped: ${result.jobsScraped}`);
            
            return {
                success: true,
                message: `Successfully scraped ${result.jobsScraped} jobs from ${platform}`,
                data: result
            };

        } catch (error) {
            // Update status on error
            this.scraperStatus = {
                ...this.scraperStatus,
                isRunning: false,
                status: 'error',
                error: error.message
            };

            console.error(`Scraping error for ${platform}:`, error.message);
            
            return {
                success: false,
                message: error.message,
                data: null
            };
        }
    }

    // Simulate calling external scraper API
    async callScraperAPI(platform, credentials) {
        // Use TASKS API controller to start and monitor scraping task
        const TASKS_API_BASE = process.env.TASKS_API_BASE || 'http://127.0.0.1:8000';

        try {
            // Start task: e.g. POST /tasks/start/linkedin
            const startResp = await axios.post(`${TASKS_API_BASE}/tasks/start/${encodeURIComponent(platform)}`);
            // startResp.data expected: { message: 'started'|'alredy_started', task: 'scrape_linkedin' }
            const startData = startResp.data || {};

            // If task already started, return quick response
            if (startData.message === 'alredy_started') {
                return { jobsScraped: 0, jobs: [], note: 'already_started' };
            }

            // If started, poll /tasks/status until task is no longer running or timeout
            const timeoutMs = 5 * 60 * 1000; // 5 minutes
            const pollInterval = 3000; // 3 seconds
            const startTime = Date.now();

            while (Date.now() - startTime < timeoutMs) {
                // GET /tasks/status
                try {
                    const statusResp = await axios.get(`${TASKS_API_BASE}/tasks/status`);
                    const statusData = statusResp.data || {};
                    const running = statusData.running || [];

                    // If task is no longer in running list, assume completed
                    if (!running.includes(startData.task)) {
                        // In a real system, we'd fetch results; here we return placeholder
                        return { jobsScraped: 0, jobs: [], note: 'completed' };
                    }
                } catch (pollErr) {
                    console.warn('Warning polling tasks status:', pollErr.message);
                }

                // wait
                await new Promise(r => setTimeout(r, pollInterval));
            }

            // Timeout reached
            throw new Error('Task did not complete within timeout');

        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(`Task controller error: ${error.response.data.detail || error.response.data.message || JSON.stringify(error.response.data)}`);
            }
            throw new Error(error.message);
        }
        
    }

    // Generate mock jobs for testing
    // generateMockJobs(count, platform) {
    //     const jobs = [];
    //     const titles = ['Software Developer', 'Full Stack Developer', 'Backend Developer', 
    //                    'Frontend Developer', 'DevOps Engineer', 'Data Scientist'];
    //     const companies = ['TechCorp', 'InnovateLabs', 'StartupXYZ', 'MegaTech', 'CodeFactory'];
    //     const locations = ['Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai'];
    //     const salaries = ['5-8 LPA', '8-12 LPA', '12-18 LPA', '18-25 LPA', 'Not disclosed'];
        
    //     for (let i = 0; i < count; i++) {
    //         const jobId = Date.now() + i;
    //         jobs.push({
    //             title: titles[Math.floor(Math.random() * titles.length)],
    //             company: companies[Math.floor(Math.random() * companies.length)],
    //             location: locations[Math.floor(Math.random() * locations.length)],
    //             experience: `${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 3) + 3} years`,
    //             description: `Looking for skilled developer with expertise in modern technologies and ${platform} experience.`,
    //             url: `https://${platform}.com/job/${jobId}`,
    //             source: platform,
    //             platform_job_id: jobId.toString(),
    //             salary: salaries[Math.floor(Math.random() * salaries.length)],
    //             employment_type: 'full-time',
    //             skills: this.extractRandomSkills(),
    //             posted_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
    //             scraped_at: new Date(),
    //             status: 'active',
    //             extra_data: {
    //                 mock_data: true,
    //                 generated_at: new Date().toISOString()
    //             }
    //         });
    //     }
        
        // return jobs;
    // }

    // Extract random skills for mock data
    extractRandomSkills() {
        const allSkills = [
            'javascript', 'python', 'java', 'react', 'nodejs', 'angular', 'vue',
            'html', 'css', 'sql', 'mongodb', 'mysql', 'postgresql', 'redis',
            'docker', 'kubernetes', 'aws', 'azure', 'git', 'jenkins'
        ];
        
        const numSkills = Math.floor(Math.random() * 5) + 2; // 2-6 skills
        const skills = [];
        
        for (let i = 0; i < numSkills; i++) {
            const skill = allSkills[Math.floor(Math.random() * allSkills.length)];
            if (!skills.includes(skill)) {
                skills.push(skill);
            }
        }
        
        return skills;
    }

    // Save scraped jobs to MongoDB
    async saveScrapedJobs(jobs) {
        try {
            let savedCount = 0;
            let duplicateCount = 0;
            let errorCount = 0;
            
            console.log(`Saving ${jobs.length} jobs to MongoDB...`);
            
            for (const jobData of jobs) {
                try {
                    // Check if job already exists by URL to avoid duplicates
                    const existingJob = await Job.findOne({ url: jobData.url });
                    
                    if (existingJob) {
                        duplicateCount++;
                        continue;
                    }
                    
                    // Create new job document
                    const newJob = new Job(jobData);
                    await newJob.save();
                    savedCount++;
                    
                } catch (error) {
                    errorCount++;
                    console.error('Error saving individual job:', error.message);
                }
            }
            
            console.log(`✅ Saved ${savedCount} new jobs to MongoDB`);
            console.log(`⏭️  Skipped ${duplicateCount} duplicate jobs`);
            if (errorCount > 0) {
                console.log(`❌ Failed to save ${errorCount} jobs`);
            }
            
            return {
                saved: savedCount,
                duplicates: duplicateCount,
                errors: errorCount,
                total: jobs.length
            };
            
        } catch (error) {
            console.error('Error saving scraped jobs to MongoDB:', error.message);
            throw error;
        }
    }

    // Stop current scraping (for manual interruption)
    stopScraping() {
        if (this.scraperStatus.isRunning) {
            this.scraperStatus = {
                ...this.scraperStatus,
                isRunning: false,
                status: 'stopped',
                error: 'Manually stopped by user'
            };
            return { success: true, message: 'Scraping stopped successfully' };
        } else {
            return { success: false, message: 'No scraping process is currently running' };
        }
    }

    // Get scraping history/logs
    getScrapingHistory() {
        // In production, this would fetch from database
        return {
            recentRuns: [
                {
                    platform: this.scraperStatus.platform,
                    startTime: this.scraperStatus.lastRun,
                    status: this.scraperStatus.status,
                    jobsScraped: this.scraperStatus.jobsScraped,
                    error: this.scraperStatus.error
                }
            ]
        };
    }
}

// Export singleton instance
module.exports = new ScraperService();