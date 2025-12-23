// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const flash = require('connect-flash');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Import routes
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const organicVendorRoutes = require('./routes/organicVendors');
const vendorRoutes = require('./routes/vendors');
const enhancedVendorRoutes = require('./routes/enhancedVendors');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const receivingRoutes = require('./routes/receiving');
const emailTemplateRoutes = require('./routes/emailTemplates');
const trackingRoutes = require('./routes/tracking'); // NEW: Self-managed tracking
const shipmentRoutes = require('./routes/shipments'); // NEW: Shipment management
const formRoutes = require('./routes/forms'); // NEW: Dynamic forms management
const foodRoutes = require('./routes/food');
const storyRoutes = require('./routes/story');
const medicineRoutes = require('./routes/medicine');
const bulletinRoutes = require('./routes/bulletin');
const hymnRoutes = require('./routes/hymns');
const announcementRoutes = require('./routes/announcements');
const emailClientRoutes = require('./email-client/enhancedEmailRoutes');
const reportConfigRoutes = require('./routes/reportConfigs'); // NEW: Saved report configurations

// Import authentication middleware
const { ensureAuthenticated, ensureApproved, logPageView } = require('./middleware/auth');

console.log('🔄 Loading dropship routes...');
const dropshipRoutes = require('./routes/dropship');
console.log('✅ Dropship routes loaded successfully');

console.log('🔄 Loading dropship test routes...');
const dropshipTestRoutes = require('./routes/dropship-test');
console.log('✅ Dropship test routes loaded successfully');

console.log('🔄 Loading seed catalog routes...');
const seedCatalogRoutes = require('./routes/seedCatalog');
console.log('✅ Seed catalog routes loaded successfully');

console.log('🔄 Loading dropshipment tracking routes...');
const dropshipmentRoutes = require('./routes/dropshipments');
console.log('✅ Dropshipment tracking routes loaded successfully');

const app = express();

// URGENT DEBUG: Add test routes IMMEDIATELY after Express app creation
console.log('🚨 Adding EMERGENCY test routes before ANY middleware...');

// VERY FIRST MIDDLEWARE - Catch ALL requests
app.use((req, res, next) => {
    console.log(`🔴 FIRST MIDDLEWARE: ${req.method} ${req.url} from ${req.ip}`);
    next();
});

app.get('/emergency-test', (req, res) => {
    console.log('🚨 EMERGENCY TEST ROUTE HIT!');
    res.send('<h1 style="color: green;">EMERGENCY TEST WORKS!</h1><p>This proves basic routing works</p><a href="/">Back to home</a>');
});

// Emergency PO11322 status check route
app.get('/check-po11322', async (req, res) => {
    console.log('🔍 Emergency PO11322 check route hit!');
    try {
        const PurchaseOrder = require('./models/PurchaseOrder');
        const LineItem = require('./models/LineItem');

        const po = await PurchaseOrder.findOne({ poNumber: 'PO11322' });
        if (!po) {
            console.log('❌ PO11322 not found');
            return res.json({ found: false, message: 'PO11322 not found' });
        }

        console.log(`📋 Found PO11322: isHidden=${po.isHidden}, reason=${po.hiddenReason}`);

        const lineItems = await LineItem.find({ poNumber: 'PO11322' });
        const hiddenLineItems = lineItems.filter(item => item.isHidden);

        const result = {
            found: true,
            poNumber: po.poNumber,
            vendor: po.vendor,
            isHidden: po.isHidden,
            hiddenReason: po.hiddenReason,
            hiddenBy: po.hiddenBy,
            hiddenDate: po.hiddenDate,
            lineItemsTotal: lineItems.length,
            lineItemsHidden: hiddenLineItems.length
        };

        console.log('🔍 PO11322 result:', result);
        res.json(result);
    } catch (error) {
        console.error('❌ Emergency PO check error:', error);
        res.status(500).json({ error: error.message });
    }
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

        // Schedule announcement cleanup
        setupAnnouncementCleanup();
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('💡 Please check your MONGODB_URI in .env file');
        process.exit(1);
    });

// Setup automatic announcement cleanup
function setupAnnouncementCleanup() {
    const Announcement = require('./models/Announcement');

    // Clean up expired announcements immediately on startup
    console.log('🧹 Running initial announcement cleanup...');
    Announcement.cleanupExpired()
        .then(result => {
            if (result.deletedCount > 0) {
                console.log(`✅ Cleaned up ${result.deletedCount} expired announcements`);
            }
        })
        .catch(error => {
            console.error('❌ Error during initial announcement cleanup:', error);
        });

    // Schedule daily cleanup at midnight
    const scheduleNextCleanup = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Set to midnight

        const timeUntilMidnight = tomorrow.getTime() - now.getTime();

        console.log(`⏰ Next announcement cleanup scheduled for ${tomorrow.toLocaleString()}`);

        setTimeout(() => {
            console.log('🧹 Running scheduled announcement cleanup...');
            Announcement.cleanupExpired()
                .then(result => {
                    if (result.deletedCount > 0) {
                        console.log(`✅ Cleaned up ${result.deletedCount} expired announcements`);
                    }
                })
                .catch(error => {
                    console.error('❌ Error during scheduled announcement cleanup:', error);
                });

            // Schedule next cleanup for tomorrow
            scheduleNextCleanup();
        }, timeUntilMidnight);
    };

    scheduleNextCleanup();
}

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

// Middleware - increase limit for inventory data imports
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

// TEMPORARY: Test route without authentication for debugging upload
app.use('/test-upload', purchaseOrderRoutes);

// Public API endpoints (require API key but not login) - MUST be before authenticated routes
// Public endpoint to download the latest auto-generated Excel file
app.get('/purchase-orders/download/latest-excel', (req, res) => {
    try {
        if (!fs.existsSync(EXCEL_CACHE_FILE)) {
            return res.status(404).send('Excel file not yet generated. Please try again in a few moments.');
        }
        
        const stats = fs.statSync(EXCEL_CACHE_FILE);
        const timestamp = new Date(stats.mtime).toLocaleString();
        
        // Read file into buffer and send directly (better for Excel Power Query)
        const fileBuffer = fs.readFileSync(EXCEL_CACHE_FILE);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=purchase-orders-latest.xlsx');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('X-Generated-At', timestamp);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.send(fileBuffer);
        
        console.log(`📥 Excel file downloaded (${Math.round(fileBuffer.length / 1024)} KB, last updated: ${timestamp})`);
    } catch (error) {
        console.error('Error serving Excel file:', error);
        res.status(500).send('Error serving Excel file: ' + error.message);
    }
});

