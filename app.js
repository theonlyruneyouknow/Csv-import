// app.js
const express = require('express');
const mongoose = require('mongoose');
const purchaseOrderRoutes = require('./routes/purchaseOrders');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/purchase-orders');

mongoose.connect('mongodb://localhost:27017/purchase-orders');
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Routes
app.use('/purchase-orders', purchaseOrderRoutes);
app.get('/', (req, res) => res.redirect('/purchase-orders'));
app.get('/upload', (req, res) => res.render('upload'));

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});