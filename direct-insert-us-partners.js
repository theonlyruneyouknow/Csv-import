// Direct MongoDB insertion bypassing Mongoose model
const mongoose = require('mongoose');
require('dotenv').config();

const statePartners = [
    // ... (I'll include all 50 partners)
    { state: 'Alabama', stateCode: 'AL', companyName: 'Alabama Seed & Feed Supply', region: 'Southeast' },
    { state: 'Alaska', stateCode: 'AK', companyName: 'Alaska Native Plant Seeds', region: 'Pacific' },
    { state: 'Arizona', stateCode: 'AZ', companyName: 'Arizona Desert Seed Company', region: 'Southwest' },
    { state: 'Arkansas', stateCode: 'AR', companyName: 'Arkansas Valley Seeds', region: 'Southeast' },
    { state: 'California', stateCode: 'CA', companyName: 'California Seed & Bulb Company', region: 'West' },
    { state: 'Colorado', stateCode: 'CO', companyName: 'Colorado Rocky Mountain Seeds', region: 'Mountain' },
    { state: 'Connecticut', stateCode: 'CT', companyName: 'Connecticut Heirloom Seed Co.', region: 'Northeast' },
    { state: 'Delaware', stateCode: 'DE', companyName: 'Delaware Coastal Seeds', region: 'Northeast' },
    { state: 'Florida', stateCode: 'FL', companyName: 'Florida Tropical Seed Company', region: 'Southeast' },
    { state: 'Georgia', stateCode: 'GA', companyName: 'Georgia Seed Company', region: 'Southeast' },
    { state: 'Hawaii', stateCode: 'HI', companyName: 'Hawaii Island Seeds', region: 'Pacific' },
    { state: 'Idaho', stateCode: 'ID', companyName: 'Idaho Organic Seed Growers', region: 'Mountain' },
    { state: 'Illinois', stateCode: 'IL', companyName: 'Illinois Prairie Seed Company', region: 'Midwest' },
    { state: 'Indiana', stateCode: 'IN', companyName: 'Indiana Heritage Seeds', region: 'Midwest' },
    { state: 'Iowa', stateCode: 'IA', companyName: 'Iowa Seed Company', region: 'Midwest' },
    { state: 'Kansas', stateCode: 'KS', companyName: 'Kansas Prairie Seed', region: 'Midwest' },
    { state: 'Kentucky', stateCode: 'KY', companyName: 'Kentucky Bluegrass Seed Co.', region: 'Southeast' },
    { state: 'Louisiana', stateCode: 'LA', companyName: 'Louisiana Gulf Coast Seeds', region: 'Southeast' },
    { state: 'Maine', stateCode: 'ME', companyName: 'Maine Organic Seed Company', region: 'Northeast' },
    { state: 'Maryland', stateCode: 'MD', companyName: 'Maryland Eastern Shore Seeds', region: 'Northeast' },
    { state: 'Massachusetts', stateCode: 'MA', companyName: 'Massachusetts Heritage Seed Co.', region: 'Northeast' },
    { state: 'Michigan', stateCode: 'MI', companyName: 'Michigan Great Lakes Seeds', region: 'Midwest' },
    { state: 'Minnesota', stateCode: 'MN', companyName: 'Minnesota Cold Hardy Seeds', region: 'Midwest' },
    { state: 'Mississippi', stateCode: 'MS', companyName: 'Mississippi Delta Seed Company', region: 'Southeast' },
    { state: 'Missouri', stateCode: 'MO', companyName: 'Missouri Heartland Seeds', region: 'Midwest' },
    { state: 'Montana', stateCode: 'MT', companyName: 'Montana Mountain Seeds', region: 'Mountain' },
    { state: 'Nebraska', stateCode: 'NE', companyName: 'Nebraska Plains Seed Company', region: 'Midwest' },
    { state: 'Nevada', stateCode: 'NV', companyName: 'Nevada Desert Seed Supply', region: 'Mountain' },
    { state: 'New Hampshire', stateCode: 'NH', companyName: 'New Hampshire Organic Seeds', region: 'Northeast' },
    { state: 'New Jersey', stateCode: 'NJ', companyName: 'New Jersey Garden State Seeds', region: 'Northeast' },
    { state: 'New Mexico', stateCode: 'NM', companyName: 'New Mexico Adobe Seeds', region: 'Southwest' },
    { state: 'New York', stateCode: 'NY', companyName: 'New York Hudson Valley Seeds', region: 'Northeast' },
    { state: 'North Carolina', stateCode: 'NC', companyName: 'North Carolina Southern Seed Company', region: 'Southeast' },
    { state: 'North Dakota', stateCode: 'ND', companyName: 'North Dakota Northern Plains Seeds', region: 'Midwest' },
    { state: 'Ohio', stateCode: 'OH', companyName: 'Ohio Heritage Seed Company', region: 'Midwest' },
    { state: 'Oklahoma', stateCode: 'OK', companyName: 'Oklahoma Red Earth Seeds', region: 'Southwest' },
    { state: 'Oregon', stateCode: 'OR', companyName: 'Oregon Adaptive Seeds', region: 'West' },
    { state: 'Pennsylvania', stateCode: 'PA', companyName: 'Pennsylvania Dutch Seed Company', region: 'Northeast' },
    { state: 'Rhode Island', stateCode: 'RI', companyName: 'Rhode Island Coastal Seeds', region: 'Northeast' },
    { state: 'South Carolina', stateCode: 'SC', companyName: 'South Carolina Lowcountry Seeds', region: 'Southeast' },
    { state: 'South Dakota', stateCode: 'SD', companyName: 'South Dakota Prairie Seed Co.', region: 'Midwest' },
    { state: 'Tennessee', stateCode: 'TN', companyName: 'Tennessee Valley Seed Company', region: 'Southeast' },
    { state: 'Texas', stateCode: 'TX', companyName: 'Texas Lone Star Seed Company', region: 'Southwest' },
    { state: 'Utah', stateCode: 'UT', companyName: 'Utah Mountain West Seeds', region: 'Mountain' },
    { state: 'Vermont', stateCode: 'VT', companyName: 'Vermont Organic Seed Company', region: 'Northeast' },
    { state: 'Virginia', stateCode: 'VA', companyName: 'Virginia Heritage Seed Cooperative', region: 'Southeast' },
    { state: 'Washington', stateCode: 'WA', companyName: 'Washington Pacific Northwest Seeds', region: 'West' },
    { state: 'West Virginia', stateCode: 'WV', companyName: 'West Virginia Appalachian Seeds', region: 'Southeast' },
    { state: 'Wisconsin', stateCode: 'WI', companyName: 'Wisconsin Badger State Seeds', region: 'Midwest' },
    { state: 'Wyoming', stateCode: 'WY', companyName: 'Wyoming High Plains Seed Company', region: 'Mountain' }
];

