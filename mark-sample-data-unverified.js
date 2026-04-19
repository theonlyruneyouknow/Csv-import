// Update US seed partners to mark as unverified sample data
const mongoose = require('mongoose');
require('dotenv').config();

async function markAsUnverified() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        const db = mongoose.connection.db;
        
        // Update all partners to remove websites and set verification to 0
        const result = await db.collection('usseedpartners').updateMany(
            {},
            {
                $set: {
                    'businessDetails.website': null,
                    'verifiedInformation.companyNameVerified.isVerified': false,
                    'verifiedInformation.addressVerified.isVerified': false,
                    'verifiedInformation.contactInfoVerified.isVerified': false,
                    'verifiedInformation.websiteVerified.isVerified': false,
                    'verifiedInformation.businessLicenseVerified.isVerified': false,
                    'verifiedInformation.seedOfferingsVerified.isVerified': false,
                    'verifiedInformation.overallVerificationScore': 0,
                    'notes': 'SAMPLE DATA - Requires verification and real contact information'
                }
            }
        );
        
        console.log(`✅ Updated ${result.modifiedCount} partners`);
        console.log('\n📝 Changes made:');
        console.log('   - Removed all websites (fictional URLs)');
        console.log('   - Set all verification scores to 0%');
        console.log('   - Marked all verification fields as false');
        console.log('   - Added note: "SAMPLE DATA - Requires verification"\n');
        
        // Verify the changes
        const sample = await db.collection('usseedpartners').findOne();
        console.log('📊 Sample partner after update:');
        console.log(`   Company: ${sample.companyName}`);
        console.log(`   City: ${sample.city}, ${sample.stateCode}`);
        console.log(`   Website: ${sample.businessDetails?.website || 'None'}`);
        console.log(`   Verification Score: ${sample.verifiedInformation?.overallVerificationScore}%`);
        console.log(`   Notes: ${sample.notes}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

markAsUnverified();
