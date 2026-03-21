// routes/food.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const FoodItem = require('../models/FoodItem');
const GroceryItem = require('../models/GroceryItem');
const FoodCategory = require('../models/FoodCategory');
const Recipe = require('../models/Recipe');
const MealPlan = require('../models/MealPlan');
let ShoppingList;
try {
  ShoppingList = require('../models/ShoppingList');
} catch (e) {
  console.log('⚠️ ShoppingList model not found, will create basic functionality');
  ShoppingList = null;
}

// No need for requireAuth middleware since authentication is handled at app level

// Root Food route - redirect to dashboard
router.get('/', (req, res) => {
    res.redirect('/food/dashboard');
});

// Food Dashboard - Main hub
router.get('/dashboard', async (req, res) => {
    try {
        // Get basic stats for the dashboard
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const stats = {
            foodItems: await GroceryItem.countDocuments({ user: req.user._id, isActive: true }),
            recipes: await Recipe.countDocuments({ createdBy: req.user._id }),
            mealPlans: await MealPlan.countDocuments({ createdBy: req.user._id }),
            pantryItems: await FoodItem.countDocuments({ quantity: { $gt: 0 } }),
            expiringSoon: await FoodItem.countDocuments({ 
                expirationDate: { 
                    $lte: sevenDaysFromNow
                } 
            }),
            lowStock: await FoodItem.countDocuments({ 
                quantity: { $lt: 5, $gt: 0 } 
            }),
            categories: await FoodCategory.countDocuments({ 
                $or: [{ user: req.user._id }, { user: null }],
                isActive: true 
            }),
            recentlyAdded: await GroceryItem.countDocuments({ 
                user: req.user._id,
                isActive: true,
                createdAt: { $gte: thirtyDaysAgo }
            })
        };

        res.render('food-dashboard', { 
            user: req.user,
            stats: stats 
        });
    } catch (error) {
        console.error('Error loading food dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Shopping Lists
router.get('/shopping', async (req, res) => {
    try {
        const lists = await ShoppingList.find({ createdBy: req.user._id })
            .sort({ createdAt: -1 });
        
        res.render('shopping-list', { 
            user: req.user,
            lists: lists
        });
    } catch (error) {
        console.error('Error loading shopping lists:', error);
        res.render('shopping-list', { 
            user: req.user,
            lists: []
        });
    }
});

router.get('/shopping/new', (req, res) => {
    res.render('shopping-new', { 
        user: req.user 
    });
});

router.post('/shopping', async (req, res) => {
    try {
        console.log('📝 Creating new shopping list:', req.body);
        
        if (ShoppingList) {
            // Create shopping list with items
            const listData = {
                title: req.body.title,
                description: req.body.description || '',
                targetStore: req.body.targetStore || '',
                shoppingDate: req.body.shoppingDate || null,
                status: req.body.status || 'Planning',
                items: [],
                createdBy: req.user._id
            };
            
            // Process items
            if (req.body.items && Array.isArray(req.body.items)) {
                listData.items = req.body.items.map(item => ({
                    foodItem: item.foodItemId || null,
                    quantity: parseFloat(item.quantity) || 1,
                    unit: item.unit || 'piece',
                    estimatedPrice: parseFloat(item.estimatedPrice) || 0,
                    priority: item.priority || 'Medium',
                    aisle: item.aisle || '',
                    notes: item.notes || '',
                    isPurchased: false
                }));
            }
            
            const shoppingList = new ShoppingList(listData);
            await shoppingList.save();
            
            res.redirect('/food/shopping?success=Shopping list created successfully!');
        } else {
            res.redirect('/food-dashboard?success=Shopping list created successfully!');
        }
    } catch (error) {
        console.error('Error creating shopping list:', error);
        res.status(500).send('Error creating shopping list: ' + error.message);
    }
});

// API endpoint to search items from master database
router.get('/api/items/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        
        if (query.length < 2) {
            return res.json([]);
        }
        
        // Search items by name or brand
        const items = await GroceryItem.find({
            user: req.user._id,
            isActive: true,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { brand: { $regex: query, $options: 'i' } }
            ]
        })
        .populate('category')
        .limit(10)
        .select('name brand category size tags priority purchaseFrequency')
        .lean();
        
        // Format response for autocomplete
        const suggestions = items.map(item => ({
            id: item._id,
            name: item.name,
            brand: item.brand || '',
            displayName: item.brand ? `${item.brand} ${item.name}` : item.name,
            category: item.category ? item.category.name : 'Other',
            categoryIcon: item.category ? item.category.icon : '🛒',
            size: item.size,
            priority: item.priority || 'medium',
            tags: item.tags || []
        }));
        
        res.json(suggestions);
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).json({ error: error.message });
    }
});

// Pantry Management
router.get('/pantry', (req, res) => {
    res.render('pantry-list', { 
        user: req.user 
    });
});

router.get('/pantry/add', (req, res) => {
    res.render('pantry-add', { 
        user: req.user 
    });
});

// Recipes
router.get('/recipes', (req, res) => {
    res.render('recipes-list', { 
        user: req.user 
    });
});

