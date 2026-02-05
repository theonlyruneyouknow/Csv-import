const fs = require('fs');
const Papa = require('papaparse');

// Update this path to your companionship CSV file
const csvFilePath = process.argv[2];

if (!csvFilePath) {
    console.log('Usage: node test-companionship-csv.js <path-to-csv-file>');
    console.log('Example: node test-companionship-csv.js "C:\\path\\to\\companionships.csv"');
    process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
    console.log(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
}

console.log(`📄 Reading CSV file: ${csvFilePath}\n`);

const csvContent = fs.readFileSync(csvFilePath, 'utf8');

const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
});

console.log(`📊 Total rows: ${parsed.data.length}`);
console.log(`📋 Column names:`, Object.keys(parsed.data[0] || {}));

if (parsed.data.length > 0) {
    console.log(`\n📋 First 5 rows:`);
    parsed.data.slice(0, 5).forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`, row);
    });
}

// Check for the fields we're looking for
if (parsed.data.length > 0) {
    const firstRow = parsed.data[0];
    console.log(`\n🔍 Checking for expected field names...`);
    console.log(`   companicrm1_id: ${firstRow.companicrm1_id !== undefined ? '✅' : '❌'}`);
    console.log(`   rm1_id: ${firstRow.rm1_id !== undefined ? '✅' : '❌'}`);
    console.log(`   companionship_rm1_id: ${firstRow.companionship_rm1_id !== undefined ? '✅' : '❌'}`);
    console.log(`   rm2_id: ${firstRow.rm2_id !== undefined ? '✅' : '❌'}`);
    console.log(`   companionship_rm2_id: ${firstRow.companionship_rm2_id !== undefined ? '✅' : '❌'}`);
    console.log(`   area_id: ${firstRow.area_id !== undefined ? '✅' : '❌'}`);
}

// Count rows with all required fields
let validRows = 0;
let missingRm1 = 0;
let missingRm2 = 0;
let missingArea = 0;

parsed.data.forEach(row => {
    const rm1IdValue = row.companicrm1_id || row.companionship_rm1_id || row.rm1_id;
    const rm2IdValue = row.rm2_id || row.companionship_rm2_id;
    const areaIdValue = row.area_id;
    
    if (!rm1IdValue) missingRm1++;
    if (!rm2IdValue) missingRm2++;
    if (!areaIdValue) missingArea++;
    
    if (rm1IdValue && rm2IdValue && areaIdValue) {
        validRows++;
    }
});

console.log(`\n📊 Data Quality:`);
console.log(`   Valid rows (all fields): ${validRows}`);
console.log(`   Missing rm1_id: ${missingRm1}`);
console.log(`   Missing rm2_id: ${missingRm2}`);
console.log(`   Missing area_id: ${missingArea}`);
