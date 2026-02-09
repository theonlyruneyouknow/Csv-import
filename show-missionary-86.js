require('dotenv').config();
const mongoose = require('mongoose');
const Missionary = require('./models/Missionary');
const MissionArea = require('./models/MissionArea');
const Companionship = require('./models/Companionship');
const User = require('./models/User'); // Need this for population

async function showMissionary86() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('='.repeat(80));
        console.log('MISSIONARY DATA: alum_id = 86');
        console.log('='.repeat(80));

        // Find the missionary
        const missionary = await Missionary.findOne({ 'legacyData.alumId': '86' })
            .populate('areasServed')
            .populate('addedBy', 'username')
            .populate('verifiedBy', 'username');

        if (!missionary) {
            console.log('❌ Missionary with alum_id = 86 not found');
            return;
        }

        console.log('\n📋 BASIC INFORMATION\n');
        console.log(`Name: ${missionary.firstName} ${missionary.lastName}`);
        if (missionary.maidenName) console.log(`Maiden Name: ${missionary.maidenName}`);
        console.log(`Mission: ${missionary.missionName || 'N/A'}`);
        console.log(`Service Dates: ${missionary.serviceStartDate ? missionary.serviceStartDate.toISOString().split('T')[0] : 'N/A'} to ${missionary.serviceEndDate ? missionary.serviceEndDate.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`Email: ${missionary.email || 'N/A'}`);
        console.log(`Phone: ${missionary.phone || 'N/A'}`);
        console.log(`Homepage: ${missionary.homepage || 'N/A'}`);

        console.log('\n📍 CURRENT ADDRESS\n');
        if (missionary.currentAddress && (missionary.currentAddress.address1 || missionary.currentAddress.city)) {
            console.log(`  ${missionary.currentAddress.address1 || ''}`);
            if (missionary.currentAddress.address2) console.log(`  ${missionary.currentAddress.address2}`);
            console.log(`  ${missionary.currentAddress.city || ''}, ${missionary.currentAddress.state || ''} ${missionary.currentAddress.zip || ''}`);
            console.log(`  ${missionary.currentAddress.country || 'USA'}`);
        } else {
            console.log('  Not provided');
        }

        console.log('\n🏠 PERMANENT ADDRESS\n');
        if (missionary.permanentAddress && (missionary.permanentAddress.address1 || missionary.permanentAddress.city)) {
            console.log(`  ${missionary.permanentAddress.address1 || ''}`);
            if (missionary.permanentAddress.address2) console.log(`  ${missionary.permanentAddress.address2}`);
            console.log(`  ${missionary.permanentAddress.city || ''}, ${missionary.permanentAddress.state || ''} ${missionary.permanentAddress.zip || ''}`);
            console.log(`  ${missionary.permanentAddress.country || ''}`);
        } else {
            console.log('  Not provided');
        }

        console.log('\n👨‍👩‍👧‍👦 FAMILY\n');
        console.log(`Spouse: ${missionary.spouse?.name || 'N/A'}`);
        if (missionary.children && missionary.children.length > 0) {
            console.log(`Children (${missionary.children.length}):`);
            missionary.children.forEach((child, i) => {
                console.log(`  ${i + 1}. ${child.name}`);
            });
        } else {
            console.log('Children: None listed');
        }

        console.log('\n💼 OCCUPATION\n');
        console.log(`Occupation: ${missionary.occupation || 'N/A'}`);
        console.log(`Work: ${missionary.work || 'N/A'}`);
        console.log(`Work URL: ${missionary.workUrl || 'N/A'}`);

        console.log('\n📸 PHOTO\n');
        if (missionary.missionPhoto?.url) {
            console.log(`Photo URL: ${missionary.missionPhoto.url}`);
        } else {
            console.log('No photo');
        }

        console.log('\n📝 NOTES\n');
        console.log(missionary.notes || 'No notes');

        console.log('\n🗂️ LEGACY DATA (from SQL database)\n');
        if (missionary.legacyData) {
            console.log(`  alum_id: ${missionary.legacyData.alumId || 'N/A'}`);
            console.log(`  person_id: ${missionary.legacyData.personId || 'N/A'}`);
            console.log(`  user_id: ${missionary.legacyData.userId || 'N/A'}`);
            console.log(`  mission_id: ${missionary.missionId || 'N/A'}`);
            console.log(`  mission_title: ${missionary.missionTitle || 'N/A'}`);
            console.log(`  last_now: ${missionary.legacyData.lastNow || 'N/A'}`);
            console.log(`  add_date: ${missionary.legacyData.addDate ? missionary.legacyData.addDate.toISOString() : 'N/A'}`);
            console.log(`  last_update: ${missionary.legacyData.lastUpdate ? missionary.legacyData.lastUpdate.toISOString() : 'N/A'}`);
        }

        console.log('\n🗺️ AREAS SERVED\n');
        if (missionary.areasServed && missionary.areasServed.length > 0) {
            console.log(`Total areas: ${missionary.areasServed.length}\n`);
            
            // Group areas by area_id to show variants together
            const areasByGroupId = new Map();
            missionary.areasServed.forEach(area => {
                const groupId = area.legacyAreaId || 'NO_GROUP';
                if (!areasByGroupId.has(groupId)) {
                    areasByGroupId.set(groupId, []);
                }
                areasByGroupId.get(groupId).push(area);
            });

            let counter = 1;
            areasByGroupId.forEach((variants, groupId) => {
                if (groupId === 'NO_GROUP') {
                    // Show ungrouped areas
                    variants.forEach(area => {
                        console.log(`${counter}. "${area.name}"`);
                        console.log(`   area_id: NOT SET`);
                        console.log(`   a_id: ${area.legacyAId || 'NOT SET'}`);
                        console.log(`   Is Canonical: ${area.isCanonical ? 'YES' : 'NO'}`);
                        console.log('');
                        counter++;
                    });
                } else {
                    // Show grouped areas
                    console.log(`${counter}. area_id: ${groupId} (${variants.length} variant${variants.length > 1 ? 's' : ''})`);
                    variants.forEach((area, idx) => {
                        const marker = area.isCanonical ? '★' : ' ';
                        console.log(`   ${marker} "${area.name}" (a_id: ${area.legacyAId || 'N/A'})`);
                    });
                    console.log('');
                    counter++;
                }
            });
        } else {
            console.log('No areas linked yet');
            console.log('');
            console.log('To link areas, re-import the missionary-area relationships CSV');
            console.log('at http://localhost:3001/ebm/import with "Missionary-Area Relationships" option');
        }

        console.log('\n👥 COMPANIONSHIPS\n');
        const companionships = await Companionship.find({
            'missionaries.missionary': missionary._id
        })
            .populate('missionaries.missionary', 'firstName lastName')
            .populate('area', 'name');

        if (companionships.length > 0) {
            console.log(`Total companionships: ${companionships.length}\n`);
            companionships.slice(0, 10).forEach((comp, i) => {
                console.log(`${i + 1}. Companionship:`);
                comp.missionaries.forEach(m => {
                    const isThis = m.missionary._id.toString() === missionary._id.toString();
                    console.log(`   ${isThis ? '→' : ' '} ${m.missionary.firstName} ${m.missionary.lastName} (${m.role})`);
                });
                console.log(`   Area: ${comp.area?.name || 'Not specified'}`);
                console.log(`   Start: ${comp.startDate ? comp.startDate.toISOString().split('T')[0] : 'N/A'}`);
                console.log('');
            });
            if (companionships.length > 10) {
                console.log(`... and ${companionships.length - 10} more companionships`);
            }
        } else {
            console.log('No companionships recorded');
        }

        console.log('\n📊 AVAILABLE AREAS IN DATABASE\n');
        const totalAreas = await MissionArea.countDocuments();
        const areasWithAreaId = await MissionArea.countDocuments({ legacyAreaId: { $exists: true, $ne: null } });
        const areasWithAId = await MissionArea.countDocuments({ legacyAId: { $exists: true, $ne: null } });
        
        console.log(`Total areas in database: ${totalAreas}`);
        console.log(`  - With area_id: ${areasWithAreaId}`);
        console.log(`  - With a_id: ${areasWithAId}`);
        console.log('');
        
        // Show sample areas grouped by area_id
        console.log('Sample areas (first 10 groups by area_id):');
        const sampleAreas = await MissionArea.find({ legacyAreaId: { $exists: true, $ne: null } })
            .sort({ legacyAreaId: 1 })
            .limit(30);
        
        const areaGroups = new Map();
        sampleAreas.forEach(area => {
            const groupId = area.legacyAreaId;
            if (!areaGroups.has(groupId)) {
                areaGroups.set(groupId, []);
            }
            areaGroups.get(groupId).push(area);
        });

        let groupCounter = 1;
        for (const [groupId, variants] of areaGroups) {
            if (groupCounter > 10) break;
            console.log(`  ${groupCounter}. area_id: ${groupId} → ${variants.length} variant${variants.length > 1 ? 's' : ''}`);
            variants.forEach(v => {
                const marker = v.isCanonical ? '★' : ' ';
                console.log(`     ${marker} "${v.name}" (a_id: ${v.legacyAId})`);
            });
            groupCounter++;
        }

        console.log('\n📊 METADATA\n');
        console.log(`Data Status: ${missionary.dataStatus || 'N/A'}`);
        console.log(`Needs Verification: ${missionary.needsVerification ? 'YES' : 'NO'}`);
        console.log(`Is Active: ${missionary.isActive ? 'YES' : 'NO'}`);
        console.log(`Added By: ${missionary.addedBy?.username || 'N/A'}`);
        console.log(`Verified By: ${missionary.verifiedBy?.username || 'Not verified'}`);
        console.log(`Created: ${missionary.createdAt ? missionary.createdAt.toISOString() : 'N/A'}`);
        console.log(`Updated: ${missionary.updatedAt ? missionary.updatedAt.toISOString() : 'N/A'}`);

        if (missionary.dataSources && missionary.dataSources.length > 0) {
            console.log(`\nData Sources (${missionary.dataSources.length}):`);
            missionary.dataSources.forEach((source, i) => {
                console.log(`  ${i + 1}. ${source.source} - ${source.date ? source.date.toISOString().split('T')[0] : 'N/A'}`);
                if (source.notes) console.log(`     ${source.notes}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('COMPLETE DOCUMENT (JSON)');
        console.log('='.repeat(80));
        console.log(JSON.stringify(missionary.toObject(), null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

showMissionary86();
