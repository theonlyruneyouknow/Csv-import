const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, username, password, done) => {
    try {
        const user = await User.findOne({ 
            $or: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() }
            ]
        });

        if (!user) {
            await AuditLog.logAction({
                userId: null,
                username: username,
                action: 'LOGIN_FAILED',
                entityType: 'User',
                details: { reason: 'User not found' },
                req,
                success: false,
                errorMessage: 'Invalid credentials'
            });
            return done(null, false, { message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (user.isLocked) {
            await AuditLog.logAction({
                userId: user._id,
                username: user.username,
                action: 'LOGIN_FAILED',
                entityType: 'User',
                details: { reason: 'Account locked' },
                req,
                success: false,
                errorMessage: 'Account temporarily locked'
            });
            return done(null, false, { message: 'Account temporarily locked due to too many failed login attempts' });
        }

        // Check if account is approved
        if (user.status !== 'approved') {
            await AuditLog.logAction({
                userId: user._id,
                username: user.username,
                action: 'LOGIN_FAILED',
                entityType: 'User',
                details: { reason: 'Account not approved', status: user.status },
                req,
                success: false,
                errorMessage: 'Account not approved'
            });
            return done(null, false, { message: `Account is ${user.status}. Please contact an administrator.` });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await user.incLoginAttempts();
            await AuditLog.logAction({
                userId: user._id,
                username: user.username,
                action: 'LOGIN_FAILED',
                entityType: 'User',
                details: { reason: 'Invalid password', attempts: user.loginAttempts + 1 },
                req,
                success: false,
                errorMessage: 'Invalid credentials'
            });
            return done(null, false, { message: 'Invalid credentials' });
        }

        // Successful login
        await user.resetLoginAttempts();
        user.lastLogin = new Date();
        await user.save();

        await AuditLog.logAction({
            userId: user._id,
            username: user.username,
            action: 'LOGIN',
            entityType: 'User',
            details: { 
                lastLogin: user.lastLogin,
                role: user.role 
            },
            req,
            success: true
        });

        return done(null, user);
    } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password');
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
