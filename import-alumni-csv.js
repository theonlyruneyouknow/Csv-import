// Script to import alumni CSV data from SQL export into MongoDB
const mongoose = require('mongoose');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');
require('dotenv').config();

const Missionary = require('./models/Missionary');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Helper function to parse children field
function parseChildren(childrenString) {
    if (!childrenString || childrenString.trim() === '') return [];
    
    // Children might be formatted as "Name1, Name2" or "Name1; Name2" or various formats
    const childArray = childrenString.split(/[,;]/).map(c => c.trim()).filter(c => c);
    return childArray.map(name => ({
        name: name,
        gender: 'unknown'
    }));
}

// Helper function to parse date
function parseDate(dateString) {
    if (!dateString || dateString === 'NULL' || dateString === '') return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

// Helper function to parse boolean
function parseBoolean(value) {
    if (value === '1' || value === 1 || value === 'true' || value === true) return true;
    return false;
}

// Map CSV row to Missionary schema - ALL 39 FIELDS
function mapCsvToMissionary(row, defaultUserId) {
    // Build comprehensive notes from various fields
    const notesArray = [];
    if (row.other) notesArray.push(`Other: ${row.other}`);
    if (row.last_now) notesArray.push(`Last Known As: ${row.last_now}`);
    if (row.password) notesArray.push(`[Legacy password hash stored]`);
    
    const missionary = {
        // Basic Information - Fields 1-4
        firstName: row.firstname || '',
        lastName: row.lastname || '',
        maidenName: row.last_now || null, // last_now appears to be maiden/previous name
        
        // Mission Service - Fields 7-8, 29-30
        missionName: 'England Birmingham Mission', // Default
        missionId: row.mission_id || null,
        missionTitle: row.mis_title || null,
        serviceStartDate: parseDate(row.start_date),
        serviceEndDate: parseDate(row.end_date),
        
        // Contact Information - Fields 9-10, 20
        email: row.email || null,
        badEmail: parseBoolean(row.bad_email),
        phone: row.cur_phone || null,
        homepage: row.homepage || null,
        
        // Current Address - Fields 14-20
        currentAddress: {
            address1: row.cur_add1 || null,
            address2: row.cur_add2 || null,
            city: row.cur_city || null,
            state: row.cur_state || null,
            zip: row.cur_zip || null,
            country: row.cur_country || 'USA',
            phone: row.cur_phone || null
        },
        
        // Legacy fields for backward compatibility
        currentCity: row.cur_city || null,
        currentState: row.cur_state || null,
        currentCountry: row.cur_country || 'USA',
        
        // Permanent Address - Fields 21-27
        permanentAddress: {
            address1: row.pmt_add1 || null,
            address2: row.pmt_add2 || null,
            city: row.pmt_city || null,
            state: row.pmt_state || null,
            zip: row.pmt_zip || null,
            country: row.pmt_country || null,
            phone: row.pmt_phone || null
        },
        
        // Family Information - Fields 5, 28
        spouse: {
            name: row.spouse || null
        },
        children: parseChildren(row.children),
        
        // Photos - Field 37
        missionPhoto: (row.photo && row.photo !== 'N' && row.photo !== 'NULL') ? {
            url: row.photo,
            uploadDate: new Date()
        } : null,
        
        // Work Information - Fields 11-12, 31
        occupation: row.occupation || null,
        work: row.work || null,
        workUrl: row.work_url || null,
        
        // Notes and Additional Info - Field 13
        notes: notesArray.join('\n') || null,
        other: row.other || null,
        
        // Legacy SQL Database References - Fields 1-2, 6, 33-36, 38-39
        legacyData: {
            alumId: row.alum_id || null,
            personId: row.person_id === 'NULL' ? null : row.person_id,
            userId: row.userid || null,
            password: row.password || null, // Store legacy password hash for reference
            addDate: parseDate(row.add_date),
            lastUpdate: parseDate(row.last_update),
            lastNow: row.last_now || null, // Field 32
            lang1Counter: row.lang_1_counter ? parseInt(row.lang_1_counter) : null,
            lang2Counter: row.lang_2_counter ? parseInt(row.lang_2_counter) : null
        },
        
        // Data Quality & Tracking
        dataStatus: 'partial',
        needsVerification: true,
        dataSources: [{
            source: 'import',
            date: new Date(),
            notes: `Imported from SQL alumni table via CSV. All 39 fields processed. Alumni ID: ${row.alum_id || 'N/A'}`
        }],
        
        // System fields
        addedBy: defaultUserId,
        isActive: true
    };
    
    return missionary;
}

// Main import function
async function importAlumniCsv(csvFilePath) {
    try {
        console.log('🔍 Step 1: Looking for admin user...');
        // Find or create admin user for import
        let adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
            console.log('⚠️  Admin user not found. Trying "adminrune"...');
            adminUser = await User.findOne({ username: 'adminrune' });
        }
        if (!adminUser) {
            console.log('⚠️  No admin user found. Please run create-admin.js first or specify a user.');
            console.log('   Available users in database:');
            const allUsers = await User.find().select('username').limit(5);
            allUsers.forEach(u => console.log(`   - ${u.username}`));
            process.exit(1);
        }
        console.log(`✓ Found user: ${adminUser.username} (${adminUser._id})`);
        
        console.log(`\n🔍 Step 2: Reading CSV file: ${csvFilePath}`);
        
        if (!fs.existsSync(csvFilePath)) {
            console.error(`❌ File not found: ${csvFilePath}`);
            console.error(`   Current directory: ${process.cwd()}`);
            process.exit(1);
        }
        console.log(`✓ File exists, size: ${fs.statSync(csvFilePath).size} bytes`);
        
        const csvContent = fs.readFileSync(csvFilePath, 'utf8');
        console.log(`✓ File read successfully, content length: ${csvContent.length} characters`);
        
        console.log('\n🔍 Step 3: Parsing CSV data...');
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });
        
        console.log(`✓ CSV parsed successfully`);
        console.log(`  - Total rows: ${parsed.data.length}`);
        console.log(`  - Columns found: ${parsed.meta.fields ? parsed.meta.fields.length : 'N/A'}`);
        if (parsed.meta.fields) {
            console.log(`  - Column names: ${parsed.meta.fields.join(', ')}`);
        }
        
        if (parsed.errors.length > 0) {
            console.log(`⚠️  CSV parsing warnings (${parsed.errors.length}):`);
            parsed.errors.slice(0, 5).forEach(err => console.log(`   ${err.message}`));
            if (parsed.errors.length > 5) {
                console.log(`   ... and ${parsed.errors.length - 5} more warnings`);
            }
        }
        
        console.log(`\n📊 Found ${parsed.data.length} records to import`);
        
        if (parsed.data.length === 0) {
            console.log('❌ No data found in CSV');
            console.log('   First few lines of file:');
            console.log(csvContent.substring(0, 500));
            process.exit(0);
        }
        
        console.log('\n🔍 Step 4: Validating first record...');
        // Show sample of first record for verification
        console.log('📋 Sample of first record:');
        const firstRow = parsed.data[0];
        console.log(`   Name: ${firstRow.firstname} ${firstRow.lastname}`);
        console.log(`   Email: ${firstRow.email || 'N/A'}`);
        console.log(`   Service: ${firstRow.start_date} to ${firstRow.end_date}`);
        console.log(`   Alumni ID: ${firstRow.alum_id}`);
        console.log(`   Mission ID: ${firstRow.mission_id}`);
        console.log(`   Mission Title: ${firstRow.mis_title}`);
        console.log(`   Current Address: ${firstRow.cur_add1 || 'N/A'}`);
        console.log(`   Permanent Address: ${firstRow.pmt_add1 || 'N/A'}`);
        console.log(`   Spouse: ${firstRow.spouse || 'N/A'}`);
        console.log(`   Children: ${firstRow.children || 'N/A'}`);
        console.log(`   Work: ${firstRow.work || 'N/A'}`);
        console.log(`   Occupation: ${firstRow.occupation || 'N/A'}`);
        console.log(`   Homepage: ${firstRow.homepage || 'N/A'}`);
        console.log(`   Other: ${firstRow.other ? firstRow.other.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`   Last Now: ${firstRow.last_now || 'N/A'}`);
        console.log(`   Photo: ${firstRow.photo || 'N/A'}`);
        console.log(`   User ID: ${firstRow.userid || 'N/A'}`);
        console.log(`   Language Counters: ${firstRow.lang_1_counter}/${firstRow.lang_2_counter}`);
        
        // Count non-null fields
        const fieldCount = Object.keys(firstRow).filter(key => {
            const val = firstRow[key];
            return val && val !== '' && val !== 'NULL' && val !== 'N';
        }).length;
        console.log(`\n   ✓ Total fields with data: ${fieldCount} of 39 columns`);
        
        console.log('\n� Step 5: Starting import process...');
        console.log('💾 Importing to MongoDB...');
        
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];
        
        for (const [index, row] of parsed.data.entries()) {
            try {
                console.log(`\n🔄 Processing row ${index + 1}/${parsed.data.length}...`);
                console.log(`   Name: ${row.firstname} ${row.lastname}`);
                console.log(`   Alumni ID: ${row.alum_id}`);
                
                // Skip rows without essential data
                if (!row.firstname || !row.lastname) {
                    console.log(`   ⊘ Skipping - missing name`);
                    skipped++;
                    continue;
                }
                
                console.log(`   ✓ Mapping CSV data to schema...`);
                const missionaryData = mapCsvToMissionary(row, adminUser._id);
                console.log(`   ✓ Mapped successfully`);
                
                // Check if missionary already exists by alumni ID or name
                console.log(`   🔍 Checking for existing record...`);
                let existingMissionary = null;
                
                if (row.alum_id) {
                    console.log(`   - Searching by alumni ID: ${row.alum_id}`);
                    existingMissionary = await Missionary.findOne({
                        'legacyData.alumId': row.alum_id
                    });
                    if (existingMissionary) {
                        console.log(`   ✓ Found existing by alumni ID`);
                    }
                }
                
                if (!existingMissionary) {
                    console.log(`   - Searching by name and date`);
                    existingMissionary = await Missionary.findOne({
                        firstName: row.firstname,
                        lastName: row.lastname,
                        serviceStartDate: parseDate(row.start_date)
                    });
                    if (existingMissionary) {
                        console.log(`   ✓ Found existing by name`);
                    }
                }
                
                if (existingMissionary) {
                    // Update existing missionary
                    console.log(`   ↻ Updating existing record...`);
                    Object.assign(existingMissionary, missionaryData);
                    existingMissionary.lastEditedBy = adminUser._id;
                    await existingMissionary.save();
                    console.log(`   ✓ Updated successfully`);
                    updated++;
                } else {
                    // Create new missionary
                    console.log(`   ✓ Creating new record...`);
                    const newMissionary = await Missionary.create(missionaryData);
                    console.log(`   ✓ Created with ID: ${newMissionary._id}`);
                    imported++;
                }
                
            } catch (err) {
                console.log(`   ❌ Error processing row ${index + 1}:`);
                console.log(`      ${err.message}`);
                console.log(`      Stack: ${err.stack}`);
                errors.push({
                    row: index + 1,
                    name: `${row.firstname} ${row.lastname}`,
                    error: err.message,
                    stack: err.stack
                });
                skipped++;
            }
        }
        
        console.log('\n✅ Import Complete!');
        console.log(`   ✓ Imported: ${imported} new missionaries`);
        console.log(`   ↻ Updated: ${updated} existing missionaries`);
        console.log(`   ⊘ Skipped: ${skipped} records`);
        
        if (errors.length > 0) {
            console.log(`\n⚠️  Errors encountered (${errors.length}):`);
            errors.slice(0, 10).forEach(err => {
                console.log(`   Row ${err.row} (${err.name}): ${err.error}`);
            });
            if (errors.length > 10) {
                console.log(`   ... and ${errors.length - 10} more errors`);
            }
        }
        
        // Get total count
        const totalCount = await Missionary.countDocuments();
        console.log(`\n📊 Total missionaries in database: ${totalCount}`);
        
        // Verify first imported record has all fields
        if (imported > 0 || updated > 0) {
            console.log('\n🔍 Verifying data integrity...');
            const sample = await Missionary.findOne().sort({ createdAt: -1 });
            if (sample) {
                const populatedFields = [
                    sample.firstName && 'firstName',
                    sample.lastName && 'lastName',
                    sample.email && 'email',
                    sample.phone && 'phone',
                    sample.homepage && 'homepage',
                    sample.serviceStartDate && 'serviceStartDate',
                    sample.serviceEndDate && 'serviceEndDate',
                    sample.missionId && 'missionId',
                    sample.missionTitle && 'missionTitle',
                    sample.currentAddress?.address1 && 'currentAddress',
                    sample.permanentAddress?.address1 && 'permanentAddress',
                    sample.spouse?.name && 'spouse',
                    sample.children?.length && 'children',
                    sample.work && 'work',
                    sample.workUrl && 'workUrl',
                    sample.occupation && 'occupation',
                    sample.other && 'other',
                    sample.missionPhoto?.url && 'missionPhoto',
                    sample.legacyData?.alumId && 'legacyData.alumId',
                    sample.legacyData?.personId && 'legacyData.personId',
                    sample.legacyData?.userId && 'legacyData.userId',
                    sample.legacyData?.password && 'legacyData.password',
                    sample.legacyData?.lastNow && 'legacyData.lastNow',
                    sample.legacyData?.addDate && 'legacyData.addDate',
                    sample.legacyData?.lastUpdate && 'legacyData.lastUpdate',
                    sample.legacyData?.lang1Counter && 'legacyData.lang1Counter',
                    sample.legacyData?.lang2Counter !== null && sample.legacyData?.lang2Counter !== undefined && 'legacyData.lang2Counter'
                ].filter(Boolean);
                
                console.log(`   ✓ Sample record has ${populatedFields.length} populated fields:`);
                console.log(`     ${populatedFields.join(', ')}`);
                console.log(`\n   Sample legacy data:`, {
                    alumId: sample.legacyData?.alumId,
                    personId: sample.legacyData?.personId,
                    userId: sample.legacyData?.userId,
                    hasPassword: !!sample.legacyData?.password,
                    lastNow: sample.legacyData?.lastNow,
                    lang1: sample.legacyData?.lang1Counter,
                    lang2: sample.legacyData?.lang2Counter
                });
            }
        }
        
        console.log(`\n🎉 Visit: http://localhost:3001/ebm/missionaries to see your data!`);
        
    } catch (err) {
        console.error('❌ Import failed:', err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Get CSV file path from command line argument
const csvFilePath = process.argv[2] || 'c:\\Users\\runet\\Documents\\testEMBMiss.csv';

console.log('🚀 Starting Alumni CSV Import');
console.log(`📁 CSV File: ${csvFilePath}\n`);

// Run the import
importAlumniCsv(csvFilePath);
