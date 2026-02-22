const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const GroceryItem = require('../models/GroceryItem');
const FoodCategory = require('../models/FoodCategory');
const FoodPrice = require('../models/FoodPrice');
const { ensureAuthenticated } = require('../middleware/auth');

// Middleware to check if user has access to grocery module
const ensureGroceryAccess = (req, res, next) => {
    // Allow admin and manager roles automatic access
    if (req.user.role === 'admin' || req.user.role === 'manager') {
        return next();
    }
    
    // Otherwise check permission
    if (!req.user.permissions.accessGroceryPrices) {
        return res.status(403).render('error', { 
            message: 'Access denied. You do not have permission to access Grocery Price Comparison.' 
        });
    }
    next();
};

// ===== DASHBOARD =====
router.get('/dashboard', ensureGroceryAccess, async (req, res) => {
    try {
        const [stores, items, recentPrices, categories, stats] = await Promise.all([
            // User's stores
            Store.find({ user: req.user._id, isActive: true })
                .sort({ isFavorite: -1, name: 1 })
                .limit(10),
            
            // User's high priority items
            GroceryItem.find({ user: req.user._id, priority: 'high', isActive: true })
                .populate('category')
                .sort({ name: 1 })
                .limit(10),
            
            // Recent price updates
            FoodPrice.find({ user: req.user._id })
                .populate('item')
                .populate('store')
                .sort({ priceDate: -1 })
                .limit(10),
            
            // Categories count
            FoodCategory.find({ $or: [{ user: req.user._id }, { user: null }], isActive: true })
                .sort({ order: 1, name: 1 }),
            
            // Statistics
            Promise.all([
                Store.countDocuments({ user: req.user._id, isActive: true }),
                GroceryItem.countDocuments({ user: req.user._id, isActive: true }),
                FoodPrice.countDocuments({ user: req.user._id }),
                FoodPrice.find({ user: req.user._id, isOnSale: true })
                    .populate('item')
                    .populate('store')
                    .sort({ priceDate: -1 })
                    .limit(5)
            ])
        ]);

        const [storeCount, itemCount, priceCount, activeSales] = stats;

        res.render('grocery-dashboard', {
            user: req.user,
            stores,
            items,
            recentPrices,
            categories,
            activeSales,
            stats: {
                storeCount,
                itemCount,
                priceCount
            },
            title: 'Grocery Price Comparison'
        });
    } catch (error) {
        console.error('Error loading grocery dashboard:', error);
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
});

// ===== STORES =====
router.get('/stores/list', ensureGroceryAccess, async (req, res) => {
    try {
        const stores = await Store.find({ user: req.user._id, isActive: true })
            .select('name chain location.city')
            .sort({ name: 1 });
        
        res.json({ stores });
    } catch (error) {
        console.error('Error loading stores:', error);
        res.status(500).json({ error: 'Error loading stores' });
    }
});

router.get('/stores', ensureGroceryAccess, async (req, res) => {
    try {
        const stores = await Store.find({ user: req.user._id })
            .sort({ isFavorite: -1, name: 1 });
        
        res.render('grocery-stores', {
            user: req.user,
            stores,
            title: 'My Stores'
        });
    } catch (error) {
        console.error('Error loading stores:', error);
        res.status(500).render('error', { message: 'Error loading stores' });
    }
});

router.get('/stores/new', ensureGroceryAccess, (req, res) => {
    res.render('grocery-store-form', {
        user: req.user,
        store: null,
        title: 'Add Store'
    });
});

router.post('/stores', ensureGroceryAccess, async (req, res) => {
    try {
        const storeData = {
            ...req.body,
            user: req.user._id,
            location: {
                address: req.body.address,
                city: req.body.city,
                state: req.body.state,
                zipCode: req.body.zipCode
            },
            contact: {
                phone: req.body.phone,
                website: req.body.website
            }
        };

        const store = new Store(storeData);
        await store.save();

        res.json({ success: true, store });
    } catch (error) {
        console.error('Error creating store:', error);
        res.status(500).json({ error: 'Error creating store' });
    }
});

router.get('/stores/:id/edit', ensureGroceryAccess, async (req, res) => {
    try {
        const store = await Store.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!store) {
            return res.status(404).render('error', { message: 'Store not found' });
        }

        res.render('grocery-store-form', {
            user: req.user,
            store,
            title: 'Edit Store'
        });
    } catch (error) {
        console.error('Error loading store:', error);
        res.status(500).render('error', { message: 'Error loading store' });
    }
});

