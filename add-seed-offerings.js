// Script to add detailed seed offerings to all partners
// Run with: node add-seed-offerings.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

// Comprehensive crop lists - organized by category

const VEGETABLES = {
    fruiting: ['Tomatoes', 'Peppers', 'Eggplant', 'Cucumbers', 'Squash', 'Zucchini', 'Pumpkins', 'Melons', 'Watermelons'],
    leafy: ['Lettuce', 'Spinach', 'Kale', 'Chard', 'Arugula', 'Cabbage', 'Collards', 'Bok Choy', 'Mustard Greens'],
    root: ['Carrots', 'Beets', 'Radishes', 'Turnips', 'Parsnips', 'Rutabaga', 'Potatoes', 'Sweet Potatoes'],
    legumes: ['Beans', 'Peas', 'Lentils', 'Soybeans', 'Chickpeas', 'Fava Beans'],
    brassicas: ['Broccoli', 'Cauliflower', 'Brussels Sprouts', 'Kohlrabi'],
    alliums: ['Onions', 'Garlic', 'Leeks', 'Shallots', 'Scallions', 'Chives'],
    other: ['Corn', 'Asparagus', 'Celery', 'Artichokes', 'Okra', 'Fennel']
};

const FLOWERS = {
    annuals: ['Marigolds', 'Petunias', 'Zinnias', 'Cosmos', 'Impatiens', 'Begonias', 'Geraniums', 'Pansies', 'Violas'],
    sunflowers: ['Sunflowers'],
    cutting: ['Sweet Peas', 'Snapdragons', 'Lisianthus', 'Celosia', 'Stocks', 'Statice'],
    perennials: ['Black-Eyed Susan', 'Coneflowers', 'Delphinium', 'Lupine', 'Hollyhocks', 'Foxglove'],
    wildflowers: ['Poppies', 'Cornflowers', 'Forget-Me-Nots', 'Wild Asters', 'Clarkia'],
    ornamental: ['Dianthus', 'Alyssum', 'Lobelia', 'Portulaca', 'Verbena', 'Salvia', 'Ageratum'],
    specialty: ['Nasturtiums', 'Morning Glories', 'Four O\'Clocks', 'Sweet William']
};

const HERBS = {
    culinary: ['Basil', 'Parsley', 'Cilantro', 'Dill', 'Oregano', 'Thyme', 'Rosemary', 'Sage', 'Chives'],
    medicinal: ['Chamomile', 'Echinacea', 'Lavender', 'Lemon Balm', 'Mint', 'Catnip'],
    specialty: ['Fennel', 'Sorrel', 'Lovage', 'Marjoram', 'Tarragon', 'Anise', 'Borage']
};

// Flatten arrays
const ALL_VEGETABLES = Object.values(VEGETABLES).flat();
const ALL_FLOWERS = Object.values(FLOWERS).flat();
const ALL_HERBS = Object.values(HERBS).flat();

/**
 * Generate seed offerings based on partner's existing seedTypes
 */
function generateSeedOfferings(partner) {
    const offerings = {
        vegetables: [],
        flowers: [],
        herbs: []
    };

    const seedTypes = partner.seedTypes || [];
    
    // Determine what to add based on seedTypes
    const hasVegetable = seedTypes.includes('Vegetable Seeds');
    const hasFlower = seedTypes.some(type => type.includes('Flower'));
    const hasHerb = seedTypes.includes('Herb Seeds');
    const hasOrganic = seedTypes.includes('Organic Seeds');
    const hasHeirloom = seedTypes.includes('Heirloom Seeds');

    // Vegetables - if they offer vegetable seeds
    if (hasVegetable) {
        // Core vegetables (most companies have these)
        const coreVeggies = ['Tomatoes', 'Peppers', 'Lettuce', 'Carrots', 'Cucumbers', 'Beans', 'Peas', 'Radishes', 'Spinach'];
        offerings.vegetables.push(...coreVeggies);

        // Add variety based on company specialization
        const additionalVeggies = shuffleArray(ALL_VEGETABLES.filter(v => !coreVeggies.includes(v)))
            .slice(0, getRandomInt(10, 20));
        offerings.vegetables.push(...additionalVeggies);
    }

    // Flowers - if they offer flower seeds
    if (hasFlower) {
        // Core flowers
        const coreFlowers = ['Sunflowers', 'Marigolds', 'Zinnias', 'Cosmos', 'Petunias'];
        offerings.flowers.push(...coreFlowers);

        // Add variety
        const additionalFlowers = shuffleArray(ALL_FLOWERS.filter(f => !coreFlowers.includes(f)))
            .slice(0, getRandomInt(8, 15));
        offerings.flowers.push(...additionalFlowers);
    }

    // Herbs - if they offer herb seeds
    if (hasHerb) {
        // Core herbs
        const coreHerbs = ['Basil', 'Parsley', 'Cilantro', 'Dill', 'Oregano', 'Thyme'];
        offerings.herbs.push(...coreHerbs);

        // Add variety
        const additionalHerbs = shuffleArray(ALL_HERBS.filter(h => !coreHerbs.includes(h)))
            .slice(0, getRandomInt(5, 10));
        offerings.herbs.push(...additionalHerbs);
    }

    // Remove duplicates and sort
    offerings.vegetables = [...new Set(offerings.vegetables)].sort();
    offerings.flowers = [...new Set(offerings.flowers)].sort();
    offerings.herbs = [...new Set(offerings.herbs)].sort();

    return offerings;
}

// Utility functions
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addSeedOfferings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        console.log('🌱 Adding seed offerings to all partners...\n');

        const partners = await SeedPartner.find({});
        console.log(`📋 Found ${partners.length} partners\n`);

        let updatedCount = 0;
        let stats = {
            totalVegetables: 0,
            totalFlowers: 0,
            totalHerbs: 0
        };

        for (const partner of partners) {
            const offerings = generateSeedOfferings(partner);
            
            partner.seedOfferings = offerings;
            await partner.save();

            stats.totalVegetables += offerings.vegetables.length;
            stats.totalFlowers += offerings.flowers.length;
            stats.totalHerbs += offerings.herbs.length;

            console.log(`✅ ${partner.companyName}`);
            console.log(`   🥕 Vegetables: ${offerings.vegetables.length}`);
            console.log(`   🌸 Flowers: ${offerings.flowers.length}`);
            console.log(`   🌿 Herbs: ${offerings.herbs.length}`);
            console.log('');

            updatedCount++;
        }

        console.log('='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updatedCount} partners`);
        console.log(`📈 Average offerings per partner:`);
        console.log(`   🥕 Vegetables: ${Math.round(stats.totalVegetables / updatedCount)}`);
        console.log(`   🌸 Flowers: ${Math.round(stats.totalFlowers / updatedCount)}`);
        console.log(`   🌿 Herbs: ${Math.round(stats.totalHerbs / updatedCount)}`);

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addSeedOfferings();
