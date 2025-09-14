const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const MedicationLog = require('../models/MedicationLog');
const Pharmacy = require('../models/Pharmacy');
const FamilyMember = require('../models/FamilyMember');
const PharmacyRecordParser = require('../services/PharmacyRecordParser');
const multer = require('multer');
const path = require('path');
const { ensureAuthenticated } = require('../middleware/auth');

// Middleware to check if user has access to medicine management
const ensureMedicineAccess = (req, res, next) => {
    if (!req.user.permissions.accessMedicineManagement) {
        return res.status(403).render('error', { 
            message: 'Access denied. You do not have permission to access Medicine Management.' 
        });
    }
    next();
};

// Medicine Dashboard
router.get('/dashboard', ensureMedicineAccess, async (req, res) => {
    try {
        // Get selected family member from query params (default to 'all')
        const selectedMemberId = req.query.member || 'all';
        
        // Get all family members for the user
        const familyMembers = await FamilyMember.findByUser(req.user._id);
        
        // Ensure 'self' member exists
        await FamilyMember.findOrCreateSelf(req.user._id, {
            firstName: req.user.firstName,
            lastName: req.user.lastName
        });
        
        // Build medicine query based on selected family member
        let medicineQuery = { user: req.user._id, status: 'active' };
        if (selectedMemberId !== 'all') {
            medicineQuery.familyMember = selectedMemberId;
        }
        
        // Build log query based on selected family member
        let logQuery = { 'medicine.user': req.user._id };
        if (selectedMemberId !== 'all') {
            logQuery.familyMember = selectedMemberId;
        }
        
        const [medicines, recentLogs, pharmacies, stats] = await Promise.all([
            // Active medicines
            Medicine.find(medicineQuery)
                .populate('familyMember', 'firstName lastName relationship')
                .sort({ createdAt: -1 })
                .limit(10),
            
            // Recent medication logs
            MedicationLog.find(logQuery)
                .populate('medicine', 'name strength form')
                .populate('familyMember', 'firstName lastName relationship')
                .sort({ takenAt: -1 })
                .limit(5),
            
            // User's pharmacies
            Pharmacy.find({ user: req.user._id, isActive: true })
                .sort({ isPrimary: -1, name: 1 }),
            
            // Dashboard statistics
            Medicine.aggregate([
                { $match: { user: req.user._id } },
                {
                    $group: {
                        _id: null,
                        totalMedicines: { $sum: 1 },
                        activeMedicines: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        },
                        needingRefill: {
                            $sum: { $cond: ['$needsRefill', 1, 0] }
                        },
                        totalCost: { $sum: '$cost.copay' }
                    }
                }
            ])
        ]);

        const projectStats = stats[0] || {
            totalMedicines: 0,
            activeMedicines: 0,
            needingRefill: 0,
            totalCost: 0
        };

        // Get medicines needing refill
        const medicinesNeedingRefill = medicines.filter(med => med.needsRefill);
        
        // Get upcoming doses (next 24 hours)
        const upcomingDoses = medicines.filter(med => 
            med.reminders.enabled && 
            med.dosage.timesToTake && 
            med.dosage.timesToTake.length > 0
        ).map(med => {
            const nextDoses = med.dosage.timesToTake.map(time => ({
                medicine: med,
                time: time,
                timeDisplay: formatTime(time)
            }));
            return nextDoses;
        }).flat().sort((a, b) => a.time.localeCompare(b.time));

        res.render('medicine-dashboard', {
            user: req.user,
            medicines,
            recentLogs,
            pharmacies,
            stats: projectStats,
            medicinesNeedingRefill,
            upcomingDoses,
            familyMembers,
            selectedMemberId,
            title: 'Medicine Management Dashboard'
        });
    } catch (error) {
        console.error('Error loading medicine dashboard:', error);
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
});

// Get all medicines
router.get('/medicines', ensureMedicineAccess, async (req, res) => {
    try {
        const { status, search, sort } = req.query;
        
        // Build query
        const query = { user: req.user._id };
        if (status && status !== 'all') {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { genericName: new RegExp(search, 'i') },
                { brandName: new RegExp(search, 'i') },
                { condition: new RegExp(search, 'i') }
            ];
        }
        
        // Sort options
        let sortOption = { createdAt: -1 }; // Default
        if (sort === 'name') sortOption = { name: 1 };
        else if (sort === 'needsRefill') sortOption = { needsRefill: -1, estimatedRunOutDate: 1 };
        else if (sort === 'runOutDate') sortOption = { estimatedRunOutDate: 1 };
        
        const medicines = await Medicine.find(query).sort(sortOption);
        
        res.render('medicines-list', {
            user: req.user,
            medicines,
            filters: { status, search, sort },
            title: 'All Medicines'
        });
    } catch (error) {
        console.error('Error loading medicines:', error);
        res.status(500).render('error', { message: 'Error loading medicines' });
    }
});

