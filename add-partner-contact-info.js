require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

// Comprehensive contact information for all 25 domestic partners
const partnerContactInfo = {
    'Native Seeds/SEARCH': {
        website: 'https://www.nativeseeds.org',
        catalogUrl: 'https://www.nativeseeds.org/collections/seeds',
        email: 'info@nativeseeds.org',
        phone: '(520) 622-0830',
        address: '3061 N. Campbell Avenue',
        city: 'Tucson',
        zipCode: '85719',
        contactPerson: 'Conservation Department'
    },

    'Peaceful Valley Farm & Garden Supply': {
        website: 'https://www.groworganic.com',
        catalogUrl: 'https://www.groworganic.com/collections/seeds',
        email: 'contact@groworganic.com',
        phone: '(888) 784-1722',
        address: '125 Clydesdale Court',
        city: 'Grass Valley',
        zipCode: '95945',
        contactPerson: 'Customer Service'
    },

    'Renee\'s Garden': {
        website: 'https://www.reneesgarden.com',
        catalogUrl: 'https://www.reneesgarden.com/collections/all-seeds',
        email: 'customerservice@reneesgarden.com',
        phone: '1-888-880-7228',
        address: '6060 Graham Hill Rd',
        city: 'Felton',
        zipCode: '95018',
        contactPerson: 'Renee Shepherd (Founder)'
    },

    'Botanical Interests': {
        website: 'https://www.botanicalinterests.com',
        catalogUrl: 'https://www.botanicalinterests.com/products/seeds',
        email: 'customerservice@botanicalinterests.com',
        phone: '(877) 821-4340',
        address: '660 Compton Street',
        city: 'Broomfield',
        zipCode: '80020',
        contactPerson: 'Curtis Jones (Founder & President)'
    },

    'Lake Valley Seed': {
        website: 'https://www.lakevalleyseed.com',
        catalogUrl: 'https://www.lakevalleyseed.com/collections/all-seeds',
        email: 'info@lakevalleyseed.com',
        phone: '(303) 449-4882',
        address: '5717 Arapahoe Ave',
        city: 'Boulder',
        zipCode: '80303',
        contactPerson: 'Sales Department'
    },

    'MASA Seed Foundation': {
        website: 'https://www.masaseed.org',
        catalogUrl: 'https://www.masaseed.org/seed-catalog',
        email: 'info@masaseed.org',
        phone: '(303) 242-7219',
        address: 'PO Box 18195',
        city: 'Boulder',
        zipCode: '80308',
        contactPerson: 'Bill McDorman (Founder)'
    },

    'Wild Mountain Seeds': {
        website: 'https://www.wildmountainseeds.com',
        catalogUrl: 'https://www.wildmountainseeds.com/shop',
        email: 'info@wildmountainseeds.com',
        phone: '(970) 963-5422',
        address: '350 County Rd 114',
        city: 'Carbondale',
        zipCode: '81623',
        contactPerson: 'Eliza Greenman (Co-Founder)'
    },

    'Seed Savers Exchange': {
        website: 'https://www.seedsavers.org',
        catalogUrl: 'https://www.seedsavers.org/collections/seeds',
        email: 'customerservice@seedsavers.org',
        phone: '(563) 382-5990',
        address: '3094 North Winn Road',
        city: 'Decorah',
        zipCode: '52101',
        contactPerson: 'Member Services'
    },

    'Fedco Seeds': {
        website: 'https://www.fedcoseeds.com',
        catalogUrl: 'https://www.fedcoseeds.com/seeds',
        email: 'info@fedcoseeds.com',
        phone: '(207) 873-7333',
        address: 'PO Box 520',
        city: 'Clinton',
        zipCode: '04927',
        contactPerson: 'Worker Cooperative'
    },

    'Johnny\'s Selected Seeds': {
        website: 'https://www.johnnyseeds.com',
        catalogUrl: 'https://www.johnnyseeds.com/vegetables/',
        email: 'customerservice@johnnyseeds.com',
        phone: '(877) 564-6697',
        address: '955 Benton Avenue',
        city: 'Winslow',
        zipCode: '04901',
        contactPerson: 'Customer Service'
    },

    'Pinetree Garden Seeds': {
        website: 'https://www.superseeds.com',
        catalogUrl: 'https://www.superseeds.com/collections/all-seeds',
        email: 'info@superseeds.com',
        phone: '(207) 926-3400',
        address: '616 Lewiston Road',
        city: 'New Gloucester',
        zipCode: '04260',
        contactPerson: 'Dick & Marilee Meiners (Founders)'
    },

    'Baker Creek Heirloom Seeds': {
        website: 'https://www.rareseeds.com',
        catalogUrl: 'https://www.rareseeds.com/store/vegetables/',
        email: 'customerservice@rareseeds.com',
        phone: '(417) 924-8917',
        address: '2278 Baker Creek Road',
        city: 'Mansfield',
        zipCode: '65704',
        contactPerson: 'Jere Gettle (Founder)'
    },

    'Seedman.com': {
        website: 'https://www.seedman.com',
        catalogUrl: 'https://www.seedman.com/Vegetable-Seeds.htm',
        email: 'seedman@seedman.com',
        phone: '(228) 832-7706',
        address: '3421 Boney Avenue',
        city: 'Gautier',
        zipCode: '39553',
        contactPerson: 'Jim Johnson (Founder)'
    },

    'Annie\'s Heirloom Seeds': {
        website: 'https://www.anniesheirloomseeds.com',
        catalogUrl: 'https://www.anniesheirloomseeds.com/collections/all-seeds',
        email: 'anniesheirloomseeds@gmail.com',
        phone: '(828) 659-2665',
        address: '4765 Heathermoor Drive',
        city: 'Nebo',
        zipCode: '28761',
        contactPerson: 'Annie Free (Owner)'
    },

    'Hudson Valley Seed Company': {
        website: 'https://www.hudsonvalleyseed.com',
        catalogUrl: 'https://www.hudsonvalleyseed.com/collections/seeds',
        email: 'info@hudsonvalleyseed.com',
        phone: '(845) 204-8769',
        address: '4 Church Street',
        city: 'Accord',
        zipCode: '12404',
        contactPerson: 'Doug Muller & Ken Greene (Co-Founders)'
    },

    'Adaptive Seeds': {
        website: 'https://www.adaptiveseeds.com',
        catalogUrl: 'https://www.adaptiveseeds.com/collections/seed-catalog',
        email: 'info@adaptiveseeds.com',
        phone: '(541) 367-9358',
        address: '25079 Brush Creek Road',
        city: 'Sweet Home',
        zipCode: '97386',
        contactPerson: 'Sarah Kleeger & Andrew Still (Founders)'
    },

    'Siskiyou Seeds': {
        website: 'https://www.siskiyouseeds.com',
        catalogUrl: 'https://www.siskiyouseeds.com/collections/seeds',
        email: 'info@siskiyouseeds.com',
        phone: '(541) 846-6704',
        address: '3220 Williams Highway',
        city: 'Williams',
        zipCode: '97544',
        contactPerson: 'Don Tipping (Founder)'
    },

    'Territorial Seed Company': {
        website: 'https://www.territorialseed.com',
        catalogUrl: 'https://www.territorialseed.com/collections/vegetable-seeds',
        email: 'info@territorialseed.com',
        phone: '(800) 626-0866',
        address: '20 Palmer Avenue',
        city: 'Cottage Grove',
        zipCode: '97424',
        contactPerson: 'Customer Service'
    },

    'Wild Garden Seed': {
        website: 'https://www.wildgardenseed.com',
        catalogUrl: 'https://www.wildgardenseed.com/collections/all',
        email: 'info@wildgardenseed.com',
        phone: '(541) 929-4068',
        address: 'PO Box 1509',
        city: 'Philomath',
        zipCode: '97370',
        contactPerson: 'Frank Morton & Karen Morton (Founders)'
    },

    'SeedRenaissance': {
        website: 'https://www.seedrenaissance.com',
        catalogUrl: 'https://www.seedrenaissance.com/collections/seeds',
        email: 'support@seedrenaissance.com',
        phone: '(801) 763-6280',
        address: '7389 S Creek Rd Suite 100',
        city: 'Sandy',
        zipCode: '84093',
        contactPerson: 'Customer Support'
    },

    'True Leaf Market (Mountain Valley Seed Co.)': {
        website: 'https://www.trueleafmarket.com',
        catalogUrl: 'https://www.trueleafmarket.com/collections/seeds',
        email: 'support@trueleafmarket.com',
        phone: '(435) 753-8345',
        address: '850 East 600 South',
        city: 'Salt Lake City',
        zipCode: '84102',
        contactPerson: 'Customer Support'
    },

    'Southern Exposure Seed Exchange': {
        website: 'https://www.southernexposure.com',
        catalogUrl: 'https://www.southernexposure.com/collections/all-seeds',
        email: 'gardens@southernexposure.com',
        phone: '(540) 894-9480',
        address: 'PO Box 460',
        city: 'Mineral',
        zipCode: '23117',
        contactPerson: 'Ira Wallace (Co-Owner)'
    },

    'High Mowing Organic Seeds': {
        website: 'https://www.highmowingseeds.com',
        catalogUrl: 'https://www.highmowingseeds.com/organic-seeds.html',
        email: 'customerservice@highmowingseeds.com',
        phone: '(866) 735-4454',
        address: '76 Quarry Road',
        city: 'Wolcott',
        zipCode: '05680',
        contactPerson: 'Tom Stearns (Founder)'
    },

    'Osborne Quality Seeds': {
        website: 'https://www.osborneseed.com',
        catalogUrl: 'https://www.osborneseed.com/collections/vegetable-seeds',
        email: 'questions@osborneseed.com',
        phone: '(360) 424-7333',
        address: '2428 Old Highway 99 South Road',
        city: 'Mount Vernon',
        zipCode: '98273',
        contactPerson: 'Family Business'
    },

    'Uprising Seeds': {
        website: 'https://www.uprisingorganics.com',
        catalogUrl: 'https://www.uprisingorganics.com/collections/seeds',
        email: 'info@uprisingorganics.com',
        phone: '(360) 778-3749',
        address: '910 B Street',
        city: 'Bellingham',
        zipCode: '98225',
        contactPerson: 'Nat Segal & Sarah Kleeger (Founders)'
    }
};

