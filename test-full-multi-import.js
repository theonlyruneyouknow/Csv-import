const path = require('path');
const PharmacyRecordParser = require('./services/PharmacyRecordParser');
const mongoose = require('mongoose');
require('dotenv').config();

async function testFullMultipleImport() {
    console.log('🧪 Testing Full Multiple Prescription Import Process');
    console.log('==================================================');
    
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine-management');
        console.log('✅ Connected to MongoDB');
        
        // Create a test user
        const User = require('./models/User');
        const testUser = await User.findOne({ username: 'testuser' }) || 
                        await User.create({
                            username: 'testuser',
                            email: 'test@example.com',
                            password: 'hashedpassword',
                            firstName: 'Test',
                            lastName: 'User'
                        });
        
        const filePath = path.join(__dirname, 'test-multiple-prescriptions.xlsx');
        const parser = new PharmacyRecordParser();
        
        console.log(`\n📂 Testing full import process with: ${filePath}`);
        console.log(`👤 Using test user: ${testUser.username}`);
        
        // Run the full import process
        const result = await parser.parsePharmacyRecords(filePath, testUser, 'walgreens');
        
        console.log('\n📊 Import Results:');
        console.log(`   Success: ${result.success}`);
        console.log(`   Total records processed: ${result.summary.totalRecords}`);
        console.log(`   Medicines created: ${result.summary.medicinesCreated}`);
        console.log(`   Medicines updated: ${result.summary.medicinesUpdated}`);
        console.log(`   Logs created: ${result.summary.logsCreated}`);
        console.log(`   Errors: ${result.summary.errorsCount}`);
        
        if (result.errors.length > 0) {
            console.log('\n❌ Errors:');
            result.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        if (result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
        }
        
        console.log('\n💊 Created Medicines:');
        result.medicines.forEach((medicine, index) => {
            console.log(`   ${index + 1}. ${medicine.name}`);
            console.log(`      Dosage: ${medicine.dosage}`);
            console.log(`      Quantity: ${medicine.quantity}`);
            console.log(`      Prescription Date: ${medicine.prescriptionDate}`);
            console.log(`      Prescriber: ${medicine.prescriber}`);
            console.log(`      Family Member: ${medicine.familyMember || 'N/A'}`);
            console.log('');
        });
        
        console.log('\n📝 Created Logs:');
        result.logs.forEach((log, index) => {
            console.log(`   ${index + 1}. ${log.medicine} - ${log.action}`);
            console.log(`      Recorded by: ${log.recordedBy}`);
            console.log(`      Date: ${log.date}`);
            console.log('');
        });
        
        if (result.summary.medicinesCreated === 3) {
            console.log('✅ SUCCESS: All 3 prescriptions imported successfully!');
        } else {
            console.log(`❌ ISSUE: Expected 3 medicines, but created ${result.summary.medicinesCreated}`);
        }
        
    } catch (error) {
        console.error('❌ Error during full import test:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testFullMultipleImport();
