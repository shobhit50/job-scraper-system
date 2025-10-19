// Tasks module index file
// Centralizes all task-related exports

const scraperTasks = require('./scraperTasks');

module.exports = {
    scraperTasks,
    
    // Export main task manager
    init: () => scraperTasks.init(),
    
    // Export task control methods
    startTask: (taskName) => scraperTasks.startTask(taskName),
    stopTask: (taskName) => scraperTasks.stopTask(taskName),
    getTaskStatuses: () => scraperTasks.getTaskStatuses(),
    startAllTasks: () => scraperTasks.startAllTasks(),
    stopAllTasks: () => scraperTasks.stopAllTasks(),
    
    // Export utility methods
    runTaskNow: (platform) => scraperTasks.runTaskNow(platform),
    addCustomTask: (taskName, schedule, platform, callback) => 
        scraperTasks.addCustomTask(taskName, schedule, platform, callback),
    removeTask: (taskName) => scraperTasks.removeTask(taskName),
    
    // Cleanup
    destroy: () => scraperTasks.destroy()
};