// Add new medicine form
router.get('/medicines/new', ensureMedicineAccess, async (req, res) => {
    try {
        const [pharmacies, familyMembers] = await Promise.all([
            Pharmacy.find({ user: req.user._id, isActive: true }),
            FamilyMember.findByUser(req.user._id)
        ]);
        
        // Ensure 'self' member exists
        await FamilyMember.findOrCreateSelf(req.user._id, {
            firstName: req.user.firstName,
            lastName: req.user.lastName
        });
        
        res.render('medicine-form', {
            user: req.user,
            medicine: null,
            pharmacies,
            familyMembers,
            isEdit: false,
            title: 'Add New Medicine'
        });
    } catch (error) {
        console.error('Error loading medicine form:', error);
        res.status(500).render('error', { message: 'Error loading form' });
    }
});

// Create new medicine
router.post('/medicines', ensureMedicineAccess, async (req, res) => {
    try {
        const medicineData = {
            ...req.body,
            user: req.user._id
        };
        
        // Validate family member exists and belongs to user
        if (req.body.familyMember) {
            const familyMember = await FamilyMember.findOne({
                _id: req.body.familyMember,
                user: req.user._id
            });
            
            if (!familyMember) {
                return res.status(400).render('medicine-form', {
                    error: 'Invalid family member selected',
                    user: req.user,
                    medicine: req.body,
                    familyMembers: await FamilyMember.findByUser(req.user._id),
                    pharmacies: await Pharmacy.find({ user: req.user._id, isActive: true }),
                    isEdit: false,
                    title: 'Add New Medicine'
                });
            }
        }
        
        // Parse dosage times
        if (req.body.timesToTake) {
            medicineData.dosage.timesToTake = Array.isArray(req.body.timesToTake) 
                ? req.body.timesToTake 
                : [req.body.timesToTake];
        }
        
        const medicine = new Medicine(medicineData);
        await medicine.save();
        
        res.redirect('/medicine/dashboard?success=Medicine added successfully');
    } catch (error) {
        console.error('Error creating medicine:', error);
        res.status(500).render('error', { message: 'Error creating medicine' });
    }
});

// Edit medicine form
router.get('/medicines/:id/edit', ensureMedicineAccess, async (req, res) => {
    try {
        const [medicine, pharmacies, familyMembers] = await Promise.all([
            Medicine.findOne({ _id: req.params.id, user: req.user._id }),
            Pharmacy.find({ user: req.user._id, isActive: true }),
            FamilyMember.findByUser(req.user._id)
        ]);
        
        if (!medicine) {
            return res.status(404).render('error', { message: 'Medicine not found' });
        }
        
        // Ensure 'self' member exists
        await FamilyMember.findOrCreateSelf(req.user._id, {
            firstName: req.user.firstName,
            lastName: req.user.lastName
        });
        
        res.render('medicine-form', {
            user: req.user,
            medicine,
            pharmacies,
            familyMembers,
            isEdit: true,
            title: `Edit ${medicine.name}`
        });
    } catch (error) {
        console.error('Error loading medicine for edit:', error);
        res.status(500).render('error', { message: 'Error loading medicine' });
    }
});

// Update medicine
router.put('/medicines/:id', ensureMedicineAccess, async (req, res) => {
    try {
        const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!medicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        Object.assign(medicine, req.body);
        
        // Parse dosage times
        if (req.body.timesToTake) {
            medicine.dosage.timesToTake = Array.isArray(req.body.timesToTake) 
                ? req.body.timesToTake 
                : [req.body.timesToTake];
        }
        
        await medicine.save();
        
        res.json({ success: true, medicine });
    } catch (error) {
        console.error('Error updating medicine:', error);
        res.status(500).json({ error: 'Error updating medicine' });
    }
});

