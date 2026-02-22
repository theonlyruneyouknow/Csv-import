const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost/purchase-orders', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkUsers() {
    try {
        const users = await User.find({}, 'username firstName lastName role email').limit(20);
        
        console.log('All users in database:');
        console.log('='.repeat(80));
        users.forEach(u => {
            console.log(`Username: ${u.username || 'N/A'}`);
            console.log(`Name: ${u.firstName} ${u.lastName}`);
            console.log(`Role: ${u.role}`);
            console.log(`Email: ${u.email}`);
            console.log('-'.repeat(80));
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
