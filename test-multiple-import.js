const XLSX = require('xlsx');
const path = require('path');

// Create test data with multiple prescriptions in exact Walgreens format
const testData = [
    ['Confidential Prescription Records', '', '', '', '', '', '', ''],
    ['Patient Name:', 'John Smith', '', '', '', '', '', ''],
    ['Date of Birth:', '01/15/1980', '', '', '', '', '', ''],
    ['Address:', '123 Main St, Anytown, ST 12345', '', '', '', '', '', ''],
    ['Phone:', '(555) 123-4567', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Showing 3 Prescriptions', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Fill Date', 'Drug Name', 'Prescriber', 'Qty', 'Day Supply', 'Generic', 'Price', 'Rx Number'],
    ['12/15/2024', 'Lisinopril 10mg', 'Dr. Johnson', '30', '30', 'Y', '$15.99', 'RX123456'],
    ['12/10/2024', 'Metformin 500mg', 'Dr. Smith', '60', '30', 'Y', '$25.99', 'RX789012'],
    ['12/08/2024', 'Atorvastatin 20mg', 'Dr. Johnson', '30', '30', 'Y', '$19.99', 'RX345678'],
    ['', '', '', '', '', '', '', ''],
    ['Total Prescriptions: 3', '', '', '', '', '', '', ''],
    ['Thank you for choosing Walgreens', '', '', '', '', '', '', '']
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(testData);

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Prescriptions');

// Write to file
const filePath = path.join(__dirname, 'test-multiple-prescriptions.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`✅ Created test file with multiple prescriptions: ${filePath}`);
console.log(`📊 File contains ${testData.length} rows`);
console.log(`💊 Contains 3 prescriptions for patient John Smith`);