// Record taking medication
router.post('/medicines/:id/take', ensureMedicineAccess, async (req, res) => {
    try {
        const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!medicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        const { amount, notes, effectiveness, takenWith, scheduledTime } = req.body;
        
        // Record in medication log
        const log = new MedicationLog({
            medicine: medicine._id,
            user: req.user._id,
            doseTaken: {
                amount: amount || medicine.dosage.amount,
                actualAmount: parseFloat(amount?.replace(/[^0-9.]/g, '')) || 1,
                wasScheduled: !!scheduledTime,
                scheduledTime,
                actualTime: new Date().toTimeString().slice(0, 5)
            },
            takenWith: takenWith || 'water',
            notes,
            effectiveness: effectiveness ? parseInt(effectiveness) : undefined,
            recordedBy: 'user'
        });
        
        await log.save();
        
        // Update medicine
        await medicine.recordDose(parseFloat(amount?.replace(/[^0-9.]/g, '')) || 1);
        
        res.json({ 
            success: true, 
            message: 'Dose recorded successfully',
            remainingPills: medicine.quantity.remainingPills,
            needsRefill: medicine.needsRefill
        });
    } catch (error) {
        console.error('Error recording dose:', error);
        res.status(500).json({ error: 'Error recording dose' });
    }
});

// Add refill
router.post('/medicines/:id/refill', ensureMedicineAccess, async (req, res) => {
    try {
        const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!medicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        const { quantity, refillsRemaining, cost, pharmacyNotes } = req.body;
        
        await medicine.addRefill(
            parseInt(quantity), 
            refillsRemaining ? parseInt(refillsRemaining) : null
        );
        
        // Update cost if provided
        if (cost) {
            medicine.cost.copay = parseFloat(cost);
        }
        
        // Add notes if provided
        if (pharmacyNotes) {
            medicine.notes = (medicine.notes || '') + '\n' + `Refill ${new Date().toLocaleDateString()}: ${pharmacyNotes}`;
        }
        
        await medicine.save();
        
        res.json({ 
            success: true, 
            message: 'Refill added successfully',
            remainingPills: medicine.quantity.remainingPills,
            needsRefill: medicine.needsRefill
        });
    } catch (error) {
        console.error('Error adding refill:', error);
        res.status(500).json({ error: 'Error adding refill' });
    }
});

// Get medicine details
router.get('/medicines/:id', ensureMedicineAccess, async (req, res) => {
    try {
        const [medicine, recentLogs, adherenceData] = await Promise.all([
            Medicine.findOne({ _id: req.params.id, user: req.user._id }),
            MedicationLog.find({ medicine: req.params.id, user: req.user._id })
                .sort({ takenAt: -1 })
                .limit(10),
            MedicationLog.getAdherence(req.params.id, req.user._id, 30)
        ]);
        
        if (!medicine) {
            return res.status(404).render('error', { message: 'Medicine not found' });
        }
        
        res.render('medicine-detail', {
            user: req.user,
            medicine,
            recentLogs,
            adherenceData,
            title: `${medicine.name} Details`
        });
    } catch (error) {
        console.error('Error loading medicine details:', error);
        res.status(500).render('error', { message: 'Error loading medicine details' });
    }
});

// Delete medicine
router.delete('/medicines/:id', ensureMedicineAccess, async (req, res) => {
    try {
        const medicine = await Medicine.findOne({ _id: req.params.id, user: req.user._id });
        
        if (!medicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }
        
        // Soft delete - mark as discontinued instead of actually deleting
        medicine.status = 'discontinued';
        medicine.isActive = false;
        await medicine.save();
        
        res.json({ success: true, message: 'Medicine discontinued successfully' });
    } catch (error) {
        console.error('Error discontinuing medicine:', error);
        res.status(500).json({ error: 'Error discontinuing medicine' });
    }
});

// Pharmacy management routes
router.get('/pharmacies', ensureMedicineAccess, async (req, res) => {
    try {
        const pharmacies = await Pharmacy.find({ user: req.user._id })
            .sort({ isPrimary: -1, name: 1 });
        
        res.render('pharmacies-list', {
            user: req.user,
            pharmacies,
            title: 'My Pharmacies'
        });
    } catch (error) {
        console.error('Error loading pharmacies:', error);
        res.status(500).render('error', { message: 'Error loading pharmacies' });
    }
});

router.post('/pharmacies', ensureMedicineAccess, async (req, res) => {
    try {
        const pharmacyData = {
            ...req.body,
            user: req.user._id
        };
        
        const pharmacy = new Pharmacy(pharmacyData);
        await pharmacy.save();
        
        res.json({ success: true, pharmacy });
    } catch (error) {
        console.error('Error creating pharmacy:', error);
        res.status(500).json({ error: 'Error creating pharmacy' });
    }
});

// Family Member Management Routes

