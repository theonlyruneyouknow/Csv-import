// Add comprehensive US seed partners - 8-10 per state
const mongoose = require('mongoose');
require('dotenv').config();

const states = [
    { state: 'Alabama', stateCode: 'AL', region: 'Southeast' },
    { state: 'Alaska', stateCode: 'AK', region: 'Pacific' },
    { state: 'Arizona', stateCode: 'AZ', region: 'Southwest' },
    { state: 'Arkansas', stateCode: 'AR', region: 'Southeast' },
    { state: 'California', stateCode: 'CA', region: 'West' },
    { state: 'Colorado', stateCode: 'CO', region: 'Mountain' },
    { state: 'Connecticut', stateCode: 'CT', region: 'Northeast' },
    { state: 'Delaware', stateCode: 'DE', region: 'Northeast' },
    { state: 'Florida', stateCode: 'FL', region: 'Southeast' },
    { state: 'Georgia', stateCode: 'GA', region: 'Southeast' },
    { state: 'Hawaii', stateCode: 'HI', region: 'Pacific' },
    { state: 'Idaho', stateCode: 'ID', region: 'Mountain' },
    { state: 'Illinois', stateCode: 'IL', region: 'Midwest' },
    { state: 'Indiana', stateCode: 'IN', region: 'Midwest' },
    { state: 'Iowa', stateCode: 'IA', region: 'Midwest' },
    { state: 'Kansas', stateCode: 'KS', region: 'Midwest' },
    { state: 'Kentucky', stateCode: 'KY', region: 'Southeast' },
    { state: 'Louisiana', stateCode: 'LA', region: 'Southeast' },
    { state: 'Maine', stateCode: 'ME', region: 'Northeast' },
    { state: 'Maryland', stateCode: 'MD', region: 'Northeast' },
    { state: 'Massachusetts', stateCode: 'MA', region: 'Northeast' },
    { state: 'Michigan', stateCode: 'MI', region: 'Midwest' },
    { state: 'Minnesota', stateCode: 'MN', region: 'Midwest' },
    { state: 'Mississippi', stateCode: 'MS', region: 'Southeast' },
    { state: 'Missouri', stateCode: 'MO', region: 'Midwest' },
    { state: 'Montana', stateCode: 'MT', region: 'Mountain' },
    { state: 'Nebraska', stateCode: 'NE', region: 'Midwest' },
    { state: 'Nevada', stateCode: 'NV', region: 'Mountain' },
    { state: 'New Hampshire', stateCode: 'NH', region: 'Northeast' },
    { state: 'New Jersey', stateCode: 'NJ', region: 'Northeast' },
    { state: 'New Mexico', stateCode: 'NM', region: 'Southwest' },
    { state: 'New York', stateCode: 'NY', region: 'Northeast' },
    { state: 'North Carolina', stateCode: 'NC', region: 'Southeast' },
    { state: 'North Dakota', stateCode: 'ND', region: 'Midwest' },
    { state: 'Ohio', stateCode: 'OH', region: 'Midwest' },
    { state: 'Oklahoma', stateCode: 'OK', region: 'Southwest' },
    { state: 'Oregon', stateCode: 'OR', region: 'West' },
    { state: 'Pennsylvania', stateCode: 'PA', region: 'Northeast' },
    { state: 'Rhode Island', stateCode: 'RI', region: 'Northeast' },
    { state: 'South Carolina', stateCode: 'SC', region: 'Southeast' },
    { state: 'South Dakota', stateCode: 'SD', region: 'Midwest' },
    { state: 'Tennessee', stateCode: 'TN', region: 'Southeast' },
    { state: 'Texas', stateCode: 'TX', region: 'Southwest' },
    { state: 'Utah', stateCode: 'UT', region: 'Mountain' },
    { state: 'Vermont', stateCode: 'VT', region: 'Northeast' },
    { state: 'Virginia', stateCode: 'VA', region: 'Southeast' },
    { state: 'Washington', stateCode: 'WA', region: 'West' },
    { state: 'West Virginia', stateCode: 'WV', region: 'Southeast' },
    { state: 'Wisconsin', stateCode: 'WI', region: 'Midwest' },
    { state: 'Wyoming', stateCode: 'WY', region: 'Mountain' }
];

