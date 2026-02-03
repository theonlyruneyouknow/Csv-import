// Script to import EBM SQL data into MongoDB
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Define Missionary Schema
const missionarySchema = new mongoose.Schema({
    firstName: String,
    middleName: String,
    lastName: String,
    maidenName: String,
    title: String,
    email: String,
    phone: String,
    serviceStartDate: Date,
    serviceEndDate: Date,
    missionName: String,
    currentCity: String,
    currentState: String,
    currentCountry: String,
    spouseName: String,
    notes: String,
    facebookGroup: String,
    originalId: Number,
    createdAt: { type: Date, default: Date.now }
});

const Missionary = mongoose.model('Missionary', missionarySchema);

// Parse SQL INSERT statement
function parseSqlInsert(sqlText) {
    const missionaries = [];
    
    // Find all INSERT VALUES
    const valuesMatch = sqlText.match(/INSERT INTO `rms` VALUES (.+);/s);
    if (!valuesMatch) {
        console.error('Could not find INSERT statement');
        return missionaries;
    }
    
    const valuesString = valuesMatch[1];
    
    // Split by ),( to get individual records
    const records = valuesString.split(/\),\(/);
    
    records.forEach((record, index) => {
        try {
            // Clean up the record
            let cleanRecord = record
                .replace(/^\(/, '')  // Remove leading (
                .replace(/\)$/, ''); // Remove trailing )
            
            // Parse the values - this is tricky due to commas in strings
            const values = [];
            let current = '';
            let inString = false;
            let stringChar = null;
            
            for (let i = 0; i < cleanRecord.length; i++) {
                const char = cleanRecord[i];
                const nextChar = cleanRecord[i + 1];
                
                if ((char === "'" || char === '"') && cleanRecord[i - 1] !== '\\') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = null;
                    }
                    current += char;
                } else if (char === ',' && !inString) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim()); // Don't forget the last value
            
            // Clean values
            const cleanValues = values.map(v => {
                if (v === 'NULL' || v === '') return null;
                // Remove quotes
                if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
                    return v.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
                }
                return v;
            });
            
            // Map SQL columns to our schema
            // SQL columns: rm_ID, reunion, LNFN, FN, FN2, LN, Title, Title2, I_remember, Facebook_group, blank2, 
            //              MissionStart, MissionEnd, Months, blank3, MissionNetID, start_through_end, Mission, 
            //              Start_month, start_year, End_Month, End_Year, Jeppson, VinStanley, Spallino, Hyde, Collaster
            
            const missionary = {
                originalId: cleanValues[0] ? parseInt(cleanValues[0]) : null,
                firstName: cleanValues[3] || cleanValues[4], // FN or FN2
                lastName: cleanValues[5],
                title: cleanValues[6] || cleanValues[7],
                facebookGroup: cleanValues[9],
                serviceStartDate: cleanValues[11] ? new Date(cleanValues[11]) : null,
                serviceEndDate: cleanValues[12] ? new Date(cleanValues[12]) : null,
                missionName: cleanValues[17],
                notes: cleanValues[8],
                currentCountry: 'Unknown'
            };
            
            // Only add if we have at least first and last name
            if (missionary.firstName && missionary.lastName) {
                missionaries.push(missionary);
            }
            
        } catch (err) {
            console.error(`Error parsing record ${index}:`, err.message);
        }
    });
    
    return missionaries;
}

// Main import function
async function importMissionaries() {
    try {
        console.log('📖 Reading SQL file...');
        
        // Read the SQL file (you'll need to save it first)
        const sqlFile = 'ebm-data.sql';
        if (!fs.existsSync(sqlFile)) {
            console.log('⚠️  Please create ebm-data.sql with your SQL dump data');
            console.log('   Paste the INSERT INTO statement into that file');
            process.exit(0);
        }
        
        const sqlText = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('🔄 Parsing SQL data...');
        const missionaries = parseSqlInsert(sqlText);
        
        console.log(`📊 Found ${missionaries.length} missionaries to import`);
        
        if (missionaries.length === 0) {
            console.log('❌ No missionaries found to import');
            process.exit(0);
        }
        
        console.log('💾 Importing to MongoDB...');
        
        let imported = 0;
        let skipped = 0;
        
        for (const missionary of missionaries) {
            try {
                // Check if already exists by originalId
                if (missionary.originalId) {
                    const exists = await Missionary.findOne({ originalId: missionary.originalId });
                    if (exists) {
                        skipped++;
                        continue;
                    }
                }
                
                await Missionary.create(missionary);
                imported++;
                
                if (imported % 100 === 0) {
                    console.log(`   Imported ${imported}/${missionaries.length}...`);
                }
            } catch (err) {
                console.error(`   Error importing ${missionary.firstName} ${missionary.lastName}:`, err.message);
                skipped++;
            }
        }
        
        console.log('\n✅ Import Complete!');
        console.log(`   ✓ Imported: ${imported} missionaries`);
        console.log(`   ⊘ Skipped: ${skipped} (duplicates or errors)`);
        console.log(`\n🎉 Visit: http://localhost:3001/ebm/missionaries to see your data!`);
        
    } catch (err) {
        console.error('❌ Import failed:', err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

// Run the import
importMissionaries();
