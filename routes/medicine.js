const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const MedicationLog = require('../models/MedicationLog');
const Pharmacy = require('../models/Pharmacy');

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
        const [medicines, recentLogs, pharmacies, stats] = await Promise.all([
            // Active medicines
            Medicine.find({ user: req.user._id, status: 'active' })
                .sort({ createdAt: -1 })
                .limit(10),
            
            // Recent medication logs
            MedicationLog.find({ user: req.user._id })
                .populate('medicine', 'name strength form')
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
        const pharmacies = await Pharmacy.find({ user: req.user._id, isActive: true });
        
        res.render('medicine-form', {
            user: req.user,
            medicine: null,
            pharmacies,
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
        const [medicine, pharmacies] = await Promise.all([
            Medicine.findOne({ _id: req.params.id, user: req.user._id }),
            Pharmacy.find({ user: req.user._id, isActive: true })
        ]);
        
        if (!medicine) {
            return res.status(404).render('error', { message: 'Medicine not found' });
        }
        
        res.render('medicine-form', {
            user: req.user,
            medicine,
            pharmacies,
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
