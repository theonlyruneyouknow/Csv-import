require('dotenv').config();
const mysql = require('mysql2/promise');

// MySQL connection configuration
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'ebm',
    port: process.env.MYSQL_PORT || 3306
};

async function exploreMySQLDatabase() {
    let connection;
    
    try {
        console.log('='.repeat(80));
        console.log('EBMDB DIAGNOSTIC TOOL - MySQL Database Explorer');
        console.log('='.repeat(80));
        console.log('\n📡 Attempting to connect to MySQL database...');
        console.log(`Host: ${dbConfig.host}`);
        console.log(`Port: ${dbConfig.port}`);
        console.log(`Database: ${dbConfig.database}`);
        console.log(`User: ${dbConfig.user}`);
        
        // Establish connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected successfully!\n');

        // Get all tables
        console.log('='.repeat(80));
        console.log('DATABASE TABLES');
        console.log('='.repeat(80));
        
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`\nFound ${tables.length} tables:\n`);
        
        tables.forEach((table, i) => {
            const tableName = Object.values(table)[0];
            console.log(`  ${i + 1}. ${tableName}`);
        });

        // Analyze each table
        console.log('\n\n' + '='.repeat(80));
        console.log('TABLE STRUCTURES & SAMPLE DATA');
        console.log('='.repeat(80));

        for (const table of tables) {
            const tableName = Object.values(table)[0];
            
            console.log(`\n\n📊 TABLE: ${tableName}`);
            console.log('-'.repeat(80));

            // Get row count
            const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            const rowCount = countResult[0].count;
            console.log(`Total rows: ${rowCount}`);

            // Get table structure
            const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
            console.log('\nColumns:');
            columns.forEach(col => {
                const key = col.Key ? ` [${col.Key}]` : '';
                const nullable = col.Null === 'YES' ? ' (nullable)' : ' (NOT NULL)';
                const extra = col.Extra ? ` ${col.Extra}` : '';
                console.log(`  - ${col.Field}: ${col.Type}${key}${nullable}${extra}`);
            });

            // Get sample data
            if (rowCount > 0) {
                console.log('\nSample data (first 3 rows):');
                const [sampleRows] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
                
                if (sampleRows.length > 0) {
                    sampleRows.forEach((row, i) => {
                        console.log(`\n  Row ${i + 1}:`);
                        Object.entries(row).forEach(([key, value]) => {
                            let displayValue = value;
                            if (value === null) {
                                displayValue = 'NULL';
                            } else if (typeof value === 'string' && value.length > 50) {
                                displayValue = value.substring(0, 50) + '...';
                            } else if (value instanceof Date) {
                                displayValue = value.toISOString();
                            }
                            console.log(`    ${key}: ${displayValue}`);
                        });
                    });
                }
            } else {
                console.log('\n  (Table is empty)');
            }
        }

        // Key relationships analysis
        console.log('\n\n' + '='.repeat(80));
        console.log('RECOMMENDED EXPORT QUERIES');
        console.log('='.repeat(80));

        // Check for specific tables we expect
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        if (tableNames.some(t => t.toLowerCase().includes('alumni') || t.toLowerCase().includes('missionary'))) {
            const missionaryTable = tableNames.find(t => t.toLowerCase().includes('alumni') || t.toLowerCase().includes('missionary'));
            console.log(`\n📋 1. MISSIONARIES TABLE: ${missionaryTable}`);
            const [missionaryCols] = await connection.query(`DESCRIBE \`${missionaryTable}\``);
            const colNames = missionaryCols.map(c => c.Field).join(', ');
            console.log(`\nExport query:`);
            console.log(`SELECT ${colNames}`);
            console.log(`FROM \`${missionaryTable}\``);
            console.log(`ORDER BY alum_id;`);
        }

        if (tableNames.some(t => t.toLowerCase().includes('area'))) {
            const areaTable = tableNames.find(t => t.toLowerCase().includes('area') && !t.toLowerCase().includes('alumni'));
            console.log(`\n📋 2. AREAS TABLE: ${areaTable}`);
            const [areaCols] = await connection.query(`DESCRIBE \`${areaTable}\``);
            const colNames = areaCols.map(c => c.Field).join(', ');
            console.log(`\nExport query:`);
            console.log(`SELECT ${colNames}`);
            console.log(`FROM \`${areaTable}\``);
            console.log(`WHERE a_id IS NOT NULL AND a_id != '0'`);
            console.log(`ORDER BY area_id, a_id;`);
        }

        if (tableNames.some(t => t.toLowerCase().includes('alumni') && t.toLowerCase().includes('area'))) {
            const linkTable = tableNames.find(t => t.toLowerCase().includes('alumni') && t.toLowerCase().includes('area'));
            console.log(`\n📋 3. MISSIONARY-AREA RELATIONSHIPS: ${linkTable}`);
            const [linkCols] = await connection.query(`DESCRIBE \`${linkTable}\``);
            const colNames = linkCols.map(c => c.Field).join(', ');
            console.log(`\nExport query:`);
            console.log(`SELECT ${colNames}`);
            console.log(`FROM \`${linkTable}\``);
            console.log(`WHERE area_id IS NOT NULL`);
            console.log(`ORDER BY alum_id, area_id;`);
        }

        if (tableNames.some(t => t.toLowerCase().includes('companion'))) {
            const companionTable = tableNames.find(t => t.toLowerCase().includes('companion'));
            console.log(`\n📋 4. COMPANIONSHIPS: ${companionTable}`);
            const [companionCols] = await connection.query(`DESCRIBE \`${companionTable}\``);
            const colNames = companionCols.map(c => c.Field).join(', ');
            console.log(`\nExport query:`);
            console.log(`SELECT ${colNames}`);
            console.log(`FROM \`${companionTable}\``);
            console.log(`ORDER BY companionship_id;`);
        }

        console.log('\n\n' + '='.repeat(80));
        console.log('NEXT STEPS');
        console.log('='.repeat(80));
        console.log('\n1. Review the table structures above');
        console.log('2. Verify the data in key tables (alumni, areas, alumni_areas)');
        console.log('3. Use the export queries to generate CSV files');
        console.log('4. Import the CSV files through the web interface');
        console.log('\nOr we can create direct import functions to pull data from MySQL → MongoDB');

    } catch (error) {
        console.error('\n❌ Error connecting to MySQL database:');
        console.error(`Error: ${error.message}`);
        console.error(`\nTroubleshooting:`);
        console.error(`1. Make sure MySQL is running`);
        console.error(`2. Check your .env file has correct credentials:`);
        console.error(`   MYSQL_HOST=localhost`);
        console.error(`   MYSQL_PORT=3306`);
        console.error(`   MYSQL_USER=your_username`);
        console.error(`   MYSQL_PASSWORD=your_password`);
        console.error(`   MYSQL_DATABASE=your_database_name`);
        console.error(`\n3. Verify you have mysql2 package installed:`);
        console.error(`   npm install mysql2`);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n✅ MySQL connection closed');
        }
    }
}

exploreMySQLDatabase();
