// Create default food categories
const mongoose = require('mongoose');
const FoodCategory = require('./models/FoodCategory');

mongoose.connect('mongodb://localhost/purchase-orders', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const defaultCategories = [
    { name: 'Produce', icon: '🥬', color: '#4caf50', order: 1 },
    { name: 'Dairy & Eggs', icon: '🥛', color: '#2196f3', order: 2 },
    { name: 'Meat & Seafood', icon: '🥩', color: '#f44336', order: 3 },
    { name: 'Bakery', icon: '🍞', color: '#ff9800', order: 4 },
    { name: 'Frozen Foods', icon: '❄️', color: '#03a9f4', order: 5 },
    { name: 'Pantry Staples', icon: '🥫', color: '#795548', order: 6 },
    { name: 'Snacks & Candy', icon: '🍿', color: '#ffc107', order: 7 },
    { name: 'Beverages', icon: '🥤', color: '#9c27b0', order: 8 },
    { name: 'Breakfast', icon: '🥞', color: '#ff5722', order: 9 },
    { name: 'Condiments & Sauces', icon: '🍯', color: '#8bc34a', order: 10 },
    { name: 'Pasta & Rice', icon: '🍝', color: '#cddc39', order: 11 },
    { name: 'Canned Goods', icon: '🥫', color: '#607d8b', order: 12 },
    { name: 'Baking', icon: '🎂', color: '#e91e63', order: 13 },
    { name: 'International', icon: '🌍', color: '#009688', order: 14 },
    { name: 'Pet Food', icon: '🐕', color: '#ff6b6b', order: 15 },
    { name: 'Health & Beauty', icon: '💄', color: '#673ab7', order: 16 },
    { name: 'Household', icon: '🧹', color: '#9e9e9e', order: 17 },
    { name: 'Baby Products', icon: '👶', color: '#ffeb3b', order: 18 },
    { name: 'Other', icon: '🛒', color: '#6c757d', order: 99 }
];

async function createCategories() {
    try {
        // Remove existing system categories (user = null)
        await FoodCategory.deleteMany({ user: null });
        
        // Create new categories
        const created = await FoodCategory.insertMany(
            defaultCategories.map(cat => ({
                ...cat,
                user: null, // null = system-wide category
                isActive: true
            }))
        );
        
        console.log(`✅ Created ${created.length} default food categories:`);
        created.forEach(cat => {
            console.log(`   ${cat.icon} ${cat.name}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createCategories();
