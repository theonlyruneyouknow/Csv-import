const express = require('express');
const passport = require('../config/passport');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ensureAuthenticated, ensureNotAuthenticated, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

console.log('🔄 Auth routes file loaded');

// Login page
router.get('/login', ensureNotAuthenticated, (req, res) => {
    console.log('📨 GET /auth/login accessed');
    res.render('auth/login', { 
        message: req.flash('error'),
        messages: {
            error: req.flash('error'),
            success: req.flash('success'),
            info: req.flash('info')
        },
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
        
        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(user);
            console.log(`📧 Welcome email sent to ${user.email}`);
        } catch (emailError) {
            console.error('📧 Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
        }
        
        // Notify admins of new user registration
        try {
            const adminUsers = await User.find({ 
                role: { $in: ['admin', 'manager'] },
                status: 'approved' 
            }).select('email');
            
            const adminEmails = adminUsers.map(admin => admin.email);
            if (adminEmails.length > 0) {
                await emailService.sendAdminNotification(user, adminEmails);
                console.log(`📧 Admin notification sent for new user: ${user.username}`);
            }
        } catch (emailError) {
            console.error('📧 Failed to send admin notification:', emailError);
        }
        
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
        req.flash('success', 'You have been logged out successfully. Thank you for using TSC Management System!');
        res.redirect('/splash');
    });
});

// Logout GET route for compatibility
router.get('/logout', (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('info', 'You are already logged out.');
        return res.redirect('/splash');
    }
    
    const userId = req.user._id;
    const username = req.user.username;
    
    AuditLog.logAction({
        userId,
        username,
        action: 'LOGOUT',
        entityType: 'User',
        details: {},
        req,
        success: true
    }).then(() => {
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            req.flash('success', 'You have been logged out successfully. Thank you for using TSC Management System!');
            res.redirect('/splash');
        });
    }).catch(err => {
        console.error('Audit log error during logout:', err);
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            req.flash('success', 'You have been logged out successfully. Thank you for using TSC Management System!');
            res.redirect('/splash');
        });
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
        
        // Send approval notification email
        try {
            await emailService.sendApprovalEmail(user);
            console.log(`📧 Approval email sent to ${user.email}`);
        } catch (emailError) {
            console.error('📧 Failed to send approval email:', emailError);
            // Don't fail the approval if email fails
        }
        
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
                approvedAt: user.approvedAt,
                approvedBy: req.user.username
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

// Reject user
router.post('/admin/users/:id/reject', ensureAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const oldStatus = user.status;
        const { reason } = req.body;
        
        user.status = 'rejected';
        user.rejectedBy = req.user._id;
        user.rejectedAt = new Date();
        user.rejectionReason = reason || 'No reason provided';
        await user.save();
        
        // Send rejection notification email
        try {
            await emailService.sendSystemAlert(
                user.email,
                'Account Registration Rejected',
                'account-rejected',
                {
                    name: `${user.firstName} ${user.lastName}`,
                    username: user.username,
                    reason: user.rejectionReason,
                    supportEmail: process.env.SUPPORT_EMAIL || 'support@company.com'
                }
            );
            console.log(`📧 Rejection email sent to ${user.email}`);
        } catch (emailError) {
            console.error('📧 Failed to send rejection email:', emailError);
        }
        
        await AuditLog.logAction({
            userId: req.user._id,
            username: req.user.username,
            action: 'USER_REJECTED',
            entityType: 'User',
            entityId: user._id,
            details: {
                targetUser: user.username,
                before: { status: oldStatus },
                after: { status: 'rejected' },
                rejectedAt: user.rejectedAt,
                rejectedBy: req.user.username,
                reason: user.rejectionReason
            },
            req,
            success: true
        });
        
        res.json({ success: true, message: 'User rejected successfully' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ error: 'Failed to reject user' });
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

// Authentication status endpoint
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            user: {
                id: req.user._id,
                username: req.user.username,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                role: req.user.role,
                permissions: req.user.permissions,
                status: req.user.status,
                lastLogin: req.user.lastLogin
            }
        });
    } else {
        res.json({
            authenticated: false,
            user: null
        });
    }
});

