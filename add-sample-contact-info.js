const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');

mongoose.connect('mongodb://localhost:27017/tsc-purchasing')
    .then(async () => {
        console.log('Connected to MongoDB\n');
        
        // Update Albert Lea Seed House with sample contact info
        const result = await Vendor.findOneAndUpdate(
            { vendorName: /ALBERT LEA/i },
            {
                $set: {
                    'contactInfo.primaryContact': {
                        name: 'Jim Wichmann',
                        title: 'Quality Assurance & Sales',
                        email: 'jim@alseed.com',
                        phone: '800.352.5247',
                        mobile: '507-377-5247'
                    },
                    mainEmail: 'info@alseed.com',
                    mainPhone: '800-352-5247',
                    'businessInfo.website': 'https://www.alseed.com'
                }
            },
            { new: true }
        );
        
        if (result) {
            console.log('✅ Updated ALBERT LEA SEED HOUSE with contact info:');
            console.log('   Name:', result.contactInfo.primaryContact.name);
            console.log('   Title:', result.contactInfo.primaryContact.title);
            console.log('   Email:', result.contactInfo.primaryContact.email);
            console.log('   Phone:', result.contactInfo.primaryContact.phone);
            console.log('   Mobile:', result.contactInfo.primaryContact.mobile);
        } else {
            console.log('❌ Vendor not found');
        }
        
        // Update a couple more vendors for testing
        await Vendor.findOneAndUpdate(
            { vendorName: /AMERICAN TAKII/i },
            {
                $set: {
                    'contactInfo.primaryContact': {
                        name: 'Sales Department',
                        title: 'Customer Service',
                        email: 'info@takii.com',
                        phone: '559-584-5956'
                    },
                    mainEmail: 'sales@takii.com',
                    mainPhone: '559-584-5956'
                }
            }
        );
        
        console.log('✅ Updated AMERICAN TAKII INC with contact info');
        
        process.exit();
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
