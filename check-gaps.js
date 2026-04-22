const mongoose = require('mongoose');
require('dotenv').config();

async function checkGaps() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const byState = {};
    const docs = await db.collection('usseedpartners').find({}).toArray();
    docs.forEach(d => { byState[d.stateCode] = (byState[d.stateCode] || 0) + 1; });

    console.log('States under 8 companies:\n');
    Object.entries(byState)
        .filter(([s, c]) => c < 8)
        .sort((a, b) => a[1] - b[1])
        .forEach(([s, c]) => console.log(`  ${s}: ${c} companies (need ${8 - c} more)`));

    console.log(`\nMissing states (0 companies):`);
    const allStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    const missing = allStates.filter(s => !byState[s]);
    if (missing.length > 0) {
        console.log(`  ${missing.join(', ')}`);
    } else {
        console.log('  None - all 50 states have coverage!');
    }

    await mongoose.disconnect();
}

checkGaps();
