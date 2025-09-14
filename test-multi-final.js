const path = require('path');
const PharmacyRecordParser = require('./services/PharmacyRecordParser');

async function testMultipleImport() {
    console.log('🧪 Testing Multiple Prescription Import');
    console.log('=====================================');
    
    try {
        const filePath = path.join(__dirname, 'test-multiple-prescriptions.xlsx');
        const parser = new PharmacyRecordParser();
        
        console.log(`📂 Testing file: ${filePath}`);
        
        // Use readExcel directly since it has auto-detection and parsing
        const result = await parser.readExcel(filePath);
        
        console.log('\n📊 Parse Results:');
        if (result && Array.isArray(result)) {
            console.log(`   Total records found: ${result.length}`);
            
            // Debug: show all records to understand structure
            console.log('\n🔍 All records:');
            result.forEach((record, index) => {
                console.log(`Record ${index}:`, record);
            });
            
            // Filter prescription records (non-patient info)
            const prescriptionRecords = result.filter(record => 
                !record._patientInfo && record['Fill Date'] && record.Prescription
            );
            
            console.log(`\n   Prescription records: ${prescriptionRecords.length}`);
            
            // Extract patient info
            const patientRecords = result.filter(record => record._patientInfo);
            console.log(`   Patient info records: ${patientRecords.length}`);
            
            if (patientRecords.length > 0) {
                console.log('\n👤 Patient Information:');
                patientRecords.forEach(record => {
                    console.log(`   ${record._patientInfo}`);
                });
            }
            
            console.log('\n💊 Prescription Records:');
            prescriptionRecords.forEach((record, index) => {
                console.log(`   ${index + 1}. ${record.Prescription}`);
                console.log(`      Fill Date: ${record['Fill Date']}`);
                console.log(`      Prescriber: ${record.Prescriber}`);
                console.log(`      Qty: ${record.Qty}`);
                console.log(`      Day Supply: ${record['Day Supply']}`);
                console.log(`      Price: ${record.Price}`);
                console.log(`      Rx Number: ${record['Rx #']}`);
                console.log('');
            });
            
            if (prescriptionRecords.length === 3) {
                console.log('✅ SUCCESS: All 3 prescriptions parsed correctly!');
            } else {
                console.log(`❌ ISSUE: Expected 3 prescriptions, but found ${prescriptionRecords.length}`);
            }
        } else {
            console.log('   Result is not an array:', typeof result);
            console.log('   Result structure:', Object.keys(result || {}));
            console.log('   Full result:', result);
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        console.error(error.stack);
    }
}

testMultipleImport();
