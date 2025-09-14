const path = require('path');
const PharmacyRecordParser = require('./services/PharmacyRecordParser');

async function testMultipleImport() {
    console.log('🧪 Testing Multiple Prescription Import');
    console.log('=====================================');
    
    try {
        const filePath = path.join(__dirname, 'test-multiple-prescriptions.xlsx');
        const parser = new PharmacyRecordParser();
        
        console.log(`📂 Testing file: ${filePath}`);
        
        // Read the file first to get the raw data
        const rawData = await parser.readFile(filePath);
        console.log(`📊 Raw data rows: ${rawData.length}`);
        
        // Debug: show first few rows to understand structure
        console.log('\n🔍 First 10 rows of raw data:');
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
            console.log(`Row ${i}:`, rawData[i]);
        }
        
        // Parse using the Walgreens Excel parser directly
        const result = parser.parseWalgreensExcel(rawData);
        
        console.log('\n📊 Parse Results:');
        if (result && result.length !== undefined) {
            console.log(`   Total records found: ${result.length}`);
        } else {
            console.log('   Result is not an array:', typeof result);
            console.log('   Result:', result);
        }
        console.log(`   Patient info: ${result.patientInfo ? 'Found' : 'Not found'}`);
        
        if (result.patientInfo) {
            console.log('👤 Patient Information:');
            console.log(`   Name: ${result.patientInfo.name}`);
            console.log(`   DOB: ${result.patientInfo.dateOfBirth}`);
            console.log(`   Address: ${result.patientInfo.address}`);
            console.log(`   Phone: ${result.patientInfo.phone}`);
        }
        
        console.log('\n💊 Prescription Records:');
        result.records.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.drugName}`);
            console.log(`      Quantity: ${record.quantity}`);
            console.log(`      Date Filled: ${record.dateFilled}`);
            console.log(`      Prescriber: ${record.prescriber}`);
            console.log(`      Rx Number: ${record.rxNumber}`);
            console.log(`      Notes: ${record.notes || 'None'}`);
            console.log('');
        });
        
        if (result.records.length === 3) {
            console.log('✅ SUCCESS: All 3 prescriptions parsed correctly!');
        } else {
            console.log(`❌ ISSUE: Expected 3 prescriptions, but found ${result.records.length}`);
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        console.error(error.stack);
    }
}

testMultipleImport();
