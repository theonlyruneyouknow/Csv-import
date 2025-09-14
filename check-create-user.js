require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function checkAndCreateUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/medicinetracker');
        console.log('Connected to MongoDB');
        
        // Check if adminrune exists
        let user = await User.findOne({ username: 'adminrune' });
        
        if (user) {
            console.log('✅ User "adminrune" already exists');
            console.log('User details:', {
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status
            });
        } else {
            console.log('❌ User "adminrune" not found');
            console.log('🔄 Creating user "adminrune"...');
            
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            const newUser = new User({
                username: 'adminrune',
                email: 'admin@rune.com',
                password: hashedPassword,
                firstName: 'Admin',
                lastName: 'Rune',
                status: 'active',
                permissions: {
                    accessMedicineManagement: true,
                    accessPurchaseOrders: true,
                    accessDropshipManagement: true,
                    accessTaskManagement: true,
                    accessOrganicVendors: true,
                    accessStoryManagement: true,
                    accessAdminPanel: true,
                    manageUsers: true,
                    manageSettings: true
                }
            });
            
            await newUser.save();
            console.log('✅ User "adminrune" created successfully!');
            console.log('📧 Email: admin@rune.com');
            console.log('🔑 Password: admin123');
        }
        
        // List all users
        const allUsers = await User.find({}).select('username email firstName lastName status');
        console.log('\n📊 All users in database:');
        allUsers.forEach(u => {
            console.log(`- ${u.username} (${u.email}) - ${u.firstName} ${u.lastName} [${u.status}]`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkAndCreateUser();