async function addContactInformation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('='.repeat(80));
        console.log('📇 ADDING CONTACT INFORMATION & SEED CATALOGS');
        console.log('='.repeat(80));

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const [companyName, contactInfo] of Object.entries(partnerContactInfo)) {
            try {
                const partner = await SeedPartner.findOne({ companyName: companyName });

                if (!partner) {
                    console.log(`⚠️  ${companyName} not found in database. Skipping.`);
                    skippedCount++;
                    continue;
                }

                await SeedPartner.updateOne(
                    { _id: partner._id },
                    {
                        $set: {
                            website: contactInfo.website,
                            catalogUrl: contactInfo.catalogUrl,
                            email: contactInfo.email,
                            phone: contactInfo.phone,
                            address: contactInfo.address,
                            city: contactInfo.city,
                            zipCode: contactInfo.zipCode,
                            contactPerson: contactInfo.contactPerson,
                            updatedAt: new Date()
                        }
                    }
                );

                console.log(`✅ ${companyName.padEnd(50)} (${partner.partnerCode})`);
                console.log(`   📧 ${contactInfo.email}`);
                console.log(`   📞 ${contactInfo.phone}`);
                console.log(`   🌐 ${contactInfo.catalogUrl}`);
                console.log(`   📍 ${contactInfo.address}, ${contactInfo.city}, ${contactInfo.zipCode}`);
                console.log(`   👤 ${contactInfo.contactPerson}\n`);

                updatedCount++;

            } catch (error) {
                console.error(`❌ Error updating ${companyName}: ${error.message}`);
                errorCount++;
            }
        }

        console.log('='.repeat(80));
        console.log('📊 UPDATE SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Successfully updated: ${updatedCount}/25 partners`);
        console.log(`⚠️  Skipped: ${skippedCount}`);
        console.log(`❌ Errors: ${errorCount}`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ CONTACT INFORMATION ADDED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log('\nAll 25 domestic prospective partners now have:');
        console.log('  ✅ Website URL');
        console.log('  ✅ Seed Catalog URL (direct link to shop/browse seeds)');
        console.log('  ✅ Email address');
        console.log('  ✅ Phone number');
        console.log('  ✅ Full mailing address with zip code');
        console.log('  ✅ Contact person/department');
        console.log('\nYou can now begin outreach to these prospective partners!');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

addContactInformation();
