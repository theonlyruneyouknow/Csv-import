const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');

mongoose.connect('mongodb://localhost:27017/tsc-purchasing')
    .then(async () => {
        console.log('Connected to MongoDB\n');
        
        // Get a few vendors to see what data exists
        const vendors = await Vendor.find().limit(5).lean();
        
        vendors.forEach(vendor => {
            console.log('='.repeat(80));
            console.log('VENDOR:', vendor.vendorName);
            console.log('CODE:', vendor.vendorCode);
            console.log('\nCONTACT INFO OBJECT:', vendor.contactInfo);
            console.log('\nPRIMARY CONTACT:', vendor.contactInfo?.primaryContact);
            console.log('\nMAIN EMAIL:', vendor.mainEmail);
            console.log('MAIN PHONE:', vendor.mainPhone);
            console.log('\nADDRESS:', vendor.address);
            console.log('='.repeat(80));
            console.log('\n');
        });
        
        process.exit();
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
