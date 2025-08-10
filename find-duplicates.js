require('dotenv').config();
const mongoose = require('mongoose');
const OrganicVendor = require('./models/OrganicVendor');

async function findDuplicates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Get all vendors and check for duplicates
        const vendors = await OrganicVendor.find({}).sort({ vendorName: 1 });
        console.log(`\nFound ${vendors.length} vendors in database:`);

        const vendorNames = [];
        const duplicates = [];

        vendors.forEach(vendor => {
            console.log(`- ${vendor.vendorName} (ID: ${vendor.internalId})`);

            if (vendorNames.includes(vendor.vendorName.toUpperCase())) {
                duplicates.push(vendor.vendorName);
            } else {
                vendorNames.push(vendor.vendorName.toUpperCase());
            }
        });

        if (duplicates.length > 0) {
            console.log('\n🚨 Found duplicate vendor names:');
            duplicates.forEach(dup => console.log(`- ${dup}`));
        } else {
            console.log('\n✅ No duplicate vendor names found');
        }

        // Check for similar names that might be duplicates
        console.log('\n🔍 Checking for similar names:');
        const similarities = [];
        for (let i = 0; i < vendors.length; i++) {
            for (let j = i + 1; j < vendors.length; j++) {
                const name1 = vendors[i].vendorName.toLowerCase();
                const name2 = vendors[j].vendorName.toLowerCase();

                // Check for partial matches
                if (name1.includes(name2) || name2.includes(name1)) {
                    similarities.push({
                        vendor1: vendors[i].vendorName,
                        id1: vendors[i].internalId,
                        vendor2: vendors[j].vendorName,
                        id2: vendors[j].internalId
                    });
                }
            }
        }

        if (similarities.length > 0) {
            console.log('⚠️ Found similar vendor names that might be duplicates:');
            similarities.forEach(sim => {
                console.log(`- "${sim.vendor1}" (ID: ${sim.id1}) vs "${sim.vendor2}" (ID: ${sim.id2})`);
            });
        }

        mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

findDuplicates();
