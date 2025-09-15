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
const receivingRoutes = require('./routes/receiving');
const foodRoutes = require('./routes/food');
const storyRoutes = require('./routes/story');
const medicineRoutes = require('./routes/medicine');
const bulletinRoutes = require('./routes/bulletin');
const hymnRoutes = require('./routes/hymns');

// Import authentication middleware
const { ensureAuthenticated, ensureApproved, logPageView } = require('./middleware/auth');

console.log('🔄 Loading dropship routes...');
const dropshipRoutes = require('./routes/dropship');
console.log('✅ Dropship routes loaded successfully');

console.log('🔄 Loading dropship test routes...');
const dropshipTestRoutes = require('./routes/dropship-test');
console.log('✅ Dropship test routes loaded successfully');

const app = express();

// URGENT DEBUG: Add test routes IMMEDIATELY after Express app creation
console.log('🚨 Adding EMERGENCY test routes before ANY middleware...');

app.get('/emergency-test', (req, res) => {
    console.log('🚨 EMERGENCY TEST ROUTE HIT!');
    res.send('<h1 style="color: green;">EMERGENCY TEST WORKS!</h1><p>This proves basic routing works</p><a href="/">Back to home</a>');
});

app.get('/emergency-food', (req, res) => {
    console.log('🚨 EMERGENCY FOOD ROUTE HIT!');
    try {
        const mockUser = { username: 'emergency-test', firstName: 'Emergency', lastName: 'Test' };
        res.render('food-dashboard', { 
            user: mockUser,
            stats: {
                foodItems: 0,
                recipes: 0,
                mealPlans: 0,
                pantryItems: 0,
                expiringSoon: 0,
                lowStock: 0
            }
        });
    } catch (error) {
        res.send('<h1>Food Dashboard Error:</h1><pre>' + error.message + '</pre>');
    }
});

