const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /login
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { error: 'Invalid email or password' });
        }
        
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('login', { error: 'Invalid email or password' });
        }
        
        // Set session
        req.session.userId = user._id;
        req.session.user = { name: user.name, email: user.email };
        req.session.justLoggedIn = true; // Flag for welcome message auto-hide
        
        res.redirect('/dashboard?from=login');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { error: 'An error occurred during login' });
    }
});

// GET /register
router.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('register');
});

// POST /register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        
        // Validation
        if (password !== confirmPassword) {
            return res.render('register', { error: 'Passwords do not match' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('register', { error: 'Email already registered' });
        }
        
        // Create new user
        const user = new User({ name, email, password });
        await user.save();
        
        // Set session
        req.session.userId = user._id;
        req.session.user = { name: user.name, email: user.email };
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', { error: 'An error occurred during registration' });
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

// GET /reset-password
router.get('/reset-password', (req, res) => {
    res.render('reset-password');
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        
        // Validation
        if (newPassword !== confirmPassword) {
            return res.render('reset-password', { error: 'Passwords do not match' });
        }
        
        if (newPassword.length < 6) {
            return res.render('reset-password', { error: 'Password must be at least 6 characters long' });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('reset-password', { error: 'No user found with this email address' });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.render('reset-password', { success: 'Password has been reset successfully. You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.render('reset-password', { error: 'An error occurred while resetting your password' });
    }
});

module.exports = router;