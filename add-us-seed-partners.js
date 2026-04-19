// add-us-seed-partners.js
const mongoose = require('mongoose');
const USSeedPartner = require('./models/USSeedPartner');

mongoose.connect('mongodb://localhost:27017/tsc-purchasing')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');
        
        // US State Partner Data - One representative seed company per state
        const usStatePartners = [
            {
                companyName: 'Alabama Seed & Feed Supply',
                partnerCode: 'AL-SEED-001',
                state: 'Alabama',
                stateCode: 'AL',
                region: 'Southeast',
                website: 'https://www.seedsupplyco.com',
                city: 'Birmingham'
            },
            {
                companyName: 'Alaska Native Plant Seeds',
                partnerCode: 'AK-SEED-001',
                state: 'Alaska',
                stateCode: 'AK',
                region: 'Pacific',
                website: 'https://alaskanativeseed.com',
                city: 'Anchorage'
            },
            {
                companyName: 'Arizona Desert Seed Company',
                partnerCode: 'AZ-SEED-001',
                state: 'Arizona',
                stateCode: 'AZ',
                region: 'Southwest',
                website: 'https://www.desertusa.com/seeds',
                city: 'Phoenix'
            },
            {
                companyName: 'Arkansas Valley Seeds',
                partnerCode: 'AR-SEED-001',
                state: 'Arkansas',
                stateCode: 'AR',
                region: 'Southeast',
                website: 'https://www.arvalleyseeds.com',
                city: 'Little Rock'
            },
            {
                companyName: 'California Seed & Bulb Company',
                partnerCode: 'CA-SEED-001',
                state: 'California',
                stateCode: 'CA',
                region: 'West',
                website: 'https://www.reneesgarden.com',
                city: 'San Francisco'
            },
            {
                companyName: 'Colorado Rocky Mountain Seeds',
                partnerCode: 'CO-SEED-001',
                state: 'Colorado',
                stateCode: 'CO',
                region: 'Mountain',
                website: 'https://www.coloradoseeds.com',
                city: 'Denver'
            },
            {
                companyName: 'Connecticut Heirloom Seed Co.',
                partnerCode: 'CT-SEED-001',
                state: 'Connecticut',
                stateCode: 'CT',
                region: 'Northeast',
                website: 'https://www.ctheirloomseeds.com',
                city: 'Hartford'
            },
            {
                companyName: 'Delaware Coastal Seeds',
                partnerCode: 'DE-SEED-001',
                state: 'Delaware',
                stateCode: 'DE',
                region: 'Northeast',
                website: 'https://www.delawareseeds.com',
                city: 'Wilmington'
            },
            {
                companyName: 'Florida Tropical Seed Company',
                partnerCode: 'FL-SEED-001',
                state: 'Florida',
                stateCode: 'FL',
                region: 'Southeast',
                website: 'https://www.toptropicals.com',
                city: 'Miami'
            },
            {
                companyName: 'Georgia Seed Company',
                partnerCode: 'GA-SEED-001',
                state: 'Georgia',
                stateCode: 'GA',
                region: 'Southeast',
                website: 'https://www.seedsource.com',
                city: 'Atlanta'
            },
            {
                companyName: 'Hawaii Island Seeds',
                partnerCode: 'HI-SEED-001',
                state: 'Hawaii',
                stateCode: 'HI',
                region: 'Pacific',
                website: 'https://www.hawaiianseeds.com',
                city: 'Honolulu'
            },
            {
                companyName: 'Idaho Organic Seed Growers',
                partnerCode: 'ID-SEED-001',
                state: 'Idaho',
                stateCode: 'ID',
                region: 'Mountain',
                website: 'https://www.seedsavers.org',
                city: 'Boise'
            },
            {
                companyName: 'Illinois Prairie Seed Company',
                partnerCode: 'IL-SEED-001',
                state: 'Illinois',
                stateCode: 'IL',
                region: 'Midwest',
                website: 'https://www.prairiemoon.com',
                city: 'Chicago'
            },
            {
                companyName: 'Indiana Heritage Seeds',
                partnerCode: 'IN-SEED-001',
                state: 'Indiana',
                stateCode: 'IN',
                region: 'Midwest',
                website: 'https://www.indianaseeds.com',
                city: 'Indianapolis'
            },
            {
                companyName: 'Iowa Seed Company',
                partnerCode: 'IA-SEED-001',
                state: 'Iowa',
                stateCode: 'IA',
                region: 'Midwest',
                website: 'https://www.iowaseeds.com',
                city: 'Des Moines'
            },
            {
                companyName: 'Kansas Prairie Seed',
                partnerCode: 'KS-SEED-001',
                state: 'Kansas',
                stateCode: 'KS',
                region: 'Midwest',
                website: 'https://www.kansasprairie.com',
                city: 'Topeka'
            },
            {
                companyName: 'Kentucky Bluegrass Seed Co.',
                partnerCode: 'KY-SEED-001',
                state: 'Kentucky',
                stateCode: 'KY',
                region: 'Southeast',
                website: 'https://www.kyseeds.com',
                city: 'Louisville'
            },
            {
                companyName: 'Louisiana Gulf Coast Seeds',
                partnerCode: 'LA-SEED-001',
                state: 'Louisiana',
                stateCode: 'LA',
                region: 'Southeast',
                website: 'https://www.southernseeds.com',
                city: 'New Orleans'
            },
            {
                companyName: 'Maine Organic Seed Company',
                partnerCode: 'ME-SEED-001',
                state: 'Maine',
                stateCode: 'ME',
                region: 'Northeast',
                website: 'https://www.fedcoseeds.com',
                city: 'Portland'
            },
            {
                companyName: 'Maryland Eastern Shore Seeds',
                partnerCode: 'MD-SEED-001',
                state: 'Maryland',
                stateCode: 'MD',
                region: 'Northeast',
                website: 'https://www.southernexposure.com',
                city: 'Baltimore'
            },
            {
                companyName: 'Massachusetts Heritage Seed Co.',
                partnerCode: 'MA-SEED-001',
                state: 'Massachusetts',
                stateCode: 'MA',
                region: 'Northeast',
                website: 'https://www.johnnyseeds.com',
                city: 'Boston'
            },
            {
                companyName: 'Michigan Great Lakes Seeds',
                partnerCode: 'MI-SEED-001',
                state: 'Michigan',
                stateCode: 'MI',
                region: 'Midwest',
                website: 'https://www.michiganseeds.com',
                city: 'Detroit'
            },
            {
                companyName: 'Minnesota Cold Hardy Seeds',
                partnerCode: 'MN-SEED-001',
                state: 'Minnesota',
                stateCode: 'MN',
                region: 'Midwest',
                website: 'https://www.seedsavers.org',
                city: 'Minneapolis'
            },
            {
                companyName: 'Mississippi Delta Seed Company',
                partnerCode: 'MS-SEED-001',
                state: 'Mississippi',
                stateCode: 'MS',
                region: 'Southeast',
                website: 'https://www.deltaseeds.com',
                city: 'Jackson'
            },
            {
                companyName: 'Missouri Heartland Seeds',
                partnerCode: 'MO-SEED-001',
                state: 'Missouri',
                stateCode: 'MO',
                region: 'Midwest',
                website: 'https://www.bakersnursery.com',
                city: 'Kansas City'
            },
            {
                companyName: 'Montana Mountain Seeds',
                partnerCode: 'MT-SEED-001',
                state: 'Montana',
                stateCode: 'MT',
                region: 'Mountain',
                website: 'https://www.montanaseeds.com',
                city: 'Billings'
            },
            {
                companyName: 'Nebraska Plains Seed Company',
                partnerCode: 'NE-SEED-001',
                state: 'Nebraska',
                stateCode: 'NE',
                region: 'Midwest',
                website: 'https://www.stockseed.com',
                city: 'Omaha'
            },
            {
                companyName: 'Nevada Desert Seed Supply',
                partnerCode: 'NV-SEED-001',
                state: 'Nevada',
                stateCode: 'NV',
                region: 'West',
                website: 'https://www.greatbasinseeds.com',
                city: 'Las Vegas'
            },
            {
                companyName: 'New Hampshire Organic Seeds',
                partnerCode: 'NH-SEED-001',
                state: 'New Hampshire',
                stateCode: 'NH',
                region: 'Northeast',
                website: 'https://www.highmowingseeds.com',
                city: 'Concord'
            },
            {
                companyName: 'New Jersey Garden State Seeds',
                partnerCode: 'NJ-SEED-001',
                state: 'New Jersey',
                stateCode: 'NJ',
                region: 'Northeast',
                website: 'https://www.njseeds.com',
                city: 'Newark'
            },
            {
                companyName: 'New Mexico Adobe Seeds',
                partnerCode: 'NM-SEED-001',
                state: 'New Mexico',
                stateCode: 'NM',
                region: 'Southwest',
                website: 'https://www.nativeseeds.org',
                city: 'Santa Fe'
            },
            {
                companyName: 'New York Hudson Valley Seeds',
                partnerCode: 'NY-SEED-001',
                state: 'New York',
                stateCode: 'NY',
                region: 'Northeast',
                website: 'https://www.hudsonvalleyseed.com',
                city: 'New York'
            },
            {
                companyName: 'North Carolina Southern Seed Company',
                partnerCode: 'NC-SEED-001',
                state: 'North Carolina',
                stateCode: 'NC',
                region: 'Southeast',
                website: 'https://www.seedsource.com',
                city: 'Raleigh'
            },
            {
                companyName: 'North Dakota Northern Plains Seeds',
                partnerCode: 'ND-SEED-001',
                state: 'North Dakota',
                stateCode: 'ND',
                region: 'Midwest',
                website: 'https://www.prairierestorations.com',
                city: 'Bismarck'
            },
            {
                companyName: 'Ohio Heritage Seed Company',
                partnerCode: 'OH-SEED-001',
                state: 'Ohio',
                stateCode: 'OH',
                region: 'Midwest',
                website: 'https://www.ohioheirlooms.com',
                city: 'Columbus'
            },
            {
                companyName: 'Oklahoma Red Earth Seeds',
                partnerCode: 'OK-SEED-001',
                state: 'Oklahoma',
                stateCode: 'OK',
                region: 'Southwest',
                website: 'https://www.okseeds.com',
                city: 'Oklahoma City'
            },
            {
                companyName: 'Oregon Adaptive Seeds',
                partnerCode: 'OR-SEED-001',
                state: 'Oregon',
                stateCode: 'OR',
                region: 'West',
                website: 'https://www.adaptiveseeds.com',
                city: 'Portland'
            },
            {
                companyName: 'Pennsylvania Dutch Seed Company',
                partnerCode: 'PA-SEED-001',
                state: 'Pennsylvania',
                stateCode: 'PA',
                region: 'Northeast',
                website: 'https://www.landrethseeds.com',
                city: 'Philadelphia'
            },
            {
                companyName: 'Rhode Island Coastal Seeds',
                partnerCode: 'RI-SEED-001',
                state: 'Rhode Island',
                stateCode: 'RI',
                region: 'Northeast',
                website: 'https://www.rhodeislandseeds.com',
                city: 'Providence'
            },
            {
                companyName: 'South Carolina Lowcountry Seeds',
                partnerCode: 'SC-SEED-001',
                state: 'South Carolina',
                stateCode: 'SC',
                region: 'Southeast',
                website: 'https://www.southernexposure.com',
                city: 'Charleston'
            },
            {
                companyName: 'South Dakota Prairie Seed Co.',
                partnerCode: 'SD-SEED-001',
                state: 'South Dakota',
                stateCode: 'SD',
                region: 'Midwest',
                website: 'https://www.prairieseeds.com',
                city: 'Sioux Falls'
            },
            {
                companyName: 'Tennessee Valley Seed Company',
                partnerCode: 'TN-SEED-001',
                state: 'Tennessee',
                stateCode: 'TN',
                region: 'Southeast',
                website: 'https://www.southernseeds.com',
                city: 'Nashville'
            },
            {
                companyName: 'Texas Lone Star Seed Company',
                partnerCode: 'TX-SEED-001',
                state: 'Texas',
                stateCode: 'TX',
                region: 'Southwest',
                website: 'https://www.seedsource.com',
                city: 'Austin'
            },
            {
                companyName: 'Utah Mountain West Seeds',
                partnerCode: 'UT-SEED-001',
                state: 'Utah',
                stateCode: 'UT',
                region: 'Mountain',
                website: 'https://www.highaltitudegardens.com',
                city: 'Salt Lake City'
            },
            {
                companyName: 'Vermont Organic Seed Company',
                partnerCode: 'VT-SEED-001',
                state: 'Vermont',
                stateCode: 'VT',
                region: 'Northeast',
                website: 'https://www.highmowingseeds.com',
                city: 'Burlington'
            },
            {
                companyName: 'Virginia Heritage Seed Cooperative',
                partnerCode: 'VA-SEED-001',
                state: 'Virginia',
                stateCode: 'VA',
                region: 'Southeast',
                website: 'https://www.southernexposure.com',
                city: 'Richmond'
            },
            {
                companyName: 'Washington Pacific Northwest Seeds',
                partnerCode: 'WA-SEED-001',
                state: 'Washington',
                stateCode: 'WA',
                region: 'Pacific',
                website: 'https://www.territorialseed.com',
                city: 'Seattle'
            },
            {
                companyName: 'West Virginia Appalachian Seeds',
                partnerCode: 'WV-SEED-001',
                state: 'West Virginia',
                stateCode: 'WV',
                region: 'Southeast',
                website: 'https://www.appalachianheirlooms.com',
                city: 'Charleston'
            },
            {
                companyName: 'Wisconsin Badger State Seeds',
                partnerCode: 'WI-SEED-001',
                state: 'Wisconsin',
                stateCode: 'WI',
                region: 'Midwest',
                website: 'https://www.jungseed.com',
                city: 'Madison'
            },
            {
                companyName: 'Wyoming High Plains Seed Company',
                partnerCode: 'WY-SEED-001',
                state: 'Wyoming',
                stateCode: 'WY',
                region: 'Mountain',
                website: 'https://www.wyomingseeds.com',
                city: 'Cheyenne'
            }
        ];

        // Seed offerings lists - Same as international
        const vegetables = [
            'Tomatoes', 'Peppers', 'Cucumbers', 'Squash', 'Zucchini', 'Pumpkins',
            'Lettuce', 'Spinach', 'Kale', 'Swiss Chard', 'Arugula', 'Cabbage',
            'Broccoli', 'Cauliflower', 'Brussels Sprouts', 'Carrots', 'Beets',
            'Radishes', 'Turnips', 'Onions', 'Garlic', 'Leeks', 'Shallots',
            'Green Beans', 'Pole Beans', 'Lima Beans', 'Snap Peas', 'Snow Peas',
            'Sweet Corn', 'Eggplant', 'Okra', 'Asparagus', 'Artichokes',
            'Celery', 'Fennel', 'Kohlrabi', 'Bok Choy', 'Mustard Greens',
            'Collard Greens', 'Endive', 'Radicchio', 'Sweet Potatoes', 'Potatoes',
            'Jerusalem Artichokes', 'Parsnips', 'Rutabaga', 'Horseradish',
            'Tomatillos', 'Ground Cherries', 'Melons', 'Watermelons', 'Cantaloupes',
            'Honeydew Melons', 'Winter Squash', 'Butternut Squash', 'Acorn Squash',
            'Spaghetti Squash', 'Delicata Squash', 'Patty Pan Squash'
        ];

        const flowers = [
            'Sunflowers', 'Zinnias', 'Marigolds', 'Cosmos', 'Nasturtiums',
            'Sweet Peas', 'Morning Glories', 'Petunias', 'Pansies', 'Violas',
            'Snapdragons', 'Calendula', 'Poppies', 'Cornflowers', 'Delphiniums',
            'Lupines', 'Black-Eyed Susans', 'Coneflowers', 'Asters', 'Dahlias',
            'Gladiolus', 'Iris', 'Daffodils', 'Tulips', 'Crocuses', 'Hyacinths',
            'Alliums', 'Lilies', 'Peonies', 'Roses', 'Hollyhocks', 'Foxgloves',
            'Sweet William', 'Dianthus', 'Stock', 'Alyssum', 'Lobelia', 'Nemesia',
            'Salvia', 'Geraniums', 'Impatiens', 'Begonias', 'Coleus'
        ];

        const herbs = [
            'Basil', 'Oregano', 'Thyme', 'Rosemary', 'Sage', 'Mint', 'Parsley',
            'Cilantro', 'Dill', 'Chives', 'Fennel', 'Tarragon', 'Marjoram',
            'Lavender', 'Lemon Balm', 'Chamomile', 'Lemongrass', 'Bay Leaf',
            'Savory', 'Sorrel', 'Chervil', 'Anise Hyssop'
        ];

        // Function to get random items
        function getRandomItems(array, min, max) {
            const count = Math.floor(Math.random() * (max - min + 1)) + min;
            const shuffled = array.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, count);
        }

        console.log('📦 Adding US Seed Partners (50 states)...\n');

        let successCount = 0;
        let errorCount = 0;

        for (const stateData of usStatePartners) {
            try {
                const partner = new USSeedPartner({
                    companyName: stateData.companyName,
                    partnerCode: stateData.partnerCode,
                    state: stateData.state,
                    stateCode: stateData.stateCode,
                    region: stateData.region,
                    partnershipType: 'Domestic Supplier',
                    status: Math.random() > 0.3 ? 'Active' : 'Prospective',
                    priority: Math.floor(Math.random() * 5) + 1,
                    
                    // Business Details
                    businessDetails: {
                        website: stateData.website,
                        yearEstablished: 1950 + Math.floor(Math.random() * 70),
                        businessType: ['Family-Owned', 'LLC', 'Corporation'][Math.floor(Math.random() * 3)]
                    },
                    
                    // Address
                    address: {
                        city: stateData.city,
                        state: stateData.state,
                        zipCode: String(Math.floor(10000 + Math.random() * 90000))
                    },
                    
                    // Primary Contact
                    primaryContact: {
                        name: ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis'][Math.floor(Math.random() * 4)],
                        title: ['Owner', 'Manager', 'Director', 'Sales Manager'][Math.floor(Math.random() * 4)],
                        email: `info@${stateData.partnerCode.toLowerCase()}.com`,
                        phone: `${Math.floor(200 + Math.random() * 800)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`
                    },
                    
                    // Seed Specializations
                    seedTypes: getRandomItems(
                        ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Organic Seeds', 'Heirloom Seeds', 'Native Seeds'],
                        2,
                        4
                    ),
                    
                    // Detailed Seed Offerings
                    seedOfferings: {
                        vegetables: getRandomItems(vegetables, 12, 25),
                        flowers: getRandomItems(flowers, 5, 15),
                        herbs: getRandomItems(herbs, 4, 12)
                    },
                    
                    // Metadata
                    createdBy: 'System',
                    isActive: true
                });

                await partner.save();
                successCount++;
                console.log(`✅ ${stateData.stateCode}: ${stateData.companyName}`);
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error adding ${stateData.state}:`, error.message);
            }
        }

        console.log(`\n🎉 Complete! Added ${successCount} US state partners`);
        if (errorCount > 0) {
            console.log(`⚠️  ${errorCount} errors occurred`);
        }
        
        console.log('\n📊 Summary:');
        const allPartners = await USSeedPartner.find({});
        console.log(`   Total US Partners: ${allPartners.length}`);
        console.log(`   Active: ${allPartners.filter(p => p.status === 'Active').length}`);
        console.log(`   With Websites: ${allPartners.filter(p => p.businessDetails?.website).length}`);
        
        // Calculate average seed offerings
        const avgVeg = allPartners.reduce((sum, p) => sum + (p.seedOfferings?.vegetables?.length || 0), 0) / allPartners.length;
        const avgFlowers = allPartners.reduce((sum, p) => sum + (p.seedOfferings?.flowers?.length || 0), 0) / allPartners.length;
        const avgHerbs = allPartners.reduce((sum, p) => sum + (p.seedOfferings?.herbs?.length || 0), 0) / allPartners.length;
        
        console.log(`\n🌱 Seed Catalog Stats:`);
        console.log(`   Avg Vegetables per partner: ${avgVeg.toFixed(1)}`);
        console.log(`   Avg Flowers per partner: ${avgFlowers.toFixed(1)}`);
        console.log(`   Avg Herbs per partner: ${avgHerbs.toFixed(1)}`);
        
        mongoose.connection.close();
        
    })
    .catch(error => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });
