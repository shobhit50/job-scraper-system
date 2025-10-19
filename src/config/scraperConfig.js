// Scraper configuration settings
module.exports = {
    // Cron schedule expressions
    schedules: {
        linkedin: '0 9 * * *',    // Every day at 9:00 AM
        naukri: '0 14 * * *',     // Every day at 2:00 PM
        indeed: '0 18 * * *'      // Every day at 6:00 PM
    },
    
    // Scraper service endpoints (for production)
    endpoints: {
        linkedin: process.env.LINKEDIN_SCRAPER_URL || 'http://localhost:3001',
        naukri: process.env.NAUKRI_SCRAPER_URL || 'http://localhost:3002',
        indeed: process.env.INDEED_SCRAPER_URL || 'http://localhost:3003'
    },
    
    // Request timeout settings
    timeouts: {
        scraping: 300000,  // 5 minutes
        api: 30000         // 30 seconds
    },
    
    // Retry settings
    retry: {
        attempts: 3,
        delay: 5000  // 5 seconds
    },
    
    // Supported platforms
    platforms: [
        {
            id: 'linkedin',
            name: 'LinkedIn',
            description: 'Professional networking platform',
            enabled: true
        },
        {
            id: 'naukri',
            name: 'Naukri.com',
            description: 'Leading job portal in India',
            enabled: true
        },
        {
            id: 'indeed',
            name: 'Indeed',
            description: 'Global job search engine',
            enabled: true
        }
    ],
    
    // Default search criteria
    defaultSearchCriteria: {
        keywords: ['developer', 'engineer', 'programmer', 'software'],
        locations: ['India', 'Bangalore', 'Mumbai', 'Delhi', 'Pune'],
        experience: ['0-1', '1-3', '3-5', '5-10'],
        jobType: ['full-time', 'part-time', 'contract']
    }
};