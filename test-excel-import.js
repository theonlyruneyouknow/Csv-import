const PharmacyRecordParser = require('./services/PharmacyRecordParser');
const mongoose = require('mongoose');
const Medicine = require('./models/Medicine');
const FamilyMember = require('./models/FamilyMember');
const MedicationLog = require('./models/MedicationLog');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Mock user for testing
const mockUser = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User'
};

class ExcelImportTester {
    constructor() {
        this.parser = new PharmacyRecordParser();
        this.testResults = [];
    }

    async connectToMongoDB() {
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
    }

    async cleanupTestData() {
        console.log('🧹 Cleaning up test data...');
        await Medicine.deleteMany({ user: mockUser._id });
        await FamilyMember.deleteMany({ user: mockUser._id });
        await MedicationLog.deleteMany({ user: mockUser._id });
        console.log('✅ Test data cleaned\n');
    }

    async testExcelFileExists() {
        console.log('📄 Test 1: Checking Excel test file...');
        try {
            const excelPath = path.join(__dirname, 'sample-walgreens-data.xlsx');
            if (fs.existsSync(excelPath)) {
                const stats = fs.statSync(excelPath);
                console.log(`   📊 Excel file found: ${stats.size} bytes`);
                console.log('✅ Excel file exists');
                this.testResults.push({ test: 'Excel File Check', result: 'PASS' });
                return excelPath;
            } else {
                throw new Error('Excel file not found');
            }
        } catch (error) {
            console.log('❌ Excel file check failed:', error.message);
            this.testResults.push({ test: 'Excel File Check', result: 'FAIL', error: error.message });
            return null;
        }
        console.log('');
    }

    async testExcelFileReading(excelPath) {
        console.log('📖 Test 2: Reading Excel file...');
        try {
            const records = await this.parser.readFile(excelPath);
            console.log(`   📊 Records found: ${records.length}`);
            
            if (records.length > 0) {
                console.log(`   📋 First record keys: ${Object.keys(records[0]).join(', ')}`);
                console.log('✅ Excel file reading successful');
                this.testResults.push({ test: 'Excel File Reading', result: 'PASS', records: records.length });
                return records;
            } else {
                throw new Error('No records found in Excel file');
            }
        } catch (error) {
            console.log('❌ Excel file reading failed:', error.message);
            this.testResults.push({ test: 'Excel File Reading', result: 'FAIL', error: error.message });
            return null;
        }
        console.log('');
    }

    async testExcelFormatDetection(records) {
        console.log('🔍 Test 3: Format detection on Excel data...');
        try {
            const format = this.parser.detectFormat(records);
            console.log(`   🏥 Detected format: ${format}`);
            
            if (format === 'walgreens') {
                console.log('✅ Excel format detection successful');
                this.testResults.push({ test: 'Excel Format Detection', result: 'PASS', format });
            } else {
                throw new Error(`Expected 'walgreens' format, got '${format}'`);
            }
        } catch (error) {
            console.log('❌ Excel format detection failed:', error.message);
            this.testResults.push({ test: 'Excel Format Detection', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testFullExcelImport(excelPath) {
        console.log('🚀 Test 4: Full Excel import process...');
        try {
            const results = await this.parser.parsePharmacyRecords(excelPath, mockUser);
            
            console.log('   📊 Import results:');
            console.log(`      Success: ${results.success}`);
            console.log(`      Total records: ${results.summary.totalRecords}`);
            console.log(`      Medicines created: ${results.summary.medicinesCreated}`);
            console.log(`      Logs created: ${results.summary.logsCreated}`);
            console.log(`      Errors: ${results.summary.errorsCount}`);
            
            if (results.errors.length > 0) {
                console.log('   ⚠️  Errors found:');
                results.errors.forEach(error => console.log(`      - ${error}`));
            }
            
            // Verify database records
            const medicineCount = await Medicine.countDocuments({ user: mockUser._id });
            const familyMemberCount = await FamilyMember.countDocuments({ user: mockUser._id });
            const logCount = await MedicationLog.countDocuments({ user: mockUser._id });
            
            console.log('   🗄️  Database verification:');
            console.log(`      Medicines in DB: ${medicineCount}`);
            console.log(`      Family members in DB: ${familyMemberCount}`);
            console.log(`      Logs in DB: ${logCount}`);
            
            if (results.success && medicineCount > 0) {
                console.log('✅ Full Excel import process successful');
                this.testResults.push({ test: 'Full Excel Import Process', result: 'PASS', results });
            } else {
                throw new Error('Excel import process failed or no records created');
            }
        } catch (error) {
            console.log('❌ Full Excel import process failed:', error.message);
            this.testResults.push({ test: 'Full Excel Import Process', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async runAllTests() {
        console.log('🧪 Starting Excel Import Tests...\n');

        try {
            await this.connectToMongoDB();
            await this.cleanupTestData();
            
            const excelPath = await this.testExcelFileExists();
            if (!excelPath) {
                console.log('❌ Cannot continue without Excel file');
                return;
            }
            
            const records = await this.testExcelFileReading(excelPath);
            if (!records) {
                console.log('❌ Cannot continue without readable records');
                return;
            }
            
            await this.testExcelFormatDetection(records);
            await this.testFullExcelImport(excelPath);
            
            await this.cleanupTestData();
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await mongoose.disconnect();
        }
    }

    printResults() {
        console.log('📋 EXCEL IMPORT TEST RESULTS');
        console.log('================================================');
        
        let passed = 0;
        let failed = 0;
        
        this.testResults.forEach(result => {
            const status = result.result === 'PASS' ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.result}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            
            if (result.result === 'PASS') passed++;
            else failed++;
        });
        
        console.log('================================================');
        console.log(`📊 Total: ${this.testResults.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
        
        if (failed === 0) {
            console.log('🎉 All Excel import tests passed!');
        } else {
            console.log('⚠️  Some Excel import tests failed. Check the errors above for details.');
        }
    }
}

// Run the tests
const tester = new ExcelImportTester();
tester.runAllTests();
