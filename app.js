// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const organicVendorRoutes = require('./routes/organicVendors');

console.log('🔄 Loading dropship routes...');
const dropshipRoutes = require('./routes/dropship');
console.log('✅ Dropship routes loaded successfully');

console.log('🔄 Loading dropship test routes...');
const dropshipTestRoutes = require('./routes/dropship-test');
console.log('✅ Dropship test routes loaded successfully');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csv-import-test');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/purchase-orders', purchaseOrderRoutes);
app.use('/organic-vendors', organicVendorRoutes);
app.use('/dropship', dropshipRoutes);
app.use('/dropship-test', dropshipTestRoutes);
app.use('/api', purchaseOrderRoutes); // API routes for AJAX calls
app.get('/', (req, res) => res.redirect('/purchase-orders'));
app.get('/upload', (req, res) => res.render('upload'));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});