// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const flash = require('connect-flash');

// Import routes
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const organicVendorRoutes = require('./routes/organicVendors');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');

// Import authentication middleware
const { ensureAuthenticated, ensureApproved, logPageView } = require('./middleware/auth');

console.log('🔄 Loading dropship routes...');
const dropshipRoutes = require('./routes/dropship');
console.log('✅ Dropship routes loaded successfully');

console.log('🔄 Loading dropship test routes...');
const dropshipTestRoutes = require('./routes/dropship-test');
console.log('✅ Dropship test routes loaded successfully');

const app = express();

// Connect to MongoDB with proper error handling
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csv-import-test';
console.log('🔄 Connecting to MongoDB...');

mongoose.connect(mongoURI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('💡 Please check your MONGODB_URI in .env file');
        process.exit(1);
    });

// Handle MongoDB connection events
mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoURI,
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); // Set the views directory explicitly

// Flash messages
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Make user available in all templates
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
});

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}${req.user ? ` (${req.user.username})` : ' (anonymous)'}`);
    next();
});

// Page view logging middleware
app.use(logPageView);

// Routes
app.use('/auth', authRoutes);

// Protected routes - require authentication and approval
app.use('/purchase-orders', ensureAuthenticated, ensureApproved, purchaseOrderRoutes);
app.use('/organic-vendors', ensureAuthenticated, ensureApproved, organicVendorRoutes);
app.use('/tasks', ensureAuthenticated, ensureApproved, taskRoutes);
app.use('/dropship', ensureAuthenticated, ensureApproved, dropshipRoutes);
app.use('/dropship-test', ensureAuthenticated, ensureApproved, dropshipTestRoutes);
app.use('/api', ensureAuthenticated, ensureApproved, purchaseOrderRoutes); // API routes for AJAX calls

// Root route - show splash page for visitors, redirect authenticated users
app.get('/', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.render('splash', { 
            user: null,
            messages: {
                error: req.flash('error'),
                success: req.flash('success'),
                info: req.flash('info')
            }
        });
    }
    if (req.user.status !== 'approved') {
        return res.redirect('/auth/pending-approval');
    }
    res.redirect('/purchase-orders');
});

// Splash page route (can be accessed directly)
app.get('/splash', (req, res) => {
    res.render('splash', { 
        user: req.isAuthenticated() ? req.user : null,
        messages: {
            error: req.flash('error'),
            success: req.flash('success'),
            info: req.flash('info')
        }
    });
});

// Welcome route for new users
app.get('/welcome', (req, res) => {
    req.flash('success', 'Welcome to TSC Management System! Please sign in to get started.');
    res.redirect('/splash');
});

// System status route (for debugging)
app.get('/status', (req, res) => {
    res.json({
        server: 'Running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        authenticated: req.isAuthenticated(),
        user: req.isAuthenticated() ? {
            username: req.user.username,
            role: req.user.role,
            status: req.user.status
        } : null,
        timestamp: new Date().toISOString()
    });
});

// Upload route (require authentication)
app.get('/upload', ensureAuthenticated, ensureApproved, (req, res) => res.render('upload'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', { 
        message: 'Something went wrong!', 
        error: process.env.NODE_ENV === 'development' ? err : {} 
    });
});

// 404 handler - redirect to splash with helpful message
app.use((req, res) => {
    req.flash('info', `The page "${req.originalUrl}" was not found. Here's what you can do from here:`);
    res.redirect('/splash');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});