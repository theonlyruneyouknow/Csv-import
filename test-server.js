// Simple test to check if the server can start
console.log('Testing server startup...');

try {
    require('dotenv').config();
    console.log('✅ dotenv loaded');
    
    const express = require('express');
    console.log('✅ express loaded');
    
    const mongoose = require('mongoose');
    console.log('✅ mongoose loaded');
    
    const app = express();
    console.log('✅ Express app created');
    
    // Test MongoDB connection
    console.log('🔌 Attempting MongoDB connection...');
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('✅ MongoDB connected successfully');
            
            // Test route
            app.get('/test', (req, res) => {
                res.json({ status: 'Server is working!' });
            });
            
            const PORT = process.env.PORT || 3001;
            app.listen(PORT, () => {
                console.log(`✅ Server running on http://localhost:${PORT}`);
                console.log('🧪 Test complete - server started successfully');
            });
        })
        .catch(err => {
            console.error('❌ MongoDB connection failed:', err.message);
        });
        
} catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error('Stack:', error.stack);
}
