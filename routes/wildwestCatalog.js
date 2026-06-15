// routes/wildwestCatalog.js - Wild West Seed Product Catalog
const express = require('express');
const router = express.Router();
const SeedProduct = require('../models/SeedProduct');
const { ensureAuthenticated, ensureApproved } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/wildwest-products';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
});

// ============================================
// PUBLIC CATALOG ROUTES
// ============================================

// Main catalog home
router.get('/', async (req, res) => {
    try {
        console.log('🌱 Loading Wild West Seed Catalog...');
        
        // Get featured products
        const featuredProducts = await SeedProduct.getFeaturedProducts(12);
        
        console.log(`\n📊 DEBUG - Featured Products Being Sent to Browser:`);
        featuredProducts.slice(0, 3).forEach(p => {
            const imgType = p.primaryImage?.includes('svg') ? '❌ SVG' : 
                           p.primaryImage?.includes('/uploads/') ? '✅ Local' : '❓ Other';
            console.log(`   ${p.productName}: ${imgType}`);
            console.log(`   Image: ${p.primaryImage?.substring(0, 80)}`);
        });
        console.log('\n');
        
        // Get counts by category
        const categoryCounts = await SeedProduct.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        
        const counts = {};
        categoryCounts.forEach(c => {
            counts[c._id] = c.count;
        });
        
        // Force no caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.render('wildwest-catalog-home', {
            featuredProducts,
            categoryCounts: counts,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error loading Wild West catalog:', error);
        res.status(500).send('Error loading catalog');
    }
});

// Category view - displays products in a category
router.get('/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const categoryMap = {
            'vegetables': 'Vegetable',
            'vegetable-seeds': 'Vegetable',
            'flowers': 'Flower',
            'flower-seeds': 'Flower',
            'herbs': 'Herb',
            'wildflower-mixes': 'Wildflower Mix',
            'wild-flower-mixes': 'Wildflower Mix'
        };
        
        const categoryName = categoryMap[category];
        if (!categoryName) {
            return res.status(404).send('Category not found');
        }
        
        console.log(`🌱 Loading ${categoryName} catalog...`);
        
        // Get filters from query
        const filters = {
            subcategory: req.query.subcategory,
            organic: req.query.organic === 'true',
            featured: req.query.featured === 'true',
            inStock: req.query.inStock === 'true' ? true : undefined
        };
        
        // Get products
        const products = await SeedProduct.getProductsByCategory(categoryName, filters);
        
        // Get unique subcategories for filtering
        const subcategories = await SeedProduct.distinct('subcategory', {
            category: categoryName,
            isActive: true
        });
        
        res.render('wildwest-catalog-category', {
            category: categoryName,
            categorySlug: category,
            products,
            subcategories: subcategories.filter(s => s).sort(),
            currentFilters: filters,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error loading category:', error);
        res.status(500).send('Error loading category');
    }
});

// Product detail view
router.get('/product/:slug', async (req, res) => {
    try {
        const product = await SeedProduct.findOne({
            slug: req.params.slug,
            isActive: true
        });
        
        if (!product) {
            return res.status(404).send('Product not found');
        }
        
        // Get related products (same subcategory)
        const relatedProducts = await SeedProduct.find({
            category: product.category,
            subcategory: product.subcategory,
            _id: { $ne: product._id },
            isActive: true
        }).limit(4);
        
        res.render('wildwest-product-detail', {
            product,
            relatedProducts,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error loading product:', error);
        res.status(500).send('Error loading product');
    }
});

// Search products
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        const category = req.query.category;
        
        if (!searchTerm) {
            return res.redirect('/wildwest');
        }
        
        console.log(`🔍 Searching for: "${searchTerm}"`);
        
        const products = await SeedProduct.searchProducts(searchTerm, category);
        
        res.render('wildwest-catalog-search', {
            searchTerm,
            category,
            products,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error searching products:', error);
        res.status(500).send('Error searching products');
    }
});

// ============================================
// ADMIN/MANAGEMENT ROUTES
// ============================================

// Admin dashboard
router.get('/admin', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        console.log('🔧 Loading Wild West Catalog Admin...');
        
        const filter = req.query.category || 'all';
        const searchTerm = req.query.search;
        
        let query = {};
        if (filter !== 'all') {
            query.category = filter;
        }
        if (searchTerm) {
            query.$or = [
                { productName: { $regex: searchTerm, $options: 'i' } },
                { scientificName: { $regex: searchTerm, $options: 'i' } },
                { subcategory: { $regex: searchTerm, $options: 'i' } }
            ];
        }
        
        const products = await SeedProduct.find(query)
            .sort({ category: 1, subcategory: 1, productName: 1 });
        
        const stats = {
            total: await SeedProduct.countDocuments({ isActive: true }),
            vegetables: await SeedProduct.countDocuments({ category: 'Vegetable', isActive: true }),
            flowers: await SeedProduct.countDocuments({ category: 'Flower', isActive: true }),
            herbs: await SeedProduct.countDocuments({ category: 'Herb', isActive: true }),
            wildflowers: await SeedProduct.countDocuments({ category: 'Wildflower Mix', isActive: true }),
            featured: await SeedProduct.countDocuments({ featured: true, isActive: true }),
            noImages: await SeedProduct.countDocuments({ 'images.0': { $exists: false }, isActive: true })
        };
        
        res.render('wildwest-catalog-admin', {
            products,
            stats,
            currentFilter: filter,
            searchTerm,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error loading admin:', error);
        res.status(500).send('Error loading admin');
    }
});

// New product form
router.get('/admin/new', ensureAuthenticated, ensureApproved, (req, res) => {
    res.render('wildwest-product-form', {
        product: null,
        isEdit: false,
        user: req.user
    });
});

// Edit product form
router.get('/admin/edit/:id', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const product = await SeedProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).send('Product not found');
        }
        
        res.render('wildwest-product-form', {
            product,
            isEdit: true,
            user: req.user
        });
        
    } catch (error) {
        console.error('❌ Error loading product:', error);
        res.status(500).send('Error loading product');
    }
});

