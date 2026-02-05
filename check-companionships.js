require('dotenv').config();
const mongoose = require('mongoose');
const Companionship = require('./models/Companionship');
const Missionary = require('./models/Missionary');
const MissionArea = require('./models/MissionArea');

async function checkCompanionships() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const totalCompanionships = await Companionship.countDocuments();
        console.log(`\n📊 Total Companionships: ${totalCompanionships}`);

        if (totalCompanionships > 0) {
            // Get sample companionships with details
            const samples = await Companionship.find()
                .limit(5)
                .populate('missionaries.missionary', 'firstName lastName displayName')
                .populate('area', 'name');

            console.log('\n📋 Sample Companionships:');
            samples.forEach((comp, index) => {
                console.log(`\n${index + 1}. Companionship ID: ${comp._id}`);
                console.log(`   Area: ${comp.area?.name || 'Unknown'}`);
                console.log(`   Missionaries:`);
                comp.missionaries.forEach(m => {
                    const name = m.missionary?.displayName || 
                                `${m.missionary?.firstName} ${m.missionary?.lastName}` || 
                                'Unknown';
                    console.log(`     - ${name} (${m.role})`);
                });
                console.log(`   Start Date: ${comp.startDate ? new Date(comp.startDate).toLocaleDateString() : 'N/A'}`);
                console.log(`   Duration: ${comp.duration ? comp.duration + ' weeks' : 'N/A'}`);
            });

            // Check a specific missionary for companions
            console.log('\n\n🔍 Checking a sample missionary for companions...');
            const missionaryWithComps = await Missionary.findOne({ 
                companionships: { $exists: true, $ne: [] } 
            }).populate({
                path: 'companionships',
                populate: [
                    { path: 'missionaries.missionary', select: 'firstName lastName displayName' },
                    { path: 'area', select: 'name' }
                ]
            });

            if (missionaryWithComps) {
                console.log(`\n👤 Missionary: ${missionaryWithComps.displayName || missionaryWithComps.firstName + ' ' + missionaryWithComps.lastName}`);
                console.log(`   Has ${missionaryWithComps.companionships.length} companionship(s)`);
                
                missionaryWithComps.companionships.forEach((comp, idx) => {
                    console.log(`\n   Companionship ${idx + 1}:`);
                    console.log(`     Area: ${comp.area?.name || 'Unknown'}`);
                    console.log(`     Companions:`);
                    comp.missionaries.forEach(m => {
                        if (m.missionary._id.toString() !== missionaryWithComps._id.toString()) {
                            const name = m.missionary?.displayName || 
                                        `${m.missionary?.firstName} ${m.missionary?.lastName}`;
                            console.log(`       - ${name} (${m.role})`);
                        }
                    });
                });
            } else {
                console.log('   No missionaries found with companionships');
            }
        } else {
            console.log('\n❌ No companionships found in the database');
            console.log('   You may need to import the companionship CSV file');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkCompanionships();