// Get family members list
router.get('/family', ensureMedicineAccess, async (req, res) => {
    try {
        const familyMembers = await FamilyMember.findByUser(req.user._id);
        
        res.render('family-members', {
            user: req.user,
            familyMembers,
            title: 'Family Members'
        });
    } catch (error) {
        console.error('Error loading family members:', error);
        res.status(500).render('error', { message: 'Error loading family members' });
    }
});

// Add new family member form
router.get('/family/new', ensureMedicineAccess, async (req, res) => {
    try {
        res.render('family-member-form', {
            user: req.user,
            familyMember: null,
            isEdit: false,
            title: 'Add Family Member'
        });
    } catch (error) {
        console.error('Error loading family member form:', error);
        res.status(500).render('error', { message: 'Error loading form' });
    }
});

// Create new family member
router.post('/family', ensureMedicineAccess, async (req, res) => {
    try {
        const familyMemberData = {
            ...req.body,
            user: req.user._id
        };
        
        const familyMember = new FamilyMember(familyMemberData);
        await familyMember.save();
        
        res.redirect('/medicine/family?success=Family member added successfully');
    } catch (error) {
        console.error('Error creating family member:', error);
        
        if (error.message.includes('Only one "self" family member')) {
            return res.render('family-member-form', {
                error: 'You can only have one "self" family member',
                user: req.user,
                familyMember: req.body,
                isEdit: false,
                title: 'Add Family Member'
            });
        }
        
        res.render('family-member-form', {
            error: 'Error creating family member: ' + error.message,
            user: req.user,
            familyMember: req.body,
            isEdit: false,
            title: 'Add Family Member'
        });
    }
});

// Edit family member form
router.get('/family/:id/edit', ensureMedicineAccess, async (req, res) => {
    try {
        const familyMember = await FamilyMember.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!familyMember) {
            return res.status(404).render('error', { message: 'Family member not found' });
        }
        
        res.render('family-member-form', {
            user: req.user,
            familyMember,
            isEdit: true,
            title: 'Edit Family Member'
        });
    } catch (error) {
        console.error('Error loading family member:', error);
        res.status(500).render('error', { message: 'Error loading family member' });
    }
});

// Update family member
router.put('/family/:id', ensureMedicineAccess, async (req, res) => {
    try {
        const familyMember = await FamilyMember.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!familyMember) {
            return res.status(404).json({ error: 'Family member not found' });
        }
        
        Object.assign(familyMember, req.body);
        await familyMember.save();
        
        res.json({ success: true, message: 'Family member updated successfully' });
    } catch (error) {
        console.error('Error updating family member:', error);
        res.status(500).json({ error: 'Error updating family member' });
    }
});

// Delete family member
router.delete('/family/:id', ensureMedicineAccess, async (req, res) => {
    try {
        const familyMember = await FamilyMember.findOne({
            _id: req.params.id,
            user: req.user._id
        });
        
        if (!familyMember) {
            return res.status(404).json({ error: 'Family member not found' });
        }
        
        // Check if family member has medicines
        const medicineCount = await Medicine.countDocuments({ familyMember: familyMember._id });
        
        if (medicineCount > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete family member with active medicines. Please remove their medicines first.' 
            });
        }
        
        // Soft delete
        familyMember.isActive = false;
        await familyMember.save();
        
        res.json({ success: true, message: 'Family member removed successfully' });
    } catch (error) {
        console.error('Error deleting family member:', error);
        res.status(500).json({ error: 'Error deleting family member' });
    }
});

// Multer configuration for CSV file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept CSV and Excel files
        const fileName = file.originalname.toLowerCase();
        const isCSV = file.mimetype === 'text/csv' || fileName.endsWith('.csv');
        const isExcel = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                       file.mimetype === 'application/vnd.ms-excel' ||
                       fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
        
        if (isCSV || isExcel) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Test import page (no authentication required)
router.get('/import-test', async (req, res) => {
    try {
        // Mock user and family members for testing
        const mockUser = {
            _id: 'test-user-id',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User'
        };
        
        const familyMembers = [];

        res.render('pharmacy-import', {
            user: mockUser,
            title: 'Import Pharmacy Records (Test)',
            familyMembers
        });
    } catch (error) {
        console.error('Error loading test import page:', error);
        res.status(500).render('error', { message: 'Error loading test import page' });
    }
});

