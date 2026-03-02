const mongoose = require('mongoose');

async function checkLocalRecipes() {
    try {
        // Try connecting to local MongoDB
        await mongoose.connect('mongodb://localhost:27017/csv-import-test');
        console.log('✅ Connected to LOCAL MongoDB (csv-import-test)');
        
        const Recipe = require('./models/Recipe');
        
        // Check raw collection
        const rawRecipes = await mongoose.connection.db.collection('recipes').find().toArray();
        console.log(`📊 Total recipes in local database: ${rawRecipes.length}`);
        
        if (rawRecipes.length > 0) {
            console.log('\n📝 Sample recipe:');
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
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkLocalRecipes();
