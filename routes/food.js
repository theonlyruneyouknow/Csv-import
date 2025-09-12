// routes/food.js
const express = require('express');
const router = express.Router();
const FoodItem = require('../models/FoodItem');
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
            user: req.user,
            stats: stats 
        });
    } catch (error) {
        console.error('Error loading food dashboard:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// Shopping Lists
router.get('/shopping', (req, res) => {
    res.render('shopping-list', { 
        user: req.user 
    });
});

router.get('/shopping/new', (req, res) => {
    res.render('shopping-new', { 
        user: req.user 
    });
});

router.post('/shopping', async (req, res) => {
    try {
        console.log('📝 Creating new shopping list:', req.body);
        
        // For now, just redirect back with a success message
        // Later we'll save to database when ShoppingList model is ready
        res.redirect('/food-dashboard?success=Shopping list created successfully!');
    } catch (error) {
        console.error('Error creating shopping list:', error);
        res.status(500).send('Error creating shopping list: ' + error.message);
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

module.exports = router;
