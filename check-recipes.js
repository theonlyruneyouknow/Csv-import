require('dotenv').config();
const mongoose = require('mongoose');

async function checkRecipes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const Recipe = require('./models/Recipe');
        
        // Count total recipes
        const count = await Recipe.countDocuments();
        console.log(`\n📊 Total recipes (countDocuments): ${count}`);
        
        // Find all recipes
        const recipes = await Recipe.find();
        console.log(`📊 Total recipes (find): ${recipes.length}`);
        
        // Check raw collection
        const rawRecipes = await mongoose.connection.db.collection('recipes').find().toArray();
        console.log(`📊 Total recipes (raw collection): ${rawRecipes.length}`);
        
        if (rawRecipes.length > 0) {
            console.log('\n📝 Sample recipe (raw):');
            console.log(JSON.stringify(rawRecipes[0], null, 2));
            
            // Check which recipes have createdBy field
            const withCreatedBy = rawRecipes.filter(r => r.createdBy).length;
            const withoutCreatedBy = rawRecipes.filter(r => !r.createdBy).length;
            
            console.log(`\n✅ Recipes with createdBy: ${withCreatedBy}`);
            console.log(`❌ Recipes without createdBy: ${withoutCreatedBy}`);
        }
        
        await mongoose.connection.close();
        console.log('\n✅ Done');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkRecipes();
