// test-create-sample-tasks.js
require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('./models/Task');

async function createSampleTasks() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csv-import-test');
        console.log('📦 Connected to MongoDB');

        // Clear existing tasks
        await Task.deleteMany({});
        console.log('🗑️ Cleared existing tasks');

        // Sample tasks
        const sampleTasks = [
            {
                title: "Follow up on Johnny's Seeds PO #12345",
                description: "Check on delivery status for critical spring seeds order. Expected ship date was 3 days ago.",
                priority: "critical",
                category: "po-management",
                status: "pending",
                dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
                assignedTo: "Sarah Chen",
                tags: ["overdue", "critical", "spring-seeds"],
                estimatedHours: 1,
                createdBy: "System"
            },
            {
                title: "Source organic tomato seeds for 2024 season",
                description: "Find reliable organic tomato seed suppliers with USDA certification. Need multiple varieties including heirloom.",
                priority: "high",
                category: "seed-sourcing",
                status: "in-progress",
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                assignedTo: "Mark Johnson",
                tags: ["organic", "tomato", "usda-certified", "heirloom"],
                estimatedHours: 4,
                createdBy: "System"
            },
            {
                title: "Contact High Mowing Seeds about bulk pricing",
                description: "Negotiate volume discounts for upcoming season orders. Need quotes for 50+ varieties.",
                priority: "medium",
                category: "vendor-contact",
                status: "pending",
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                assignedTo: "Lisa Rodriguez",
                tags: ["bulk-pricing", "high-mowing", "negotiations"],
                estimatedHours: 2,
                createdBy: "System"
            },
            {
                title: "Quality check shipment from Eden Brothers",
                description: "Inspect incoming seed shipment for quality issues. Check germination rates and seed purity.",
                priority: "high",
                category: "quality-check",
                status: "pending",
                dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
                assignedTo: "David Kim",
                tags: ["quality-control", "eden-brothers", "germination"],
                estimatedHours: 3,
                createdBy: "System"
            },
            {
                title: "Update inventory levels for winter crops",
                description: "Complete inventory count for all winter crop seeds. Update system with current stock levels.",
                priority: "medium",
                category: "inventory",
                status: "in-progress",
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                assignedTo: "Jennifer Wilson",
                tags: ["inventory", "winter-crops", "stock-count"],
                estimatedHours: 6,
                createdBy: "System"
            },
            {
                title: "Arrange shipping for Burpee order",
                description: "Coordinate pickup and delivery for large Burpee seed order. Ensure temperature-controlled transport.",
                priority: "low",
                category: "shipping",
                status: "completed",
                dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
                assignedTo: "Mike Thompson",
                tags: ["burpee", "temperature-controlled", "completed"],
                estimatedHours: 1,
                completedAt: new Date(),
                createdBy: "System"
            },
            {
                title: "Research new drought-resistant varieties",
                description: "Investigate and source new drought-resistant seed varieties for climate change adaptation.",
                priority: "low",
                category: "seed-sourcing",
                status: "pending",
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
                assignedTo: "Emily Zhang",
                tags: ["drought-resistant", "climate-adaptation", "research"],
                estimatedHours: 8,
                createdBy: "System"
            },
            {
                title: "URGENT: Missing shipment from Southern Exposure",
                description: "Shipment was supposed to arrive 5 days ago. Customer orders are waiting. Need immediate follow-up.",
                priority: "critical",
                category: "vendor-contact",
                status: "pending",
                dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (overdue)
                assignedTo: "Sarah Chen",
                tags: ["urgent", "missing-shipment", "southern-exposure", "customer-impact"],
                estimatedHours: 2,
                createdBy: "System"
            }
        ];

        // Insert sample tasks
        const createdTasks = await Task.insertMany(sampleTasks);
        console.log(`✅ Created ${createdTasks.length} sample tasks`);

        // Display summary
        console.log('\n📊 Task Summary:');
        const stats = await Task.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        stats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count}`);
        });

        const priorities = await Task.aggregate([
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        console.log('\n🔥 Priority Distribution:');
        priorities.forEach(priority => {
            console.log(`   ${priority._id}: ${priority.count}`);
        });

        // Show overdue tasks
        const overdueTasks = await Task.find({
            dueDate: { $lt: new Date() },
            status: { $ne: 'completed' }
        });
        
        console.log(`\n⚠️  Overdue Tasks: ${overdueTasks.length}`);
        overdueTasks.forEach(task => {
            const daysOverdue = Math.ceil((new Date() - task.dueDate) / (1000 * 60 * 60 * 24));
            console.log(`   - ${task.title} (${daysOverdue} days overdue)`);
        });

        console.log('\n🎉 Sample tasks created successfully!');
        console.log('🌐 Visit http://localhost:3001/tasks to see the task dashboard');

    } catch (error) {
        console.error('❌ Error creating sample tasks:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📦 Disconnected from MongoDB');
    }
}

createSampleTasks();
