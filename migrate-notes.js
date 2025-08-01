// migrate-notes.js
// Script to migrate existing notes from PurchaseOrder.notes field to individual Note records

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const PurchaseOrder = require('./models/PurchaseOrder');
const Note = require('./models/Note');

async function migrateNotes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csvimport');
        console.log('Connected to MongoDB');

        // Find all PurchaseOrders that have notes
        const purchaseOrdersWithNotes = await PurchaseOrder.find({
            notes: { $exists: true, $ne: '' }
        });

        console.log(`Found ${purchaseOrdersWithNotes.length} purchase orders with existing notes`);

        let migratedCount = 0;
        let errorCount = 0;

        for (const po of purchaseOrdersWithNotes) {
            try {
                // Check if we already have a note for this PO (to avoid duplicates)
                const existingNote = await Note.findOne({ 
                    poId: po._id,
                    content: po.notes 
                });

                if (existingNote) {
                    console.log(`Skipping PO ${po.poNumber} - note already migrated`);
                    continue;
                }

                // Create a new Note record
                const newNote = new Note({
                    poId: po._id,
                    poNumber: po.poNumber,
                    vendor: po.vendor || 'Unknown Vendor',
                    content: po.notes,
                    createdAt: po.updatedAt || po.createdAt || new Date()
                });

                await newNote.save();
                migratedCount++;
                console.log(`✓ Migrated note for PO ${po.poNumber}`);

                // Optional: Clear the old notes field after successful migration
                // Uncomment the lines below if you want to remove the old notes field
                /*
                po.notes = '';
                await po.save();
                console.log(`  Cleared old notes field for PO ${po.poNumber}`);
                */

            } catch (error) {
                console.error(`✗ Error migrating PO ${po.poNumber}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n=== Migration Summary ===');
        console.log(`Successfully migrated: ${migratedCount} notes`);
        console.log(`Errors encountered: ${errorCount}`);
        console.log(`Total processed: ${purchaseOrdersWithNotes.length}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the migration
if (require.main === module) {
    console.log('Starting notes migration...');
    migrateNotes().then(() => {
        console.log('Migration completed');
        process.exit(0);
    }).catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}

module.exports = migrateNotes;