router.put('/stores/:id', ensureGroceryAccess, async (req, res) => {
    try {
        const storeData = {
            ...req.body,
            location: {
                address: req.body.address,
                city: req.body.city,
                state: req.body.state,
                zipCode: req.body.zipCode
            },
            contact: {
                phone: req.body.phone,
                website: req.body.website
            }
        };

        const store = await Store.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            storeData,
            { new: true, runValidators: true }
        );

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json({ success: true, store });
    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({ error: 'Error updating store' });
    }
});

router.delete('/stores/:id', ensureGroceryAccess, async (req, res) => {
    try {
        const store = await Store.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // Also delete associated prices
        await FoodPrice.deleteMany({ store: req.params.id, user: req.user._id });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting store:', error);
        res.status(500).json({ error: 'Error deleting store' });
    }
});

// ===== ITEMS =====
router.get('/items/list', ensureGroceryAccess, async (req, res) => {
    try {
        const items = await GroceryItem.find({ user: req.user._id, isActive: true })
            .populate('category')
            .populate('storeSKUs.store')
            .sort({ name: 1 });
        
        res.json({ items });
    } catch (error) {
        console.error('Error loading items:', error);
        res.status(500).json({ error: 'Error loading items' });
    }
});

router.get('/items', ensureGroceryAccess, async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = { user: req.user._id, isActive: true };
        
        if (category) {
            query.category = category;
        }
        
        let items;
        if (search) {
            items = await GroceryItem.find({
                ...query,
                $text: { $search: search }
            })
            .populate('category')
            .sort({ score: { $meta: 'textScore' } });
        } else {
            items = await GroceryItem.find(query)
                .populate('category')
                .sort({ name: 1 });
        }

        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }], 
            isActive: true 
        }).sort({ order: 1, name: 1 });

        res.render('grocery-items', {
            user: req.user,
            items,
            categories,
            selectedCategory: category,
            searchQuery: search,
            title: 'Grocery Items'
        });
    } catch (error) {
        console.error('Error loading items:', error);
        res.status(500).render('error', { message: 'Error loading items' });
    }
});

router.get('/items/new', ensureGroceryAccess, async (req, res) => {
    try {
        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }], 
            isActive: true 
        }).sort({ order: 1, name: 1 });

        res.render('grocery-item-form', {
            user: req.user,
            item: null,
            categories,
            title: 'Add Grocery Item'
        });
    } catch (error) {
        console.error('Error loading form:', error);
        res.status(500).render('error', { message: 'Error loading form' });
    }
});

router.post('/items', ensureGroceryAccess, async (req, res) => {
    try {
        const itemData = {
            ...req.body,
            user: req.user._id,
            size: {
                value: req.body.sizeValue,
                unit: req.body.sizeUnit
            }
        };

        // Handle image data (base64 or URL)
        if (req.body.imageData) {
            itemData.image = req.body.imageData;
        }

        const item = new GroceryItem(itemData);
        await item.save();

        res.json({ success: true, item });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ error: 'Error creating item' });
    }
});

// Create new category
router.post('/categories', ensureGroceryAccess, async (req, res) => {
    try {
        const categoryData = {
            ...req.body,
            user: req.user._id
        };

        const category = new FoodCategory(categoryData);
        await category.save();

        res.json({ success: true, category });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Error creating category' });
    }
});

router.get('/items/:id', ensureGroceryAccess, async (req, res) => {
    try {
        const item = await GroceryItem.findOne({ _id: req.params.id, user: req.user._id })
            .populate('category');
        
        if (!item) {
            return res.status(404).render('error', { message: 'Item not found' });
        }

        // Get price history across all stores
        const prices = await FoodPrice.find({ item: req.params.id, user: req.user._id })
            .populate('store')
            .sort({ priceDate: -1 });

        // Get current best price
        const bestPrice = await FoodPrice.getBestPrice(req.params.id);

        res.render('grocery-item-detail', {
            user: req.user,
            item,
            prices,
            bestPrice,
            title: item.displayName
        });
    } catch (error) {
        console.error('Error loading item:', error);
        res.status(500).render('error', { message: 'Error loading item' });
    }
});

