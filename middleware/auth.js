const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

function isDevBypassEnabled() {
    const value = String(process.env.DEV_BYPASS_AUTH || '').trim().toLowerCase();
    return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

function applyDevBypass(req) {
    if (!isDevBypassEnabled()) {
        return false;
    }

    if (!req.user) {
        req.user = {
            _id: new mongoose.Types.ObjectId('000000000000000000000001'),
            username: 'dev-bypass',
            firstName: 'Dev',
            lastName: 'Bypass',
            email: 'dev-bypass@local',
            role: 'admin',
            status: 'approved',
            hasPermission: () => true
        };
    }

    req.isAuthenticated = () => true;
    return true;
}

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (applyDevBypass(req)) {
        return next();
    }

    if (req.isAuthenticated()) {
        return next();
    }
    
    // Only store returnTo for actual page requests, not API/AJAX calls
    const isApiRequest = req.originalUrl.includes('/api/') || 
                        req.xhr || 
                        req.headers.accept?.indexOf('json') > -1;
    
    if (!isApiRequest) {
        req.session.returnTo = req.originalUrl;
        console.log('📍 [ensureAuthenticated] Stored returnTo:', req.session.returnTo);
    } else {
        console.log('⚠️ [ensureAuthenticated] Skipping returnTo for API request:', req.originalUrl);
    }
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    return res.redirect('/auth/login');
};

// Middleware to ensure user is not authenticated (for login/register pages)
const ensureNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/');
};

// Middleware to check if user has specific permission
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (applyDevBypass(req)) {
            return next();
        }

        if (!req.isAuthenticated()) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            return res.redirect('/auth/login');
        }

        if (!req.user.hasPermission(permission)) {
            AuditLog.logAction({
                userId: req.user._id,
                username: req.user.username,
                action: 'PERMISSION_DENIED',
                entityType: 'System',
                details: { 
                    requiredPermission: permission,
                    userRole: req.user.role,
                    url: req.originalUrl 
                },
                req,
                success: false,
                errorMessage: 'Insufficient permissions'
            });

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            return res.status(403).render('error', { 
                message: 'Access Denied', 
                error: { status: 403, stack: 'You do not have permission to access this resource.' }
            });
        }

        next();
    };
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        if (applyDevBypass(req)) {
            return next();
        }

        if (!req.isAuthenticated()) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            return res.redirect('/auth/login');
        }

        if (!roleArray.includes(req.user.role)) {
            AuditLog.logAction({
                userId: req.user._id,
                username: req.user.username,
                action: 'ROLE_DENIED',
                entityType: 'System',
                details: { 
                    requiredRoles: roleArray,
                    userRole: req.user.role,
                    url: req.originalUrl 
                },
                req,
                success: false,
                errorMessage: 'Insufficient role'
            });

            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            return res.status(403).render('error', { 
                message: 'Access Denied', 
                error: { status: 403, stack: 'Your role does not have access to this resource.' }
            });
        }

        next();
    };
};

// Middleware to check if user's account is approved
const ensureApproved = (req, res, next) => {
    if (applyDevBypass(req)) {
        return next();
    }

    console.log('🔐 ensureApproved middleware - Path:', req.path);
    console.log('🔐 Authenticated:', req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting to login');
        
        // Only store returnTo for actual page requests, not API/AJAX calls
        const isApiRequest = req.originalUrl.includes('/api/') || 
                            req.xhr || 
                            req.headers.accept?.includes('application/json');
        
        if (!isApiRequest) {
            req.session.returnTo = req.originalUrl;
            console.log('📍 Stored returnTo in session:', req.session.returnTo);
        } else {
            console.log('⚠️ Skipping returnTo for API request:', req.originalUrl);
        }
        
        // Save session before redirect to ensure it persists
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error saving session:', err);
            }
            console.log('✅ Session saved, redirecting to /auth/login');
            return res.redirect('/auth/login');
        });
        return;
    }

    console.log('🔐 User:', req.user?.username);
    console.log('🔐 User status:', req.user?.status);
    console.log('🔐 User approved field:', req.user?.approved);
    
    if (req.user.status !== 'approved') {
        console.log('❌ User not approved, showing pending approval page');
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(403).json({ error: 'Account not approved' });
        }
        return res.render('auth/pending-approval', { user: req.user });
    }

    console.log('✅ User approved, proceeding to route');
    next();
};

// Middleware to log page views
const logPageView = (req, res, next) => {
    if (req.isAuthenticated() && req.method === 'GET') {
        // Only log certain page views to avoid spam
        const loggedPaths = ['/purchase-orders', '/purchase-orders/line-items', '/purchase-orders/notes-manager'];
        
        if (loggedPaths.some(path => req.path.startsWith(path))) {
            AuditLog.logAction({
                userId: req.user._id,
                username: req.user.username,
                action: 'PAGE_VIEW',
                entityType: 'System',
                details: { 
                    path: req.path,
                    query: req.query 
                },
                req,
                success: true
            });
        }
    }
    next();
};

// Middleware to audit data changes
const auditDataChange = (action, entityType) => {
    return (req, res, next) => {
        // Store original send method
        const originalSend = res.send;
        
        // Override send method to capture response
        res.send = function(data) {
            if (req.isAuthenticated() && res.statusCode < 400) {
                AuditLog.logAction({
                    userId: req.user._id,
                    username: req.user.username,
                    action: action,
                    entityType: entityType,
                    entityId: req.params.id || req.body.id || req.body._id,
                    details: {
                        method: req.method,
                        body: req.body,
                        params: req.params,
                        query: req.query
                    },
                    req,
                    success: true
                });
            }
            
            // Call original send method
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    ensureAuthenticated,
    ensureNotAuthenticated,
    requirePermission,
    requireRole,
    ensureApproved,
    logPageView,
    auditDataChange
};
