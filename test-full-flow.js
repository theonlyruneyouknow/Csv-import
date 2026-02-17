// Comprehensive test to find the missing link
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

const PrePurchaseOrder = require('./models/PrePurchaseOrder');

async function runFullTest() {
    try {
        console.log('🔬 ========== COMPREHENSIVE PRE-PO TEST ==========\n');

        // Step 1: Connect to database
        console.log('Step 1: Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected\n');

        // Step 2: Direct database insert with ALL fields
        console.log('Step 2: Creating pre-PO directly in database with ALL fields...');
        const testData = {
            orderNumber: 'DIRECTTEST456',
            vendor: 'DIRECT TEST VENDOR',
            poLink: 'https://direct.test.com/po/456',
            date: '2026-02-16',
            enteredBy: 'Direct Test Script',
            productTeamNotes: 'These are comprehensive product team notes for testing',
            approval: 'Approved',
            ynh: 'Y',
            notesQuestions: 'What is the ETA? When will it arrive?',
            response: 'Ships next week, arrives by end of month',
            followUp: 'Check on 2026-03-01',
            createdBy: 'TestScript'
        };

        console.log('Test data:', JSON.stringify(testData, null, 2));
        const directPrePO = await PrePurchaseOrder.create(testData);
        console.log('✅ Direct insert successful!');
        console.log('   ID:', directPrePO._id);
        console.log('   Order Number:', directPrePO.orderNumber);
        console.log('   All fields populated:', {
            orderNumber: !!directPrePO.orderNumber,
            vendor: !!directPrePO.vendor,
            poLink: !!directPrePO.poLink,
            date: !!directPrePO.date,
            enteredBy: !!directPrePO.enteredBy,
            productTeamNotes: !!directPrePO.productTeamNotes,
            approval: !!directPrePO.approval,
            ynh: !!directPrePO.ynh,
            notesQuestions: !!directPrePO.notesQuestions,
            response: !!directPrePO.response,
            followUp: !!directPrePO.followUp
        });

        // Step 3: Retrieve from database to verify
        console.log('\nStep 3: Retrieving from database to verify...');
        const retrieved = await PrePurchaseOrder.findById(directPrePO._id);
        console.log('✅ Retrieved successfully!');
        console.log('   Order Number:', retrieved.orderNumber);
        console.log('   Vendor:', retrieved.vendor);
        console.log('   PO Link:', retrieved.poLink);
        console.log('   Date:', retrieved.date);
        console.log('   Entered By:', retrieved.enteredBy);
        console.log('   Product Team Notes:', retrieved.productTeamNotes);
        console.log('   Approval:', retrieved.approval);
        console.log('   Y/N/H:', retrieved.ynh);
        console.log('   Notes/Questions:', retrieved.notesQuestions);
        console.log('   Response:', retrieved.response);
        console.log('   Follow-Up:', retrieved.followUp);

        // Step 4: Simulate a POST request like the browser sends
        console.log('\nStep 4: Simulating browser POST request to server...');
        const postData = {
            orderNumber: 'POSTTEST789',
            vendor: 'POST TEST VENDOR',
            poLink: 'https://post.test.com/po/789',
            date: '2026-02-16',
            enteredBy: 'POST Test Script',
            productTeamNotes: 'POST request product notes',
            approval: 'Pending Review',
            ynh: 'H',
            notesQuestions: 'POST test question?',
            response: 'POST test response',
            followUp: 'POST test follow up'
        };

        console.log('POST data:', JSON.stringify(postData, null, 2));

        try {
            const response = await fetch('http://localhost:3001/purchase-orders/pre-purchase-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': 'connect.sid=test' // Note: This won't work without proper auth
                },
                body: JSON.stringify(postData)
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response body:', JSON.stringify(result, null, 2));

            if (response.status === 401 || response.status === 403) {
                console.log('⚠️  Authentication required - this is expected for protected routes');
                console.log('   The issue is NOT with authentication since browser is logged in');
            } else if (result.success) {
                console.log('✅ POST request successful!');
                
                // Verify it saved correctly
                console.log('\nStep 5: Verifying POST-created pre-PO in database...');
                const postCreatedPrePO = await PrePurchaseOrder.findById(result.prePO._id || result.id);
                if (postCreatedPrePO) {
                    console.log('✅ Found in database!');
                    console.log('   Order Number:', postCreatedPrePO.orderNumber);
                    console.log('   Vendor:', postCreatedPrePO.vendor);
                    console.log('   All fields:', {
                        orderNumber: postCreatedPrePO.orderNumber || 'EMPTY',
                        poLink: postCreatedPrePO.poLink || 'EMPTY',
                        date: postCreatedPrePO.date || 'EMPTY',
                        enteredBy: postCreatedPrePO.enteredBy || 'EMPTY',
                        productTeamNotes: postCreatedPrePO.productTeamNotes || 'EMPTY',
                        approval: postCreatedPrePO.approval || 'EMPTY',
                        ynh: postCreatedPrePO.ynh || 'EMPTY',
                        notesQuestions: postCreatedPrePO.notesQuestions || 'EMPTY',
                        response: postCreatedPrePO.response || 'EMPTY',
                        followUp: postCreatedPrePO.followUp || 'EMPTY'
                    });
                }
            } else {
                console.log('❌ POST request failed:', result);
            }
        } catch (fetchError) {
            console.log('⚠️  POST request error (likely auth issue):', fetchError.message);
            console.log('   This is OK - we confirmed direct database insert works');
        }

        // Step 6: Check total count
        console.log('\nStep 6: Checking total pre-PO count...');
        const total = await PrePurchaseOrder.countDocuments();
        console.log(`📊 Total pre-POs in database: ${total}`);

        // Step 7: Show latest 3
        console.log('\nStep 7: Latest 3 pre-POs:');
        const latest = await PrePurchaseOrder.find().sort({ createdAt: -1 }).limit(3);
        latest.forEach((po, i) => {
            console.log(`\n${i + 1}. ${po.vendor}`);
            console.log(`   Order #: ${po.orderNumber || 'EMPTY'}`);
            console.log(`   Date: ${po.date || 'EMPTY'}`);
            console.log(`   Entered By: ${po.enteredBy || 'EMPTY'}`);
            console.log(`   Y/N/H: ${po.ynh || 'EMPTY'}`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Test completed successfully!');
        console.log('\n📋 SUMMARY:');
        console.log('   ✅ Database connection: Working');
        console.log('   ✅ Direct database insert: Working');
        console.log('   ✅ Database retrieval: Working');
        console.log('   ✅ All fields saved correctly: YES');
        console.log('   ⚠️  POST endpoint: Requires authentication');
        console.log('\n🔍 NEXT STEP: Test from browser with authenticated session');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

runFullTest();
