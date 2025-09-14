const XLSX = require('xlsx');
const PharmacyRecordParser = require('./services/PharmacyRecordParser');

async function debugWalgreensRecords() {
    console.log('🔍 TARGETED WALGREENS RECORD ANALYSIS');
    console.log('====================================');
    
    try {
        const filePath = 'uploads/csvFile-1757829871975-351231888.xls';
        
        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get both parsing methods
        const parser = new PharmacyRecordParser();
        
        // Method 1: Raw array data
        const arrayData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
        });
        
        // Method 2: Parsed records
        const parsedRecords = await parser.readExcel(filePath);
        
        console.log(`📊 Array data rows: ${arrayData.length}`);
        console.log(`📊 Parsed records: ${parsedRecords.length}`);
        
        // Find the header row in array data
        let headerRowIndex = -1;
        for (let i = 0; i < arrayData.length; i++) {
            const row = arrayData[i];
            if (row[0] === 'Fill Date' || String(row[0]).toLowerCase().includes('fill date')) {
                headerRowIndex = i;
                break;
            }
        }
        
        console.log(`\n🎯 Header row found at index: ${headerRowIndex}`);
        if (headerRowIndex >= 0) {
            console.log('📋 Headers:', arrayData[headerRowIndex]);
            
            // Show a few data rows after the header
            console.log('\n📊 Sample data rows after header:');
            for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 6, arrayData.length); i++) {
                const row = arrayData[i];
                if (row.some(cell => cell && String(cell).trim() !== '')) {
                    console.log(`   Row ${i}:`, row);
                }
            }
        }
        
        // Check parsed records for prescription data
        console.log('\n🔍 ANALYZING PARSED RECORDS');
        console.log('===========================');
        
        const prescriptionLikeRecords = parsedRecords.filter(record => {
            // Look for records that might be prescriptions
            return (record['Fill Date'] || record.fillDate || record['Date Filled']) &&
                   (record['Prescription'] || record.drugName || record['Drug Name'] || record.Medication);
        });
        
        console.log(`💊 Records with prescription-like fields: ${prescriptionLikeRecords.length}`);
        
        if (prescriptionLikeRecords.length > 0) {
            console.log('\n📋 Sample prescription-like records:');
            prescriptionLikeRecords.slice(0, 5).forEach((record, index) => {
                console.log(`\nRecord ${index + 1}:`);
                Object.entries(record).forEach(([key, value]) => {
                    if (value && String(value).trim() !== '') {
                        console.log(`   ${key}: "${value}"`);
                    }
                });
            });
        }
        
        // Test the specific filter criteria from parseWalgreensFormat
        console.log('\n🧪 TESTING WALGREENS FORMAT CRITERIA');
        console.log('====================================');
        
        const matchingRecords = parsedRecords.filter(record => {
            const fillDate = record['Fill Date'];
            const prescription = record['Prescription'];
            
            console.log(`\nTesting record:`, { fillDate, prescription });
            
            if (!fillDate) {
                console.log(`   ❌ No 'Fill Date' field`);
                return false;
            }
            
            if (!prescription) {
                console.log(`   ❌ No 'Prescription' field`);
                return false;
            }
            
            const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
            const dateMatches = String(fillDate).match(datePattern);
            console.log(`   Fill Date "${fillDate}" matches MM/DD/YYYY: ${!!dateMatches}`);
            
            const prescriptionValid = String(prescription).trim() !== '';
            console.log(`   Prescription "${prescription}" is valid: ${prescriptionValid}`);
            
            const notHeaderRow = String(fillDate) !== 'Fill Date';
            console.log(`   Not header row: ${notHeaderRow}`);
            
            const passes = fillDate && prescription && dateMatches && prescriptionValid && notHeaderRow;
            console.log(`   ✅ PASSES ALL CRITERIA: ${passes}`);
            
            return passes;
        });
        
        console.log(`\n🎯 Records passing all Walgreens criteria: ${matchingRecords.length}`);
        
        if (matchingRecords.length > 0) {
            console.log('\n✅ PASSING RECORDS:');
            matchingRecords.forEach((record, index) => {
                console.log(`\nPassing Record ${index + 1}:`);
                console.log(`   Fill Date: "${record['Fill Date']}"`);
                console.log(`   Prescription: "${record['Prescription']}"`);
                console.log(`   Prescriber: "${record['Prescriber'] || 'N/A'}"`);
                console.log(`   Qty: "${record['Qty'] || 'N/A'}"`);
            });
        } else {
            console.log('\n❌ NO RECORDS PASS THE CRITERIA');
            console.log('\n🔍 FIELD NAME ANALYSIS:');
            
            // Check what field names actually exist
            const allFieldNames = new Set();
            parsedRecords.forEach(record => {
                Object.keys(record).forEach(key => allFieldNames.add(key));
            });
            
            console.log('📋 All field names found in records:');
            Array.from(allFieldNames).sort().forEach(fieldName => {
                console.log(`   "${fieldName}"`);
            });
            
            // Look for date-like fields
            console.log('\n📅 Date-like field values:');
            parsedRecords.slice(0, 10).forEach((record, index) => {
                Object.entries(record).forEach(([key, value]) => {
                    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('fill')) {
                        console.log(`   Record ${index}: ${key} = "${value}"`);
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugWalgreensRecords();