// Test import POST route (no authentication required) - FOR TESTING ONLY
router.post('/import-test', upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create a mock user for testing
        const mockUser = {
            _id: '507f1f77bcf86cd799439011', // Valid ObjectId format
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User'
        };

        const filePath = req.file.path;
        const parser = new PharmacyRecordParser();
        
        // Parse the CSV file
        const result = await parser.parsePharmacyRecords(filePath, mockUser);
        
        // Clean up uploaded file
        const fs = require('fs');
        fs.unlinkSync(filePath);
        
        res.json({
            success: true,
            message: 'Pharmacy records imported successfully (TEST MODE)',
            summary: {
                totalRecords: result.summary.totalRecords,
                medicinesCreated: result.summary.medicinesCreated,
                logsCreated: result.summary.logsCreated,
                errorsCount: result.summary.errorsCount
            },
            medicines: result.medicines,
            logs: result.logs,
            errors: result.errors,
            warnings: result.warnings
        });
    } catch (error) {
        console.error('Error importing pharmacy records (test):', error);
        
        // Clean up uploaded file in case of error
        if (req.file && req.file.path) {
            try {
                const fs = require('fs');
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        
        res.status(500).json({ 
            error: 'Error importing pharmacy records (test)',
            details: error.message 
        });
    }
});

// Show import page
router.get('/import', ensureAuthenticated, async (req, res) => {
    try {
        const familyMembers = await FamilyMember.find({ 
            user: req.user._id, 
            isActive: true 
        }).sort({ relationship: 1, name: 1 });

        res.render('pharmacy-import', {
            user: req.user,
            title: 'Import Pharmacy Records',
            familyMembers
        });
    } catch (error) {
        console.error('Error loading import page:', error);
        res.status(500).render('error', { message: 'Error loading import page' });
    }
});

// Handle CSV file upload and processing
router.post('/import', ensureAuthenticated, upload.single('csvFile'), async (req, res) => {
    try {
        console.log('📨 POST /medicine/import - File upload received');
        
        if (!req.file) {
            console.log('❌ No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`📂 File received: ${req.file.originalname} (${req.file.size} bytes)`);
        console.log(`📁 Saved to: ${req.file.path}`);
        console.log(`👤 User: ${req.user.username}`);

        const filePath = req.file.path;
        const parser = new PharmacyRecordParser();
        
        console.log('🔄 Starting pharmacy record parsing...');
        
        // Parse the CSV file
        const result = await parser.parsePharmacyRecords(filePath, req.user);
        
        console.log('✅ Parsing completed');
        console.log(`📊 Summary: ${result.summary.totalRecords} records, ${result.summary.medicinesCreated} medicines created`);
        
        // Only clean up uploaded file if parsing was successful OR if explicitly requested
        const fs = require('fs');
        if (result.summary.totalRecords > 0 || req.query.cleanup === 'force') {
            fs.unlinkSync(filePath);
            console.log('🗑️ Uploaded file cleaned up');
        } else {
            console.log(`🔍 File preserved for debugging at: ${filePath}`);
            console.log(`🔍 To force cleanup, add ?cleanup=force to the request`);
        }
        
        res.json({
            success: true,
            message: 'Pharmacy records imported successfully',
            summary: {
                totalRecords: result.summary.totalRecords,
                medicinesCreated: result.summary.medicinesCreated,
                logsCreated: result.summary.logsCreated,
                errorsCount: result.summary.errorsCount
            },
            medicines: result.medicines,
            logs: result.logs,
            errors: result.errors,
            warnings: result.warnings
        });
    } catch (error) {
        console.error('Error importing pharmacy records:', error);
        
        // Clean up uploaded file in case of error
        if (req.file && req.file.path) {
            try {
                const fs = require('fs');
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        
        res.status(500).json({ 
            error: 'Error importing pharmacy records',
            details: error.message 
        });
    }
});

// Get import history
router.get('/import/history', ensureAuthenticated, async (req, res) => {
    try {
        // Find recently created medicines as a proxy for import history
        const recentMedicines = await Medicine.find({ 
            user: req.user._id 
        })
        .populate('familyMember')
        .sort({ createdAt: -1 })
        .limit(50);
        
        const recentLogs = await MedicationLog.find({ 
            user: req.user._id 
        })
        .populate('medicine')
        .populate('familyMember')
        .sort({ createdAt: -1 })
        .limit(50);
        
        res.json({
            recentMedicines,
            recentLogs
        });
    } catch (error) {
        console.error('Error fetching import history:', error);
        res.status(500).json({ error: 'Error fetching import history' });
    }
});

// Utility function to format time
function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

module.exports = router;