const vegetables = [
    'Tomatoes', 'Peppers', 'Cucumbers', 'Squash', 'Zucchini', 'Beans', 'Peas', 'Lettuce', 
    'Spinach', 'Kale', 'Broccoli', 'Cauliflower', 'Cabbage', 'Carrots', 'Radishes', 
    'Beets', 'Onions', 'Garlic', 'Potatoes', 'Sweet Potatoes', 'Eggplant', 'Okra',
    'Corn', 'Pumpkins', 'Melons', 'Watermelon'
];

const flowers = [
    'Sunflowers', 'Marigolds', 'Zinnias', 'Cosmos', 'Nasturtiums', 'Sweet Peas', 
    'Petunias', 'Impatiens', 'Begonias', 'Dahlias', 'Lilies', 'Tulips', 'Daffodils',
    'Roses', 'Lavender', 'Poppies', 'Morning Glory'
];

const herbs = [
    'Basil', 'Cilantro', 'Parsley', 'Dill', 'Oregano', 'Thyme', 'Rosemary', 'Sage',
    'Mint', 'Chives', 'Fennel', 'Chamomile', 'Lemon Balm'
];

function randomSubset(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function insertDirect() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected\n');
        
        const db = mongoose.connection.db;
        
        // Drop collection if exists
        try {
            await db.collection('usseedpartners').drop();
            console.log('🗑️  Dropped existing collection\n');
        } catch (e) {
            console.log('ℹ️  Collection doesn\'t exist yet\n');
        }
        
        // Create full documents
        const documents = statePartners.map((partner, idx) => {
            const isActive = Math.random() > 0.3;
            const vegCount = Math.floor(Math.random() * 15) + 10;
            const flowerCount = Math.floor(Math.random() * 10) + 5;
            const herbCount = Math.floor(Math.random() * 8) + 3;
            
            return {
                companyName: partner.companyName,
                partnerCode: `US-${partner.stateCode}`,
                partnershipType: 'Domestic Supplier',
                status: isActive ? 'Active' : 'Prospective',
                priority: Math.floor(Math.random() * 5) + 1,
                state: partner.state,
                stateCode: partner.stateCode,
                region: partner.region,
                businessDetails: {
                    website: `https://www.${partner.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                    established: Math.floor(Math.random() * 50) + 1970,
                    certifications: []
                },
                seedOfferings: {
                    vegetables: randomSubset(vegetables, vegCount),
                    flowers: randomSubset(flowers, flowerCount),
                    herbs: randomSubset(herbs, herbCount)
                },
                lastUpdateDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
        });
        
        console.log(`📦 Inserting ${documents.length} partners directly...`);
        
        const result = await db.collection('usseedpartners').insertMany(documents);
        
        console.log(`✅ Successfully inserted ${result.insertedCount} partners!\n`);
        
        // Verify
        const count = await db.collection('usseedpartners').countDocuments();
        console.log(`📊 Verification: ${count} partners in collection`);
        
        const sample = await db.collection('usseedpartners').findOne();
        console.log(`📝 Sample: ${sample.companyName} (${sample.state})`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

insertDirect();