// Dynamic endpoint for auto-generated reports (must come before static routes)
app.get('/purchase-orders/reports/:reportSlug', async (req, res) => {
    try {
        // Check if this is a static report first
        const staticReports = ['unreceived-items', 'waiting-for-approval'];
        if (staticReports.includes(req.params.reportSlug)) {
            return; // Let the specific handlers below handle it
        }
        
        const AutoReport = require('./models/AutoReport');
        const urlPath = `/purchase-orders/reports/${req.params.reportSlug}`;
        const autoReport = await AutoReport.findOne({ urlPath, isActive: true });
        
        if (!autoReport) {
            return res.status(404).send('Report not found or inactive.');
        }
        
        const cacheFilePath = path.join(EXCEL_CACHE_DIR, autoReport.cacheFileName);
        
        if (!fs.existsSync(cacheFilePath)) {
            return res.status(404).send('Report file not yet generated. Please try again in a few moments.');
        }
        
        const stats = fs.statSync(cacheFilePath);
        const timestamp = new Date(stats.mtime).toLocaleString();
        const fileBuffer = fs.readFileSync(cacheFilePath);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${autoReport.cacheFileName}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('X-Generated-At', timestamp);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.send(fileBuffer);
        console.log(`📥 Auto-report downloaded: ${autoReport.name} (${Math.round(fileBuffer.length / 1024)} KB, updated: ${timestamp})`);
    } catch (error) {
        console.error('Error serving auto-report:', error);
        // Continue to next handler if this fails
    }
});

// Public endpoint for Unreceived Items Report
app.get('/purchase-orders/reports/unreceived-items', (req, res) => {
    try {
        if (!fs.existsSync(UNRECEIVED_CACHE_FILE)) {
            return res.status(404).send('Unreceived Items report not yet generated. Please try again in a few moments.');
        }
        
        const stats = fs.statSync(UNRECEIVED_CACHE_FILE);
        const timestamp = new Date(stats.mtime).toLocaleString();
        const fileBuffer = fs.readFileSync(UNRECEIVED_CACHE_FILE);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=unreceived-items-report.xlsx');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('X-Generated-At', timestamp);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.send(fileBuffer);
        console.log(`📥 Unreceived Items report downloaded (${Math.round(fileBuffer.length / 1024)} KB, updated: ${timestamp})`);
    } catch (error) {
        console.error('Error serving Unreceived Items report:', error);
        res.status(500).send('Error serving report: ' + error.message);
    }
});

// Public endpoint for Waiting for Approval Report
app.get('/purchase-orders/reports/waiting-for-approval', (req, res) => {
    try {
        if (!fs.existsSync(WAITING_APPROVAL_CACHE_FILE)) {
            return res.status(404).send('Waiting for Approval report not yet generated. Please try again in a few moments.');
        }
        
        const stats = fs.statSync(WAITING_APPROVAL_CACHE_FILE);
        const timestamp = new Date(stats.mtime).toLocaleString();
        const fileBuffer = fs.readFileSync(WAITING_APPROVAL_CACHE_FILE);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=waiting-for-approval-report.xlsx');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('X-Generated-At', timestamp);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.send(fileBuffer);
        console.log(`📥 Waiting for Approval report downloaded (${Math.round(fileBuffer.length / 1024)} KB, updated: ${timestamp})`);
    } catch (error) {
        console.error('Error serving Waiting for Approval report:', error);
        res.status(500).send('Error serving report: ' + error.message);
    }
});

app.get('/purchase-orders/export/csv-data', async (req, res) => {
    const apiKey = req.query.key;
    const validApiKey = process.env.EXCEL_API_KEY;
    
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).send('Unauthorized. Invalid API key.');
    }
    
    // Forward to the route handler
    const PurchaseOrder = require('./models/PurchaseOrder');
    const Papa = require('papaparse');
    
    try {
        const purchaseOrders = await PurchaseOrder.find()
            .populate('lineItems')
            .sort({ poNumber: -1 });

        const csvData = [];
        purchaseOrders.forEach(po => {
            if (po.lineItems && po.lineItems.length > 0) {
                po.lineItems.forEach(item => {
                    csvData.push({
                        'PO_Number': po.poNumber || '',
                        'Vendor': po.vendor || '',
                        'PO_Type': po.poType || '',
                        'PO_Status': po.status || '',
                        'PO_NS_Status': po.nsStatus || '',
                        'PO_Priority': po.priority || '',
                        'PO_Location': po.location || '',
                        'PO_Tracking': po.trackingNumber || '',
                        'PO_ETA': po.eta ? new Date(po.eta).toISOString().split('T')[0] : '',
                        'PO_Date_Ordered': po.dateOrdered ? new Date(po.dateOrdered).toISOString().split('T')[0] : '',
                        'Item_Number': item.itemNumber || '',
                        'Variety': item.variety || '',
                        'Description': item.description || '',
                        'Location': item.locationName || '',
                        'Qty_Ordered': item.quantityOrdered || 0,
                        'Qty_Expected': item.quantityExpected || 0,
                        'Qty_Received': item.quantityReceived || 0,
                        'Unit': item.unit || '',
                        'Item_Status': item.status || '',
                        'Urgency': item.urgency || '',
                        'EAD': item.ead || '',
                        'Item_ETA': item.eta ? new Date(item.eta).toISOString().split('T')[0] : '',
                        'Item_Notes': item.notes || '',
                        'PO_Notes': po.notes || ''
                    });
                });
            } else {
                csvData.push({
                    'PO_Number': po.poNumber || '',
                    'Vendor': po.vendor || '',
                    'PO_Type': po.poType || '',
                    'PO_Status': po.status || '',
                    'PO_NS_Status': po.nsStatus || '',
                    'PO_Priority': po.priority || '',
                    'PO_Location': po.location || '',
                    'PO_Tracking': po.trackingNumber || '',
                    'PO_ETA': po.eta ? new Date(po.eta).toISOString().split('T')[0] : '',
                    'PO_Date_Ordered': po.dateOrdered ? new Date(po.dateOrdered).toISOString().split('T')[0] : '',
                    'Item_Number': '',
                    'Variety': '',
                    'Description': '',
                    'Location': '',
                    'Qty_Ordered': 0,
                    'Qty_Expected': 0,
                    'Qty_Received': 0,
                    'Unit': '',
                    'Item_Status': '',
                    'Urgency': '',
                    'EAD': '',
                    'Item_ETA': '',
                    'Item_Notes': '',
                    'PO_Notes': po.notes || ''
                });
            }
        });

        const csv = Papa.unparse(csvData);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="PurchaseOrders_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('❌ CSV export error:', error);
        res.status(500).send('Error: ' + error.message);
    }
});