router.get('/recipes/new', (req, res) => {
    res.render('recipe-new', { 
        user: req.user 
    });
});

// Meal Plans
router.get('/meal-plans', (req, res) => {
    res.render('meal-plans-list', { 
        user: req.user 
    });
});

router.get('/meal-plans/new', (req, res) => {
    res.render('meal-plan-new', { 
        user: req.user 
    });
});

// ===== ITEMS DATABASE =====
// Browse suggested common items
router.get('/items/suggestions', async (req, res) => {
    try {
        // Load common food items
        const commonItemsPath = path.join(__dirname, '..', 'data', 'common-food-items.json');
        const commonItemsData = JSON.parse(fs.readFileSync(commonItemsPath, 'utf8'));
        
        // Get user's existing items to avoid duplicates
        const existingItems = await GroceryItem.find({ 
            user: req.user._id, 
            isActive: true 
        }).select('name');
        
        const existingNames = new Set(existingItems.map(item => item.name.toLowerCase()));
        
        // Get categories with mapping from names to IDs
        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }],
            isActive: true 
        });
        
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat.name] = cat._id;
        });
        
        // Organize items by category and mark which ones user already has
        const organizedItems = {};
        Object.keys(commonItemsData).forEach(categoryKey => {
            const items = commonItemsData[categoryKey].map(item => ({
                ...item,
                alreadyAdded: existingNames.has(item.name.toLowerCase()),
                categoryId: categoryMap[item.category] || null
            }));
            organizedItems[categoryKey] = items;
        });
        
        res.render('food-items-suggestions', {
            user: req.user,
            items: organizedItems,
            categories: categories
        });
    } catch (error) {
        console.error('Error loading suggestions:', error);
        res.status(500).send('Error loading suggestions: ' + error.message);
    }
});

// Quick-add item from suggestions
router.post('/items/quick-add', async (req, res) => {
    try {
        const { name, category, tags, priority, purchaseFrequency } = req.body;
        
        // Check if item already exists
        const existing = await GroceryItem.findOne({
            user: req.user._id,
            name: name,
            isActive: true
        });
        
        if (existing) {
            return res.json({ 
                success: false, 
                error: 'Item already exists in your database' 
            });
        }
        
        // If no category provided or empty, try to find or create a default one
        let categoryId = category;
        if (!categoryId || categoryId === '') {
            // Try to find or create an "Other" category
            let otherCategory = await FoodCategory.findOne({
                name: 'Other',
                isActive: true
            });
            
            if (!otherCategory) {
                // Create a default Other category
                otherCategory = new FoodCategory({
                    name: 'Other',
                    icon: '🍽️',
                    color: '#6c757d',
                    user: null, // System-wide category
                    isActive: true
                });
                await otherCategory.save();
            }
            categoryId = otherCategory._id;
        }
        
        // Create the item
        const itemData = {
            name: name,
            category: categoryId,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            priority: priority || 'medium',
            purchaseFrequency: purchaseFrequency || 'occasional',
            user: req.user._id,
            isActive: true
        };
        
        const item = new GroceryItem(itemData);
        await item.save();
        
        res.json({ 
            success: true, 
            message: 'Item added successfully',
            itemId: item._id
        });
    } catch (error) {
        console.error('Error quick-adding item:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// List all items
router.get('/items', async (req, res) => {
    try {
        const items = await GroceryItem.find({ user: req.user._id, isActive: true })
            .populate('category')
            .populate('parentItem', 'name brand')
            .sort({ name: 1 });
        
        // Fetch child items for each parent
        const itemsWithChildren = await Promise.all(items.map(async (item) => {
            const itemObj = item.toObject();
            if (item.isParent) {
                const children = await GroceryItem.find({
                    user: req.user._id,
                    parentItem: item._id,
                    isActive: true
                }).populate('category').sort({ name: 1 });
                itemObj.children = children;
            } else {
                itemObj.children = [];
            }
            return itemObj;
        }));
        
        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }],
            isActive: true 
        }).sort({ order: 1, name: 1 });
        
        res.render('food-items-list', {
            user: req.user,
            items: itemsWithChildren,
            categories: categories
        });
    } catch (error) {
        console.error('Error loading items:', error);
        res.status(500).send('Error loading items');
    }
});

// New item form
router.get('/items/new', async (req, res) => {
    try {
        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }],
            isActive: true 
        }).sort({ order: 1, name: 1 });
        
        // Get all items that could be parents (or all items for selection)
        const parentItems = await GroceryItem.find({ 
            user: req.user._id, 
            isActive: true 
        }).select('name brand').sort({ name: 1 });
        
        res.render('food-items-new', {
            user: req.user,
            categories: categories,
            parentItems: parentItems,
            isVariation: false,
            isDuplicate: false,
            preSelectedParent: null,
            duplicateFrom: null
        });
    } catch (error) {
        console.error('Error loading new item form:', error);
        res.status(500).send('Error loading form');
    }
});

