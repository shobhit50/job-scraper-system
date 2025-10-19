const mongoose = require('mongoose');
const crypto = require('crypto');

const profileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Academic Details
    education: {
        degree: {
            type: String,
            trim: true
        },
        field: {
            type: String,
            trim: true
        },
        university: {
            type: String,
            trim: true
        },
        graduationYear: {
            type: Number
        }
    },
    experience: {
        level: {
            type: String,
            enum: ['fresher', '0-1', '1-3', '3-5', '5-10', '10+'],
            default: 'fresher'
        },
        currentRole: {
            type: String,
            trim: true
        },
        currentCompany: {
            type: String,
            trim: true
        }
    },
    skills: [String],
    location: {
        type: String,
        trim: true
    },
    // Platform Credentials (encrypted)
    credentials: {
        linkedin: {
            email: String,
            password: String,
            isActive: {
                type: Boolean,
                default: false
            }
        },
        naukri: {
            email: String,
            password: String,
            isActive: {
                type: Boolean,
                default: false
            }
        }
    }
}, {
    timestamps: true
});

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = 'your-32-character-secret-key-here!';

// Encrypt function
function encrypt(text) {
    if (!text) return '';
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Decrypt function
function decrypt(text) {
    if (!text) return '';
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Pre-save middleware to encrypt credentials
profileSchema.pre('save', function(next) {
    if (this.isModified('credentials.linkedin.email')) {
        this.credentials.linkedin.email = encrypt(this.credentials.linkedin.email);
    }
    if (this.isModified('credentials.linkedin.password')) {
        this.credentials.linkedin.password = encrypt(this.credentials.linkedin.password);
    }
    if (this.isModified('credentials.naukri.email')) {
        this.credentials.naukri.email = encrypt(this.credentials.naukri.email);
    }
    if (this.isModified('credentials.naukri.password')) {
        this.credentials.naukri.password = encrypt(this.credentials.naukri.password);
    }
    next();
});

// Method to get decrypted credentials
profileSchema.methods.getDecryptedCredentials = function() {
    return {
        linkedin: {
            email: decrypt(this.credentials.linkedin.email),
            password: decrypt(this.credentials.linkedin.password),
            isActive: this.credentials.linkedin.isActive
        },
        naukri: {
            email: decrypt(this.credentials.naukri.email),
            password: decrypt(this.credentials.naukri.password),
            isActive: this.credentials.naukri.isActive
        }
    };
};

module.exports = mongoose.model('Profile', profileSchema);