const express = require('express');
const passport = require('../config/passport');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ensureAuthenticated, ensureNotAuthenticated, requireRole } = require('../middleware/auth');

const router = express.Router();

// Login page
router.get('/login', ensureNotAuthenticated, (req, res) => {
    res.render('auth/login', { 
        message: req.flash('error'),
        returnTo: req.session.returnTo 
    });
});

// Login POST
router.post('/login', ensureNotAuthenticated, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        
        if (!user) {
            req.flash('error', info.message);
            return res.redirect('/auth/login');
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            return res.redirect(returnTo);
        });
    })(req, res, next);
});

// Register page
router.get('/register', ensureNotAuthenticated, (req, res) => {
    res.render('auth/register', { 
        message: req.flash('error') 
    });
});

// Register POST
router.post('/register', ensureNotAuthenticated, async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;
        
        // Validation
        if (!username || !email || !password || !firstName || !lastName) {
            req.flash('error', 'All fields are required');
            return res.redirect('/auth/register');
        }
        
        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long');
            return res.redirect('/auth/register');
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });
        
        if (existingUser) {
            req.flash('error', 'Username or email already exists');
            return res.redirect('/auth/register');
        }
        
        // Create new user
        const user = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            firstName,
            lastName,
            status: 'pending' // Requires approval
        });
        
        user.setDefaultPermissions();
        await user.save();
        
        // Log user creation
        await AuditLog.logAction({
            userId: user._id,
            username: user.username,
            action: 'USER_CREATED',
            entityType: 'User',
            entityId: user._id,
            details: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status
            },
            req,
            success: true
        });
        
        res.render('auth/registration-success', { 
            username: user.username 
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error', 'Registration failed. Please try again.');
        res.redirect('/auth/register');
    }
});

// Logout
router.post('/logout', ensureAuthenticated, async (req, res) => {
    const userId = req.user._id;
    const username = req.user.username;
    
    await AuditLog.logAction({
        userId,
        username,
        action: 'LOGOUT',
        entityType: 'User',
        details: {},
        req,
        success: true
    });
    
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/auth/login');
    });
});

// Pending approval page
router.get('/pending-approval', ensureAuthenticated, (req, res) => {
    if (req.user.status === 'approved') {
        return res.redirect('/');
    }
    res.render('auth/pending-approval', { user: req.user });
});

// Admin routes for user management
router.get('/admin/users', ensureAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .populate('createdBy', 'username firstName lastName')
            .populate('approvedBy', 'username firstName lastName')
            .sort({ createdAt: -1 });
        
        res.render('auth/admin/users', { users, currentUser: req.user });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).render('error', { message: 'Error loading users', error });
    }
});

// Approve user
router.post('/admin/users/:id/approve', ensureAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const oldStatus = user.status;
        user.status = 'approved';
        user.approvedBy = req.user._id;
        user.approvedAt = new Date();
        await user.save();
        
        await AuditLog.logAction({
            userId: req.user._id,
            username: req.user.username,
            action: 'USER_APPROVED',
            entityType: 'User',
            entityId: user._id,
            details: {
                targetUser: user.username,
                before: { status: oldStatus },
                after: { status: 'approved' },
                approvedAt: user.approvedAt
            },
            req,
            success: true
        });
        
        res.json({ success: true, message: 'User approved successfully' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

// Update user permissions
router.post('/admin/users/:id/permissions', ensureAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const oldPermissions = { ...user.permissions };
        const { role, permissions } = req.body;
        
        if (role) {
            user.role = role;
            user.setDefaultPermissions();
        }
        
        if (permissions) {
            Object.keys(permissions).forEach(key => {
                if (user.permissions.hasOwnProperty(key)) {
                    user.permissions[key] = permissions[key] === 'true' || permissions[key] === true;
                }
            });
        }
        
        await user.save();
        
        await AuditLog.logAction({
            userId: req.user._id,
            username: req.user.username,
            action: 'PERMISSIONS_CHANGED',
            entityType: 'User',
            entityId: user._id,
            details: {
                targetUser: user.username,
                before: { role: user.role, permissions: oldPermissions },
                after: { role: user.role, permissions: user.permissions }
            },
            req,
            success: true
        });
        
        res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

// Audit logs
router.get('/admin/audit-logs', ensureAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const { action, entityType, user, dateRange, page = 1 } = req.query;
        const limit = 50;
        const skip = (page - 1) * limit;
        
        // Build filter
        const filter = {};
        if (action) filter.action = action;
        if (entityType) filter.entityType = entityType;
        if (user) filter.userId = user;
        
        // Date range filter
        if (dateRange && dateRange !== 'all') {
            const now = new Date();
            let startDate;
            
            switch (dateRange) {
                case 'today':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(now.setDate(now.getDate() - 30));
                    break;
            }
            
            if (startDate) {
                filter.createdAt = { $gte: startDate };
            }
        }
        
        const [logs, totalLogs, users] = await Promise.all([
            AuditLog.find(filter)
                .populate('userId', 'username firstName lastName')
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip),
            AuditLog.countDocuments(filter),
            User.find({}, 'firstName lastName').sort({ firstName: 1 })
        ]);
        
        const totalPages = Math.ceil(totalLogs / limit);
        
        res.render('auth/admin/audit-logs', {
            logs: logs.map(log => ({
                ...log.toObject(),
                user: log.userId,
                timestamp: log.createdAt
            })),
            users,
            filters: { action, entityType, user, dateRange },
            currentPage: parseInt(page),
            totalPages,
            totalLogs
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).render('error', { message: 'Error loading audit logs', error });
    }
});

module.exports = router;
