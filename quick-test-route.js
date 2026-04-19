// quick-test-route.js
const express = require('express');
const mongoose = require('mongoose');

// Register models FIRST
const USSeedPartner = require('./models/USSeedPartner');

async function testServerRoute() {
    try {
        await mongoose.connect('mongodb://localhost:27017/tsc-purchasing');
        console.log('✅ Connected to MongoDB\n');
        
        // Test 1: Direct model query
        console.log('Test 1: Direct model query');
        const directCount = await USSeedPartner.countDocuments();
        console.log(`   Direct count: ${directCount}`);
        
        const directPartners = await USSeedPartner.find({}).sort({ state: 1 }).limit(3);
        console.log(`   Retrieved: ${directPartners.length} partners`);
        if (directPartners.length > 0) {
            console.log(`   First partner: ${directPartners[0].companyName} (${directPartners[0].state})`);
        }
        
        // Test 2: Simulate route behavior
        console.log('\nTest 2: Simulating route behavior');
        const query = {};
        const allPartners = await USSeedPartner.find(query).sort({ state: 1 });
        console.log(`   Partners found: ${allPartners.length}`);
        
        const stats = {
            total: allPartners.length,
            active: allPartners.filter(p => p.status === 'Active').length,
            prospective: allPartners.filter(p => p.status === 'Prospective').length,
            withWebsites: allPartners.filter(p => p.businessDetails?.website).length
        };
        
        console.log('   Stats:', stats);
        
        // Test 3: Check if mongoose found the model
        console.log('\nTest 3: Mongoose models registered');
        console.log(`   Mongoose models: ${Object.keys(mongoose.models).filter(m => m.includes('Seed')).join(', ')}`);
        
        await mongoose.connection.close();
        console.log('\n✅ All tests passed');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testServerRoute();
