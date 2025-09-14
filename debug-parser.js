const PharmacyRecordParser = require('./services/PharmacyRecordParser');
const fs = require('fs');

// Debug the CSV parsing
const mockWalgreensCSVData = `Confidential Prescription Records,,,,,,,,,
,,,,,,,,,
Rune Larsen,,,,,,,,,
555 n danebo ave spc 34,,,,,,,,,
"eugene, OR 974022230",,,,,,,,,
5416062179,,,,,,,,,
01/14/1971,,,,,,,,,
Male,,,,,,,,,
,,,,,,,,,
09/08/2025 to 09/13/2025,,,,,,,,,"Showing  Prescriptions, Sorted By fill date (09/08/2025 to 09/13/2025)"
Fill Date,Prescription,Rx #,Qty,Prescriber,Pharmacist,NDC#,Insurance,Claim Reference #,Price
09/08/2025,Cyclobenzaprine 10mg Tablets,185848411643,90,"Wilson,Erica",SMM,29300041510,APM,252514899525277999,$0.00
,,,,,,,,Total ,$0.00
,,,,,,,,Generics Saved You ,$0.00
,,,,,,,,Insurance Saved You ,$35.39`;

async function debugParser() {
    console.log('🔍 Debugging CSV parsing...\n');
    
    // Create test file
    fs.writeFileSync('debug-test.csv', mockWalgreensCSVData);
    
    const parser = new PharmacyRecordParser();
    const records = await parser.readFile('debug-test.csv');
    
    console.log(`📊 Total records: ${records.length}\n`);
    
    // Show first few records
    console.log('📋 First 5 records:');
    records.slice(0, 5).forEach((record, index) => {
        console.log(`Record ${index}:`, JSON.stringify(record, null, 2));
    });
    
    // Find the header row
    console.log('\n🎯 Looking for header row...');
    records.forEach((record, index) => {
        const keys = Object.keys(record);
        const firstKey = keys[0];
        if (firstKey && firstKey.toLowerCase().includes('fill date')) {
            console.log(`Found header at index ${index}:`, keys);
        }
        if (record[firstKey] === 'Fill Date') {
            console.log(`Found "Fill Date" value at index ${index}:`, record);
        }
    });
    
    // Test format detection
    console.log('\n🔍 Testing format detection...');
    const format = parser.detectFormat(records);
    console.log(`Detected format: ${format}`);
    
    // Show all headers for analysis
    console.log('\n📋 All record headers:');
    const allHeaders = new Set();
    records.forEach(record => {
        Object.keys(record).forEach(key => allHeaders.add(key));
    });
    console.log(Array.from(allHeaders));
    
    // Cleanup
    fs.unlinkSync('debug-test.csv');
}

debugParser().catch(console.error);