app.use('/purchase-orders', ensureAuthenticated, ensureApproved, purchaseOrderRoutes);
app.use('/purchase-orders', ensureAuthenticated, ensureApproved, trackingRoutes); // NEW: Tracking routes
app.use('/shipments', ensureAuthenticated, ensureApproved, shipmentRoutes); // NEW: Shipment management
app.use('/organic-vendors', ensureAuthenticated, ensureApproved, organicVendorRoutes);
app.use('/vendors', ensureAuthenticated, ensureApproved, vendorRoutes);
app.use('/enhanced-vendors', ensureAuthenticated, ensureApproved, enhancedVendorRoutes);
app.use('/tasks', ensureAuthenticated, ensureApproved, taskRoutes);
app.use('/receiving', ensureAuthenticated, ensureApproved, receivingRoutes);
app.use('/email-templates', ensureAuthenticated, ensureApproved, emailTemplateRoutes);
app.use('/forms', ensureAuthenticated, ensureApproved, formRoutes); // NEW: Forms management
app.use('/seed-catalog', ensureAuthenticated, ensureApproved, seedCatalogRoutes); // NEW: AI Seed Catalog
app.use('/dropshipments', ensureAuthenticated, ensureApproved, dropshipmentRoutes); // NEW: Dropshipment Tracking
app.use('/dropship', ensureAuthenticated, ensureApproved, dropshipRoutes);
app.use('/dropship-test', ensureAuthenticated, ensureApproved, dropshipTestRoutes);
// Quick Office 365 test route (unprotected for debugging)
app.get('/office365-test-direct', async (req, res) => {
    try {
        const office365ImapService = require('./services/office365ImapService');

        const envCheck = {
            OFFICE365_USER: process.env.OFFICE365_USER || 'NOT SET',
            OFFICE365_PASSWORD: process.env.OFFICE365_PASSWORD ? '***SET***' : 'NOT SET',
            OFFICE365_PASSWORD_LENGTH: process.env.OFFICE365_PASSWORD ? process.env.OFFICE365_PASSWORD.length : 0
        };

        // Test Office 365 IMAP connection
        let connectionTest = {
            status: 'unknown',
            error: null,
            stats: null
        };

        try {
            console.log('🔍 Testing Office 365 connection...');
            await office365ImapService.connect();
            console.log('✅ Office 365 connected successfully');
            const stats = await office365ImapService.getMailboxStats();
            console.log('📊 Office 365 stats:', stats);
            connectionTest = {
                status: 'success',
                error: null,
                stats: stats
            };
            office365ImapService.disconnect();
            console.log('👋 Office 365 disconnected');
        } catch (error) {
            console.error('❌ Office 365 connection failed:', error.message);
            connectionTest = {
                status: 'failed',
                error: error.message,
                stats: null
            };
        }

        res.json({
            environment: envCheck,
            connection: connectionTest,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Test route error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test dashboard vendor links (unprotected for debugging)
app.get('/test-dashboard-vendor-links', async (req, res) => {
    try {
        const PurchaseOrder = require('./models/PurchaseOrder');
        const Vendor = require('./models/Vendor');

        // Get a few sample POs
        const samplePOs = await PurchaseOrder.find().limit(3).lean();

        // Get unique vendors
        const uniqueVendors = [...new Set(samplePOs.map(po => po.vendor).filter(Boolean))];

        // Get vendor records
        const vendorRecords = await Vendor.find({
            $or: [
                { vendorName: { $in: uniqueVendors } },
                { vendorCode: { $in: uniqueVendors } }
            ]
        }).lean();

        // Create mapping
        const vendorMap = {};
        vendorRecords.forEach(vendor => {
            vendorMap[vendor.vendorName] = vendor._id;
            if (vendor.vendorCode) {
                vendorMap[vendor.vendorCode] = vendor._id;
            }
        });

        // Generate HTML for testing
        let html = `
        <html>
        <head>
            <title>Test Vendor Links</title>
            <style>
                .vendor-link { color: #007bff; text-decoration: none; }
                .vendor-link:hover { color: #0056b3; text-decoration: underline; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Vendor Links Test</h1>
            <h2>Vendor Mapping Debug</h2>
            <p>Total vendors in mapping: ${Object.keys(vendorMap).length}</p>
            <p>Vendor map keys: ${Object.keys(vendorMap).join(', ')}</p>
            
            <h2>Sample Purchase Orders</h2>
            <table>
                <tr><th>PO Number</th><th>Vendor</th><th>Has Link?</th><th>Vendor Display</th></tr>`;

        samplePOs.forEach(po => {
            const hasLink = vendorMap && vendorMap[po.vendor];
            const vendorDisplay = hasLink
                ? `<a href="/vendors/${vendorMap[po.vendor]}" class="vendor-link" title="View ${po.vendor} profile">${po.vendor}</a>`
                : po.vendor;

            html += `<tr>
                <td>${po.poNumber}</td>
                <td>${po.vendor}</td>
                <td>${hasLink ? '✅' : '❌'}</td>
                <td>${vendorDisplay}</td>
            </tr>`;
        });

        html += `</table></body></html>`;
        res.send(html);

    } catch (error) {
        res.status(500).send(`Error: ${error.message}<br>Stack: ${error.stack}`);
    }
});

// Debug vendor mapping endpoint
app.get('/debug-vendor-links', async (req, res) => {
    try {
        const Vendor = require('./models/Vendor');
        const PurchaseOrder = require('./models/PurchaseOrder');

        // Get first 10 purchase orders
        const samplePOs = await PurchaseOrder.find().limit(10).lean();
        const vendorNamesFromPOs = [...new Set(samplePOs.map(po => po.vendor).filter(Boolean))];

        // Get all vendor records
        const allVendors = await Vendor.find().lean();

        // Get vendor records that match PO vendor names
        const vendorRecords = await Vendor.find({
            $or: [
                { vendorName: { $in: vendorNamesFromPOs } },
                { vendorCode: { $in: vendorNamesFromPOs } }
            ]
        }).lean();

        // Create mapping
        const vendorMap = {};
        vendorRecords.forEach(vendor => {
            vendorMap[vendor.vendorName] = vendor._id;
            if (vendor.vendorCode) {
                vendorMap[vendor.vendorCode] = vendor._id;
            }
        });

        res.json({
            poVendorNames: vendorNamesFromPOs,
            allVendorCount: allVendors.length,
            matchingVendors: vendorRecords.map(v => ({
                id: v._id,
                name: v.vendorName,
                code: v.vendorCode
            })),
            vendorMap,
            samplePOsWithLinks: samplePOs.map(po => ({
                poNumber: po.poNumber,
                vendor: po.vendor,
                hasVendorRecord: !!vendorMap[po.vendor],
                vendorId: vendorMap[po.vendor] || null,
                linkUrl: vendorMap[po.vendor] ? `/vendors/${vendorMap[po.vendor]}` : null
            })),
            debug: {
                vendorMapKeys: Object.keys(vendorMap),
                vendorMapSize: Object.keys(vendorMap).length
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Quick vendor mapping test route (unprotected for debugging)
app.get('/test-vendor-mapping', async (req, res) => {
    try {
        const Vendor = require('./models/Vendor');
        const PurchaseOrder = require('./models/PurchaseOrder');

        // Get some sample purchase orders
        const samplePOs = await PurchaseOrder.find().limit(5).lean();
        const vendorNames = samplePOs.map(po => po.vendor).filter(Boolean);

        // Get vendor records
        const vendorRecords = await Vendor.find({
            $or: [
                { vendorName: { $in: vendorNames } },
                { vendorCode: { $in: vendorNames } }
            ]
        }).lean();

        // Create mapping
        const vendorMap = {};
        vendorRecords.forEach(vendor => {
            vendorMap[vendor.vendorName] = vendor._id;
            if (vendor.vendorCode) {
                vendorMap[vendor.vendorCode] = vendor._id;
            }
        });

        res.json({
            samplePOs: samplePOs.map(po => ({
                poNumber: po.poNumber,
                vendor: po.vendor,
                vendorId: vendorMap[po.vendor] || null,
                hasLink: !!vendorMap[po.vendor]
            })),
            vendorRecords: vendorRecords.map(v => ({
                id: v._id,
                name: v.vendorName,
                code: v.vendorCode
            })),
            vendorMap,
            totalVendors: await Vendor.countDocuments(),
            totalPOs: await PurchaseOrder.countDocuments()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.use('/email-client', ensureAuthenticated, ensureApproved, emailClientRoutes);
app.use('/food', ensureAuthenticated, ensureApproved, foodRoutes);
app.use('/story', ensureAuthenticated, ensureApproved, storyRoutes);
app.use('/medicine', ensureAuthenticated, ensureApproved, medicineRoutes);
app.use('/bulletin', bulletinRoutes); // Temporarily remove auth for testing
app.use('/hymns', hymnRoutes); // Remove authentication requirement for hymn search
app.use('/api/report-configs', reportConfigRoutes); // NEW: Saved report configurations

// Public email template routes for dashboard access (read-only)
app.use('/public/email-templates', emailTemplateRoutes);

// API routes - Order matters! More specific routes must come first
app.use('/api/announcements', announcementRoutes); // Announcement API routes - MUST be before /api

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

// Excel Reports Manager page
app.get('/excel-reports', ensureAuthenticated, ensureApproved, (req, res) => {
    // Automatically detect the base URL from the request
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    
    res.render('excel-reports', { 
        user: req.user,
        baseUrl: baseUrl
    });
});

// Manage Auto-Updating Reports page
app.get('/manage-auto-reports', ensureAuthenticated, ensureApproved, (req, res) => {
    res.render('manage-auto-reports', { user: req.user });
});

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

// ==============================================================
// EXCEL REPORTS API ROUTES
// ==============================================================

// Helper function to get report file info
function getReportInfo(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const fileDate = new Date(stats.mtime);
            return {
                exists: true,
                size: `${Math.round(stats.size / 1024)} KB`,
                timestamp: fileDate.toLocaleString('en-US', { 
                    timeZone: 'America/Los_Angeles',
                    month: '2-digit',
                    day: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                }),
                mtime: stats.mtime
            };
        }
    } catch (error) {
        console.error(`Error getting info for ${filePath}:`, error);
    }
    return {
        exists: false,
        size: 'N/A',
        timestamp: 'Not generated',
        mtime: null
    };
}

// API: Get status of all reports
app.get('/api/excel-reports/status', ensureAuthenticated, ensureApproved, (req, res) => {
    try {
        const reports = {
            main: getReportInfo(EXCEL_CACHE_FILE),
            unreceived: getReportInfo(UNRECEIVED_CACHE_FILE),
            approval: getReportInfo(WAITING_APPROVAL_CACHE_FILE)
        };

        // Find the most recent update
        const timestamps = [
            reports.main.exists ? reports.main.mtime : null,
            reports.unreceived.exists ? reports.unreceived.mtime : null,
            reports.approval.exists ? reports.approval.mtime : null
        ].filter(t => t !== null);

        const lastUpdate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();

        res.json({
            success: true,
            lastUpdate: lastUpdate.toISOString(),
            reports: reports
        });
    } catch (error) {
        console.error('Error getting report status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Refresh specific report
app.post('/api/excel-reports/refresh/:type', ensureAuthenticated, ensureApproved, async (req, res) => {
    const { type } = req.params;
    
    try {
        let reportInfo;
        
        switch(type) {
            case 'main':
                await generateExcelCache();
                reportInfo = getReportInfo(EXCEL_CACHE_FILE);
                break;
            case 'unreceived':
                await generateUnreceivedItemsReport();
                reportInfo = getReportInfo(UNRECEIVED_CACHE_FILE);
                break;
            case 'approval':
                await generateWaitingForApprovalReport();
                reportInfo = getReportInfo(WAITING_APPROVAL_CACHE_FILE);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid report type' });
        }

        res.json({
            success: true,
            message: `Report regenerated successfully`,
            report: reportInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Error refreshing ${type} report:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Legacy endpoint for backward compatibility
app.post('/purchase-orders/refresh-excel-cache', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        await generateExcelCache();
        await generateUnreceivedItemsReport();
        await generateWaitingForApprovalReport();
        res.json({ 
            success: true, 
            message: 'All Excel reports regenerated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error refreshing Excel cache:', error);
        res.status(500).json({ success: false, error: 'Error refreshing Excel cache' });
    }
});

// API: Generate Excel from saved report configuration
app.post('/api/excel-reports/generate-from-config/:configId', ensureAuthenticated, ensureApproved, async (req, res) => {
    const { configId } = req.params;
    
    try {
        const ReportConfig = require('./models/ReportConfig');
        const PurchaseOrder = require('./models/PurchaseOrder');
        
        // Load the configuration
        const config = await ReportConfig.findById(configId);
        
        if (!config) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        
        // Check access permission
        if (!config.canAccess(req.user)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        // Record usage
        await config.recordUsage();
        
        // Fetch data based on report type
        let data = [];
        const purchaseOrders = await PurchaseOrder.find().populate('lineItems').sort({ dateOrdered: -1 });
        
        if (config.reportType === 'unreceived-items') {
            // Generate unreceived items data
            purchaseOrders.forEach(po => {
                if (po.lineItems && po.lineItems.length > 0) {
                    po.lineItems.forEach(item => {
                        const qtyExpected = item.qtyExpected || item.qtyOrdered || 0;
                        const qtyReceived = item.qtyReceived || 0;
                        const qtyRemaining = qtyExpected - qtyReceived;
                        
                        if (qtyRemaining > 0) {
                            // Apply filters from config
                            const matchesType = !config.config.types || config.config.types.length === 0 || 
                                config.config.types.some(t => t.checked && t.value === po.poType);
                            const matchesStatus = !config.config.statuses || config.config.statuses.length === 0 ||
                                config.config.statuses.some(s => s.checked && s.value === item.status);
                            const matchesUrgency = !config.config.urgencies || config.config.urgencies.length === 0 ||
                                config.config.urgencies.some(u => u.checked && u.value === item.urgency);
                            
                            if (matchesType && matchesStatus && matchesUrgency) {
                                const row = {
                                    'PO Number': po.poNumber || '',
                                    'Vendor': po.vendor || '',
                                    'PO Type': po.poType || '',
                                    'Item Number': item.itemNumber || '',
                                    'Variety': item.variety || '',
                                    'Description': item.description || '',
                                    'Location': item.location || '',
                                    'Qty Expected': qtyExpected,
                                    'Qty Received': qtyReceived,
                                    'Qty Remaining': qtyRemaining,
                                    'Unit': item.unit || '',
                                    'Item Status': item.status || '',
                                    'Urgency': item.urgency || '',
                                    'EAD': item.ead ? item.ead.toISOString().split('T')[0] : '',
                                    'Item ETA': item.eta ? item.eta.toISOString().split('T')[0] : '',
                                    'PO Status': po.status || '',
                                    'PO ETA': po.eta ? po.eta.toISOString().split('T')[0] : '',
                                    'Date Ordered': po.dateOrdered ? po.dateOrdered.toISOString().split('T')[0] : '',
                                    'Tracking': po.tracking || '',
                                    'Item Notes': item.notes || '',
                                    'PO Notes': po.notes || ''
                                };
                                
                                // Only include selected columns
                                const filteredRow = {};
                                if (config.config.columns) {
                                    config.config.columns.forEach(col => {
                                        if (col.checked) {
                                            const columnName = col.id.replace('col_', '').replace(/_/g, ' ')
                                                .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                            if (row[columnName] !== undefined) {
                                                filteredRow[columnName] = row[columnName];
                                            }
                                        }
                                    });
                                    data.push(Object.keys(filteredRow).length > 0 ? filteredRow : row);
                                } else {
                                    data.push(row);
                                }
                            }
                        }
                    });
                }
            });
        } else if (config.reportType === 'waiting-for-approval') {
            // Generate waiting for approval data
            const approvalStatuses = ['Waiting for approval', 'waiting for approval'];
            
            purchaseOrders.forEach(po => {
                if (approvalStatuses.includes(po.status)) {
                    // Apply filters from config
                    const matchesType = !config.config.types || config.config.types.length === 0 || 
                        config.config.types.some(t => t.checked && t.value === po.poType);
                    
                    if (matchesType) {
                        if (po.lineItems && po.lineItems.length > 0) {
                            po.lineItems.forEach(item => {
                                const matchesStatus = !config.config.statuses || config.config.statuses.length === 0 ||
                                    config.config.statuses.some(s => s.checked && s.value === item.status);
                                
                                if (matchesStatus) {
                                    data.push({
                                        'PO Number': po.poNumber || '',
                                        'Vendor': po.vendor || '',
                                        'PO Type': po.poType || '',
                                        'PO Status': po.status || '',
                                        'Priority': po.priority || '',
                                        'Item Number': item.itemNumber || '',
                                        'Variety': item.variety || '',
                                        'Description': item.description || '',
                                        'Location': item.location || '',
                                        'Qty Ordered': item.qtyOrdered || 0,
                                        'Unit': item.unit || '',
                                        'Urgency': item.urgency || '',
                                        'EAD': item.ead ? item.ead.toISOString().split('T')[0] : '',
                                        'Date Ordered': po.dateOrdered ? po.dateOrdered.toISOString().split('T')[0] : '',
                                        'Item Notes': item.notes || '',
                                        'PO Notes': po.notes || ''
                                    });
                                }
                            });
                        } else {
                            data.push({
                                'PO Number': po.poNumber || '',
                                'Vendor': po.vendor || '',
                                'PO Type': po.poType || '',
                                'PO Status': po.status || '',
                                'Priority': po.priority || '',
                                'Item Number': '',
                                'Variety': '',
                                'Description': '',
                                'Location': '',
                                'Qty Ordered': 0,
                                'Unit': '',
                                'Urgency': '',
                                'EAD': '',
                                'Date Ordered': po.dateOrdered ? po.dateOrdered.toISOString().split('T')[0] : '',
                                'Item Notes': '',
                                'PO Notes': po.notes || ''
                            });
                        }
                    }
                }
            });
        }
        
        // Generate Excel file
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, config.name.substring(0, 31));
        
        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Send file
        const filename = `${config.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
        
        console.log(`📥 Generated Excel from config: ${config.name} (${data.length} rows)`);
    } catch (error) {
        console.error('Error generating Excel from config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==============================================================
// AUTO-REPORTS API ENDPOINTS
// ==============================================================

// Get all auto-reports (user's own + public ones if they exist in future)
app.get('/api/auto-reports', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const AutoReport = require('./models/AutoReport');
        
        // Admins see all, regular users see only their own
        const query = req.user.role === 'admin' 
            ? {} 
            : { createdBy: req.user._id };
        
        const reports = await AutoReport.find(query)
            .populate('reportConfigId', 'name reportType')
            .sort({ createdAt: -1 });
        
        res.json(reports);
    } catch (error) {
        console.error('Error fetching auto-reports:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new auto-report
app.post('/api/auto-reports', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const AutoReport = require('./models/AutoReport');
        const ReportConfig = require('./models/ReportConfig');
        const { name, description, reportConfigId, urlPath, frequency } = req.body;
        
        // Validate the report config exists and user has access
        const config = await ReportConfig.findById(reportConfigId);
        if (!config) {
            return res.status(404).json({ error: 'Report configuration not found' });
        }
        
        if (!config.canAccess(req.user)) {
            return res.status(403).json({ error: 'You do not have access to this configuration' });
        }
        
        // Check for duplicate URL path
        const existingReport = await AutoReport.findOne({ urlPath: `/purchase-orders/reports/${urlPath}` });
        if (existingReport) {
            return res.status(400).json({ error: 'A report with this URL path already exists' });
        }
        
        // Create cron expression based on frequency
        let cronExpression = '0 * * * *'; // Default: hourly
        if (frequency === 'daily') {
            cronExpression = '0 0 * * *'; // Daily at midnight
        }
        
        // Create the auto-report
        const autoReport = new AutoReport({
            name,
            description,
            reportConfigId,
            urlPath,
            generationFrequency: frequency,
            cronExpression,
            createdBy: req.user._id,
            createdByUsername: req.user.username
        });
        
        await autoReport.save();
        
        // Generate the report immediately
        await generateAutoReport(autoReport._id);
        
        console.log(`✅ Created auto-report: ${name} by ${req.user.username}`);
        res.json(autoReport);
    } catch (error) {
        console.error('Error creating auto-report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate auto-report now (manual trigger)
app.post('/api/auto-reports/:id/generate', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const AutoReport = require('./models/AutoReport');
        const report = await AutoReport.findById(req.params.id);
        
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        if (!report.canAccess(req.user)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        await generateAutoReport(report._id);
        
        res.json({ success: true, message: 'Report generated successfully' });
    } catch (error) {
        console.error('Error generating auto-report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Toggle auto-report active status
app.put('/api/auto-reports/:id/toggle', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const AutoReport = require('./models/AutoReport');
        const report = await AutoReport.findById(req.params.id);
        
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        if (!report.canModify(req.user)) {
            return res.status(403).json({ error: 'You do not have permission to modify this report' });
        }
        
        report.isActive = req.body.isActive;
        await report.save();
        
        console.log(`${report.isActive ? '▶️' : '⏸️'} Auto-report ${report.isActive ? 'activated' : 'deactivated'}: ${report.name}`);
        res.json(report);
    } catch (error) {
        console.error('Error toggling auto-report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete auto-report
app.delete('/api/auto-reports/:id', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const AutoReport = require('./models/AutoReport');
        const report = await AutoReport.findById(req.params.id);
        
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        if (!report.canModify(req.user)) {
            return res.status(403).json({ error: 'You do not have permission to delete this report' });
        }
        
        // Delete the cache file if it exists
        const cacheFilePath = path.join(EXCEL_CACHE_DIR, report.cacheFileName);
        if (fs.existsSync(cacheFilePath)) {
            fs.unlinkSync(cacheFilePath);
            console.log(`🗑️ Deleted cache file: ${report.cacheFileName}`);
        }
        
        await AutoReport.findByIdAndDelete(req.params.id);
        
        console.log(`🗑️ Deleted auto-report: ${report.name} by ${req.user.username}`);
        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Error deleting auto-report:', error);
        res.status(500).json({ error: error.message });
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

const PORT = process.env.PORT || 3002;

// ==============================================================
// EXCEL CACHE CONFIGURATION
// ==============================================================
const EXCEL_CACHE_DIR = path.join(__dirname, 'cache');
const EXCEL_CACHE_FILE = path.join(EXCEL_CACHE_DIR, 'purchase-orders-latest.xlsx');
const UNRECEIVED_CACHE_FILE = path.join(EXCEL_CACHE_DIR, 'unreceived-items-report.xlsx');
const WAITING_APPROVAL_CACHE_FILE = path.join(EXCEL_CACHE_DIR, 'waiting-for-approval-report.xlsx');

// Ensure cache directory exists
if (!fs.existsSync(EXCEL_CACHE_DIR)) {
    fs.mkdirSync(EXCEL_CACHE_DIR, { recursive: true });
}

// ==============================================================
// PERMANENT SOLUTION: Auto-Generate Excel File Every Hour
// ==============================================================

// Function to generate Excel file
async function generateExcelCache() {
    try {
        console.log('🔄 Generating Excel cache...');
        const PurchaseOrder = require('./models/PurchaseOrder');
        
        // Fetch all purchase orders with line items
        const purchaseOrders = await PurchaseOrder.find()
            .populate('lineItems')
            .sort({ dateOrdered: -1 });
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Prepare PO data
        const poData = purchaseOrders.map(po => ({
            'PO Number': po.poNumber || '',
            'Vendor': po.vendor || '',
            'PO Type': po.poType || '',
            'Status': po.status || '',
            'NS Status': po.nsStatus || '',
            'Priority': po.priority || '',
            'Location': po.location || '',
            'Tracking': po.tracking || '',
            'ETA': po.eta ? po.eta.toISOString().split('T')[0] : '',
            'Date Ordered': po.dateOrdered ? po.dateOrdered.toISOString().split('T')[0] : '',
            'Notes': po.notes || ''
        }));
        
        // Prepare Line Items data
        const lineItemData = [];
        purchaseOrders.forEach(po => {
            if (po.lineItems && po.lineItems.length > 0) {
                po.lineItems.forEach(item => {
                    lineItemData.push({
                        'PO Number': po.poNumber || '',
                        'Item Number': item.itemNumber || '',
                        'Variety': item.variety || '',
                        'Description': item.description || '',
                        'Location': item.location || '',
                        'Qty Ordered': item.qtyOrdered || 0,
                        'Qty Expected': item.qtyExpected || 0,
                        'Qty Received': item.qtyReceived || 0,
                        'Unit': item.unit || '',
                        'Status': item.status || '',
                        'Urgency': item.urgency || '',
                        'EAD': item.ead ? item.ead.toISOString().split('T')[0] : '',
                        'Item ETA': item.eta ? item.eta.toISOString().split('T')[0] : '',
                        'Notes': item.notes || ''
                    });
                });
            }
        });
        
        // Add worksheets
        const poSheet = XLSX.utils.json_to_sheet(poData);
        const itemSheet = XLSX.utils.json_to_sheet(lineItemData);
        
        XLSX.utils.book_append_sheet(workbook, poSheet, 'Purchase Orders');
        XLSX.utils.book_append_sheet(workbook, itemSheet, 'Line Items');
        
        // Write to cache file
        XLSX.writeFile(workbook, EXCEL_CACHE_FILE);
        
        const stats = fs.statSync(EXCEL_CACHE_FILE);
        console.log(`✅ Excel cache generated successfully (${Math.round(stats.size / 1024)} KB) at ${new Date().toLocaleString()}`);
        
    } catch (error) {
        console.error('❌ Error generating Excel cache:', error);
    }
}

// ==============================================================
// REPORT-SPECIFIC EXCEL CACHE GENERATORS
// ==============================================================

// Generate Unreceived Items Report
async function generateUnreceivedItemsReport() {
    try {
        console.log('🔄 Generating Unreceived Items report...');
        const PurchaseOrder = require('./models/PurchaseOrder');
        
        // Fetch POs with unreceived items
        const purchaseOrders = await PurchaseOrder.find()
            .populate('lineItems')
            .sort({ dateOrdered: -1 });
        
        const unreceivedData = [];
        
        purchaseOrders.forEach(po => {
            if (po.lineItems && po.lineItems.length > 0) {
                po.lineItems.forEach(item => {
                    const qtyExpected = item.qtyExpected || item.qtyOrdered || 0;
                    const qtyReceived = item.qtyReceived || 0;
                    const qtyRemaining = qtyExpected - qtyReceived;
                    
                    // Only include items that have quantity remaining
                    if (qtyRemaining > 0) {
                        unreceivedData.push({
                            'PO Number': po.poNumber || '',
                            'Vendor': po.vendor || '',
                            'PO Type': po.poType || '',
                            'Item Number': item.itemNumber || '',
                            'Variety': item.variety || '',
                            'Description': item.description || '',
                            'Location': item.location || '',
                            'Qty Expected': qtyExpected,
                            'Qty Received': qtyReceived,
                            'Qty Remaining': qtyRemaining,
                            'Unit': item.unit || '',
                            'Item Status': item.status || '',
                            'Urgency': item.urgency || '',
                            'EAD': item.ead ? item.ead.toISOString().split('T')[0] : '',
                            'Item ETA': item.eta ? item.eta.toISOString().split('T')[0] : '',
                            'PO Status': po.status || '',
                            'PO ETA': po.eta ? po.eta.toISOString().split('T')[0] : '',
                            'Date Ordered': po.dateOrdered ? po.dateOrdered.toISOString().split('T')[0] : '',
                            'Tracking': po.tracking || '',
                            'Item Notes': item.notes || '',
                            'PO Notes': po.notes || ''
                        });
                    }
                });
            }
        });
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(unreceivedData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Unreceived Items');
        XLSX.writeFile(workbook, UNRECEIVED_CACHE_FILE);
        
        const stats = fs.statSync(UNRECEIVED_CACHE_FILE);
        console.log(`✅ Unreceived Items report generated (${Math.round(stats.size / 1024)} KB, ${unreceivedData.length} items)`);
    } catch (error) {
        console.error('❌ Error generating Unreceived Items report:', error);
    }
}

// Generate Waiting for Approval Report
async function generateWaitingForApprovalReport() {
    try {
        console.log('🔄 Generating Waiting for Approval report...');
        const PurchaseOrder = require('./models/PurchaseOrder');
        
        // Fetch POs waiting for approval
        const purchaseOrders = await PurchaseOrder.find({ 
            status: { $in: ['Waiting for Approval', 'Pending', 'Pre-Purchase'] }
        })
            .populate('lineItems')
            .sort({ dateOrdered: -1 });
        
        const approvalData = [];
        
        purchaseOrders.forEach(po => {
            if (po.lineItems && po.lineItems.length > 0) {
                po.lineItems.forEach(item => {
                    approvalData.push({
                        'PO Number': po.poNumber || '',
                        'Vendor': po.vendor || '',
                        'PO Type': po.poType || '',
                        'PO Status': po.status || '',
                        'Priority': po.priority || '',
                        'Item Number': item.itemNumber || '',
                        'Variety': item.variety || '',
                        'Description': item.description || '',
                        'Location': item.location || '',
                        'Qty Ordered': item.qtyOrdered || 0,
                        'Unit': item.unit || '',
                        'Urgency': item.urgency || '',
                        'EAD': item.ead ? item.ead.toISOString().split('T')[0] : '',
                        'Date Ordered': po.dateOrdered ? po.dateOrdered.toISOString().split('T')[0] : '',
                        'Item Notes': item.notes || '',
                        'PO Notes': po.notes || ''
                    });
                });
            } else {
                // Include POs without line items
                approvalData.push({
                    'PO Number': po.poNumber || '',
                    'Vendor': po.vendor || '',
                    'PO Type': po.poType || '',
                    'PO Status': po.status || '',
                    'Priority': po.priority || '',
                    'Item Number': '',
                    'Variety': '',
                    'Description': '',
                    'Location': '',
                    'Qty Ordered': 0,
                    'Unit': '',
                    'Urgency': '',
                    'EAD': '',
                    'Date Ordered': po.dateOrdered ? po.dateOrdered.toISOString().split('T')[0] : '',
                    'Item Notes': '',
                    'PO Notes': po.notes || ''
                });
            }
        });
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(approvalData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Waiting for Approval');
        XLSX.writeFile(workbook, WAITING_APPROVAL_CACHE_FILE);
        
        const stats = fs.statSync(WAITING_APPROVAL_CACHE_FILE);
        console.log(`✅ Waiting for Approval report generated (${Math.round(stats.size / 1024)} KB, ${approvalData.length} items)`);
    } catch (error) {
        console.error('❌ Error generating Waiting for Approval report:', error);
    }
}

// ==============================================================
// DYNAMIC AUTO-REPORT GENERATOR
// ==============================================================

// Generate a single auto-report based on its saved configuration
async function generateAutoReport(reportId) {
    try {
        const AutoReport = require('./models/AutoReport');
        const ReportConfig = require('./models/ReportConfig');
        const PurchaseOrder = require('./models/PurchaseOrder');
        
        // Load the auto-report and its configuration
        const autoReport = await AutoReport.findById(reportId).populate('reportConfigId');
        
        if (!autoReport) {
            console.error(`❌ Auto-report not found: ${reportId}`);
            return;
        }
        
        if (!autoReport.isActive) {
            console.log(`⏸️ Skipping inactive report: ${autoReport.name}`);
            return;
        }
        
        const config = autoReport.reportConfigId;
        if (!config) {
            console.error(`❌ Configuration not found for report: ${autoReport.name}`);
            autoReport.lastError = 'Configuration not found';
            await autoReport.save();
            return;
        }
        
        console.log(`🔄 Generating auto-report: ${autoReport.name}`);
        console.log(`   Report type: ${config.reportType}`);
        console.log(`   Config filters:`, {
            types: config.config.types?.length || 0,
            statuses: config.config.statuses?.length || 0,
            urgencies: config.config.urgencies?.length || 0,
            columns: config.config.columns?.length || 0
        });
        
        // Fetch data based on report type
        let data = [];
        const purchaseOrders = await PurchaseOrder.find().populate('lineItems').sort({ dateOrdered: -1 });
        console.log(`   Found ${purchaseOrders.length} purchase orders`);
        
        if (config.reportType === 'unreceived-items') {
            // Build unreceived items data
            purchaseOrders.forEach(po => {
                if (po.lineItems && po.lineItems.length > 0) {
                    po.lineItems.forEach(item => {
                        const qtyExpected = item.qtyExpected || item.qtyOrdered || 0;
                        const qtyReceived = item.qtyReceived || 0;
                        const unreceived = qtyExpected - qtyReceived;
                        
                        if (unreceived > 0) {
                            data.push({
                                poNumber: po.poNumber,
                                vendor: po.vendor,
                                poType: po.poType,
                                poStatus: po.status,
                                priority: po.priority,
                                itemNumber: item.itemNumber,
                                variety: item.variety,
                                description: item.description,
                                location: item.location,
                                qtyOrdered: item.qtyOrdered,
                                qtyExpected: qtyExpected,
                                qtyReceived: qtyReceived,
                                unreceived: unreceived,
                                unit: item.unit,
                                status: item.status,
                                urgency: item.urgency,
                                ead: item.ead,
                                eta: item.eta,
                                dateOrdered: po.dateOrdered,
                                itemNotes: item.notes,
                                poNotes: po.notes
                            });
                        }
                    });
                }
            });
        } else if (config.reportType === 'waiting-for-approval') {
            // Build waiting for approval data
            const approvalStatuses = ['Waiting for Approval', 'Pending', 'Pre-Purchase'];
            purchaseOrders
                .filter(po => approvalStatuses.includes(po.status))
                .forEach(po => {
                    if (po.lineItems && po.lineItems.length > 0) {
                        po.lineItems.forEach(item => {
                            data.push({
                                poNumber: po.poNumber,
                                vendor: po.vendor,
                                poType: po.poType,
                                poStatus: po.status,
                                priority: po.priority,
                                itemNumber: item.itemNumber,
                                variety: item.variety,
                                description: item.description,
                                location: item.location,
                                qtyOrdered: item.qtyOrdered,
                                unit: item.unit,
                                urgency: item.urgency,
                                ead: item.ead,
                                dateOrdered: po.dateOrdered,
                                itemNotes: item.notes,
                                poNotes: po.notes
                            });
                        });
                    }
                });
        }
        
        console.log(`   Built ${data.length} data rows before filters`);
        
        // Apply filters from configuration
        if (config.config.types && config.config.types.length > 0) {
            const checkedTypes = config.config.types.filter(t => t.checked).map(t => t.value);
            console.log(`   Type filters (${checkedTypes.length}):`, checkedTypes);
            if (checkedTypes.length > 0) {
                data = data.filter(row => checkedTypes.includes(row.poType));
                console.log(`   After type filter: ${data.length} rows`);
            }
        }
        
        if (config.config.statuses && config.config.statuses.length > 0) {
            const checkedStatuses = config.config.statuses.filter(s => s.checked).map(s => s.value);
            console.log(`   Status filters (${checkedStatuses.length}):`, checkedStatuses);
            if (checkedStatuses.length > 0) {
                data = data.filter(row => checkedStatuses.includes(row.status));
                console.log(`   After status filter: ${data.length} rows`);
            }
        }
        
        if (config.config.urgencies && config.config.urgencies.length > 0) {
            const checkedUrgencies = config.config.urgencies.filter(u => u.checked).map(u => u.value);
            console.log(`   Urgency filters (${checkedUrgencies.length}):`, checkedUrgencies);
            if (checkedUrgencies.length > 0) {
                data = data.filter(row => checkedUrgencies.includes(row.urgency));
                console.log(`   After urgency filter: ${data.length} rows`);
            }
        }
        
        console.log(`   Final data rows: ${data.length}`);
        
        // Determine which columns to include
        const checkedColumns = config.config.columns?.filter(col => col.checked).map(col => col.id) || [];
        
        // Build Excel data with selected columns
        const excelData = data.map(row => {
            const excelRow = {};
            
            const columnMap = {
                'poNumber': 'PO Number',
                'vendor': 'Vendor',
                'poType': 'PO Type',
                'poStatus': 'PO Status',
                'priority': 'Priority',
                'itemNumber': 'Item Number',
                'variety': 'Variety',
                'description': 'Description',
                'location': 'Location',
                'qtyOrdered': 'Qty Ordered',
                'qtyExpected': 'Qty Expected',
                'qtyReceived': 'Qty Received',
                'unreceived': 'Unreceived',
                'unit': 'Unit',
                'status': 'Item Status',
                'urgency': 'Urgency',
                'ead': 'EAD',
                'eta': 'ETA',
                'dateOrdered': 'Date Ordered',
                'itemNotes': 'Item Notes',
                'poNotes': 'PO Notes'
            };
            
            // If no columns specified, include all
            const columnsToInclude = checkedColumns.length > 0 ? checkedColumns : Object.keys(columnMap);
            
            columnsToInclude.forEach(colId => {
                const colName = columnMap[colId] || colId;
                let value = row[colId];
                
                // Format dates
                if (value instanceof Date) {
                    value = value.toISOString().split('T')[0];
                } else if (value === undefined || value === null) {
                    value = '';
                }
                
                excelRow[colName] = value;
            });
            
            return excelRow;
        });
        
        // Generate Excel file
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, autoReport.name.substring(0, 31)); // Sheet name max 31 chars
        
        const cacheFilePath = path.join(EXCEL_CACHE_DIR, autoReport.cacheFileName);
        XLSX.writeFile(workbook, cacheFilePath);
        
        // Update auto-report metadata
        autoReport.lastGenerated = new Date();
        autoReport.lastError = null;
        await autoReport.save();
        
        const stats = fs.statSync(cacheFilePath);
        console.log(`✅ Auto-report generated: ${autoReport.name} (${Math.round(stats.size / 1024)} KB, ${excelData.length} rows)`);
        
    } catch (error) {
        console.error(`❌ Error generating auto-report ${reportId}:`, error);
        
        try {
            const AutoReport = require('./models/AutoReport');
            const report = await AutoReport.findById(reportId);
            if (report) {
                report.lastError = error.message;
                await report.save();
            }
        } catch (saveError) {
            console.error('Error saving error state:', saveError);
        }
    }
}

// Generate all active auto-reports
async function generateAllAutoReports() {
    try {
        const AutoReport = require('./models/AutoReport');
        const activeReports = await AutoReport.find({ isActive: true });
        
        console.log(`🔄 Generating ${activeReports.length} active auto-reports...`);
        
        for (const report of activeReports) {
            await generateAutoReport(report._id);
        }
        
        console.log(`✅ Completed generating all auto-reports`);
    } catch (error) {
        console.error('❌ Error generating auto-reports:', error);
    }
}

// Generate all reports on startup
generateExcelCache();
generateUnreceivedItemsReport();
generateWaitingForApprovalReport();
generateAllAutoReports();

// Schedule automatic generation every hour
cron.schedule('0 * * * *', () => {
    console.log('⏰ Scheduled report generation triggered');
    generateExcelCache();
    generateUnreceivedItemsReport();
    generateWaitingForApprovalReport();
    generateAllAutoReports();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`📊 Excel auto-generation scheduled (every hour at :00)`);
});