// Test the route logic with empty database
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

mongoose.connect('mongodb://localhost:27017/ebmdb')
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');
        
        // Simulate the route logic
        const query = { isActive: true };
        const partners = await SeedPartner.find(query).sort({ priority: 1, companyName: 1 });
        
        console.log('📊 Query results:');
        console.log('  Partners found:', partners.length);
        
        // Calculate stats like the route does
        const allPartnersCount = await SeedPartner.countDocuments({ isActive: true });
        const domesticCount = await SeedPartner.countDocuments({ isActive: true, isDomestic: true });
        const internationalCount = await SeedPartner.countDocuments({ isActive: true, isDomestic: { $ne: true } });
        
        const stats = {
            total: partners.length,
            allPartnersTotal: allPartnersCount,
            domestic: domesticCount,
            international: internationalCount,
            active: partners.filter(p => p.status === 'Active').length,
            prospective: partners.filter(p => p.status === 'Prospective').length,
            onHold: partners.filter(p => p.status === 'On Hold').length,
            totalOrderValue: partners.reduce((sum, p) => sum + (p.totalOrderValue || 0), 0),
            byRegion: {},
            byCountry: {},
            bySeedType: {},
            byExclusionGroup: {}
        };
        
        // Get unique values
        const uniqueRegions = [...new Set(partners.map(p => p.region))].sort();
        const uniqueCountries = [...new Set(partners.map(p => p.country))].sort();
        
        console.log('\n📈 Stats:');
        console.log('  Total:', stats.total);
        console.log('  Domestic:', stats.domestic);
        console.log('  International:', stats.international);
        console.log('  Unique regions:', uniqueRegions);
        console.log('  Unique countries:', uniqueCountries);
        console.log('  byRegion:', stats.byRegion);
        
        console.log('\n✅ Route logic test passed! No errors with empty data.');
        
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
