const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        index: true // For search optimization
    },
    company: {
        type: String,
        required: true,
        trim: true,
        index: true // For filtering by company
    },
    location: {
        type: String,
        trim: true,
        index: true // For location-based filtering
    },
    description: {
        type: String,
        trim: true
    },
    url: {
        type: String,
        required: true,
        unique: true, // Prevent duplicate URLs
        trim: true
    },
    source: {
        type: String,
        required: true,
        enum: ['linkedin', 'naukri', 'indeed'],
        lowercase: true,
        index: true // For source filtering
    },
    platform_job_id: {
        type: String,
        trim: true,
        index: true // For deduplication
    },
    salary: {
        type: String, // Store as string to handle various formats like "5-8 LPA", "Not disclosed"
        trim: true
    },
    experience: {
        type: String,
        trim: true,
        index: true // For experience filtering
    },
    employment_type: {
        type: String,
        enum: ['full-time', 'part-time', 'internship', 'contract', 'freelance'],
        lowercase: true,
        default: 'full-time'
    },
    skills: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    posted_at: {
        type: Date,
        default: Date.now // If platform doesn't provide posting date
    },
    scraped_at: {
        type: Date,
        required: true,
        default: Date.now,
        index: true // For sorting by scrape time
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Global jobs vs user-specific jobs
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'removed'],
        default: 'active',
        index: true
    },
    extra_data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'jobs'
});

// Compound indexes for common queries
jobSchema.index({ source: 1, scraped_at: -1 }); // Jobs by source, newest first
jobSchema.index({ company: 1, status: 1 }); // Active jobs by company
jobSchema.index({ location: 1, status: 1 }); // Active jobs by location
jobSchema.index({ title: 'text', description: 'text' }); // Text search index

// Pre-save middleware to clean and process data
jobSchema.pre('save', function(next) {
    // Clean and normalize data
    if (this.title) {
        this.title = this.title.trim();
    }
    
    if (this.company) {
        this.company = this.company.trim();
    }
    
    if (this.location) {
        this.location = this.location.trim();
    }
    
    // Extract skills from description if skills array is empty
    if ((!this.skills || this.skills.length === 0) && this.description) {
        this.skills = extractSkillsFromDescription(this.description);
    }
    
    // Normalize salary format
    if (this.salary) {
        this.salary = normalizeSalary(this.salary);
    }
    
    next();
});

// Static methods
jobSchema.statics.findActiveJobs = function(filters = {}) {
    return this.find({ status: 'active', ...filters })
               .sort({ scraped_at: -1 })
               .populate('user_id', 'name email');
};

jobSchema.statics.findBySource = function(source, limit = 50) {
    return this.find({ source: source.toLowerCase(), status: 'active' })
               .sort({ scraped_at: -1 })
               .limit(limit);
};

jobSchema.statics.searchJobs = function(searchTerm, filters = {}) {
    const searchQuery = {
        $and: [
            { status: 'active' },
            {
                $or: [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { company: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } },
                    { skills: { $in: [new RegExp(searchTerm, 'i')] } }
                ]
            },
            filters
        ]
    };
    
    return this.find(searchQuery).sort({ scraped_at: -1 });
};

jobSchema.statics.getJobStats = function() {
    return this.aggregate([
        {
            $match: { status: 'active' }
        },
        {
            $group: {
                _id: '$source',
                count: { $sum: 1 },
                latestScrape: { $max: '$scraped_at' }
            }
        }
    ]);
};

// Instance methods
jobSchema.methods.markAsExpired = function() {
    this.status = 'expired';
    return this.save();
};

jobSchema.methods.addSkill = function(skill) {
    if (!this.skills.includes(skill.toLowerCase())) {
        this.skills.push(skill.toLowerCase());
        return this.save();
    }
    return Promise.resolve(this);
};

// Helper functions
function extractSkillsFromDescription(description) {
    const commonSkills = [
        'javascript', 'python', 'java', 'react', 'nodejs', 'angular', 'vue',
        'html', 'css', 'sql', 'mongodb', 'mysql', 'postgresql', 'redis',
        'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'jenkins',
        'typescript', 'php', 'laravel', 'spring', 'django', 'flask',
        'express', 'restapi', 'graphql', 'microservices', 'agile', 'scrum'
    ];
    
    const foundSkills = [];
    const lowerDesc = description.toLowerCase();
    
    commonSkills.forEach(skill => {
        if (lowerDesc.includes(skill)) {
            foundSkills.push(skill);
        }
    });
    
    return foundSkills;
}

function normalizeSalary(salary) {
    // Clean and normalize salary strings
    return salary.trim()
                 .replace(/₹/g, '')
                 .replace(/,/g, '')
                 .replace(/\s+/g, ' ');
}

// Virtual for formatted display
jobSchema.virtual('displaySalary').get(function() {
    if (!this.salary) return 'Not disclosed';
    return this.salary;
});

jobSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const scraped = new Date(this.scraped_at);
    const diffTime = Math.abs(now - scraped);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
});

// Ensure virtuals are included in JSON output
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);