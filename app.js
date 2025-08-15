// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const organicVendorRoutes = require('./routes/organicVendors');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Routes
app.use('/purchase-orders', purchaseOrderRoutes);
app.use('/organic-vendors', organicVendorRoutes);
app.use('/api', purchaseOrderRoutes); // API routes for AJAX calls
app.get('/', (req, res) => res.redirect('/purchase-orders'));
app.get('/upload', (req, res) => res.render('upload'));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});