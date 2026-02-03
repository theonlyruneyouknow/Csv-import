// Quick script to enable EBM access for adminrune
// Run this in a separate terminal: node enable-my-ebm-access.js

const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        
        const User = require('./models/User');
        
        // Update your user
        const result = await User.updateOne(
            { username: 'adminrune' },
            { $set: { 'permissions.accessEBMAlumni': true } }
        );
        
        if (result.modifiedCount > 0) {
            console.log('✅ EBM Alumni access ENABLED for adminrune!');
            console.log('🎉 You can now access: http://localhost:3001/ebm/dashboard');
        } else {
            console.log('⚠️  User already has access or not found');
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
