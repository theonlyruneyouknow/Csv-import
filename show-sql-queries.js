require('dotenv').config();
const mongoose = require('mongoose');
const Missionary = require('./models/Missionary');
const MissionArea = require('./models/MissionArea');
const Companionship = require('./models/Companionship');

async function showDatabaseStructure() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('='.repeat(80));
        console.log('EBM DATABASE STRUCTURE & SQL EXPORT QUERIES');
        console.log('='.repeat(80));

        // Get sample data to understand structure
        const sampleMissionary = await Missionary.findOne({ 'legacyData.alumId': { $exists: true } });
        const sampleArea = await MissionArea.findOne({ legacyAId: { $exists: true } });

        console.log('\n📊 CURRENT MONGODB STRUCTURE\n');
        
        console.log('1. MISSIONARIES COLLECTION');
        console.log('   Documents:', await Missionary.countDocuments());
        if (sampleMissionary) {
            console.log('   Sample document fields:');
            console.log('   - firstName, lastName, maidenName');
            console.log('   - email, phone, homepage');
            console.log('   - serviceStartDate, serviceEndDate');
            console.log('   - currentAddress, permanentAddress');
            console.log('   - spouse, children, occupation');
            console.log('   - legacyData.alumId (primary key from SQL)');
            console.log('   - areasServed[] (references to MissionArea docs)');
        }

        console.log('\n2. MISSION AREAS COLLECTION');
        console.log('   Documents:', await MissionArea.countDocuments());
        if (sampleArea) {
            console.log('   Sample document fields:');
            console.log('   - name, city, county, region');
            console.log('   - legacyAId (specific spelling variant ID)');
            console.log('   - legacyAreaId (normalized area group ID)');
            console.log('   - isCanonical (marks preferred spelling)');
        }

        console.log('\n3. COMPANIONSHIPS COLLECTION');
        console.log('   Documents:', await Companionship.countDocuments());
        console.log('   Fields:');
        console.log('   - missionaries[] (array of 2+ missionary references)');
        console.log('   - area (reference to MissionArea)');
        console.log('   - startDate, endDate');

        console.log('\n\n' + '='.repeat(80));
        console.log('SQL QUERIES TO EXPORT YOUR DATA');
        console.log('='.repeat(80));

        console.log('\n📋 1. MISSIONARIES EXPORT\n');
        console.log('-- Export all missionary data');
        console.log('SELECT ');
        console.log('    alum_id,');
        console.log('    firstname,');
        console.log('    lastname,');
        console.log('    last_now,          -- maiden name');
        console.log('    email,');
        console.log('    bad_email,');
        console.log('    cur_phone,');
        console.log('    homepage,');
        console.log('    start_date,        -- mission start');
        console.log('    end_date,          -- mission end');
        console.log('    cur_add1,');
        console.log('    cur_add2,');
        console.log('    cur_city,');
        console.log('    cur_state,');
        console.log('    cur_zip,');
        console.log('    cur_country,');
        console.log('    pmt_add1,          -- permanent address');
        console.log('    pmt_add2,');
        console.log('    pmt_city,');
        console.log('    pmt_state,');
        console.log('    pmt_zip,');
        console.log('    pmt_country,');
        console.log('    pmt_phone,');
        console.log('    spouse,');
        console.log('    children,');
        console.log('    photo,');
        console.log('    occupation,');
        console.log('    work,');
        console.log('    work_url,');
        console.log('    other,');
        console.log('    mission_id,');
        console.log('    mis_title,');
        console.log('    person_id,');
        console.log('    userid,');
        console.log('    password,');
        console.log('    add_date,');
        console.log('    last_update,');
        console.log('    lang_1_counter,');
        console.log('    lang_2_counter');
        console.log('FROM alumni');
        console.log('ORDER BY alum_id;');

        console.log('\n\n📋 2. AREAS EXPORT (ALL VARIANTS)\n');
        console.log('-- Export all area spelling variants with their grouping');
        console.log('SELECT ');
        console.log('    a_id,              -- specific variant ID (unique)');
        console.log('    area_id,           -- normalized group ID (multiple a_ids share same area_id)');
        console.log('    area_nam           -- the actual name/spelling');
        console.log('FROM areas');
        console.log('WHERE a_id IS NOT NULL');
        console.log('ORDER BY area_id, a_id;');

        console.log('\n\n📋 3. MISSIONARY-AREA RELATIONSHIPS EXPORT\n');
        console.log('-- Export which areas each missionary served in');
        console.log('-- BEST: If you have the specific a_id they entered:');
        console.log('SELECT ');
        console.log('    alum_id,           -- missionary ID');
        console.log('    a_id,              -- specific area variant they entered');
        console.log('    area_sequence      -- order/sequence (optional)');
        console.log('FROM alumni_areas');
        console.log('WHERE a_id IS NOT NULL');
        console.log('ORDER BY alum_id, area_sequence;');
        console.log('');
        console.log('-- FALLBACK: If you only have normalized area_id:');
        console.log('SELECT ');
        console.log('    alum_id,           -- missionary ID');
        console.log('    area_id,           -- normalized area group ID');
        console.log('    area_sequence      -- order/sequence (optional)');
        console.log('FROM alumni_areas');
        console.log('WHERE area_id IS NOT NULL');
        console.log('ORDER BY alum_id, area_sequence;');

        console.log('\n\n📋 4. COMPANIONSHIPS EXPORT\n');
        console.log('-- Export companion relationships');
        console.log('SELECT ');
        console.log('    companionship_id,  -- unique companionship ID');
        console.log('    rm1_id,            -- first missionary (senior)');
        console.log('    rm2_id,            -- second missionary (junior)');
        console.log('    area_id,           -- area they served together (can be NULL)');
        console.log('    start_date,        -- when companionship started (optional)');
        console.log('    end_date           -- when companionship ended (optional)');
        console.log('FROM companionships');
        console.log('ORDER BY companionship_id;');

        console.log('\n\n' + '='.repeat(80));
        console.log('ADDITIONAL TABLES TO CONSIDER');
        console.log('='.repeat(80));

        console.log('\n📋 5. OTHER POSSIBLE TABLES\n');
        console.log('-- If you have these tables, export them too:');
        console.log('');
        console.log('-- Photos/Images');
        console.log('SELECT alum_id, photo_url, photo_type, upload_date FROM photos;');
        console.log('');
        console.log('-- Contact history/updates');
        console.log('SELECT alum_id, contact_date, contact_method, notes FROM contact_log;');
        console.log('');
        console.log('-- Family information');
        console.log('SELECT alum_id, spouse_name, marriage_date, children_count FROM family;');
        console.log('');
        console.log('-- Mission assignments/transfers');
        console.log('SELECT alum_id, area_id, transfer_date, transfer_type FROM transfers;');

        console.log('\n\n' + '='.repeat(80));
        console.log('RECOMMENDED EXPORT ORDER');
        console.log('='.repeat(80));
        console.log('\n1. Export missionaries (alumni table) → missionaries.csv');
        console.log('2. Export areas (areas table) → areas.csv');
        console.log('3. Export missionary-areas (alumni_areas table) → missionary-areas.csv');
        console.log('4. Export companionships → companionships.csv');
        console.log('\nThen import in the same order through the web interface.');

        console.log('\n\n' + '='.repeat(80));
        console.log('EXAMPLE: MySQL EXPORT COMMANDS');
        console.log('='.repeat(80));
        console.log('\nmysql -u your_user -p your_database -e "SELECT * FROM alumni" > missionaries.csv');
        console.log('mysql -u your_user -p your_database -e "SELECT a_id, area_id, area_nam FROM areas WHERE a_id IS NOT NULL" > areas.csv');
        console.log('mysql -u your_user -p your_database -e "SELECT alum_id, area_id FROM alumni_areas WHERE area_id IS NOT NULL" > missionary-areas.csv');

        console.log('\n\n' + '='.repeat(80));
        console.log('CURRENT DATA SUMMARY');
        console.log('='.repeat(80));
        
        const stats = {
            missionaries: await Missionary.countDocuments(),
            missionariesWithLegacyId: await Missionary.countDocuments({ 'legacyData.alumId': { $exists: true, $ne: null } }),
            areas: await MissionArea.countDocuments(),
            areasWithAId: await MissionArea.countDocuments({ legacyAId: { $exists: true, $ne: null } }),
            areasWithAreaId: await MissionArea.countDocuments({ legacyAreaId: { $exists: true, $ne: null } }),
            companionships: await Companionship.countDocuments()
        };

        console.log('\n✅ Currently imported:');
        console.log(`   Missionaries: ${stats.missionaries} (${stats.missionariesWithLegacyId} with legacy IDs)`);
        console.log(`   Areas: ${stats.areas} (${stats.areasWithAId} with a_id, ${stats.areasWithAreaId} with area_id)`);
        console.log(`   Companionships: ${stats.companionships}`);

        // Check for relationships
        const missionariesWithAreas = await Missionary.countDocuments({
            areasServed: { $exists: true, $not: { $size: 0 } }
        });
        console.log(`   Missionaries with areas linked: ${missionariesWithAreas}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
    }
}

showDatabaseStructure();
