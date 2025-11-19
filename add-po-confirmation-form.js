// add-po-confirmation-form.js
// Run this once to add the PO Confirmation form to the database
require('dotenv').config();
const mongoose = require('mongoose');
const Form = require('./models/Form');

async function addForm() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders');
        console.log('✅ Connected to MongoDB');

        const embedCode = '<iframe width="640px" height="480px" src="https://forms.office.com/Pages/ResponsePage.aspx?id=3dEHsfhTrkCaa4zoGmBMvmJ9Z8fLyHxErtfn8ze6jI5UNlpGNEdOWklLQVpIMllERzBMNVJUQ1dPOC4u&embed=true" frameborder="0" marginwidth="0" marginheight="0" style="border: none; max-width:100%; max-height:100vh" allowfullscreen webkitallowfullscreen mozallowfullscreen msallowfullscreen> </iframe>';

        const form = new Form({
            name: 'PO Confirmation',
            embedCode: embedCode,
            description: 'Submit purchase order confirmation details',
            category: 'management',
            order: 0,
            isActive: true
        });

        await form.save();
        console.log('✅ Form added successfully!');
        console.log('📝 Form details:', {
            name: form.name,
            id: form._id,
            category: form.category
        });

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addForm();
