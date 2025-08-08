const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const LineItem = require('./models/LineItem');
const LineItemStatusOption = require('./models/LineItemStatusOption');

async function createSampleData() {
    try {
        await mongoose.connect('mongodb://localhost:27017/csv-import');
        console.log('Connected to MongoDB');

        // Create some sample Purchase Orders
        const samplePOs = [
            {
                reportDate: '2025-08-07',
                date: '2025-08-05',
                poNumber: 'PO-2025-001',
                vendor: 'Tech Supplies Inc',
                nsStatus: 'Partially Received',
                status: 'In Progress',
                amount: 1250.00,
                location: 'Main Warehouse',
                notes: 'Sample PO for testing line item statuses'
            },
            {
                reportDate: '2025-08-07',
                date: '2025-08-06',
                poNumber: 'PO-2025-002',
                vendor: 'Office Equipment Co',
                nsStatus: 'Pending Receipt',
                status: 'Approved for Purchase',
                amount: 850.50,
                location: 'Branch Office',
                notes: 'Sample PO with various line item statuses'
            },
            {
                reportDate: '2025-08-07',
                date: '2025-08-07',
                poNumber: 'PO-2025-003',
                vendor: 'Industrial Parts Ltd',
                nsStatus: 'Open',
                status: 'Planning',
                amount: 2100.75,
                location: 'Factory Floor',
                notes: 'Sample PO demonstrating status management'
            }
        ];

        console.log('Creating sample Purchase Orders...');
        const createdPOs = await PurchaseOrder.insertMany(samplePOs);
        console.log(`✓ Created ${createdPOs.length} Purchase Orders`);

        // Create sample line items with various statuses
        const sampleLineItems = [
            // PO-2025-001 items
            {
                poId: createdPOs[0]._id,
                poNumber: 'PO-2025-001',
                date: '2025-08-05',
                memo: 'Wireless Mouse - Logitech MX Master 3',
                sku: 'LOG-MX3-BLK',
                itemStatus: 'In Stock',
                received: true,
                receivedDate: new Date('2025-08-06'),
                notes: 'Received and verified'
            },
            {
                poId: createdPOs[0]._id,
                poNumber: 'PO-2025-001',
                date: '2025-08-05',
                memo: 'Mechanical Keyboard - Cherry MX Blue',
                sku: 'CHR-KB-BLU',
                itemStatus: 'Backordered',
                received: false,
                eta: new Date('2025-08-15'),
                notes: 'Vendor confirmed backorder status'
            },
            {
                poId: createdPOs[0]._id,
                poNumber: 'PO-2025-001',
                date: '2025-08-05',
                memo: 'USB-C Hub - 7-in-1 Multiport',
                sku: 'HUB-7IN1-GRY',
                itemStatus: 'Delivery Delay',
                received: false,
                notes: 'Delayed due to shipping issues'
            },

            // PO-2025-002 items
            {
                poId: createdPOs[1]._id,
                poNumber: 'PO-2025-002',
                date: '2025-08-06',
                memo: 'Ergonomic Office Chair - Herman Miller',
                sku: 'HM-CHAIR-ERG',
                itemStatus: 'Special Order',
                received: false,
                eta: new Date('2025-08-20'),
                notes: 'Custom configuration ordered'
            },
            {
                poId: createdPOs[1]._id,
                poNumber: 'PO-2025-002',
                date: '2025-08-06',
                memo: 'Standing Desk - Electric Height Adjustable',
                sku: 'DSK-ELEC-WHT',
                itemStatus: 'Find Different Vendor',
                received: false,
                notes: 'Original vendor discontinued model'
            },
            {
                poId: createdPOs[1]._id,
                poNumber: 'PO-2025-002',
                date: '2025-08-06',
                memo: 'Monitor Arm - Dual Display Mount',
                sku: 'ARM-DUAL-BLK',
                itemStatus: 'On Order',
                received: false,
                eta: new Date('2025-08-12'),
                notes: 'Confirmed with vendor'
            },

            // PO-2025-003 items
            {
                poId: createdPOs[2]._id,
                poNumber: 'PO-2025-003',
                date: '2025-08-07',
                memo: 'Industrial Bearing - SKF 6205-2RS',
                sku: 'SKF-6205-2RS',
                itemStatus: 'Discontinued',
                received: false,
                notes: 'Manufacturer discontinued this model'
            },
            {
                poId: createdPOs[2]._id,
                poNumber: 'PO-2025-003',
                date: '2025-08-07',
                memo: 'Hydraulic Seal Kit - Parker P350',
                sku: 'PKR-P350-KIT',
                itemStatus: 'Substitute Product',
                received: false,
                notes: 'Vendor recommended alternative part'
            },
            {
                poId: createdPOs[2]._id,
                poNumber: 'PO-2025-003',
                date: '2025-08-07',
                memo: 'Motor Coupling - Flexible 1/2 inch',
                sku: 'CPL-FLEX-05',
                itemStatus: 'Cancelled',
                received: false,
                notes: 'Project cancelled, no longer needed'
            },
            {
                poId: createdPOs[2]._id,
                poNumber: 'PO-2025-003',
                date: '2025-08-07',
                memo: 'Safety Switch - Emergency Stop Button',
                sku: 'SW-ESTOP-RED',
                itemStatus: 'In Stock',
                received: true,
                receivedDate: new Date('2025-08-07'),
                notes: 'Received same day'
            }
        ];

        console.log('Creating sample Line Items...');
        const createdLineItems = await LineItem.insertMany(sampleLineItems);
        console.log(`✓ Created ${createdLineItems.length} Line Items`);

        // Create default status options if they don't exist
        console.log('Ensuring default status options exist...');
        const existingOptions = await LineItemStatusOption.find();

        if (existingOptions.length === 0) {
            const defaultStatuses = [
                { name: 'In Stock', isDefault: true },
                { name: 'Backordered', isDefault: true },
                { name: 'Find Different Vendor', isDefault: true },
                { name: 'Substitute Product', isDefault: true },
                { name: 'Discontinued', isDefault: true },
                { name: 'Delivery Delay', isDefault: true },
                { name: 'On Order', isDefault: true },
                { name: 'Cancelled', isDefault: true },
                { name: 'Special Order', isDefault: true }
            ];

            const createdOptions = await LineItemStatusOption.insertMany(defaultStatuses);
            console.log(`✓ Created ${createdOptions.length} default status options`);
        } else {
            console.log(`✓ Found ${existingOptions.length} existing status options`);
        }

        // Summary
        console.log('\n🎉 Sample data created successfully!');
        console.log('─────────────────────────────────────');
        console.log(`📦 Purchase Orders: ${createdPOs.length}`);
        console.log(`📋 Line Items: ${createdLineItems.length}`);
        console.log(`🏷️  Status Options: ${existingOptions.length > 0 ? existingOptions.length : 9}`);

        console.log('\n📊 Status Distribution:');
        const statusCounts = {};
        createdLineItems.forEach(item => {
            statusCounts[item.itemStatus] = (statusCounts[item.itemStatus] || 0) + 1;
        });
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count} items`);
        });

        console.log('\n✨ You can now test the line item status system!');
        console.log('Visit your dashboard to see the new data and try:');
        console.log('• Managing line item status options');
        console.log('• Viewing line items in the Line Items Manager');
        console.log('• Updating statuses for individual items');
        console.log('• Filtering by status');

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');

    } catch (error) {
        console.error('Error creating sample data:', error);
        await mongoose.disconnect();
    }
}

createSampleData();
