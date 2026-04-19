// Add comprehensive US seed partners with cities, references, and verification info
const mongoose = require('mongoose');
require('dotenv').config();

const statesWithCities = [
    { state: 'Alabama', stateCode: 'AL', region: 'Southeast', cities: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa', 'Auburn', 'Dothan', 'Decatur'] },
    { state: 'Alaska', stateCode: 'AK', region: 'Pacific', cities: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan', 'Wasilla', 'Palmer', 'Homer'] },
    { state: 'Arizona', stateCode: 'AZ', region: 'Southwest', cities: ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale', 'Flagstaff', 'Yuma', 'Sedona', 'Prescott'] },
    { state: 'Arkansas', stateCode: 'AR', region: 'Southeast', cities: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro', 'Conway', 'Rogers', 'Bentonville'] },
    { state: 'California', stateCode: 'CA', region: 'West', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Fresno', 'Bakersfield', 'Santa Cruz', 'Riverside', 'Napa', 'Salinas'] },
    { state: 'Colorado', stateCode: 'CO', region: 'Mountain', cities: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Boulder', 'Pueblo', 'Grand Junction', 'Aspen'] },
    { state: 'Connecticut', stateCode: 'CT', region: 'Northeast', cities: ['Hartford', 'New Haven', 'Stamford', 'Bridgeport', 'Waterbury', 'Norwich', 'Danbury', 'Greenwich'] },
    { state: 'Delaware', stateCode: 'DE', region: 'Northeast', cities: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna', 'Milford', 'Seaford', 'Georgetown'] },
    { state: 'Florida', stateCode: 'FL', region: 'Southeast', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee', 'Fort Myers', 'Gainesville', 'Sarasota', 'Naples', 'Pensacola'] },
    { state: 'Georgia', stateCode: 'GA', region: 'Southeast', cities: ['Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Macon', 'Athens', 'Albany', 'Valdosta'] },
    { state: 'Hawaii', stateCode: 'HI', region: 'Pacific', cities: ['Honolulu', 'Hilo', 'Kailua', 'Waipahu', 'Lahaina', 'Kona', 'Lihue', 'Waimea'] },
    { state: 'Idaho', stateCode: 'ID', region: 'Mountain', cities: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello', 'Coeur d\'Alene', 'Twin Falls', 'Lewiston'] },
    { state: 'Illinois', stateCode: 'IL', region: 'Midwest', cities: ['Chicago', 'Aurora', 'Naperville', 'Peoria', 'Rockford', 'Springfield', 'Champaign', 'Bloomington'] },
    { state: 'Indiana', stateCode: 'IN', region: 'Midwest', cities: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Bloomington', 'Terre Haute', 'Lafayette'] },
    { state: 'Iowa', stateCode: 'IA', region: 'Midwest', cities: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo', 'Ames', 'Council Bluffs'] },
    { state: 'Kansas', stateCode: 'KS', region: 'Midwest', cities: ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Olathe', 'Lawrence', 'Manhattan', 'Salina'] },
    { state: 'Kentucky', stateCode: 'KY', region: 'Southeast', cities: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Paducah', 'Frankfort', 'Richmond'] },
    { state: 'Louisiana', stateCode: 'LA', region: 'Southeast', cities: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Bossier City', 'Monroe', 'Alexandria'] },
    { state: 'Maine', stateCode: 'ME', region: 'Northeast', cities: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Augusta', 'Biddeford', 'Waterville'] },
    { state: 'Maryland', stateCode: 'MD', region: 'Northeast', cities: ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Annapolis', 'Salisbury', 'Hagerstown', 'Cumberland'] },
    { state: 'Massachusetts', stateCode: 'MA', region: 'Northeast', cities: ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton', 'Quincy', 'Amherst'] },
    { state: 'Michigan', stateCode: 'MI', region: 'Midwest', cities: ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Lansing', 'Kalamazoo', 'Traverse City', 'Marquette', 'Saginaw'] },
    { state: 'Minnesota', stateCode: 'MN', region: 'Midwest', cities: ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park', 'St. Cloud', 'Mankato'] },
    { state: 'Mississippi', stateCode: 'MS', region: 'Southeast', cities: ['Jackson', 'Gulfport', 'Biloxi', 'Hattiesburg', 'Meridian', 'Tupelo', 'Southaven', 'Vicksburg'] },
    { state: 'Missouri', stateCode: 'MO', region: 'Midwest', cities: ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Jefferson City', 'Joplin', 'St. Joseph'] },
    { state: 'Montana', stateCode: 'MT', region: 'Mountain', cities: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena', 'Kalispell', 'Whitefish'] },
    { state: 'Nebraska', stateCode: 'NE', region: 'Midwest', cities: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont', 'Norfolk', 'North Platte'] },
    { state: 'Nevada', stateCode: 'NV', region: 'Mountain', cities: ['Las Vegas', 'Henderson', 'Reno', 'Carson City', 'Sparks', 'Elko', 'Boulder City', 'Mesquite'] },
    { state: 'New Hampshire', stateCode: 'NH', region: 'Northeast', cities: ['Manchester', 'Nashua', 'Concord', 'Dover', 'Rochester', 'Keene', 'Portsmouth', 'Laconia'] },
    { state: 'New Jersey', stateCode: 'NJ', region: 'Northeast', cities: ['Newark', 'Jersey City', 'Paterson', 'Trenton', 'Princeton', 'Atlantic City', 'Camden', 'New Brunswick'] },
    { state: 'New Mexico', stateCode: 'NM', region: 'Southwest', cities: ['Albuquerque', 'Santa Fe', 'Las Cruces', 'Roswell', 'Farmington', 'Alamogordo', 'Taos', 'Silver City'] },
    { state: 'New York', stateCode: 'NY', region: 'Northeast', cities: ['New York', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Ithaca', 'Utica', 'Binghamton', 'Cooperstown'] },
    { state: 'North Carolina', stateCode: 'NC', region: 'Southeast', cities: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Asheville', 'Wilmington', 'Fayetteville'] },
    { state: 'North Dakota', stateCode: 'ND', region: 'Midwest', cities: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Dickinson', 'Mandan', 'Williston'] },
    { state: 'Ohio', stateCode: 'OH', region: 'Midwest', cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Canton', 'Youngstown'] },
    { state: 'Oklahoma', stateCode: 'OK', region: 'Southwest', cities: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Lawton', 'Stillwater', 'Enid'] },
    { state: 'Oregon', stateCode: 'OR', region: 'West', cities: ['Portland', 'Eugene', 'Salem', 'Bend', 'Corvallis', 'Ashland', 'Hood River', 'Grants Pass'] },
    { state: 'Pennsylvania', stateCode: 'PA', region: 'Northeast', cities: ['Philadelphia', 'Pittsburgh', 'Harrisburg', 'Lancaster', 'Erie', 'Scranton', 'Reading', 'Bethlehem'] },
    { state: 'Rhode Island', stateCode: 'RI', region: 'Northeast', cities: ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'Newport', 'Wakefield', 'Westerly', 'Bristol'] },
    { state: 'South Carolina', stateCode: 'SC', region: 'Southeast', cities: ['Columbia', 'Charleston', 'Greenville', 'Myrtle Beach', 'Spartanburg', 'Hilton Head', 'Rock Hill', 'Sumter'] },
    { state: 'South Dakota', stateCode: 'SD', region: 'Midwest', cities: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell', 'Yankton', 'Pierre'] },
    { state: 'Tennessee', stateCode: 'TN', region: 'Southeast', cities: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Jackson'] },
    { state: 'Texas', stateCode: 'TX', region: 'Southwest', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Corpus Christi', 'Lubbock', 'Tyler', 'Waco'] },
    { state: 'Utah', stateCode: 'UT', region: 'Mountain', cities: ['Salt Lake City', 'Provo', 'Ogden', 'St. George', 'Park City', 'Logan', 'Moab', 'Cedar City'] },
    { state: 'Vermont', stateCode: 'VT', region: 'Northeast', cities: ['Burlington', 'Montpelier', 'Rutland', 'Brattleboro', 'Stowe', 'Bennington', 'St. Albans', 'Middlebury'] },
    { state: 'Virginia', stateCode: 'VA', region: 'Southeast', cities: ['Virginia Beach', 'Richmond', 'Norfolk', 'Arlington', 'Charlottesville', 'Roanoke', 'Alexandria', 'Winchester'] },
    { state: 'Washington', stateCode: 'WA', region: 'West', cities: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellingham', 'Olympia', 'Wenatchee', 'Walla Walla'] },
    { state: 'West Virginia', stateCode: 'WV', region: 'Southeast', cities: ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling', 'Martinsburg', 'Beckley', 'Clarksburg'] },
    { state: 'Wisconsin', stateCode: 'WI', region: 'Midwest', cities: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Eau Claire', 'La Crosse'] },
    { state: 'Wyoming', stateCode: 'WY', region: 'Mountain', cities: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Jackson', 'Sheridan', 'Cody', 'Evanston'] }
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

const sourceSources = [
    { type: 'Company Website', reliability: 'High' },
    { type: 'USDA Database', reliability: 'High' },
    { type: 'State Agriculture Department', reliability: 'High' },
    { type: 'Industry Directory', reliability: 'Medium' },
    { type: 'Direct Contact', reliability: 'High' },
    { type: 'Online Research', reliability: 'Medium' },
    { type: 'LinkedIn', reliability: 'Medium' },
    { type: 'Better Business Bureau', reliability: 'High' }
];

function randomSubset(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function generateCompanyName(state, city, index) {
    const templates = [
        `${city} ${companyTypes[index % companyTypes.length]}`,
        `${companyModifiers[index % companyModifiers.length]} ${state.state} ${companyTypes[(index + 3) % companyTypes.length]}`,
        `${state.state} ${companyModifiers[(index + 5) % companyModifiers.length]} ${companyTypes[(index + 7) % companyTypes.length]}`,
        `${companyModifiers[index % companyModifiers.length]} ${companyTypes[(index + 2) % companyTypes.length]} of ${city}`,
        `${city} ${companyModifiers[(index + 8) % companyModifiers.length]} ${companyTypes[(index + 1) % companyTypes.length]}`
    ];
    
    return templates[index % templates.length];
}

function generateReferences(count) {
    const refs = [];
    const selectedSources = randomSubset(sourceSources, count);
    
    selectedSources.forEach(source => {
        refs.push({
            sourceType: source.type,
            sourceUrl: source.type === 'Company Website' ? 'https://www.example.com' : undefined,
            sourceDescription: `Information gathered from ${source.type}`,
            dateCollected: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date in last year
            reliability: source.reliability,
            notes: 'Verified during initial research'
        });
    });
    
    return refs;
}

function generateVerificationInfo() {
    const verificationLevels = Math.random();
    const isHighlyVerified = verificationLevels > 0.6;
    const isPartiallyVerified = verificationLevels > 0.3;
    
    const verification = {
        companyNameVerified: {
            isVerified: true, // Always verify company name
            verifiedDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
            verifiedBy: 'System',
            verificationMethod: 'Cross-referenced with state business registry'
        },
        addressVerified: {
            isVerified: isHighlyVerified,
            verifiedDate: isHighlyVerified ? new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000) : undefined,
            verifiedBy: isHighlyVerified ? 'Admin' : undefined,
            verificationMethod: isHighlyVerified ? 'USPS Address Verification' : undefined
        },
        contactInfoVerified: {
            isVerified: isPartiallyVerified,
            verifiedDate: isPartiallyVerified ? new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000) : undefined,
            verifiedBy: isPartiallyVerified ? 'Admin' : undefined,
            verificationMethod: isPartiallyVerified ? 'Direct phone call' : undefined
        },
        websiteVerified: {
            isVerified: isHighlyVerified,
            verifiedDate: isHighlyVerified ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : undefined,
            verifiedBy: isHighlyVerified ? 'System' : undefined,
            verificationMethod: isHighlyVerified ? 'Automated website check' : undefined
        },
        businessLicenseVerified: {
            isVerified: isHighlyVerified,
            verifiedDate: isHighlyVerified ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) : undefined,
            verifiedBy: isHighlyVerified ? 'Admin' : undefined,
            verificationMethod: isHighlyVerified ? 'State agriculture department lookup' : undefined,
            licenseNumber: isHighlyVerified ? `SL-${Math.floor(Math.random() * 100000)}` : undefined
        },
        seedOfferingsVerified: {
            isVerified: isPartiallyVerified,
            verifiedDate: isPartiallyVerified ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : undefined,
            verifiedBy: isPartiallyVerified ? 'Admin' : undefined,
            verificationMethod: isPartiallyVerified ? 'Product catalog review' : undefined
        },
        lastFullVerification: isHighlyVerified ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : undefined
    };
    
    // Calculate overall verification score
    let score = 0;
    if (verification.companyNameVerified.isVerified) score += 20;
    if (verification.addressVerified.isVerified) score += 20;
    if (verification.contactInfoVerified.isVerified) score += 15;
    if (verification.websiteVerified.isVerified) score += 15;
    if (verification.businessLicenseVerified.isVerified) score += 20;
    if (verification.seedOfferingsVerified.isVerified) score += 10;
    
    verification.overallVerificationScore = score;
    
    return verification;
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
        let totalVerified = 0;
        let totalPartiallyVerified = 0;
        
        // Generate 8-10 partners per state with cities and verification
        statesWithCities.forEach((state, stateIndex) => {
            const partnersPerState = Math.floor(Math.random() * 3) + 8; // 8-10 partners per state
            const usedCities = [];
            
            for (let i = 0; i < partnersPerState; i++) {
                // Select a city (avoid duplicates within same state when possible)
                let city;
                if (usedCities.length < state.cities.length) {
                    const availableCities = state.cities.filter(c => !usedCities.includes(c));
                    city = availableCities[Math.floor(Math.random() * availableCities.length)];
                } else {
                    city = state.cities[Math.floor(Math.random() * state.cities.length)];
                }
                usedCities.push(city);
                
                const companyName = generateCompanyName(state, city, i);
                const isActive = Math.random() > 0.35; // ~65% prospective, ~35% active
                
                if (isActive) totalActive++;
                else totalProspective++;
                
                const vegCount = Math.floor(Math.random() * 15) + 10; // 10-24 vegetables
                const flowerCount = Math.floor(Math.random() * 10) + 5; // 5-14 flowers
                const herbCount = Math.floor(Math.random() * 8) + 3; // 3-10 herbs
                
                const referenceCount = Math.floor(Math.random() * 3) + 2; // 2-4 references
                const references = generateReferences(referenceCount);
                
                const verifiedInfo = generateVerificationInfo();
                if (verifiedInfo.overallVerificationScore >= 80) totalVerified++;
                else if (verifiedInfo.overallVerificationScore >= 40) totalPartiallyVerified++;
                
                documents.push({
                    companyName: companyName,
                    partnerCode: `US-${state.stateCode}-${String(i + 1).padStart(2, '0')}`,
                    partnershipType: 'Domestic Supplier',
                    status: isActive ? 'Active' : 'Prospective',
                    priority: Math.floor(Math.random() * 5) + 1,
                    state: state.state,
                    stateCode: state.stateCode,
                    city: city,
                    region: state.region,
                    address: {
                        street: `${Math.floor(Math.random() * 9999) + 1} ${city} Road`,
                        city: city,
                        state: state.state,
                        zipCode: String(Math.floor(Math.random() * 90000) + 10000)
                    },
                    businessDetails: {
                        website: `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                        established: Math.floor(Math.random() * 50) + 1974,
                        certifications: []
                    },
                    seedOfferings: {
                        vegetables: randomSubset(vegetables, vegCount),
                        flowers: randomSubset(flowers, flowerCount),
                        herbs: randomSubset(herbs, herbCount)
                    },
                    references: references,
                    verifiedInformation: verifiedInfo,
                    lastUpdateDate: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        });
        
        console.log(`📦 Inserting ${documents.length} US seed partners with verified information...\n`);
        
        const result = await db.collection('usseedpartners').insertMany(documents);
        
        console.log(`✅ Successfully inserted ${result.insertedCount} partners!\n`);
        
        // Verify and show statistics
        const count = await db.collection('usseedpartners').countDocuments();
        
        console.log('📊 Final Statistics:');
        console.log(`   Total Partners: ${count}`);
        console.log(`   Active: ${totalActive}`);
        console.log(`   Prospective: ${totalProspective}`);
        console.log(`   Average per state: ${(count / 50).toFixed(1)}`);
        console.log(`   Fully Verified (80%+): ${totalVerified}`);
        console.log(`   Partially Verified (40-79%): ${totalPartiallyVerified}`);
        console.log(`   Needs Verification (<40%): ${count - totalVerified - totalPartiallyVerified}\n`);
        
        // Show sample by state with verification info
        console.log('📍 Sample Partners by State (first 2 states):');
        for (let i = 0; i < 2; i++) {
            const state = statesWithCities[i];
            const statePartners = await db.collection('usseedpartners')
                .find({ stateCode: state.stateCode })
                .toArray();
            
            console.log(`\n   ${state.state} (${state.stateCode}): ${statePartners.length} partners`);
            statePartners.slice(0, 3).forEach((p, idx) => {
                const verScore = p.verifiedInformation?.overallVerificationScore || 0;
                console.log(`      ${idx + 1}. ${p.companyName} - ${p.city}, ${p.stateCode}`);
                console.log(`         Status: ${p.status} | Verification: ${verScore}% | References: ${p.references?.length || 0}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

addComprehensivePartners();
