const PharmacyRecordParser = require('./services/PharmacyRecordParser');

async function testFixedParsing() {
    console.log('🧪 Testing Fixed Walgreens Detection');
    console.log('====================================');
    
    try {
        const filePath = 'uploads/csvFile-1757829871975-351231888.xls';
        const parser = new PharmacyRecordParser();
        
        console.log('🔄 Testing readExcel with fixed detection...');
        const parsedRecords = await parser.readExcel(filePath);
        
        console.log(`📊 Parsed records: ${parsedRecords.length}`);
        
        // Check if we now have proper field names
        if (parsedRecords.length > 0) {
            const sampleRecord = parsedRecords[0];
            console.log('\n📋 Sample record field names:');
            Object.keys(sampleRecord).forEach(key => {
                console.log(`   "${key}"`);
            });
            
            // Look for prescription records
            const prescriptionRecords = parsedRecords.filter(record => 
                record['Fill Date'] && record['Prescription'] && 
                record['Fill Date'] !== 'Fill Date' &&
                String(record['Fill Date']).match(/^\d{2}\/\d{2}\/\d{4}$/)
            );
            
            console.log(`\n💊 Valid prescription records: ${prescriptionRecords.length}`);
            
            if (prescriptionRecords.length > 0) {
                console.log('\n📋 First prescription record:');
                const first = prescriptionRecords[0];
                console.log(`   Fill Date: "${first['Fill Date']}"`);
                console.log(`   Prescription: "${first['Prescription']}"`);
                console.log(`   Qty: "${first['Qty']}"`);
                console.log(`   Prescriber: "${first['Prescriber']}"`);
                
                console.log('\n✅ FIX SUCCESSFUL! Should now import correctly.');
            } else {
                console.log('\n❌ Still no valid prescription records found.');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testFixedParsing();
