// test-connection.js - Simple MongoDB connection test
require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔄 Testing MongoDB connection...');
console.log('📍 MongoDB URI:', process.env.MONGODB_URI ? 'Set in .env' : 'NOT SET');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

mongoose.connect(mongoURI)
    .then(() => {
        console.log('✅ MongoDB connection successful!');
        console.log('🔗 Connected to:', mongoose.connection.name);
        console.log('🌐 Host:', mongoose.connection.host);
        console.log('📊 Ready state:', mongoose.connection.readyState);
        
        // Test a simple operation
        const testSchema = new mongoose.Schema({ test: String });
        const TestModel = mongoose.model('Test', testSchema);
        
        return TestModel.create({ test: 'Connection working!' });
    })
    .then((doc) => {
        console.log('✅ Test document created:', doc);
        return mongoose.connection.close();
    })
    .then(() => {
        console.log('✅ Connection closed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ MongoDB connection failed:');
        console.error('Error message:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.error('💡 Solution: Either start local MongoDB or use MongoDB Atlas');
            console.error('💡 Local MongoDB: Install and start MongoDB service');
            console.error('💡 MongoDB Atlas: Update MONGODB_URI in .env with your Atlas connection string');
        }
        
        if (error.message.includes('authentication failed')) {
            console.error('💡 Solution: Check your username/password in the connection string');
        }
        
        process.exit(1);
    });
