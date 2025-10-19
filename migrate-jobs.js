const mongoose = require('mongoose');
const Job = require('./src/models/Job');
const fs = require('fs');
const path = require('path');

// Migration script to move data from JSON file to MongoDB
async function migrateJobsToMongoDB() {
    try {
        console.log('🔄 Starting job data migration...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/jobscraper', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
        
        // Read existing JSON data
        const jsonFilePath = path.join(__dirname, 'data', 'jobs.json');
        const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
        const jobs = JSON.parse(jsonData);
        
        console.log(`📊 Found ${jobs.length} jobs in JSON file`);
        
        // Clear existing jobs collection
        await Job.deleteMany({});
        console.log('🧹 Cleared existing jobs collection');
        
        // Transform and insert jobs
        let successCount = 0;
        let errorCount = 0;
        
        for (const jobData of jobs) {
            try {
                // Transform JSON structure to match new schema
                const transformedJob = {
                    title: jobData.jobTitle || jobData.title,
                    company: jobData.companyName || jobData.company,
                    location: jobData.location,
                    description: jobData.profileDescription || jobData.description || '',
                    url: jobData.url || `https://example.com/job/${jobData.id}`,
                    source: jobData.platform || 'linkedin', // Default to linkedin if not specified
                    platform_job_id: jobData.id?.toString(),
                    experience: jobData.experience,
                    employment_type: 'full-time', // Default value
                    posted_at: jobData.scrapedAt ? new Date(jobData.scrapedAt) : new Date(),
                    scraped_at: jobData.scrapedAt ? new Date(jobData.scrapedAt) : new Date(),
                    status: 'active',
                    extra_data: {
                        original_id: jobData.id,
                        original_data: jobData
                    }
                };
                
                // Create new job document
                const newJob = new Job(transformedJob);
                await newJob.save();
                successCount++;
                
                if (successCount % 10 === 0) {
                    console.log(`✅ Migrated ${successCount} jobs...`);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error migrating job ${jobData.id}:`, error.message);
            }
        }
        
        console.log('\n📈 Migration Summary:');
        console.log(`✅ Successfully migrated: ${successCount} jobs`);
        console.log(`❌ Failed migrations: ${errorCount} jobs`);
        
        // Verify migration
        const totalJobsInDB = await Job.countDocuments();
        console.log(`📊 Total jobs in database: ${totalJobsInDB}`);
        
        // Get some statistics
        const stats = await Job.getJobStats();
        console.log('\n📊 Job Statistics by Source:');
        stats.forEach(stat => {
            console.log(`  ${stat._id}: ${stat.count} jobs (latest: ${stat.latestScrape.toLocaleDateString()})`);
        });
        
        console.log('\n🎉 Migration completed successfully!');
        
        // Create backup of original JSON file
        const backupPath = path.join(__dirname, 'data', `jobs_backup_${Date.now()}.json`);
        fs.copyFileSync(jsonFilePath, backupPath);
        console.log(`📁 Backup created at: ${backupPath}`);
        
        return {
            success: true,
            migrated: successCount,
            errors: errorCount,
            total: totalJobsInDB
        };
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateJobsToMongoDB()
        .then(result => {
            if (result.success) {
                console.log(`\n✅ Migration completed: ${result.migrated} jobs migrated`);
                process.exit(0);
            } else {
                console.error(`\n❌ Migration failed: ${result.error}`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = migrateJobsToMongoDB;