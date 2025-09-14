const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Medicine = require('../models/Medicine');
const FamilyMember = require('../models/FamilyMember');
const MedicationLog = require('../models/MedicationLog');

class PharmacyRecordParser {
    constructor() {
        this.supportedFormats = ['walgreens', 'cvs', 'generic'];
    }

    /**
     * Parse pharmacy file (CSV or Excel) and extract prescription records
     * @param {string} filePath - Path to the CSV or Excel file
     * @param {Object} user - User object
     * @param {string} format - Pharmacy format (walgreens, cvs, generic)
     * @returns {Promise<Object>} - Parsed results with medicines and logs
     */
    async parsePharmacyRecords(filePath, user, format = 'auto') {
        try {
            const results = {
                success: true,
                medicines: [],
                logs: [],
                errors: [],
                warnings: [],
                summary: {
                    totalRecords: 0,
                    medicinesCreated: 0,
                    medicinesUpdated: 0,
                    logsCreated: 0,
                    errorsCount: 0
                }
            };

            // Detect file type and read accordingly
            const records = await this.readFile(filePath);
            
            // Auto-detect format if not specified
            if (format === 'auto') {
                format = this.detectFormat(records);
            }

            // Parse based on detected/specified format
            switch (format.toLowerCase()) {
                case 'walgreens':
                    return await this.parseWalgreensFormat(records, user);
                case 'cvs':
                    return await this.parseCVSFormat(records, user);
                case 'generic':
                    return await this.parseGenericFormat(records, user);
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                medicines: [],
                logs: [],
                errors: [error.message],
                warnings: [],
                summary: {
                    totalRecords: 0,
                    medicinesCreated: 0,
                    medicinesUpdated: 0,
                    logsCreated: 0,
                    errorsCount: 1
                }
            };
        }
    }

    /**
     * Read CSV file and return array of records
     */
    async readCSV(filePath) {
        return new Promise((resolve, reject) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check if this looks like a Walgreens CSV
                if (content.includes('Confidential Prescription Records') && 
                    content.includes('Fill Date,Prescription,Rx #')) {
                    resolve(this.parseWalgreensCSV(content));
                    return;
                }
                
                // Use standard CSV parser for other formats
                const records = [];
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        records.push(data);
                    })
                    .on('end', () => {
                        resolve(records);
                    })
                    .on('error', (error) => {
                        reject(error);
                    });
                    
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Parse Walgreens CSV format specifically
     */
    parseWalgreensCSV(content) {
        const lines = content.split('\n');
        const records = [];
        
        // Extract patient info lines (first several rows)
        let patientData = [];
        let headerLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Find the header line
            if (line.startsWith('Fill Date,Prescription,Rx #')) {
                headerLineIndex = i;
                break;
            }
            
            // Collect patient info before the header
            if (line && !line.includes('Confidential Prescription Records') && 
                !line.includes('Showing  Prescriptions')) {
                patientData.push(line);
            }
        }
        
        if (headerLineIndex === -1) {
            console.log('No header line found in Walgreens CSV');
            return [];
        }
        
