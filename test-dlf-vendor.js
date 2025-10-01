const { splitVendorData } = require('./lib/vendorUtils');

// Test DLF vendor splitting
const dlfVendor = "792 DLF USA Inc";
const result = splitVendorData(dlfVendor);

console.log('Testing DLF vendor splitting:');
console.log('Input:', dlfVendor);
console.log('Result:', result);
console.log('Vendor Number:', result.vendorNumber);
console.log('Vendor Name:', result.vendorName);
console.log('Internal ID would be:', result.vendorNumber || result.vendorName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
