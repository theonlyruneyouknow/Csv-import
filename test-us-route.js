// test-us-route.js
const express = require('express');
const mongoose = require('mongoose');
const USSeedPartner = require('./models/USSeedPartner');

async function testRoute() {
    try {
        await mongoose.connect('mongodb://localhost:27017/tsc-purchasing');
        console.log('✅ Connected to MongoDB\n');
        
        // Simulate what the dashboard route does
        const query = {};
        const allPartners = await USSeedPartner.find(query).sort({ state: 1 });
        
        console.log(`📊 Query returned ${allPartners.length} partners\n`);
        
        if (allPartners.length === 0) {
            console.log('⚠️  No partners returned by query!');
        } else {
            // Show first 3 partners
            console.log('First 3 Partners:');
            allPartners.slice(0, 3).forEach(p => {
                console.log(`\n${p.state} (${p.stateCode}): ${p.companyName}`);
                console.log(`   Status: ${p.status}`);
                console.log(`   Priority: ${p.priority}`);
                console.log(`   Website: ${p.businessDetails?.website || 'None'}`);
                console.log(`   Vegetables: ${p.seedOfferings?.vegetables?.length || 0}`);
                console.log(`   Flowers: ${p.seedOfferings?.flowers?.length || 0}`);
                console.log(`   Herbs: ${p.seedOfferings?.herbs?.length || 0}`);
            });
            
            // Calculate stats like the route does
            const stats = {
                total: allPartners.length,
                active: allPartners.filter(p => p.status === 'Active').length,
                prospective: allPartners.filter(p => p.status === 'Prospective').length,
                onHold: allPartners.filter(p => p.status === 'On Hold').length,
                highPriority: allPartners.filter(p => p.priority >= 4).length,
                withWebsites: allPartners.filter(p => p.businessDetails?.website).length
            };
            
            console.log('\n\n📈 Stats (as dashboard would show):');
            console.log(`   Total: ${stats.total}`);
            console.log(`   Active: ${stats.active}`);
            console.log(`   Prospective: ${stats.prospective}`);
            console.log(`   High Priority: ${stats.highPriority}`);
            console.log(`   With Websites: ${stats.withWebsites}`);
        }
        
        await mongoose.connection.close();
        console.log('\n✅ Test complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testRoute();