        // Parse the header
        const headerLine = lines[headerLineIndex];
        const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Add patient info as initial records
        patientData.forEach((data, index) => {
            const cleanData = data.replace(/"/g, '').trim();
            if (cleanData) {
                records.push({ 
                    '_patientInfo': cleanData, 
                    '_patientLineIndex': index 
                });
            }
        });
        
        // Parse prescription records
        for (let i = headerLineIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.includes('Total') || line.includes('Generics Saved') || 
                line.includes('Insurance Saved')) {
                continue;
            }
            
            const values = this.parseCSVLine(line);
            if (values.length > 0 && values[0]) { // Must have a fill date
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = values[index] || '';
                });
                records.push(record);
            }
        }
        
        return records;
    }

    /**
     * Parse a CSV line handling quoted values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Read Excel file and return array of records
     */
    async readExcel(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0]; // Use first sheet
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to array of arrays format first
            const arrayData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1, // Return array of arrays
                defval: '' // Default value for empty cells
            });

            // Check if this looks like a Walgreens Excel file
            // Look in the first several rows for the indicator
            let isWalgreensFormat = false;
            for (let i = 0; i < Math.min(10, arrayData.length); i++) {
                const row = arrayData[i];
                if (row[0] && String(row[0]).includes('Confidential Prescription Records')) {
                    isWalgreensFormat = true;
                    break;
                }
            }
            
            if (isWalgreensFormat) {
                return this.parseWalgreensExcel(arrayData);
            }
            
            // Standard Excel parsing - use first row as headers
            if (arrayData.length === 0) return [];
            
            const headers = arrayData[0];
            const dataRows = arrayData.slice(1);
            
            return dataRows.map(row => {
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = row[index] || '';
                });
                return record;
            });
        } catch (error) {
            throw new Error(`Excel parsing error: ${error.message}`);
        }
    }

    /**
     * Parse Walgreens Excel format specifically
     */
    parseWalgreensExcel(arrayData) {
        const records = [];
        
        // Extract patient info lines (first several rows)
        let patientData = [];
        let headerRowIndex = -1;
        
        for (let i = 0; i < arrayData.length; i++) {
            const row = arrayData[i];
            const firstCell = row[0] || '';
            
            // Find the header row
            if (firstCell === 'Fill Date') {
                headerRowIndex = i;
                break;
            }
            
            // Collect patient info before the header
            if (firstCell && !firstCell.includes('Confidential Prescription Records') && 
                !firstCell.includes('Showing  Prescriptions')) {
                patientData.push(firstCell);
            }
        }
        
        if (headerRowIndex === -1) {
            console.log('No header row found in Walgreens Excel file');
            return [];
        }
        
        // Add patient info as initial records
        patientData.forEach((data, index) => {
            if (data && data.trim()) {
                records.push({ 
                    '_patientInfo': data.trim(), 
                    '_patientLineIndex': index 
                });
            }
        });
        
        // Parse the header row
        const headers = arrayData[headerRowIndex];
        
        // Parse prescription records
        for (let i = headerRowIndex + 1; i < arrayData.length; i++) {
            const row = arrayData[i];
            const fillDate = row[0] || '';
            
            // Skip empty rows or summary rows
            if (!fillDate || fillDate.includes('Total') || fillDate.includes('Generics Saved') || 
                fillDate.includes('Insurance Saved') || fillDate.includes('Please be aware') ||
                fillDate.includes('Thank you') || fillDate.includes('Walgreen Co.')) {
                continue;
            }
            
            // Must have a fill date that looks like a date
            if (fillDate && row[1]) { // Must have fill date and prescription
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = row[index] || '';
                });
                records.push(record);
            }
        }
        
        return records;
    }

    /**
     * Detect file type and read accordingly (CSV or Excel)
     */
    async readFile(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        
        if (extension === '.csv') {
            return await this.readCSV(filePath);
        } else if (extension === '.xlsx' || extension === '.xls') {
            return await this.readExcel(filePath);
        } else {
            throw new Error(`Unsupported file type: ${extension}. Please use CSV or Excel files.`);
        }
    }

    /**
     * Auto-detect pharmacy format based on CSV headers and content
     */
    detectFormat(records) {
        if (!records || records.length === 0) {
            return 'generic';
        }

        // Check for Walgreens patient info format
        const hasPatientInfo = records.some(r => r._patientInfo);
        
        // Check for Walgreens headers
        const firstRecord = records.find(r => !r._patientInfo) || records[0];
        const headers = Object.keys(firstRecord).map(h => h.toLowerCase());

        // Check for Walgreens-specific indicators
        if (hasPatientInfo || 
            headers.includes('fill date') || 
            headers.includes('rx #') || 
            headers.includes('ndc#') ||
            records.some(r => r.Pharmacist === 'SMM' || 
                         Object.values(r).some(v => String(v).includes('Walgreens')))) {
            return 'walgreens';
        }

        // Check for CVS-specific indicators
        if (headers.includes('date filled') || 
            headers.includes('prescription number') ||
            records.some(r => Object.values(r).some(v => String(v).includes('CVS')))) {
            return 'cvs';
        }

        return 'generic';
    }

    /**
     * Parse Walgreens format CSV
     */
    async parseWalgreensFormat(records, user) {
        const results = {
            success: true,
            medicines: [],
            logs: [],
            errors: [],
            warnings: [],
            summary: {
                totalRecords: 0,
                medicinesCreated: 0,
                medicinesUpdated: 0,
                logsCreated: 0,
                errorsCount: 0
            }
        };

        // Extract patient info from the initial rows
        let patientInfo = this.extractWalgreensPatientInfo(records);
        
        for (const record of records) {
            // Look for actual prescription records with Fill Date that looks like a date
            if (record['Fill Date'] && record['Prescription'] && 
                record['Fill Date'].match(/^\d{2}\/\d{2}\/\d{4}$/) &&
                record['Prescription'].trim() !== '' &&
                record['Fill Date'] !== 'Fill Date') {
                
                results.summary.totalRecords++;

                try {
                    const medicineData = await this.extractWalgreensRecord(record, user, patientInfo);
                    if (medicineData.medicine) {
                        results.medicines.push(medicineData.medicine);
                        if (medicineData.isNew) {
                            results.summary.medicinesCreated++;
                        } else {
                            results.summary.medicinesUpdated++;
                        }
                    }
                    if (medicineData.log) {
                        results.logs.push(medicineData.log);
                        results.summary.logsCreated++;
                    }
                } catch (error) {
                    results.errors.push(`Row ${results.summary.totalRecords}: ${error.message}`);
                    results.summary.errorsCount++;
                }
            }
        }

        return results;
    }

    /**
     * Extract patient information from Walgreens CSV header section
     */
    extractWalgreensPatientInfo(records) {
        let patientInfo = {
            name: '',
            address: '',
            phone: '',
            dob: '',
            gender: ''
        };

        // Get all patient info lines and clean them
        const patientLines = records
            .filter(r => r._patientInfo)
            .map(r => r._patientInfo)
            .map(line => line ? line.replace(/,+$/, '').trim() : '') // Remove trailing commas and whitespace
            .filter(line => line && line.length > 0); // Remove empty lines

        for (let line of patientLines) {
            // Look for name (contains only letters and spaces, reasonable length)
            if (!patientInfo.name && line.match(/^[A-Za-z\s]+$/) && line.length > 3 && line.length < 50) {
                patientInfo.name = line.trim();
            }
            
            // Look for address (contains numbers and letters)
            if (!patientInfo.address && line.match(/\d+.*[A-Za-z]/) && !line.match(/^\d{10}$/) && !line.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                patientInfo.address = line.trim();
            }
            
            // Look for city/state/zip (contains comma and state abbreviation)
            if (patientInfo.address && !patientInfo.address.includes(',') && 
                line.match(/[A-Za-z]+,\s*[A-Z]{2}/)) {
                patientInfo.address += ', ' + line.trim();
            }
            
            // Look for phone number (exactly 10 digits)
            if (!patientInfo.phone && line.match(/^\d{10}$/)) {
                patientInfo.phone = line.trim();
            }
            
            // Look for date of birth (MM/DD/YYYY format)
            if (!patientInfo.dob && line.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                patientInfo.dob = line.trim();
            }
            
            // Look for gender (exactly "Male" or "Female")
            if (!patientInfo.gender && (line === 'Male' || line === 'Female')) {
                patientInfo.gender = line.trim();
            }
        }

        return patientInfo;
    }

    /**
     * Extract medicine data from a Walgreens record
     */
    async extractWalgreensRecord(record, user, patientInfo) {
        const result = {
            medicine: null,
            log: null,
            isNew: false
        };

        // Parse prescription name and strength
        const prescriptionText = record['Prescription'] || '';
        const parsed = this.parseMedicationString(prescriptionText);

        // Get or create family member (default to self for now)
        let familyMember = await FamilyMember.findOrCreateSelf(user._id, {
            firstName: user.firstName,
            lastName: user.lastName
        });

        // If we have patient info that doesn't match the user, try to find/create family member
        if (patientInfo && patientInfo.name) {
            const nameParts = patientInfo.name.trim().split(' ');
            if (nameParts.length >= 2) {
                const firstName = nameParts[0];
                const lastName = nameParts[nameParts.length - 1];
                
                if (firstName.toLowerCase() !== user.firstName.toLowerCase() || 
                    lastName.toLowerCase() !== user.lastName.toLowerCase()) {
                    
                    // Try to find existing family member
                    let existingMember = await FamilyMember.findOne({
                        user: user._id,
                        firstName: new RegExp(firstName, 'i'),
                        lastName: new RegExp(lastName, 'i')
                    });

                    if (!existingMember) {
                        // Create new family member
                        existingMember = new FamilyMember({
                            user: user._id,
                            firstName: firstName,
                            lastName: lastName,
                            relationship: 'other', // Default, user can change later
                            phone: patientInfo.phone,
                            notes: `Auto-created from pharmacy import: ${patientInfo.address}`
                        });
                        await existingMember.save();
                    }
                    
                    familyMember = existingMember;
                }
            }
        }

        // Check if medicine already exists
        let existingMedicine = await Medicine.findOne({
            user: user._id,
            familyMember: familyMember._id,
            name: new RegExp(parsed.name, 'i')
        });

        let medicine;
        if (existingMedicine) {
            // Update existing medicine
            medicine = existingMedicine;
            result.isNew = false;

            // Update prescription info if available
            if (record['Rx #']) {
                medicine.prescriptionNumber = record['Rx #'];
            }
            if (record['Prescriber']) {
                medicine.prescribedBy = {
                    doctorName: record['Prescriber']
                };
            }

            await medicine.save();
        } else {
            // Create new medicine
            const fillDate = this.parseDate(record['Fill Date']) || new Date();
            
            medicine = new Medicine({
                user: user._id,
                familyMember: familyMember._id,
                name: parsed.name,
                strength: parsed.strength,
                form: parsed.form,
                prescriptionNumber: record['Rx #'],
                prescribedBy: {
                    doctorName: record['Prescriber']
                },
                quantity: {
                    totalPills: parseInt(record['Qty']) || 0,
                    remainingPills: parseInt(record['Qty']) || 0
                },
                dosage: {
                    amount: parsed.dosage || '1 tablet',
                    frequency: 'as-needed' // Default, user should update
                },
                prescriptionDate: fillDate, // Use fill date as prescription date
                startDate: fillDate, // Use fill date as start date
                cost: {
                    copay: this.parsePrice(record['Price']) || 0
                },
                pharmacy: {
                    name: 'Walgreens',
                    ndc: record['NDC#']
                },
                status: 'active',
                notes: `Imported from pharmacy records on ${new Date().toLocaleDateString()}`
            });

            await medicine.save();
            result.isNew = true;
        }

        result.medicine = medicine;

        // Create medication log entry for the fill date
        if (record['Fill Date']) {
            const fillDate = this.parseDate(record['Fill Date']);
            if (fillDate) {
                const log = new MedicationLog({
                    medicine: medicine._id,
                    user: user._id,
                    familyMember: familyMember._id,
                    recordedBy: 'import',
                    takenAt: fillDate,
                    doseTaken: {
                        amount: 'Prescription filled',
                        wasScheduled: false
                    },
                    notes: `Prescription filled at pharmacy. Rx#: ${record['Rx #']}, Qty: ${record['Qty']}`
                });

                await log.save();
                result.log = log;
            }
        }

        return result;
    }

    /**
     * Parse medication string to extract name, strength, and form
     */
    parseMedicationString(medicationString) {
        const result = {
            name: '',
            strength: '',
            form: 'tablet',
            dosage: ''
        };

        if (!medicationString) return result;

        const text = medicationString.trim();
        
        // Extract strength (numbers followed by mg, mcg, etc.)
        const strengthMatch = text.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)/i);
        if (strengthMatch) {
            result.strength = strengthMatch[0];
        }

        // Extract form (tablets, capsules, etc.)
        const formMatch = text.match(/(tablets?|capsules?|liquid|cream|ointment|drops|spray|patch|injection)/i);
        if (formMatch) {
            result.form = formMatch[1].toLowerCase().replace('s', ''); // Remove plural
        }

        // Extract name (everything before the first number or form)
        let name = text;
        if (strengthMatch) {
            name = text.substring(0, text.indexOf(strengthMatch[0])).trim();
        } else if (formMatch) {
            name = text.substring(0, text.indexOf(formMatch[0])).trim();
        }

        result.name = name || text;

        return result;
    }

    /**
     * Parse date string in various formats
     */
    parseDate(dateString) {
        if (!dateString) return null;

        try {
            // Handle MM/DD/YYYY format
            if (dateString.includes('/')) {
                const parts = dateString.split('/');
                if (parts.length === 3) {
                    const month = parseInt(parts[0]) - 1; // JavaScript months are 0-indexed
                    const day = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    return new Date(year, month, day);
                }
            }

            // Try standard Date parsing
            const parsed = new Date(dateString);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parse price string to number
     */
    parsePrice(priceString) {
        if (!priceString) return 0;

        try {
            // Remove currency symbols and parse
            const cleaned = priceString.replace(/[$,]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Parse CVS format (placeholder for future implementation)
     */
    async parseCVSFormat(records, user) {
        // TODO: Implement CVS-specific parsing
        throw new Error('CVS format parsing not yet implemented');
    }

    /**
     * Parse generic format (basic CSV with common headers)
     */
    async parseGenericFormat(records, user) {
        const results = {
            success: true,
            medicines: [],
            logs: [],
            errors: [],
            warnings: [],
            summary: {
                totalRecords: 0,
                medicinesCreated: 0,
                medicinesUpdated: 0,
                logsCreated: 0,
                errorsCount: 0
            }
        };

        // Find records that look like prescription data
        for (const record of records) {
            const keys = Object.keys(record);
            
            // Skip empty records
            if (keys.every(key => !record[key] || record[key].trim() === '')) {
                continue;
            }
            
            // Look for records with medication names
            const medicationField = keys.find(key => 
                key.toLowerCase().includes('medication') ||
                key.toLowerCase().includes('prescription') ||
                key.toLowerCase().includes('drug') ||
                key.toLowerCase().includes('medicine')
            );
            
            if (medicationField && record[medicationField]) {
                results.summary.totalRecords++;
                
                try {
                    const medicineData = await this.extractGenericRecord(record, user);
                    if (medicineData.medicine) {
                        results.medicines.push(medicineData.medicine);
                        if (medicineData.isNew) {
                            results.summary.medicinesCreated++;
                        } else {
                            results.summary.medicinesUpdated++;
                        }
                    }
                    if (medicineData.log) {
                        results.logs.push(medicineData.log);
                        results.summary.logsCreated++;
                    }
                } catch (error) {
                    results.errors.push(`Row ${results.summary.totalRecords}: ${error.message}`);
                    results.summary.errorsCount++;
                }
            }
        }

        return results;
    }

    /**
     * Extract medicine data from a generic CSV record
     */
    async extractGenericRecord(record, user) {
        const result = {
            medicine: null,
            log: null,
            isNew: false
        };

        // Find the user's family member (use default if only one, or create default)
        let familyMember = await FamilyMember.findOne({ 
            user: user._id,
            relationship: 'self'
        });

        if (!familyMember) {
            // Create a default family member for the user
            familyMember = new FamilyMember({
                user: user._id,
                firstName: user.name ? user.name.split(' ')[0] : 'User',
                lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
                relationship: 'self',
                isActive: true
            });
            await familyMember.save();
        }

        // Find medication name field
        const keys = Object.keys(record);
        const medicationField = keys.find(key => 
            key.toLowerCase().includes('medication') ||
            key.toLowerCase().includes('prescription') ||
            key.toLowerCase().includes('drug') ||
            key.toLowerCase().includes('medicine')
        );

        if (!medicationField || !record[medicationField]) {
            throw new Error('No medication name found');
        }

        const medicationString = record[medicationField];
        const parsed = this.parseMedicationString(medicationString);

        // Check if medicine already exists
        let existingMedicine = await Medicine.findOne({
            user: user._id,
            familyMember: familyMember._id,
            name: new RegExp(parsed.name, 'i')
        });

        let medicine;
        if (existingMedicine) {
            medicine = existingMedicine;
            result.isNew = false;
            await medicine.save();
        } else {
            // Create new medicine
            medicine = new Medicine({
                user: user._id,
                familyMember: familyMember._id,
                name: parsed.name,
                strength: parsed.strength,
                form: parsed.form,
                dosage: {
                    amount: parsed.dosage || '1 tablet',
                    frequency: 'as-needed'
                },
                prescriptionDate: new Date(), // Use current date as default
                startDate: new Date(), // Use current date as default
                notes: 'Imported from CSV file'
            });

            await medicine.save();
            result.isNew = true;
        }

        result.medicine = medicine;
        return result;
    }
}

module.exports = PharmacyRecordParser;
