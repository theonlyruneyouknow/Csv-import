const path = require('path');
const XLSX = require('xlsx');
const PharmacyRecordParser = require('./services/PharmacyRecordParser');
const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Comprehensive Excel Import Debugger
 * This tool performs deep analysis at every step of the import process
 */
class ExcelImportDebugger {
    constructor() {
        this.results = {
            fileAccess: null,
            fileRead: null,
            worksheetDetection: null,
            dataExtraction: null,
            formatDetection: null,
            parsingResults: null,
            databaseConnection: null,
            finalValidation: null
        };
    }

    async debugImportProcess(filePath) {
        console.log('🔍 COMPREHENSIVE EXCEL IMPORT DEBUGGER');
        console.log('=====================================');
        console.log(`📂 Target file: ${filePath}`);
        console.log(`📅 Debug started: ${new Date().toISOString()}\n`);

        // Step 1: File Access Check
        await this.checkFileAccess(filePath);
        
        // Step 2: File Reading Check
        await this.checkFileReading(filePath);
        
        // Step 3: Worksheet Detection
        await this.checkWorksheetDetection(filePath);
        
        // Step 4: Data Extraction
        await this.checkDataExtraction(filePath);
        
        // Step 5: Format Detection
        await this.checkFormatDetection(filePath);
        
        // Step 6: Parsing Results
        await this.checkParsingResults(filePath);
        
        // Step 7: Database Connection
        await this.checkDatabaseConnection();
        
        // Step 8: Final Validation
        await this.performFinalValidation(filePath);
        
        // Summary Report
        this.generateSummaryReport();
    }

    async checkFileAccess(filePath) {
        console.log('📋 STEP 1: File Access Check');
        console.log('-----------------------------');
        
        try {
            const fs = require('fs');
            
            // Check if file exists
            const exists = fs.existsSync(filePath);
            console.log(`✅ File exists: ${exists}`);
            
            if (!exists) {
                this.results.fileAccess = { success: false, error: 'File does not exist' };
                return;
            }
            
            // Check file stats
            const stats = fs.statSync(filePath);
            console.log(`📊 File size: ${stats.size} bytes`);
            console.log(`📅 Modified: ${stats.mtime}`);
            console.log(`🔒 Readable: ${fs.constants.R_OK & fs.accessSync(filePath, fs.constants.R_OK) === 0 ? 'Yes' : 'No'}`);
            
            // Check file extension
            const ext = path.extname(filePath).toLowerCase();
            console.log(`📎 Extension: ${ext}`);
            
            const validExtensions = ['.xls', '.xlsx'];
            const isValidExtension = validExtensions.includes(ext);
            console.log(`✅ Valid Excel extension: ${isValidExtension}`);
            
            this.results.fileAccess = {
                success: true,
                exists: exists,
                size: stats.size,
                extension: ext,
                isValidExtension: isValidExtension
            };
            
            console.log('✅ File access check completed\n');
            
        } catch (error) {
            console.error(`❌ File access error: ${error.message}`);
            this.results.fileAccess = { success: false, error: error.message };
        }
    }

    async checkFileReading(filePath) {
        console.log('📋 STEP 2: File Reading Check');
        console.log('-----------------------------');
        
        try {
            // Attempt to read with XLSX
            console.log('🔄 Attempting to read file with XLSX library...');
            const workbook = XLSX.readFile(filePath);
            
            console.log(`✅ File read successfully`);
            console.log(`📊 Number of worksheets: ${workbook.SheetNames.length}`);
            
            workbook.SheetNames.forEach((name, index) => {
                console.log(`   Sheet ${index + 1}: "${name}"`);
            });
            
            this.results.fileRead = {
                success: true,
                worksheetCount: workbook.SheetNames.length,
                worksheetNames: workbook.SheetNames
            };
            
            console.log('✅ File reading check completed\n');
            
        } catch (error) {
            console.error(`❌ File reading error: ${error.message}`);
            this.results.fileRead = { success: false, error: error.message };
        }
    }

