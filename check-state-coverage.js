// Check coverage gaps and identify states needing more companies
const mongoose = require('mongoose');
require('dotenv').config();

const allStates = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

async function checkCoverage() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        const db = mongoose.connection.db;
        const collection = db.collection('usseedpartners');
        
        const allDocs = await collection.find({}, { projection: { stateCode: 1, companyName: 1 } }).toArray();
        
        const byState = {};
        allDocs.forEach(d => {
            byState[d.stateCode] = byState[d.stateCode] || [];
            byState[d.stateCode].push(d.companyName);
        });
        
        console.log('📊 CURRENT STATE COVERAGE:\n');
        console.log(`Total Companies: ${allDocs.length}`);
        console.log(`States Covered: ${Object.keys(byState).length}/50\n`);
        
        // Categorize states
        const zeroCompanies = [];
        const lowCoverage = []; // 1-2 companies
        const mediumCoverage = []; // 3-5 companies
        const goodCoverage = []; // 6+ companies
        
        Object.keys(allStates).forEach(code => {
            const count = byState[code]?.length || 0;
            if (count === 0) {
                zeroCompanies.push({ code, name: allStates[code], count });
            } else if (count <= 2) {
                lowCoverage.push({ code, name: allStates[code], count });
            } else if (count <= 5) {
                mediumCoverage.push({ code, name: allStates[code], count });
            } else {
                goodCoverage.push({ code, name: allStates[code], count });
            }
        });
        
        console.log('🔴 ZERO COMPANIES (Priority 1):');
        if (zeroCompanies.length === 0) {
            console.log('   None - All states have at least one company!\n');
        } else {
            zeroCompanies.forEach(s => console.log(`   ${s.code} - ${s.name}`));
            console.log('');
        }
        
        console.log('🟡 LOW COVERAGE (1-2 companies - Priority 2):');
        lowCoverage.forEach(s => console.log(`   ${s.code} - ${s.name} (${s.count})`));
        console.log('');
        
        console.log('🟢 MEDIUM COVERAGE (3-5 companies):');
        mediumCoverage.forEach(s => console.log(`   ${s.code} - ${s.name} (${s.count})`));
        console.log('');
        
        console.log('✅ GOOD COVERAGE (6+ companies):');
        goodCoverage.forEach(s => console.log(`   ${s.code} - ${s.name} (${s.count})`));
        console.log('');
        
        console.log('📋 SUMMARY:');
        console.log(`   Zero companies: ${zeroCompanies.length} states`);
        console.log(`   Low coverage (1-2): ${lowCoverage.length} states`);
        console.log(`   Medium coverage (3-5): ${mediumCoverage.length} states`);
        console.log(`   Good coverage (6+): ${goodCoverage.length} states\n`);
        
        console.log('🎯 NEXT STEPS:');
        console.log('   1. Add companies for zero-coverage states');
        console.log('   2. Boost low-coverage states to 3+ companies');
        console.log('   3. Optional: Enhance medium-coverage states\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkCoverage();
