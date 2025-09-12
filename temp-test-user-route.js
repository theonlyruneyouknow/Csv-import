// Quick test user creation route - add this temporarily to app.js
app.get('/create-test-user', async (req, res) => {
    try {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        
        // Check if test user already exists
        let testUser = await User.findOne({ username: 'tuser' });
        
        if (testUser) {
            // Update existing user to ensure it's approved
            testUser.status = 'approved';
            testUser.role = 'admin';
            await testUser.save();
            
            return res.json({
                success: true,
                message: 'Test user already exists and has been updated',
                user: {
                    username: testUser.username,
                    email: testUser.email,
                    role: testUser.role,
                    status: testUser.status
                }
            });
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash('tpass123', 10);
        
        // Create new test user
        testUser = new User({
            username: 'tuser',
            email: 'tuser@test.com',
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
            status: 'approved',
            permissions: {
                viewDashboard: true,
                editLineItems: true,
                deleteLineItems: true,
                managePurchaseOrders: true,
                manageNotes: true,
                manageTasks: true,
                manageUsers: true,
                viewReports: true,
                systemSettings: true
            }
        });
        
        await testUser.save();
        
        res.json({
            success: true,
            message: 'Test user created successfully!',
            credentials: {
                username: 'tuser',
                password: 'tpass123'
            },
            user: {
                username: testUser.username,
                email: testUser.email,
                role: testUser.role,
                status: testUser.status
            }
        });
        
    } catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
