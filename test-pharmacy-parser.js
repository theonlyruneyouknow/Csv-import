const PharmacyRecordParser = require('./services/PharmacyRecordParser');
const mongoose = require('mongoose');
const Medicine = require('./models/Medicine');
const FamilyMember = require('./models/FamilyMember');
const MedicationLog = require('./models/MedicationLog');
const fs = require('fs');
const path = require('path');

// Mock data based on your Walgreens format
const mockWalgreensCSVData = `Confidential Prescription Records,,,,,,,,,
,,,,,,,,,
Rune Larsen,,,,,,,,,
555 n danebo ave spc 34,,,,,,,,,
"eugene, OR 974022230",,,,,,,,,
5416062179,,,,,,,,,
01/14/1971,,,,,,,,,
Male,,,,,,,,,
,,,,,,,,,
09/08/2025 to 09/13/2025,,,,,,,,,"Showing  Prescriptions, Sorted By fill date (09/08/2025 to 09/13/2025)"
Fill Date,Prescription,Rx #,Qty,Prescriber,Pharmacist,NDC#,Insurance,Claim Reference #,Price
09/08/2025,Cyclobenzaprine 10mg Tablets,185848411643,90,"Wilson,Erica",SMM,29300041510,APM,252514899525277999,$0.00
,,,,,,,,Total ,$0.00
,,,,,,,,Generics Saved You ,$0.00
,,,,,,,,Insurance Saved You ,$35.39`;

// Mock user for testing
const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser'
};

class PharmacyParserTester {
    constructor() {
        this.testResults = [];
        this.parser = new PharmacyRecordParser();
    }

    async runAllTests() {
        console.log('🧪 Starting Pharmacy Record Parser Tests...\n');

        try {
            await this.connectToMongoDB();
            await this.cleanupTestData();
            
            await this.testCSVFileCreation();
            await this.testFileReading();
            await this.testFormatDetection();
            await this.testPatientInfoExtraction();
            await this.testMedicationStringParsing();
            await this.testFullImportProcess();
            
            await this.cleanupTestData();
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await mongoose.disconnect();
        }
    }