const companyTypes = [
    'Seed Company', 'Seed Co.', 'Seeds', 'Seed Supply', 'Seed & Feed', 
    'Organic Seeds', 'Heritage Seeds', 'Heirloom Seed Co.', 'Seed Growers',
    'Seed Cooperative', 'Seed Farm', 'Seed Exchange', 'Garden Seeds',
    'Native Seeds', 'Specialty Seeds', 'Regional Seeds', 'Seed Merchants',
    'Seed Producers', 'Seed Distributors', 'Seed Savers'
];

const companyModifiers = [
    'Valley', 'Mountain', 'Prairie', 'Coastal', 'Heritage', 'Premium',
    'Organic', 'Natural', 'Traditional', 'Local', 'Family', 'Artisan',
    'Native', 'Regional', 'Quality', 'Sustainable', 'Heirloom', 'Legacy',
    'Pioneer', 'Homestead', 'Garden', 'Farm', 'Country', 'Community'
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

function generateCompanyName(state, index) {
    const templates = [
        `${state.state} ${companyTypes[index % companyTypes.length]}`,
        `${companyModifiers[index % companyModifiers.length]} ${state.state} ${companyTypes[(index + 3) % companyTypes.length]}`,
        `${state.state} ${companyModifiers[(index + 5) % companyModifiers.length]} ${companyTypes[(index + 7) % companyTypes.length]}`,
        `${companyModifiers[index % companyModifiers.length]} ${companyTypes[(index + 2) % companyTypes.length]} of ${state.state}`,
        `${state.stateCode} ${companyModifiers[(index + 8) % companyModifiers.length]} ${companyTypes[(index + 1) % companyTypes.length]}`
    ];
    
    return templates[index % templates.length];
}

async function addComprehensivePartners() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        const db = mongoose.connection.db;
        
        // Drop and recreate collection
        try {
            await db.collection('usseedpartners').drop();
            console.log('🗑️  Dropped existing collection\n');
        } catch (e) {
            console.log('ℹ️  Collection doesn\'t exist yet\n');
        }
        
        const documents = [];
        let totalActive = 0;
        let totalProspective = 0;
        
        // Generate 8-10 partners per state
        states.forEach((state, stateIndex) => {
            const partnersPerState = Math.floor(Math.random() * 3) + 8; // 8-10 partners per state
            
            for (let i = 0; i < partnersPerState; i++) {
                const companyName = generateCompanyName(state, i);
                const isActive = Math.random() > 0.35; // ~65% prospective, ~35% active
                
                if (isActive) totalActive++;
                else totalProspective++;
                
                const vegCount = Math.floor(Math.random() * 15) + 10; // 10-24 vegetables
                const flowerCount = Math.floor(Math.random() * 10) + 5; // 5-14 flowers
                const herbCount = Math.floor(Math.random() * 8) + 3; // 3-10 herbs
                
                documents.push({
                    companyName: companyName,
                    partnerCode: `US-${state.stateCode}-${String(i + 1).padStart(2, '0')}`,
                    partnershipType: 'Domestic Supplier',
                    status: isActive ? 'Active' : 'Prospective',
                    priority: Math.floor(Math.random() * 5) + 1,
                    state: state.state,
                    stateCode: state.stateCode,
                    region: state.region,
                    businessDetails: {
                        website: `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
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
                });
            }
        });
        
        console.log(`📦 Inserting ${documents.length} US seed partners...\n`);
        
        const result = await db.collection('usseedpartners').insertMany(documents);
        
        console.log(`✅ Successfully inserted ${result.insertedCount} partners!\n`);
        
        // Verify and show statistics
        const count = await db.collection('usseedpartners').countDocuments();
        
        console.log('📊 Final Statistics:');
        console.log(`   Total Partners: ${count}`);
        console.log(`   Active: ${totalActive}`);
        console.log(`   Prospective: ${totalProspective}`);
        console.log(`   Average per state: ${(count / 50).toFixed(1)}\n`);
        
        // Show sample by state
        console.log('📍 Sample Partners by State (first 3 states):');
        for (let i = 0; i < 3; i++) {
            const state = states[i];
            const statePartners = await db.collection('usseedpartners')
                .find({ stateCode: state.stateCode })
                .toArray();
            
            console.log(`\n   ${state.state} (${state.stateCode}): ${statePartners.length} partners`);
            statePartners.slice(0, 3).forEach((p, idx) => {
                console.log(`      ${idx + 1}. ${p.companyName} - ${p.status}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

addComprehensivePartners();