// EMERGENCY: All Food module routes unprotected
app.get('/food/shopping/new', (req, res) => {
    console.log('🚨 /food/shopping/new accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('shopping-new', { user: mockUser });
});

app.get('/food/shopping', (req, res) => {
    console.log('🚨 /food/shopping accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('shopping-list', { user: mockUser });
});

app.get('/food/recipes/new', (req, res) => {
    console.log('🚨 /food/recipes/new accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('recipe-new', { user: mockUser });
});

app.get('/food/recipes', (req, res) => {
    console.log('🚨 /food/recipes accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('recipes-list', { user: mockUser });
});

app.get('/food/meal-plans/new', (req, res) => {
    console.log('🚨 /food/meal-plans/new accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('meal-plan-new', { user: mockUser });
});

app.get('/food/meal-plans', (req, res) => {
    console.log('🚨 /food/meal-plans accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('meal-plans-list', { user: mockUser });
});

app.get('/food/pantry/add', (req, res) => {
    console.log('🚨 /food/pantry/add accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('pantry-add', { user: mockUser });
});

app.get('/food/pantry', (req, res) => {
    console.log('🚨 /food/pantry accessed');
    const mockUser = { username: 'test', firstName: 'Test', lastName: 'User' };
    res.render('pantry-list', { user: mockUser });
});

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

// Simple test endpoint
app.get('/test-api', (req, res) => {
    console.log('🧪 Test API hit!');
    res.json({ message: 'Test API working', timestamp: new Date() });
});

// Serve hymn data as static JavaScript
app.get('/hymn-data.js', (req, res) => {
    console.log('📋 Serving hymn data');
    res.sendFile(__dirname + '/views/hymn-data.js');
});

// Unprotected hymn search API - must be before authentication middleware
app.get('/api/hymns/search', async (req, res) => {
    try {
        const Hymn = require('./models/Hymn');
        const { q } = req.query;
        console.log('🎵 Unprotected hymn search:', q);
        
        if (!q) {
            console.log('🎵 No query provided, returning empty array');
            return res.json([]);
        }

        let hymns = [];
        
        if (!isNaN(q)) {
            const number = parseInt(q);
            console.log('🎵 Searching by number:', number);
            hymns = await Hymn.find({ number: number }).limit(10);
        } else {
            console.log('🎵 Searching by title:', q);
            hymns = await Hymn.find({
                title: { $regex: q, $options: 'i' }
            }).limit(10);
        }
        
        console.log('🎵 Found hymns:', hymns.length);
        if (hymns.length > 0) {
            console.log('🎵 First hymn:', hymns[0]);
        }
        res.json(hymns);
    } catch (error) {
        console.error('❌ Error in unprotected hymn search:', error);
        res.status(500).json({ error: 'Error searching hymns' });
    }
});

// Page view logging middleware
app.use(logPageView);

// Routes
app.use('/auth', authRoutes);

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// DEBUG: Simple test routes - place early to avoid middleware conflicts
console.log('🔄 Adding early test routes...');

app.get('/simple-test', (req, res) => {
    console.log('📨 /simple-test accessed successfully!');
    res.send('<h1>Simple test route works!</h1><p><a href="/">Back to home</a></p>');
});

app.get('/food-debug', (req, res) => {
    console.log('📨 /food-debug accessed successfully!');
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('food-dashboard', { 
        user: mockUser,
        stats: {
            foodItems: 0,
            recipes: 0,
            mealPlans: 0,
            pantryItems: 0,
            expiringSoon: 0,
            lowStock: 0
        }
    });
});

// Temporary test user creation route
app.get('/create-test-user', async (req, res) => {
    try {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        
        // Check if test user already exists
        let testUser = await User.findOne({ username: 'tuser' });
        
        if (testUser) {
            // Update existing user to ensure it's approved
            testUser.status = 'approved';
            testUser.role = 'admin';
            await testUser.save();
            
            return res.json({
                success: true,
                message: 'Test user already exists and has been updated',
                user: {
                    username: testUser.username,
                    email: testUser.email,
                    role: testUser.role,
                    status: testUser.status
                }
            });
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash('tpass123', 10);
        
        // Create new test user
        testUser = new User({
            username: 'tuser',
            email: 'tuser@test.com',
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
            status: 'approved',
            permissions: {
                viewDashboard: true,
                editLineItems: true,
                deleteLineItems: true,
                managePurchaseOrders: true,
                manageNotes: true,
                manageTasks: true,
                manageUsers: true,
                viewReports: true,
                systemSettings: true
            }
        });
        
        await testUser.save();
        
        res.json({
            success: true,
            message: 'Test user created successfully!',
            credentials: {
                username: 'tuser',
                password: 'tpass123'
            },
            user: {
                username: testUser.username,
                email: testUser.email,
                role: testUser.role,
                status: testUser.status
            }
        });
        
    } catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Temporary unprotected Food dashboard test route
app.get('/food-test-dashboard', async (req, res) => {
    try {
        const FoodItem = require('./models/FoodItem');
        const Recipe = require('./models/Recipe');
        const MealPlan = require('./models/MealPlan');
        
        // Create a mock user for testing
        const mockUser = {
            username: 'test-user',
            firstName: 'Test',
            lastName: 'User'
        };
        
        // Get basic stats for the dashboard
        const stats = {
            foodItems: await FoodItem.countDocuments(),
            recipes: await Recipe.countDocuments(),
            mealPlans: await MealPlan.countDocuments(),
            pantryItems: await FoodItem.countDocuments({ quantity: { $gt: 0 } }),
            expiringSoon: await FoodItem.countDocuments({ 
                expirationDate: { 
                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
                } 
            }),
            lowStock: await FoodItem.countDocuments({ 
                quantity: { $lt: 5, $gt: 0 } 
            })
        };

        res.render('food-dashboard', { 
            user: mockUser,
            stats: stats 
        });
    } catch (error) {
        console.error('Error loading food dashboard:', error);
        res.status(500).send('Error loading dashboard: ' + error.message);
    }
});

// Completely unprotected Food test routes
console.log('🔄 Registering unprotected Food test routes...');

// Simple test route
app.get('/test-route', (req, res) => {
    console.log('📨 Simple test route accessed');
    res.send('Test route works!');
});

app.get('/food-test-simple', (req, res) => {
    console.log('📨 GET /food-test-simple accessed');
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('food-dashboard', { 
        user: mockUser,
        stats: {
            foodItems: 0,
            recipes: 0,
            mealPlans: 0,
            pantryItems: 0,
            expiringSoon: 0,
            lowStock: 0
        }
    });
});

app.get('/food-test-shopping-new', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('shopping-new', { user: mockUser });
});

app.get('/food-test-shopping-list', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('shopping-list', { user: mockUser });
});

app.get('/food-test-recipes-new', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('recipe-new', { user: mockUser });
});

app.get('/food-test-recipes-list', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('recipes-list', { user: mockUser });
});

app.get('/food-test-pantry-add', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('pantry-add', { user: mockUser });
});

app.get('/food-test-pantry-list', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('pantry-list', { user: mockUser });
});

app.get('/food-test-meal-plans-new', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('meal-plan-new', { user: mockUser });
});

app.get('/food-test-meal-plans-list', (req, res) => {
    const mockUser = { username: 'test-user', firstName: 'Test', lastName: 'User' };
    res.render('meal-plans-list', { user: mockUser });
});

// Protected routes - require authentication and approval
app.use('/purchase-orders', ensureAuthenticated, ensureApproved, purchaseOrderRoutes);
app.use('/organic-vendors', ensureAuthenticated, ensureApproved, organicVendorRoutes);
app.use('/tasks', ensureAuthenticated, ensureApproved, taskRoutes);
app.use('/receiving', ensureAuthenticated, ensureApproved, receivingRoutes);
app.use('/dropship', ensureAuthenticated, ensureApproved, dropshipRoutes);
app.use('/dropship-test', ensureAuthenticated, ensureApproved, dropshipTestRoutes);
app.use('/food', ensureAuthenticated, ensureApproved, foodRoutes);
app.use('/story', ensureAuthenticated, ensureApproved, storyRoutes);
app.use('/medicine', ensureAuthenticated, ensureApproved, medicineRoutes);
app.use('/bulletin', ensureAuthenticated, ensureApproved, bulletinRoutes);
app.use('/hymns', hymnRoutes); // Remove authentication requirement for hymn search
// Temporary unprotected food routes for testing
app.use('/food-test', foodRoutes);
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

// Main dashboard route (redirect to purchase orders for now)
app.get('/dashboard', ensureAuthenticated, ensureApproved, (req, res) => {
    res.redirect('/purchase-orders');
});

// Food dashboard route
app.get('/food-dashboard', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        // Get basic stats for the dashboard
        const stats = {
            foodItems: 0,
            recipes: 0,
            mealPlans: 0,
            pantryItems: 0,
            expiringSoon: 0,
            lowStock: 0
        };

        res.render('food-dashboard', { 
            user: req.user,
            stats: stats 
        });
    } catch (error) {
        console.error('Error loading food dashboard:', error);
        res.status(500).send('Error loading food dashboard: ' + error.message);
    }
});

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