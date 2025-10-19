const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// GET /profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        // Get existing profile and user details
        const profile = await Profile.findOne({ userId: req.session.userId });
        const user = await User.findById(req.session.userId).select('-password');
        
        res.render('profile', { 
            user: req.session.user,
            userDetails: user,
            profile: profile || {}
        });
    } catch (error) {
        console.error('Profile page error:', error);
        
        // Try to get user details even if profile loading fails
        let userDetails = {};
        try {
            userDetails = await User.findById(req.session.userId).select('-password');
        } catch (userError) {
            console.error('Error fetching user details:', userError);
        }
        
        res.render('profile', { 
            user: req.session.user,
            userDetails: userDetails,
            profile: {},
            error: 'Error loading profile'
        });
    }
});

// POST /update-user
router.post('/update-user', requireAuth, async (req, res) => {
    try {
        const { name, phone, currentPassword, newPassword, confirmPassword } = req.body;
        
        // Find current user
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.redirect('/profile?error=User not found');
        }
        
        // Update name and phone
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone; // Allow empty string to clear phone
        
        // Update password if provided
        if (newPassword) {
            // Validate current password
            if (!currentPassword) {
                return res.redirect('/profile?error=Current password is required to change password');
            }
            
            const isCurrentPasswordValid = await user.comparePassword(currentPassword);
            if (!isCurrentPasswordValid) {
                return res.redirect('/profile?error=Current password is incorrect');
            }
            
            // Validate new password
            if (newPassword !== confirmPassword) {
                return res.redirect('/profile?error=New passwords do not match');
            }
            
            if (newPassword.length < 6) {
                return res.redirect('/profile?error=New password must be at least 6 characters long');
            }
            
            user.password = newPassword;
        }
        
        await user.save();
        
        // Update session data
        req.session.user.name = user.name;
        
        // Check for redirect parameter
        const redirectTo = req.query.redirect;
        if (redirectTo === 'dashboard') {
            res.redirect('/dashboard?success=User profile updated successfully');
        } else {
            res.redirect('/profile?success=User profile updated successfully');
        }
        
    } catch (error) {
        console.error('User profile update error:', error);
        const redirectTo = req.query.redirect;
        if (redirectTo === 'dashboard') {
            res.redirect('/dashboard?error=Error updating user profile');
        } else {
            res.redirect('/profile?error=Error updating user profile');
        }
    }
});

// POST /profile
router.post('/profile', requireAuth, async (req, res) => {
    try {
        const {
            degree, field, university, graduationYear,
            experienceLevel, currentRole, currentCompany,
            skills, location,
            linkedinEmail, linkedinPassword,
            naukriEmail, naukriPassword
        } = req.body;
        
        // Parse skills from comma-separated string
        const skillsArray = skills ? skills.split(',').map(skill => skill.trim()).filter(skill => skill) : [];
        
        // Find existing profile or create new one
        let profile = await Profile.findOne({ userId: req.session.userId });
        
        if (!profile) {
            profile = new Profile({ userId: req.session.userId });
        }
        
        // Update profile data
        profile.education = {
            degree: degree || '',
            field: field || '',
            university: university || '',
            graduationYear: graduationYear ? parseInt(graduationYear) : undefined
        };
        
        profile.experience = {
            level: experienceLevel || 'fresher',
            currentRole: currentRole || '',
            currentCompany: currentCompany || ''
        };
        
        profile.skills = skillsArray;
        profile.location = location || '';
        
        // Update credentials if provided
        if (linkedinEmail && linkedinPassword) {
            profile.credentials.linkedin = {
                email: linkedinEmail,
                password: linkedinPassword,
                isActive: true
            };
        }
        
        if (naukriEmail && naukriPassword) {
            profile.credentials.naukri = {
                email: naukriEmail,
                password: naukriPassword,
                isActive: true
            };
        }
        
        await profile.save();
        
        // Check for redirect parameter
        const redirectTo = req.query.redirect;
        if (redirectTo === 'dashboard') {
            res.redirect('/dashboard?success=Profile updated successfully!');
        } else {
            res.render('profile', {
                user: req.session.user,
                userDetails: profile,
                profile: profile,
                success: 'Profile updated successfully!'
            });
        }
        
    } catch (error) {
        console.error('Profile update error:', error);
        
        // Get user details for error case
        let userDetails = {};
        try {
            userDetails = await User.findById(req.session.userId).select('-password');
        } catch (userError) {
            console.error('Error fetching user details:', userError);
        }
        
        res.render('profile', {
            user: req.session.user,
            userDetails: userDetails,
            profile: req.body,
            error: 'Error updating profile'
        });
    }
});

module.exports = router;