router.delete('/items/:id', ensureGroceryAccess, async (req, res) => {
    try {
        const item = await GroceryItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Also delete associated prices
        await FoodPrice.deleteMany({ item: req.params.id, user: req.user._id });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Error deleting item' });
    }
});

// Update item details
router.put('/items/:id', ensureGroceryAccess, async (req, res) => {
    try {
        const updateData = {
            brandType: req.body.brandType,
            sku: req.body.sku,
            barcode: req.body.barcode,
            upc: req.body.upc,
            storeSKUs: req.body.storeSKUs || [],
            updatedAt: new Date()
        };

        const item = await GroceryItem.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            updateData,
            { new: true }
        );
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ success: true, item });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Error updating item' });
    }
});

// ===== PRICES =====
router.get('/prices/all', ensureGroceryAccess, async (req, res) => {
    try {
        const prices = await FoodPrice.find({ user: req.user._id })
            .select('item store price priceDate isOnSale regularPrice')
            .lean();
        
        // Convert ObjectIds to strings for easier comparison in frontend
        const formattedPrices = prices.map(p => ({
            ...p,
            item: p.item.toString(),
            store: p.store.toString()
        }));
        
        res.json({ prices: formattedPrices });
    } catch (error) {
        console.error('Error loading prices:', error);
        res.status(500).json({ error: 'Error loading prices' });
    }
});

router.get('/prices', ensureGroceryAccess, async (req, res) => {
    try {
        const prices = await FoodPrice.find({ user: req.user._id })
            .populate('item')
            .populate('store')
            .sort({ priceDate: -1 })
            .limit(100);

        res.render('grocery-prices', {
            user: req.user,
            prices,
            title: 'Price History'
        });
    } catch (error) {
        console.error('Error loading prices:', error);
        res.status(500).render('error', { message: 'Error loading prices' });
    }
});

router.post('/prices', ensureGroceryAccess, async (req, res) => {
    try {
        const priceData = {
            ...req.body,
            user: req.user._id,
            priceDate: req.body.priceDate || new Date()
        };

        const price = new FoodPrice(priceData);
        await price.save();

        res.json({ success: true, price });
    } catch (error) {
        console.error('Error adding price:', error);
        res.status(500).json({ error: 'Error adding price' });
    }
});

// Update price
router.put('/prices/:id', ensureGroceryAccess, async (req, res) => {
    try {
        const updateData = {
            price: req.body.price,
            isOnSale: req.body.isOnSale,
            regularPrice: req.body.regularPrice,
            priceDate: req.body.priceDate || new Date(),
            notes: req.body.notes
        };

        const price = await FoodPrice.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            updateData,
            { new: true }
        );
        
        if (!price) {
            return res.status(404).json({ error: 'Price not found' });
        }

        res.json({ success: true, price });
    } catch (error) {
        console.error('Error updating price:', error);
        res.status(500).json({ error: 'Error updating price' });
    }
});

// Delete price
router.delete('/prices/:id', ensureGroceryAccess, async (req, res) => {
    try {
        const price = await FoodPrice.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        
        if (!price) {
            return res.status(404).json({ error: 'Price not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting price:', error);
        res.status(500).json({ error: 'Error deleting price' });
    }
});

// ===== COMPARISON =====
router.get('/comparison', ensureGroceryAccess, async (req, res) => {
    try {
        const { items: itemIds } = req.query;
        
        let selectedItems = [];
        let comparisonData = [];

        if (itemIds) {
            const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
            selectedItems = await GroceryItem.find({ 
                _id: { $in: ids }, 
                user: req.user._id 
            }).populate('category');

            // Get latest prices for each item at each store
            const stores = await Store.find({ user: req.user._id, isActive: true });
            
            for (const item of selectedItems) {
                const itemPrices = [];
                for (const store of stores) {
                    const latestPrice = await FoodPrice.getLatestPrice(item._id, store._id);
                    itemPrices.push({
                        store,
                        price: latestPrice
                    });
                }
                comparisonData.push({
                    item,
                    prices: itemPrices
                });
            }
        }

        const allItems = await GroceryItem.find({ user: req.user._id, isActive: true })
            .populate('category')
            .sort({ name: 1 });

        res.render('grocery-comparison', {
            user: req.user,
            allItems,
            selectedItems,
            comparisonData,
            title: 'Price Comparison'
        });
    } catch (error) {
        console.error('Error loading comparison:', error);
        res.status(500).render('error', { message: 'Error loading comparison' });
    }
});

module.exports = router;