// Add variation (new item with parent pre-selected)
router.get('/items/new-variation/:parentId', async (req, res) => {
    try {
        console.log('Add variation route hit for parent:', req.params.parentId);
        
        const parentItem = await GroceryItem.findOne({
            _id: req.params.parentId,
            user: req.user._id
        }).populate('category');

        console.log('Parent item found:', parentItem ? parentItem.name : 'not found');

        if (!parentItem) {
            return res.status(404).send('Parent item not found');
        }

        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }],
            isActive: true 
        }).sort({ order: 1, name: 1 });
        
        const parentItems = await GroceryItem.find({ 
            user: req.user._id, 
            isActive: true 
        }).select('name brand').sort({ name: 1 });
        
        console.log('Rendering template with isVariation=true');
        
        res.render('food-items-new', {
            user: req.user,
            categories: categories,
            parentItems: parentItems,
            preSelectedParent: parentItem,
            isVariation: true,
            isDuplicate: false,
            duplicateFrom: null
        });
    } catch (error) {
        console.error('Error loading add variation form:', error);
        res.status(500).send('Error loading form: ' + error.message);
    }
});

// Duplicate item
router.get('/items/:id/duplicate', async (req, res) => {
    try {
        const originalItem = await GroceryItem.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate('category');

        if (!originalItem) {
            return res.status(404).send('Item not found');
        }

        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }],
            isActive: true 
        }).sort({ order: 1, name: 1 });
        
        const parentItems = await GroceryItem.find({ 
            user: req.user._id, 
            isActive: true,
            _id: { $ne: req.params.id }
        }).select('name brand').sort({ name: 1 });
        
        res.render('food-items-new', {
            user: req.user,
            categories: categories,
            parentItems: parentItems,
            duplicateFrom: originalItem,
            isDuplicate: true,
            isVariation: false,
            preSelectedParent: null
        });
    } catch (error) {
        console.error('Error loading duplicate form:', error);
        res.status(500).send('Error loading form');
    }
});

// Create new item
router.post('/items', async (req, res) => {
    try {
        const itemData = {
            name: req.body.name,
            brand: req.body.brand || '',
            category: req.body.category,
            size: {
                value: req.body.sizeValue || null,
                unit: req.body.sizeUnit || null
            },
            description: req.body.description || '',
            tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
            purchaseFrequency: req.body.purchaseFrequency || 'occasional',
            priority: req.body.priority || 'medium',
            notes: req.body.notes || '',
            parentItem: req.body.parentItem || null,
            isParent: req.body.isParent === 'true' || req.body.isParent === true,
            variation: {
                type: req.body.variationType || null,
                value: req.body.variationValue || null
            },
            user: req.user._id,
            isActive: true
        };

        const item = new GroceryItem(itemData);
        await item.save();

        res.redirect('/food/items?success=Item added successfully');
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).send('Error creating item: ' + error.message);
    }
});

// Edit item form
router.get('/items/:id/edit', async (req, res) => {
    try {
        const item = await GroceryItem.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        }).populate('category').populate('parentItem', 'name brand');
        
        if (!item) {
            return res.status(404).send('Item not found');
        }

        const categories = await FoodCategory.find({ 
            $or: [{ user: req.user._id }, { user: null }],
            isActive: true 
        }).sort({ order: 1, name: 1 });
        
        // Get all items that could be parents (exclude current item and its children)
        const parentItems = await GroceryItem.find({ 
            user: req.user._id, 
            isActive: true,
            _id: { $ne: req.params.id },
            parentItem: { $ne: req.params.id }
        }).select('name brand').sort({ name: 1 });
        
        res.render('food-items-edit', {
            user: req.user,
            item: item,
            categories: categories,
            parentItems: parentItems
        });
    } catch (error) {
        console.error('Error loading item for edit:', error);
        res.status(500).send('Error loading item');
    }
});

// Update item
router.put('/items/:id', async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            brand: req.body.brand || '',
            category: req.body.category,
            size: {
                value: req.body.sizeValue || null,
                unit: req.body.sizeUnit || null
            },
            description: req.body.description || '',
            tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
            purchaseFrequency: req.body.purchaseFrequency || 'occasional',
            priority: req.body.priority || 'medium',
            notes: req.body.notes || '',
            parentItem: req.body.parentItem || null,
            isParent: req.body.isParent === 'true' || req.body.isParent === true,
            variation: {
                type: req.body.variationType || null,
                value: req.body.variationValue || null
            },
            updatedAt: Date.now()
        };

        await GroceryItem.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            updateData
        );
        res.json({ success: true, message: 'Item updated successfully' });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete item
router.delete('/items/:id', async (req, res) => {
    try {
        // Soft delete by setting isActive to false
        await GroceryItem.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { 
                isActive: false,
                updatedAt: Date.now()
            }
        );
        
        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new category
router.post('/categories', async (req, res) => {
    try {
        const categoryData = {
            name: req.body.name,
            icon: req.body.icon || '🛒',
            color: req.body.color || '#6c757d',
            user: req.user._id,
            isActive: true
        };

        const category = new FoodCategory(categoryData);
        await category.save();

        res.json({ success: true, category });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, error: 'Error creating category' });
    }
});

module.exports = router;
