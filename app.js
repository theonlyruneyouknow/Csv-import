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
const vendorRoutes = require('./routes/vendors');
const enhancedVendorRoutes = require('./routes/enhancedVendors');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const receivingRoutes = require('./routes/receiving');
const emailTemplateRoutes = require('./routes/emailTemplates');
const trackingRoutes = require('./routes/tracking'); // NEW: Self-managed tracking
const shipmentRoutes = require('./routes/shipments'); // NEW: Shipment management
const foodRoutes = require('./routes/food');
const storyRoutes = require('./routes/story');
const medicineRoutes = require('./routes/medicine');
const bulletinRoutes = require('./routes/bulletin');
const hymnRoutes = require('./routes/hymns');
const announcementRoutes = require('./routes/announcements');
const emailClientRoutes = require('./email-client/enhancedEmailRoutes');

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

// TEMPORARY: Test route without authentication for debugging upload
app.use('/test-upload', purchaseOrderRoutes);

app.use('/purchase-orders', ensureAuthenticated, ensureApproved, purchaseOrderRoutes);
app.use('/purchase-orders', ensureAuthenticated, ensureApproved, trackingRoutes); // NEW: Tracking routes
app.use('/shipments', ensureAuthenticated, ensureApproved, shipmentRoutes); // NEW: Shipment management
app.use('/organic-vendors', ensureAuthenticated, ensureApproved, organicVendorRoutes);
app.use('/vendors', ensureAuthenticated, ensureApproved, vendorRoutes);
app.use('/enhanced-vendors', ensureAuthenticated, ensureApproved, enhancedVendorRoutes);
app.use('/tasks', ensureAuthenticated, ensureApproved, taskRoutes);
app.use('/receiving', ensureAuthenticated, ensureApproved, receivingRoutes);
app.use('/email-templates', ensureAuthenticated, ensureApproved, emailTemplateRoutes);
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

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});