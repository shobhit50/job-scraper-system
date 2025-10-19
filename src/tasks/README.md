# Tasks Directory

This directory contains all scheduled task modules for the job scraper system.

## Structure

```
src/tasks/
├── index.js          # Main tasks module export
├── scraperTasks.js   # Scraper cron job management
└── README.md         # This documentation
```

## ScraperTasks Module

The `scraperTasks.js` module manages all automated scraping jobs using node-cron.

### Features

- **Automated Scheduling**: Daily scraping for LinkedIn, Naukri, and Indeed
- **Task Management**: Start, stop, and monitor individual tasks
- **Custom Tasks**: Add custom scraping schedules
- **Timezone Support**: All tasks run in Asia/Kolkata timezone
- **Error Handling**: Comprehensive error logging and recovery

### Default Schedules

| Platform | Schedule | Time (IST) | Description |
|----------|----------|------------|-------------|
| LinkedIn | `0 9 * * *` | 9:00 AM | Daily LinkedIn job scraping |
| Naukri | `0 14 * * *` | 2:00 PM | Daily Naukri job scraping |
| Indeed | `0 18 * * *` | 6:00 PM | Daily Indeed job scraping |

### Usage

#### Initialize Tasks
```javascript
const scraperTasks = require('./src/tasks/scraperTasks');
scraperTasks.init(); // Start all scheduled tasks
```

#### Control Individual Tasks
```javascript
// Start a specific task
scraperTasks.startTask('linkedin-daily');

// Stop a specific task
scraperTasks.stopTask('naukri-daily');

// Get task statuses
const statuses = scraperTasks.getTaskStatuses();
console.log(statuses);
```

#### Run Tasks Immediately
```javascript
// Run a platform scraping immediately (outside schedule)
scraperTasks.runTaskNow('linkedin')
    .then(result => console.log('Scraping completed:', result))
    .catch(error => console.error('Scraping failed:', error));
```

#### Add Custom Tasks
```javascript
// Add a custom scraping task
scraperTasks.addCustomTask(
    'weekend-linkedin',     // Task name
    '0 10 * * 6,0',        // Every Saturday and Sunday at 10 AM
    'linkedin',            // Platform
    async () => {          // Custom callback
        console.log('Running weekend LinkedIn scraping...');
        await scraperTasks.runTaskNow('linkedin');
    }
);
```

#### Cleanup
```javascript
// Stop and cleanup all tasks (useful for graceful shutdown)
scraperTasks.destroy();
```

## API Endpoints

Task management is also available via REST API endpoints:

### Task Status
- **GET** `/tasks/status` - Get all task statuses

### Task Control
- **POST** `/tasks/start/:taskName` - Start specific task
- **POST** `/tasks/stop/:taskName` - Stop specific task
- **POST** `/tasks/start-all` - Start all tasks
- **POST** `/tasks/stop-all` - Stop all tasks

### Immediate Execution
- **POST** `/tasks/run-now/:platform` - Run platform scraping immediately

### Custom Tasks
- **POST** `/tasks/add-custom` - Add custom task
- **DELETE** `/tasks/:taskName` - Remove task

## Configuration

Task schedules and settings can be configured in:
- `src/config/scraperConfig.js` - Cron schedules and platform settings

## Logging

All task activities are logged with emojis for easy identification:
- 🔄 Task starting
- ✅ Task completed successfully
- ❌ Task failed
- 📅 Task scheduled
- 🚀 Task started manually
- ⏹️ Task stopped
- 🧹 Cleanup operations

## Error Handling

Tasks include comprehensive error handling:
- Failed scraping attempts are logged but don't stop the scheduler
- Tasks continue running even if individual executions fail
- All errors include detailed messages for debugging

## Best Practices

1. **Initialize Once**: Call `scraperTasks.init()` only once in your application
2. **Graceful Shutdown**: Use `scraperTasks.destroy()` when shutting down
3. **Monitor Logs**: Check console logs for task status and errors
4. **Custom Schedules**: Use standard cron syntax for custom task schedules
5. **Timezone Awareness**: All tasks use Asia/Kolkata timezone by default