const XLSX = require('xlsx');
const path = require('path');

// Sample Walgreens data based on your provided format
const walgreensData = [
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
    ['', '', '', '', '', '', '', 'Total ', '', '$0.00'],
    ['', '', '', '', '', '', '', 'Generics Saved You ', '', '$0.00'],
    ['', '', '', '', '', '', '', 'Insurance Saved You ', '', '$35.39'],
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
const ws = XLSX.utils.aoa_to_sheet(walgreensData);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Prescriptions');

// Write the file
const outputPath = path.join(__dirname, 'sample-walgreens-data.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Sample Walgreens Excel file created: ${outputPath}`);
console.log('This file can be used to test the Excel import functionality.');