    async connectToMongoDB() {
        console.log('📡 Connecting to MongoDB...');
        require('dotenv').config();
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

    async testCSVFileCreation() {
        console.log('📄 Test 1: Creating test CSV file...');
        try {
            const testFilePath = path.join(__dirname, 'test-walgreens.csv');
            fs.writeFileSync(testFilePath, mockWalgreensCSVData);
            
            if (fs.existsSync(testFilePath)) {
                console.log('✅ Test CSV file created successfully');
                this.testResults.push({ test: 'CSV File Creation', result: 'PASS' });
            } else {
                throw new Error('Test file was not created');
            }
        } catch (error) {
            console.log('❌ CSV file creation failed:', error.message);
            this.testResults.push({ test: 'CSV File Creation', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testFileReading() {
        console.log('📖 Test 2: Reading CSV file...');
        try {
            const testFilePath = path.join(__dirname, 'test-walgreens.csv');
            const records = await this.parser.readFile(testFilePath);
            
            console.log(`   📊 Records found: ${records.length}`);
            console.log(`   📋 First record keys: ${Object.keys(records[0]).join(', ')}`);
            
            if (records.length > 0) {
                console.log('✅ File reading successful');
                this.testResults.push({ test: 'File Reading', result: 'PASS', recordCount: records.length });
            } else {
                throw new Error('No records found in file');
            }
        } catch (error) {
            console.log('❌ File reading failed:', error.message);
            this.testResults.push({ test: 'File Reading', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testFormatDetection() {
        console.log('🔍 Test 3: Format detection...');
        try {
            const testFilePath = path.join(__dirname, 'test-walgreens.csv');
            const records = await this.parser.readFile(testFilePath);
            const format = this.parser.detectFormat(records);
            
            console.log(`   🏥 Detected format: ${format}`);
            
            if (format === 'walgreens') {
                console.log('✅ Format detection successful');
                this.testResults.push({ test: 'Format Detection', result: 'PASS', format });
            } else {
                throw new Error(`Expected 'walgreens', got '${format}'`);
            }
        } catch (error) {
            console.log('❌ Format detection failed:', error.message);
            this.testResults.push({ test: 'Format Detection', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testPatientInfoExtraction() {
        console.log('👤 Test 4: Patient information extraction...');
        try {
            const testFilePath = path.join(__dirname, 'test-walgreens.csv');
            const records = await this.parser.readFile(testFilePath);
            const patientInfo = this.parser.extractWalgreensPatientInfo(records);
            
            console.log('   📋 Extracted patient info:');
            console.log(`      Name: ${patientInfo.name}`);
            console.log(`      Address: ${patientInfo.address}`);
            console.log(`      Phone: ${patientInfo.phone}`);
            console.log(`      DOB: ${patientInfo.dob}`);
            console.log(`      Gender: ${patientInfo.gender}`);
            
            if (patientInfo.name === 'Rune Larsen' && patientInfo.phone === '5416062179') {
                console.log('✅ Patient info extraction successful');
                this.testResults.push({ test: 'Patient Info Extraction', result: 'PASS', patientInfo });
            } else {
                throw new Error('Patient info does not match expected values');
            }
        } catch (error) {
            console.log('❌ Patient info extraction failed:', error.message);
            this.testResults.push({ test: 'Patient Info Extraction', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testMedicationStringParsing() {
        console.log('💊 Test 5: Medication string parsing...');
        try {
            const testMedication = 'Cyclobenzaprine 10mg Tablets';
            const parsed = this.parser.parseMedicationString(testMedication);
            
            console.log('   📋 Parsed medication:');
            console.log(`      Name: ${parsed.name}`);
            console.log(`      Strength: ${parsed.strength}`);
            console.log(`      Form: ${parsed.form}`);
            
            if (parsed.name === 'Cyclobenzaprine' && parsed.strength === '10mg' && parsed.form === 'tablet') {
                console.log('✅ Medication parsing successful');
                this.testResults.push({ test: 'Medication Parsing', result: 'PASS', parsed });
            } else {
                throw new Error('Medication parsing does not match expected values');
            }
        } catch (error) {
            console.log('❌ Medication parsing failed:', error.message);
            this.testResults.push({ test: 'Medication Parsing', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    async testFullImportProcess() {
        console.log('🚀 Test 6: Full import process...');
        try {
            const testFilePath = path.join(__dirname, 'test-walgreens.csv');
            const results = await this.parser.parsePharmacyRecords(testFilePath, mockUser);
            
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
            
            if (results.success && medicineCount > 0 && logCount > 0) {
                console.log('✅ Full import process successful');
                this.testResults.push({ 
                    test: 'Full Import Process', 
                    result: 'PASS', 
                    importResults: results.summary,
                    dbCounts: { medicineCount, familyMemberCount, logCount }
                });
            } else {
                throw new Error('Import process failed or no records created');
            }
        } catch (error) {
            console.log('❌ Full import process failed:', error.message);
            this.testResults.push({ test: 'Full Import Process', result: 'FAIL', error: error.message });
        }
        console.log('');
    }

    printResults() {
        console.log('📋 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        
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
        
        console.log('='.repeat(50));
        console.log(`📊 Total: ${this.testResults.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
        
        if (failed === 0) {
            console.log('🎉 All tests passed! The pharmacy parser is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the errors above for details.');
        }
        
        // Clean up test file
        try {
            const testFilePath = path.join(__dirname, 'test-walgreens.csv');
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
                console.log('🧹 Test files cleaned up');
            }
        } catch (error) {
            console.log('⚠️  Could not clean up test files:', error.message);
        }
    }
}

// Run the tests
const tester = new PharmacyParserTester();
tester.runAllTests().catch(console.error);
