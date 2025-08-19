// Simple MongoDB connection test
const mongoose = require('mongoose');

async function testConnection() {
    const connections = [
        'mongodb://localhost:27017/purchase-orders',
        'mongodb://localhost:27017/purchaseOrdersDB',
        'mongodb://127.0.0.1:27017/purchase-orders'
    ];

    for (const uri of connections) {
        try {
            console.log(`Testing: ${uri}`);
            await mongoose.connect(uri, { 
                serverSelectionTimeoutMS: 3000,
                connectTimeoutMS: 3000 
            });
            console.log('✅ Connected successfully');
            
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('Collections:', collections.map(c => c.name));
            
            await mongoose.disconnect();
            return uri;
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            try { await mongoose.disconnect(); } catch {}
        }
    }
    return null;
}

testConnection().then(result => {
    if (result) {
        console.log(`\n🎯 Use this connection: ${result}`);
    } else {
        console.log('\n❌ No MongoDB connection available');
        console.log('Make sure MongoDB is running: mongod --dbpath ./data');
    }
});