// Create product
router.post('/admin/create', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const productData = {
            productName: req.body.productName,
            scientificName: req.body.scientificName,
            category: req.body.category,
            subcategory: req.body.subcategory,
            description: req.body.description,
            variety: req.body.variety,
            inStock: req.body.inStock === 'true',
            featured: req.body.featured === 'true',
            isActive: req.body.isActive === 'true',
            createdBy: req.user._id
        };
        
        const product = new SeedProduct(productData);
        await product.save();
        
        console.log(`✅ Created product: ${product.productName}`);
        res.redirect('/wildwest/admin');
        
    } catch (error) {
        console.error('❌ Error creating product:', error);
        res.status(500).send('Error creating product: ' + error.message);
    }
});

// Update product
router.post('/admin/update/:id', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const product = await SeedProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).send('Product not found');
        }
        
        // Update fields
        product.productName = req.body.productName;
        product.scientificName = req.body.scientificName;
        product.category = req.body.category;
        product.subcategory = req.body.subcategory;
        product.description = req.body.description;
        product.variety = req.body.variety;
        product.inStock = req.body.inStock === 'true';
        product.featured = req.body.featured === 'true';
        product.isActive = req.body.isActive === 'true';
        product.updatedBy = req.user._id;
        
        await product.save();
        
        console.log(`✅ Updated product: ${product.productName}`);
        res.redirect('/wildwest/admin');
        
    } catch (error) {
        console.error('❌ Error updating product:', error);
        res.status(500).send('Error updating product: ' + error.message);
    }
});

// Upload product image
router.post('/admin/:id/upload-image', ensureAuthenticated, ensureApproved, upload.single('image'), async (req, res) => {
    try {
        const product = await SeedProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file uploaded' });
        }
        
        const imageUrl = `/uploads/wildwest-products/${req.file.filename}`;
        
        product.images.push({
            url: imageUrl,
            caption: req.body.caption || '',
            isPrimary: product.images.length === 0,
            order: product.images.length
        });
        
        product.updatedBy = req.user._id;
        await product.save();
        
        console.log(`✅ Added image to product: ${product.productName}`);
        res.json({ success: true, imageUrl, product });
        
    } catch (error) {
        console.error('❌ Error uploading image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete product image
router.delete('/admin/:id/image/:imageIndex', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const product = await SeedProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        const imageIndex = parseInt(req.params.imageIndex);
        if (imageIndex < 0 || imageIndex >= product.images.length) {
            return res.status(400).json({ success: false, message: 'Invalid image index' });
        }
        
        product.images.splice(imageIndex, 1);
        product.updatedBy = req.user._id;
        await product.save();
        
        console.log(`✅ Removed image from product: ${product.productName}`);
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error deleting image:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete product
router.delete('/admin/:id', ensureAuthenticated, ensureApproved, async (req, res) => {
    try {
        const product = await SeedProduct.findByIdAndDelete(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        console.log(`✅ Deleted product: ${product.productName}`);
        res.json({ success: true });
        
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
