const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/ebmdb')
    .then(async () => {
        console.log('Connected to database\n');
        
        const users = await User.find({}, 'username email firstName lastName role').limit(10);
        
        if (users.length === 0) {
            console.log('No users found in database');
        } else {
            console.log('Available users:');
            users.forEach(u => {
                console.log(`  Username: ${u.username}`);
                console.log(`  Email: ${u.email}`);
                console.log(`  Name: ${u.firstName} ${u.lastName}`);
                console.log(`  Role: ${u.role || 'user'}`);
                console.log('---');
            });
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
