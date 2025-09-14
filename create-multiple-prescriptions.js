const XLSX = require('xlsx');
const path = require('path');

// Enhanced sample Walgreens data with multiple prescriptions
const walgreensDataMultiple = [
    ['Confidential Prescription Records', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Rune Larsen', '', '', '', '', '', '', '', '', ''],
    ['555 n danebo ave spc 34', '', '', '', '', '', '', '', '', ''],
    ['eugene, OR 974022230', '', '', '', '', '', '', '', '', ''],
    ['5416062179', '', '', '', '', '', '', '', '', ''],
    ['01/14/1971', '', '', '', '', '', '', '', '', ''],
    ['Male', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['09/08/2025 to 09/13/2025', '', '', '', '', '', '', '', '', 'Showing  Prescriptions, Sorted By fill date (09/08/2025 to 09/13/2025)'],
    ['Fill Date', 'Prescription', 'Rx #', 'Qty', 'Prescriber', 'Pharmacist', 'NDC#', 'Insurance', 'Claim Reference #', 'Price'],
    ['09/08/2025', 'Cyclobenzaprine 10mg Tablets', '185848411643', '90', 'Wilson,Erica', 'SMM', '29300041510', 'APM', '252514899525277999', '$0.00'],
    ['09/10/2025', 'Lisinopril 10mg Tablets', '185848411644', '30', 'Smith,John', 'SMM', '12345678901', 'APM', '252514899525277998', '$5.00'],
    ['09/12/2025', 'Metformin 500mg Tablets', '185848411645', '60', 'Johnson,Mary', 'SMM', '98765432109', 'APM', '252514899525277997', '$10.00'],
    ['09/13/2025', 'Atorvastatin 20mg Tablets', '185848411646', '30', 'Brown,David', 'SMM', '11223344556', 'APM', '252514899525277996', '$15.00'],
    ['', '', '', '', '', '', '', 'Total ', '', '$30.00'],
    ['', '', '', '', '', '', '', 'Generics Saved You ', '', '$25.00'],
    ['', '', '', '', '', '', '', 'Insurance Saved You ', '', '$120.50'],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Please be aware that certain insurance claim information may not be included in this report. Please speak with a pharmacy staff member if you have questions regarding payments for your prescriptions.', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Thank you for choosing Walgreens', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Walgreen Co. 200 Wilmot Rd. Deerfield IL All rights reserved.', '', '', '', '', '', '', '', '', '']
];

// Create a new workbook
const wb = XLSX.utils.book_new();

// Add worksheet
const ws = XLSX.utils.aoa_to_sheet(walgreensDataMultiple);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Prescriptions');

// Write the file
const outputPath = path.join(__dirname, 'sample-walgreens-multiple.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Sample Walgreens Excel file with multiple prescriptions created: ${outputPath}`);
console.log('This file contains 4 prescription records for testing.');

// Also create a CSV version for comparison
const csvData = walgreensDataMultiple.map(row => row.join(',')).join('\n');
const csvPath = path.join(__dirname, 'sample-walgreens-multiple.csv');
require('fs').writeFileSync(csvPath, csvData);
console.log(`CSV version also created: ${csvPath}`);
