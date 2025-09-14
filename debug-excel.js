const PharmacyRecordParser = require('./services/PharmacyRecordParser');
const path = require('path');

async function debugExcelParsing() {
    console.log('🔍 Debugging Excel Parsing...\n');
    
    const parser = new PharmacyRecordParser();
    const excelPath = path.join(__dirname, 'sample-walgreens-data.xlsx');
    
    try {
        console.log('📖 Reading Excel file...');
        const records = await parser.readFile(excelPath);
        
        console.log(`📊 Total records: ${records.length}\n`);
        
        console.log('📋 First 10 records:');
        records.slice(0, 10).forEach((record, index) => {
            console.log(`Record ${index}:`, JSON.stringify(record, null, 2));
        });
        
        console.log('\n🔍 Looking for patient info records...');
        const patientRecords = records.filter(r => r._patientInfo);
        console.log(`Found ${patientRecords.length} patient info records`);
        
        console.log('\n🔍 Looking for prescription records...');
        const prescriptionRecords = records.filter(r => r['Fill Date'] && r['Prescription']);
        console.log(`Found ${prescriptionRecords.length} prescription records`);
        
        if (prescriptionRecords.length > 0) {
            console.log('First prescription record:', JSON.stringify(prescriptionRecords[0], null, 2));
        }
        
        console.log('\n🎯 Testing format detection...');
        const format = parser.detectFormat(records);
        console.log(`Detected format: ${format}`);
        
        console.log('\n🔍 Testing patient info extraction...');
        const patientInfo = parser.extractWalgreensPatientInfo(records);
        console.log('Patient info:', JSON.stringify(patientInfo, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugExcelParsing();
