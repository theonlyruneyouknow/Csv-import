const PharmacyRecordParser = require('./services/PharmacyRecordParser');
const fs = require('fs');

// Debug the patient info extraction
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

async function debugPatientInfo() {
    console.log('🔍 Debugging patient info extraction...\n');
    
    // Create test file
    fs.writeFileSync('debug-patient.csv', mockWalgreensCSVData);
    
    const parser = new PharmacyRecordParser();
    const records = await parser.readFile('debug-patient.csv');
    
    console.log('📊 All records:');
    records.forEach((record, index) => {
        console.log(`Record ${index}:`, JSON.stringify(record, null, 2));
    });
    
    console.log('\n👤 Patient info records:');
    const patientRecords = records.filter(r => r._patientInfo);
    patientRecords.forEach((record, index) => {
        console.log(`Patient line ${index}: "${record._patientInfo}"`);
    });
    
    console.log('\n🔍 Testing patient info extraction...');
    const patientInfo = parser.extractWalgreensPatientInfo(records);
    console.log('Extracted patient info:', JSON.stringify(patientInfo, null, 2));
    
    // Test each line individually
    console.log('\n🧪 Testing individual patterns:');
    patientRecords.forEach((record, index) => {
        const line = record._patientInfo;
        console.log(`\nLine ${index}: "${line}"`);
        console.log(`  - Name pattern (letters only): ${line.match(/^[A-Za-z\s]+$/) ? 'MATCH' : 'NO MATCH'}`);
        console.log(`  - Address pattern (numbers+letters): ${line.match(/\d+.*[A-Za-z]/) ? 'MATCH' : 'NO MATCH'}`);
        console.log(`  - Phone pattern (10 digits): ${line.match(/^\d{10}$/) ? 'MATCH' : 'NO MATCH'}`);
        console.log(`  - DOB pattern (MM/DD/YYYY): ${line.match(/^\d{2}\/\d{2}\/\d{4}$/) ? 'MATCH' : 'NO MATCH'}`);
        console.log(`  - Gender pattern: ${(line === 'Male' || line === 'Female') ? 'MATCH' : 'NO MATCH'}`);
        console.log(`  - City/State pattern: ${line.match(/[A-Za-z]+,\s*[A-Z]{2}/) ? 'MATCH' : 'NO MATCH'}`);
    });
    
    // Cleanup
    fs.unlinkSync('debug-patient.csv');
}

debugPatientInfo().catch(console.error);
