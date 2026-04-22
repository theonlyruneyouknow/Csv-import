require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

async function migrateContactStructure() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('='.repeat(80));
        console.log('🔄 MIGRATING CONTACT INFORMATION TO NESTED STRUCTURE');
        console.log('='.repeat(80));

        // Find all US partners with top-level contact fields
        const partners = await SeedPartner.find({
            country: 'United States',
            email: { $exists: true }
        });

        console.log(`\nFound ${partners.length} partners with contact information to migrate\n`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const partner of partners) {
            try {
                // Prepare the update
                const updateData = {};

                // Migrate to primaryContact object
                if (partner.email || partner.phone || partner.contactPerson) {
                    updateData.primaryContact = {
                        name: partner.contactPerson || '',
                        email: partner.email || '',
                        phone: partner.phone || '',
                        preferredLanguage: partner.primaryContact?.preferredLanguage || 'English',
                        preferredContactMethod: partner.primaryContact?.preferredContactMethod || 'Email'
                    };
                }

                // Migrate to address object
                if (partner.address || partner.city || partner.state || partner.zipCode) {
                    updateData.address = {
                        street: partner.address || '',
                        city: partner.city || '',
                        state: partner.state || '',
                        stateCode: partner.stateCode || '',
                        postalCode: partner.zipCode || '',
                        country: partner.country || 'United States'
                    };
                }

                // Migrate to businessDetails object
                if (partner.website || partner.catalogUrl) {
                    // Handle businessDetails whether it's a Mongoose doc or plain object
                    const existingBusinessDetails = partner.businessDetails ?
                        (typeof partner.businessDetails.toObject === 'function' ?
                            partner.businessDetails.toObject() :
                            partner.businessDetails) : {};

                    updateData.businessDetails = {
                        ...existingBusinessDetails,
                        website: partner.website || existingBusinessDetails.website || '',
                        catalogUrl: partner.catalogUrl || '',
                        email: partner.email || ''
                    };
                }

                // Update the partner
                await SeedPartner.updateOne(
                    { _id: partner._id },
                    {
                        $set: {
                            ...updateData,
                            updatedAt: new Date()
                        }
                    }
                );

                console.log(`✅ ${partner.companyName.padEnd(50)} (${partner.partnerCode})`);
                console.log(`   Primary Contact: ${updateData.primaryContact?.name || 'N/A'}`);
                console.log(`   Email: ${updateData.primaryContact?.email || 'N/A'}`);
                console.log(`   Phone: ${updateData.primaryContact?.phone || 'N/A'}`);
                console.log(`   Address: ${updateData.address?.street || 'N/A'}, ${updateData.address?.city || 'N/A'}, ${updateData.address?.stateCode || 'N/A'} ${updateData.address?.postalCode || 'N/A'}`);
                console.log(`   Website: ${updateData.businessDetails?.website || 'N/A'}`);
                console.log(`   Catalog: ${updateData.businessDetails?.catalogUrl || 'N/A'}\n`);

                migratedCount++;

            } catch (error) {
                console.error(`❌ Error migrating ${partner.companyName}: ${error.message}`);
                errorCount++;
            }
        }

        console.log('='.repeat(80));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Successfully migrated: ${migratedCount}/${partners.length} partners`);
        console.log(`❌ Errors: ${errorCount}`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ MIGRATION COMPLETE!');
        console.log('='.repeat(80));
        console.log('\nContact information has been restructured to match the template:');
        console.log('  ✅ primaryContact.name (from contactPerson)');
        console.log('  ✅ primaryContact.email (from email)');
        console.log('  ✅ primaryContact.phone (from phone)');
        console.log('  ✅ address.street (from address)');
        console.log('  ✅ address.city (from city)');
        console.log('  ✅ address.postalCode (from zipCode)');
        console.log('  ✅ businessDetails.website (from website)');
        console.log('  ✅ businessDetails.catalogUrl (from catalogUrl)');
        console.log('\nThe partner detail pages will now display contact information correctly!');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

migrateContactStructure();