// Authentication status page
router.get('/check', (req, res) => {
    res.render('auth/status');
});

// Test email functionality (admin and manager)
router.get('/admin/test-email', ensureAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const testResult = await emailService.sendTestEmail(req.user.email);
        res.json({ 
            success: true, 
            message: 'Test email sent successfully',
            details: testResult 
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send test email',
            details: error.message 
        });
    }
});

// Public test email endpoint (for development only)
router.get('/test-email-public', async (req, res) => {
    try {
        const testEmail = 'test@example.com';
        const testResult = await emailService.sendTestEmail(testEmail);
        res.json({ 
            success: true, 
            message: 'Test email sent successfully',
            details: testResult,
            note: 'This is a development endpoint - remove in production'
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send test email',
            details: error.message 
        });
    }
});

// Test email to specific user address
router.get('/test-email-to-user', async (req, res) => {
    try {
        const userEmail = 'theonlyruneyouknow@gmail.com';
        const testResult = await emailService.sendTestEmail(userEmail);
        res.json({ 
            success: true, 
            message: `Test email sent successfully to ${userEmail}`,
            details: testResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error sending test email to user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send test email',
            details: error.message 
        });
    }
});

// Forgot password - show form
router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', { 
        title: 'Reset Password',
        messages: req.flash() 
    });
});

// Forgot password - process form
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            req.flash('error', 'Email address is required');
            return res.redirect('/auth/forgot-password');
        }
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            // Don't reveal if email exists for security
            req.flash('success', 'If an account with that email exists, a password reset link has been sent.');
            return res.redirect('/auth/forgot-password');
        }
        
        // Generate reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();
        
        // Send password reset email
        try {
            await emailService.sendPasswordResetEmail(user, resetToken);
            console.log(`📧 Password reset email sent to ${user.email}`);
            
            await AuditLog.logAction({
                userId: user._id,
                username: user.username,
                action: 'PASSWORD_RESET_REQUESTED',
                entityType: 'User',
                entityId: user._id,
                details: {
                    email: user.email,
                    requestedAt: new Date()
                },
                req,
                success: true
            });
            
        } catch (emailError) {
            console.error('📧 Failed to send password reset email:', emailError);
            req.flash('error', 'Failed to send reset email. Please try again.');
            return res.redirect('/auth/forgot-password');
        }
        
        req.flash('success', 'If an account with that email exists, a password reset link has been sent.');
        res.redirect('/auth/forgot-password');
        
    } catch (error) {
        console.error('Error processing forgot password:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/auth/forgot-password');
    }
});

// Reset password - show form with token
router.get('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }
        
        res.render('auth/reset-password', { 
            title: 'Reset Password',
            token,
            messages: req.flash() 
        });
        
    } catch (error) {
        console.error('Error validating reset token:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/auth/forgot-password');
    }
});

// Reset password - process new password
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        
        if (!password || !confirmPassword) {
            req.flash('error', 'Both password fields are required');
            return res.redirect(`/auth/reset-password/${token}`);
        }
        
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect(`/auth/reset-password/${token}`);
        }
        
        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long');
            return res.redirect(`/auth/reset-password/${token}`);
        }
        
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }
        
        // Update password and clear reset token
        user.password = password; // Will be hashed by pre-save middleware
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        await AuditLog.logAction({
            userId: user._id,
            username: user.username,
            action: 'PASSWORD_RESET_COMPLETED',
            entityType: 'User',
            entityId: user._id,
            details: {
                email: user.email,
                resetAt: new Date()
            },
            req,
            success: true
        });
        
        req.flash('success', 'Password has been reset successfully. You can now log in.');
        res.redirect('/auth/login');
        
    } catch (error) {
        console.error('Error resetting password:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect(`/auth/reset-password/${req.params.token}`);
    }
});

module.exports = router;