    async checkWorksheetDetection(filePath) {
        console.log('📋 STEP 3: Worksheet Detection');
        console.log('-------------------------------');
        
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            console.log(`🎯 Using first worksheet: "${sheetName}"`);
            
            // Get worksheet range
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            console.log(`📐 Worksheet range: ${worksheet['!ref']}`);
            console.log(`📊 Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
            
            // Check if worksheet has data
            const hasData = range.e.r > 0 || range.e.c > 0;
            console.log(`📝 Has data: ${hasData}`);
            
            this.results.worksheetDetection = {
                success: true,
                activeSheet: sheetName,
                range: worksheet['!ref'],
                rows: range.e.r + 1,
                columns: range.e.c + 1,
                hasData: hasData
            };
            
            console.log('✅ Worksheet detection completed\n');
            
        } catch (error) {
            console.error(`❌ Worksheet detection error: ${error.message}`);
            this.results.worksheetDetection = { success: false, error: error.message };
        }
    }

    async checkDataExtraction(filePath) {
        console.log('📋 STEP 4: Data Extraction');
        console.log('---------------------------');
        
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to array of arrays
            console.log('🔄 Converting to array of arrays...');
            const arrayData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: ''
            });
            
            console.log(`✅ Extracted ${arrayData.length} rows`);
            
            // Show first 10 rows for inspection
            console.log('🔍 First 10 rows of extracted data:');
            for (let i = 0; i < Math.min(10, arrayData.length); i++) {
                const row = arrayData[i];
                const displayRow = row.slice(0, 8).map(cell => 
                    String(cell).length > 20 ? String(cell).substring(0, 17) + '...' : String(cell)
                );
                console.log(`   Row ${i}: [${displayRow.join(', ')}]`);
            }
            
            // Check for empty rows
            const nonEmptyRows = arrayData.filter(row => 
                row.some(cell => cell && String(cell).trim() !== '')
            );
            console.log(`📊 Non-empty rows: ${nonEmptyRows.length}`);
            
            this.results.dataExtraction = {
                success: true,
                totalRows: arrayData.length,
                nonEmptyRows: nonEmptyRows.length,
                sampleData: arrayData.slice(0, 5)
            };
            
            console.log('✅ Data extraction completed\n');
            
        } catch (error) {
            console.error(`❌ Data extraction error: ${error.message}`);
            this.results.dataExtraction = { success: false, error: error.message };
        }
    }

    async checkFormatDetection(filePath) {
        console.log('📋 STEP 5: Format Detection');
        console.log('----------------------------');
        
        try {
            const parser = new PharmacyRecordParser();
            const arrayData = await this.getArrayData(filePath);
            
            // Check for Walgreens format indicators
            console.log('🔍 Checking for Walgreens format indicators...');
            
            let walgreensIndicators = {
                confidentialRecords: false,
                fillDateHeader: false,
                prescriptionHeader: false,
                showingPrescriptions: false
            };
            
            // Check first few rows for Walgreens indicators
            for (let i = 0; i < Math.min(20, arrayData.length); i++) {
                const row = arrayData[i];
                const firstCell = String(row[0] || '').toLowerCase();
                
                if (firstCell.includes('confidential prescription records')) {
                    walgreensIndicators.confidentialRecords = true;
                    console.log(`   ✅ Found "Confidential Prescription Records" at row ${i}`);
                }
                
                if (firstCell === 'fill date') {
                    walgreensIndicators.fillDateHeader = true;
                    console.log(`   ✅ Found "Fill Date" header at row ${i}`);
                }
                
                if (row.some(cell => String(cell || '').toLowerCase().includes('prescription'))) {
                    walgreensIndicators.prescriptionHeader = true;
                    console.log(`   ✅ Found prescription-related content at row ${i}`);
                }
                
                if (firstCell.includes('showing') && firstCell.includes('prescription')) {
                    walgreensIndicators.showingPrescriptions = true;
                    console.log(`   ✅ Found "Showing X Prescriptions" at row ${i}`);
                }
            }
            
            // Try format detection
            console.log('\n🔄 Running parser format detection...');
            const detectedFormat = parser.detectFormat(arrayData);
            console.log(`🎯 Detected format: ${detectedFormat}`);
            
            const isWalgreens = detectedFormat.toLowerCase() === 'walgreens';
            console.log(`✅ Is Walgreens format: ${isWalgreens}`);
            
            this.results.formatDetection = {
                success: true,
                detectedFormat: detectedFormat,
                isWalgreens: isWalgreens,
                indicators: walgreensIndicators
            };
            
            console.log('✅ Format detection completed\n');
            
        } catch (error) {
            console.error(`❌ Format detection error: ${error.message}`);
            this.results.formatDetection = { success: false, error: error.message };
        }
    }

    async checkParsingResults(filePath) {
        console.log('📋 STEP 6: Parsing Results');
        console.log('---------------------------');
        
        try {
            const parser = new PharmacyRecordParser();
            const arrayData = await this.getArrayData(filePath);
            
            console.log('🔄 Testing different parsing methods...');
            
            // Method 1: readExcel
            console.log('\n📋 Method 1: Using readExcel()');
            try {
                const readExcelResult = await parser.readExcel(filePath);
                console.log(`   ✅ readExcel returned: ${Array.isArray(readExcelResult) ? readExcelResult.length : 'non-array'} records`);
                
                if (Array.isArray(readExcelResult) && readExcelResult.length > 0) {
                    console.log('   📊 Sample record:');
                    console.log('   ', readExcelResult[0]);
                }
            } catch (error) {
                console.log(`   ❌ readExcel error: ${error.message}`);
            }
            
            // Method 2: parseWalgreensExcel directly
            console.log('\n📋 Method 2: Using parseWalgreensExcel()');
            try {
                const walgreensResult = parser.parseWalgreensExcel(arrayData);
                console.log(`   ✅ parseWalgreensExcel returned: ${Array.isArray(walgreensResult) ? walgreensResult.length : 'non-array'} records`);
                
                if (Array.isArray(walgreensResult) && walgreensResult.length > 0) {
                    console.log('   📊 Sample record:');
                    console.log('   ', walgreensResult[0]);
                }
            } catch (error) {
                console.log(`   ❌ parseWalgreensExcel error: ${error.message}`);
            }
            
            // Method 3: detectFormat and parse
            console.log('\n📋 Method 3: Format detection and parsing');
            try {
                const format = parser.detectFormat(arrayData);
                console.log(`   🎯 Detected format: ${format}`);
                
                if (format.toLowerCase() === 'walgreens') {
                    const formatResult = parser.parseWalgreensExcel(arrayData);
                    console.log(`   ✅ Format-based parsing returned: ${Array.isArray(formatResult) ? formatResult.length : 'non-array'} records`);
                } else {
                    console.log(`   ⚠️ Format "${format}" not supported for Excel parsing`);
                }
            } catch (error) {
                console.log(`   ❌ Format-based parsing error: ${error.message}`);
            }
            
            this.results.parsingResults = { success: true };
            console.log('\n✅ Parsing results check completed\n');
            
        } catch (error) {
            console.error(`❌ Parsing results error: ${error.message}`);
            this.results.parsingResults = { success: false, error: error.message };
        }
    }

    async checkDatabaseConnection() {
        console.log('📋 STEP 7: Database Connection');
        console.log('-------------------------------');
        
        try {
            console.log('🔄 Testing MongoDB connection...');
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine-management');
            console.log('✅ Successfully connected to MongoDB');
            
            // Test basic operations
            console.log('🔄 Testing basic database operations...');
            const User = require('./models/User');
            const userCount = await User.countDocuments();
            console.log(`📊 Users in database: ${userCount}`);
            
            const Medicine = require('./models/Medicine');
            const medicineCount = await Medicine.countDocuments();
            console.log(`💊 Medicines in database: ${medicineCount}`);
            
            this.results.databaseConnection = {
                success: true,
                userCount: userCount,
                medicineCount: medicineCount
            };
            
            console.log('✅ Database connection check completed\n');
            
        } catch (error) {
            console.error(`❌ Database connection error: ${error.message}`);
            this.results.databaseConnection = { success: false, error: error.message };
        }
    }

    async performFinalValidation(filePath) {
        console.log('📋 STEP 8: Final Validation');
        console.log('----------------------------');
        
        try {
            // Get test user
            const User = require('./models/User');
            const testUser = await User.findOne({ username: 'adminrune' });
            
            if (!testUser) {
                throw new Error('Test user "adminrune" not found');
            }
            
            console.log(`👤 Using test user: ${testUser.username}`);
            
            // Run full parsing process
            console.log('🔄 Running full parsePharmacyRecords process...');
            const parser = new PharmacyRecordParser();
            const result = await parser.parsePharmacyRecords(filePath, testUser, 'walgreens');
            
            console.log('📊 Full process results:');
            console.log(`   Success: ${result.success}`);
            console.log(`   Total records: ${result.summary.totalRecords}`);
            console.log(`   Medicines created: ${result.summary.medicinesCreated}`);
            console.log(`   Medicines updated: ${result.summary.medicinesUpdated}`);
            console.log(`   Logs created: ${result.summary.logsCreated}`);
            console.log(`   Errors: ${result.summary.errorsCount}`);
            
            if (result.errors.length > 0) {
                console.log('❌ Errors found:');
                result.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }
            
            if (result.warnings.length > 0) {
                console.log('⚠️ Warnings found:');
                result.warnings.forEach((warning, index) => {
                    console.log(`   ${index + 1}. ${warning}`);
                });
            }
            
            this.results.finalValidation = {
                success: true,
                result: result
            };
            
            console.log('✅ Final validation completed\n');
            
        } catch (error) {
            console.error(`❌ Final validation error: ${error.message}`);
            this.results.finalValidation = { success: false, error: error.message };
        }
    }

    async getArrayData(filePath) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        return XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
        });
    }

    generateSummaryReport() {
        console.log('📋 COMPREHENSIVE SUMMARY REPORT');
        console.log('================================');
        
        Object.entries(this.results).forEach(([step, result]) => {
            const status = result?.success ? '✅ PASS' : '❌ FAIL';
            const title = step.replace(/([A-Z])/g, ' $1').trim();
            console.log(`${status} ${title}`);
            
            if (!result?.success && result?.error) {
                console.log(`    Error: ${result.error}`);
            }
        });
        
        console.log('\n🎯 CONCLUSION');
        console.log('=============');
        
        const totalSteps = Object.keys(this.results).length;
        const passedSteps = Object.values(this.results).filter(r => r?.success).length;
        
        console.log(`Steps passed: ${passedSteps}/${totalSteps}`);
        
        if (passedSteps === totalSteps) {
            console.log('🎉 All steps passed! Import should be working.');
        } else {
            console.log('⚠️ Some steps failed. Review the errors above.');
        }
        
        console.log(`\n📅 Debug completed: ${new Date().toISOString()}`);
    }
}

// Check if this script is run directly
if (require.main === module) {
    const importDebugger = new ExcelImportDebugger();
    
    // Use the most recent uploaded file
    const filePath = 'uploads/csvFile-1757829871975-351231888.xls';
    
    importDebugger.debugImportProcess(filePath)
        .then(() => {
            console.log('\n🏁 Debug process completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Critical error:', error);
            process.exit(1);
        });
}

module.exports = ExcelImportDebugger;
