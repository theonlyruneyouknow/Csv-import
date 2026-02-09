const express = require('express');
const router = express.Router();
const Missionary = require('../models/Missionary');
const Companionship = require('../models/Companionship');
const MissionArea = require('../models/MissionArea');
const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Helper function to write import logs
function writeImportLog(importType, result, data) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const logFilePath = path.join(logsDir, `ebm-${importType}-import-${timestamp}.log`);
    
    const logContent = [
        `==========================================================`,
        `EBM ${importType.toUpperCase()} IMPORT LOG`,
        `Timestamp: ${new Date().toISOString()}`,
        `==========================================================`,
        ``,
        `INPUT DATA:`,
        `  Total rows processed: ${data.length}`,
        ``,
        `RESULTS:`,
        JSON.stringify(result, null, 2),
        ``,
        `==========================================================`,
        `Log file: ${logFilePath}`,
        `==========================================================`
    ].join('\n');
    
    fs.writeFileSync(logFilePath, logContent, 'utf8');
    console.log(`📄 Import log saved to: ${logFilePath}`);
    
    return logFilePath;
}

// Middleware to check if user has access to EBM Alumni module
const ensureEBMAccess = (req, res, next) => {
    if (!req.user.permissions.accessEBMAlumni) {
        return res.status(403).render('error', { 
            message: 'Access denied. You do not have permission to access EBM Alumni Connections.' 
        });
    }
    next();
};

// ==================== DASHBOARD ====================

// Main Dashboard
router.get('/dashboard', ensureEBMAccess, async (req, res) => {
    try {
        const [
            totalMissionaries,
            needVerification,
            totalAreas,
            totalCompanionships,
            recentMissionaries,
            dataQualityStats
        ] = await Promise.all([
            Missionary.countDocuments({ isActive: true }),
            Missionary.countDocuments({ needsVerification: true, isActive: true }),
            MissionArea.countDocuments(),
            Companionship.countDocuments(),
            Missionary.find({ isActive: true })
                .sort({ updatedAt: -1 })
                .limit(10)
                .populate('addedBy', 'username'),
            Missionary.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$dataStatus',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const stats = {
            total: totalMissionaries,
            needVerification,
            areas: totalAreas,
            companionships: totalCompanionships,
            dataQuality: dataQualityStats.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {})
        };

        res.render('ebm-dashboard', {
            user: req.user,
            stats,
            recentMissionaries,
            title: 'EBM Alumni Connections Dashboard'
        });
    } catch (error) {
        console.error('Error loading EBM dashboard:', error);
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
});

// ==================== MISSIONARIES ====================

// List all missionaries
router.get('/missionaries', ensureEBMAccess, async (req, res) => {
    try {
        const { search, status, sort = 'lastName', order = 'asc', yearFrom, yearTo } = req.query;
        
        let query = { isActive: true };
        
        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { firstName: regex },
                { lastName: regex },
                { maidenName: regex },
                { email: regex }
            ];
        }
        
        if (status) {
            query.dataStatus = status;
        }
        
        // Filter by service years
        if (yearFrom || yearTo) {
            const dateQuery = {};
            
            if (yearFrom) {
                const fromDate = new Date(parseInt(yearFrom), 0, 1); // Jan 1st of yearFrom
                dateQuery.$gte = fromDate;
            }
            
            if (yearTo) {
                const toDate = new Date(parseInt(yearTo), 11, 31); // Dec 31st of yearTo
                dateQuery.$lte = toDate;
            }
            
            // Match if either start date or end date falls within range
            query.$or = query.$or || [];
            const yearConditions = [
                { serviceStartDate: dateQuery }
            ];
            
            if (yearTo) {
                yearConditions.push({ serviceEndDate: dateQuery });
            }
            
            // If we already have a $or for search, we need to AND it properly
            if (search) {
                const searchOr = query.$or;
                query.$and = [
                    { $or: searchOr },
                    { $or: yearConditions }
                ];
                delete query.$or;
            } else {
                query.$or = yearConditions;
            }
        }
        
        const sortOrder = order === 'desc' ? -1 : 1;
        const missionaries = await Missionary.find(query)
            .sort({ [sort]: sortOrder })
            .populate('addedBy', 'username')
            .populate('verifiedBy', 'username')
            .populate({
                path: 'areasServed',
                select: 'name city legacyAreaId'
            })
            .populate({
                path: 'companionships',
                select: 'missionaries startDate endDate',
                populate: {
                    path: 'missionaries.missionary',
                    select: 'firstName lastName'
                }
            });
        
        res.render('ebm-missionaries', {
            user: req.user,
            missionaries,
            filters: { search, status, sort, order, yearFrom, yearTo },
            title: 'Missionaries'
        });
    } catch (error) {
        console.error('Error loading missionaries:', error);
        res.status(500).render('error', { message: 'Error loading missionaries' });
    }
});

// Get missionary log (formerly called areabook - the missionary's personal log)
router.get('/missionary-log/:id', ensureEBMAccess, async (req, res) => {
    try {
        const missionary = await Missionary.findById(req.params.id)
            .populate('areasServed', 'name city state legacyAreaId')
            .populate({
                path: 'companionships',
                populate: {
                    path: 'missionaries.missionary',
                    select: 'firstName lastName email'
                }
            });
        
        if (!missionary) {
            return res.status(404).render('error', { message: 'Missionary not found' });
        }
        
        res.render('ebm-missionary-log', {
            user: req.user,
            missionary,
            title: `Missionary Log - ${missionary.firstName} ${missionary.lastName}`
        });
    } catch (error) {
        console.error('Error loading missionary log:', error);
        res.status(500).render('error', { message: 'Error loading missionary log' });
    }
});

// Get single missionary details
router.get('/missionaries/:id', ensureEBMAccess, async (req, res) => {
    try {
        const missionary = await Missionary.findById(req.params.id)
            .populate('addedBy', 'username firstName lastName')
            .populate('verifiedBy', 'username firstName lastName')
            .populate('areasServed', 'name city legacyAreaId');
        
        if (!missionary) {
            return res.status(404).render('error', { message: 'Missionary not found' });
        }
        
        // Get companions if Companionship model exists, otherwise skip
        let companions = [];
        try {
            if (Companionship && Companionship.findCompanionsOf) {
                companions = await Companionship.findCompanionsOf(missionary._id);
            }
        } catch (companionError) {
            console.log('Companionship feature not available yet');
        }
        
        res.render('ebm-missionary-detail', {
            user: req.user,
            missionary,
            companions,
            title: missionary.displayName || `${missionary.firstName} ${missionary.lastName}`
        });
    } catch (error) {
        console.error('Error loading missionary:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).render('error', { 
            message: 'Error loading missionary details',
            error: error.message 
        });
    }
});

// Get missionary edit page
router.get('/missionaries/:id/edit', ensureEBMAccess, async (req, res) => {
    try {
        const missionary = await Missionary.findById(req.params.id)
            .populate('areasServed', 'name city legacyAreaId');
        
        if (!missionary) {
            return res.status(404).render('error', { message: 'Missionary not found' });
        }
        
        // Get all areas for selection
        const allAreas = await MissionArea.find({ isActive: true })
            .sort({ name: 1 })
            .select('name city state legacyAreaId');
        
        // Get companionships for this missionary
        const companionships = await Companionship.find({
            'missionaries.missionary': missionary._id
        })
            .populate('area', 'name city')
            .populate('missionaries.missionary', 'firstName lastName')
            .sort({ startDate: -1 });
        
        // Get all missionaries for selection (excluding current one)
        const allMissionaries = await Missionary.find({ _id: { $ne: missionary._id } })
            .sort({ lastName: 1, firstName: 1 })
            .select('firstName lastName serviceStartDate serviceEndDate')
            .lean();
        
        res.render('ebm-missionary-edit', {
            user: req.user,
            missionary,
            allAreas,
            companionships,
            allMissionaries,
            title: `Edit ${missionary.firstName} ${missionary.lastName}`
        });
    } catch (error) {
        console.error('Error loading missionary edit page:', error);
        res.status(500).render('error', { message: 'Error loading edit page' });
    }
});

// Create missionary
router.post('/missionaries', ensureEBMAccess, async (req, res) => {
    try {
        const missionaryData = {
            ...req.body,
            addedBy: req.user._id
        };
        
        const missionary = new Missionary(missionaryData);
        await missionary.save();
        await missionary.updateDataStatus();
        
        res.json({ success: true, missionary, message: 'Missionary added successfully' });
    } catch (error) {
        console.error('Error creating missionary:', error);
        res.status(500).json({ success: false, error: 'Failed to add missionary' });
    }
});

// Update missionary
router.put('/missionaries/:id', ensureEBMAccess, async (req, res) => {
    try {
        const missionary = await Missionary.findById(req.params.id);
        
        if (!missionary) {
            return res.status(404).json({ success: false, error: 'Missionary not found' });
        }
        
        Object.assign(missionary, req.body);
        missionary.lastEditedBy = req.user._id;
        await missionary.save();
        await missionary.updateDataStatus();
        
        res.json({ success: true, missionary, message: 'Missionary updated successfully' });
    } catch (error) {
        console.error('Error updating missionary:', error);
        res.status(500).json({ success: false, error: 'Failed to update missionary' });
    }
});

// Verify missionary
router.post('/missionaries/:id/verify', ensureEBMAccess, async (req, res) => {
    try {
        const missionary = await Missionary.findById(req.params.id);
        
        if (!missionary) {
            return res.status(404).json({ success: false, error: 'Missionary not found' });
        }
        
        await missionary.markVerified(req.user._id);
        
        res.json({ success: true, message: 'Missionary verified successfully' });
    } catch (error) {
        console.error('Error verifying missionary:', error);
        res.status(500).json({ success: false, error: 'Failed to verify missionary' });
    }
});

// Delete (soft delete) missionary
router.delete('/missionaries/:id', ensureEBMAccess, async (req, res) => {
    try {
        const missionary = await Missionary.findById(req.params.id);
        
        if (!missionary) {
            return res.status(404).json({ success: false, error: 'Missionary not found' });
        }
        
        missionary.isActive = false;
        missionary.lastEditedBy = req.user._id;
        await missionary.save();
        
        res.json({ success: true, message: 'Missionary removed successfully' });
    } catch (error) {
        console.error('Error deleting missionary:', error);
        res.status(500).json({ success: false, error: 'Failed to remove missionary' });
    }
});

// ==================== COMPANIONSHIPS ====================

// List companionships
router.get('/companionships', ensureEBMAccess, async (req, res) => {
    try {
        const { missionaryId, areaId } = req.query;
        
        let query = {};
        if (missionaryId) query['missionaries.missionary'] = missionaryId;
        if (areaId) query.area = areaId;
        
        const companionships = await Companionship.find(query)
            .populate('missionaries.missionary', 'firstName lastName')
            .populate('area', 'name city')
            .sort({ startDate: -1 });
        
        res.render('ebm-companionships', {
            user: req.user,
            companionships,
            title: 'Companionships'
        });
    } catch (error) {
        console.error('Error loading companionships:', error);
        res.status(500).render('error', { message: 'Error loading companionships' });
    }
});

// Create companionship
router.post('/companionships', ensureEBMAccess, async (req, res) => {
    try {
        const companionshipData = {
            ...req.body,
            addedBy: req.user._id
        };
        
        const companionship = new Companionship(companionshipData);
        await companionship.save();
        
        // Update missionaries with this companionship
        for (const missionary of companionship.missionaries) {
            const miss = await Missionary.findById(missionary.missionary);
            if (miss) {
                await miss.addCompanionship(companionship._id);
                await miss.addArea(companionship.area);
            }
        }
        
        // Update area stats
        const area = await MissionArea.findById(companionship.area);
        if (area) {
            await area.updateStats();
        }
        
        res.json({ success: true, companionship, message: 'Companionship added successfully' });
    } catch (error) {
        console.error('Error creating companionship:', error);
        res.status(500).json({ success: false, error: 'Failed to add companionship' });
    }
});

// Get single companionship
router.get('/companionships/:id', ensureEBMAccess, async (req, res) => {
    try {
        const companionship = await Companionship.findById(req.params.id)
            .populate('area', 'name city')
            .populate('missionaries.missionary', 'firstName lastName');
        
        if (!companionship) {
            return res.status(404).json({ success: false, error: 'Companionship not found' });
        }
        
        res.json(companionship);
    } catch (error) {
        console.error('Error fetching companionship:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch companionship' });
    }
});

// Update companionship
router.put('/companionships/:id', ensureEBMAccess, async (req, res) => {
    try {
        const companionship = await Companionship.findById(req.params.id);
        
        if (!companionship) {
            return res.status(404).json({ success: false, error: 'Companionship not found' });
        }
        
        Object.assign(companionship, req.body);
        companionship.lastEditedBy = req.user._id;
        await companionship.save();
        
        res.json({ success: true, companionship, message: 'Companionship updated successfully' });
    } catch (error) {
        console.error('Error updating companionship:', error);
        res.status(500).json({ success: false, error: 'Failed to update companionship' });
    }
});

// Delete companionship
router.delete('/companionships/:id', ensureEBMAccess, async (req, res) => {
    try {
        const companionship = await Companionship.findById(req.params.id);
        
        if (!companionship) {
            return res.status(404).json({ success: false, error: 'Companionship not found' });
        }
        
        await Companionship.findByIdAndDelete(req.params.id);
        
        res.json({ success: true, message: 'Companionship deleted successfully' });
    } catch (error) {
        console.error('Error deleting companionship:', error);
        res.status(500).json({ success: false, error: 'Failed to delete companionship' });
    }
});

// ==================== AREAS ====================

// Create new area (quick add)
router.post('/areas', ensureEBMAccess, async (req, res) => {
    try {
        const areaData = {
            ...req.body,
            addedBy: req.user._id
        };
        
        const area = new MissionArea(areaData);
        await area.save();
        
        res.json({ success: true, area, message: 'Area created successfully' });
    } catch (error) {
        console.error('Error creating area:', error);
        res.status(500).json({ success: false, error: 'Failed to create area' });
    }
});

// List all areas
router.get('/areas', ensureEBMAccess, async (req, res) => {
    try {
        const { search, sort = 'name', order = 'asc' } = req.query;
        
        let query = {};
        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { name: regex },
                { city: regex },
                { county: regex }
            ];
        }
        
        const sortOrder = order === 'desc' ? -1 : 1;
        const areas = await MissionArea.find(query)
            .sort({ [sort]: sortOrder })
            .populate('addedBy', 'username');
        
        res.render('ebm-areas', {
            user: req.user,
            areas,
            filters: { search, sort, order },
            title: 'Mission Areas'
        });
    } catch (error) {
        console.error('Error loading areas:', error);
        res.status(500).render('error', { message: 'Error loading areas' });
    }
});

// Area normalization tool - MUST BE BEFORE /areas/:id
router.get('/areas/normalize', ensureEBMAccess, async (req, res) => {
    try {
        const areas = await MissionArea.find({})
            .sort({ name: 1 })
            .select('name city state county legacyAreaId');
        
        // Group similar areas
        const grouped = {};
        areas.forEach(area => {
            const key = area.name.toLowerCase().trim().replace(/\s+/g, ' ');
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(area);
        });
        
        // Find duplicates (same normalized name)
        const duplicates = Object.entries(grouped)
            .filter(([key, areas]) => areas.length > 1)
            .map(([key, areas]) => ({ key, areas }));
        
        // Find similar areas (Levenshtein distance or similar cities)
        const similar = [];
        const areasList = Object.values(grouped).flat();
        for (let i = 0; i < areasList.length; i++) {
            for (let j = i + 1; j < areasList.length; j++) {
                const a = areasList[i];
                const b = areasList[j];
                if (a.city === b.city && a.name !== b.name) {
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();
                    // Check if names are very similar
                    if (Math.abs(nameA.length - nameB.length) <= 2) {
                        similar.push({ area1: a, area2: b });
                    }
                }
            }
        }
        
        res.render('ebm-areas-normalize', {
            user: req.user,
            duplicates,
            similar,
            totalAreas: areas.length,
            title: 'Normalize Area Names'
        });
    } catch (error) {
        console.error('Error loading area normalization:', error);
        res.status(500).render('error', { message: 'Error loading normalization tool' });
    }
});

// Merge areas - MUST BE BEFORE /areas/:id
router.post('/areas/merge', ensureEBMAccess, async (req, res) => {
    try {
        const { sourceId, targetId } = req.body;
        
        console.log('Merge request:', { sourceId, targetId });
        
        if (!sourceId || !targetId || sourceId === targetId) {
            return res.status(400).json({ success: false, error: 'Invalid area IDs' });
        }
        
        const source = await MissionArea.findById(sourceId);
        const target = await MissionArea.findById(targetId);
        
        console.log('Source area:', source ? source.name : 'NOT FOUND');
        console.log('Target area:', target ? target.name : 'NOT FOUND');
        
        if (!source || !target) {
            return res.status(404).json({ success: false, error: 'Area not found' });
        }
        
        // Update all missionaries - do in two steps to avoid conflict
        // First, add the target area
        const missionaryAdd = await Missionary.updateMany(
            { areasServed: sourceId },
            { $addToSet: { areasServed: targetId } }
        );
        console.log('Added target area to missionaries:', missionaryAdd.modifiedCount);
        
        // Then, remove the source area
        const missionaryRemove = await Missionary.updateMany(
            { areasServed: sourceId },
            { $pull: { areasServed: sourceId } }
        );
        console.log('Removed source area from missionaries:', missionaryRemove.modifiedCount);
        
        // Update all companionships
        const companionshipUpdate = await Companionship.updateMany(
            { area: sourceId },
            { $set: { area: targetId } }
        );
        console.log('Updated companionships:', companionshipUpdate.modifiedCount);
        
        // Merge alternate names (initialize if undefined)
        if (!target.alternateNames) {
            target.alternateNames = [];
        }
        if (!target.alternateNames.includes(source.name)) {
            target.alternateNames.push(source.name);
        }
        if (source.alternateNames) {
            source.alternateNames.forEach(name => {
                if (!target.alternateNames.includes(name)) {
                    target.alternateNames.push(name);
                }
            });
        }
        
        await target.save();
        await MissionArea.findByIdAndDelete(sourceId);
        
        console.log('Merge completed successfully');
        res.json({ success: true, message: 'Areas merged successfully' });
    } catch (error) {
        console.error('Error merging areas:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to merge areas' });
    }
});

// Get area details
router.get('/areas/:id', ensureEBMAccess, async (req, res) => {
    try {
        const area = await MissionArea.findById(req.params.id)
            .populate('addedBy', 'username firstName lastName')
            .populate('verifiedBy', 'username firstName lastName');
        
        if (!area) {
            return res.status(404).render('error', { message: 'Area not found' });
        }
        
        // Fetch companionships with populated missionary data
        const companionships = await Companionship.find({ area: area._id })
            .populate({
                path: 'missionaries.missionary',
                select: 'firstName lastName serviceStartDate'
            })
            .lean();
        
        // Also get all missionaries who have this area in their areasServed
        const missionariesInArea = await Missionary.find({ 
            areasServed: area._id,
            isActive: true 
        })
            .select('firstName lastName serviceStartDate serviceEndDate')
            .sort('serviceStartDate')
            .lean();
        
        // Create a map of missionaries already in companionships
        const missionariesInCompanionships = new Set();
        companionships.forEach(comp => {
            comp.missionaries.forEach(m => {
                if (m.missionary && m.missionary._id) {
                    missionariesInCompanionships.add(m.missionary._id.toString());
                }
            });
        });
        
        // Add missionaries not yet in companionships as individual entries
        missionariesInArea.forEach(missionary => {
            const missionaryIdStr = missionary._id.toString();
            if (!missionariesInCompanionships.has(missionaryIdStr)) {
                // Create a pseudo-companionship for display purposes
                companionships.push({
                    _id: null, // No actual companionship ID
                    startDate: missionary.serviceStartDate,
                    endDate: missionary.serviceEndDate,
                    missionaries: [{
                        missionary: missionary,
                        role: 'missionary'
                    }],
                    isUnassigned: true // Flag to indicate this is not a real companionship
                });
            }
        });
        
        // Sort companionships by the earliest service start date of missionaries in each companionship
        companionships.sort((a, b) => {
            const aEarliestDate = a.missionaries
                .map(m => m.missionary?.serviceStartDate)
                .filter(d => d)
                .sort((d1, d2) => new Date(d1) - new Date(d2))[0];
            
            const bEarliestDate = b.missionaries
                .map(m => m.missionary?.serviceStartDate)
                .filter(d => d)
                .sort((d1, d2) => new Date(d1) - new Date(d2))[0];
            
            if (!aEarliestDate && !bEarliestDate) return 0;
            if (!aEarliestDate) return 1;
            if (!bEarliestDate) return -1;
            
            return new Date(aEarliestDate) - new Date(bEarliestDate);
        });
        
        res.render('ebm-area-detail', {
            user: req.user,
            area,
            companionships,
            title: area.fullLocation
        });
    } catch (error) {
        console.error('Error loading area:', error);
        res.status(500).render('error', { message: 'Error loading area details' });
    }
});

// Merge companionships (drag and drop)
router.post('/companionships/merge', ensureEBMAccess, async (req, res) => {
    try {
        const { sourceId, targetId } = req.body;
        
        if (!sourceId || !targetId) {
            return res.status(400).json({ success: false, message: 'Source and target IDs required' });
        }
        
        if (sourceId === targetId) {
            return res.status(400).json({ success: false, message: 'Cannot merge a companionship with itself' });
        }
        
        const source = await Companionship.findById(sourceId);
        const target = await Companionship.findById(targetId);
        
        if (!source || !target) {
            return res.status(404).json({ success: false, message: 'Companionship not found' });
        }
        
        // Merge missionaries arrays, avoiding duplicates
        const existingMissionaryIds = new Set(
            target.missionaries.map(m => m.missionary.toString())
        );
        
        source.missionaries.forEach(m => {
            if (!existingMissionaryIds.has(m.missionary.toString())) {
                target.missionaries.push(m);
            }
        });
        
        // Update dates to encompass both companionships
        if (source.startDate && (!target.startDate || source.startDate < target.startDate)) {
            target.startDate = source.startDate;
        }
        
        if (source.endDate && (!target.endDate || source.endDate > target.endDate)) {
            target.endDate = source.endDate;
        }
        
        // Merge leadership flags
        target.isDistrictLeadership = target.isDistrictLeadership || source.isDistrictLeadership;
        target.isZoneLeadership = target.isZoneLeadership || source.isZoneLeadership;
        target.isTraining = target.isTraining || source.isTraining;
        
        // Calculate new duration
        if (target.startDate && target.endDate) {
            const weeks = Math.round(
                (target.endDate - target.startDate) / (7 * 24 * 60 * 60 * 1000)
            );
            target.duration = weeks;
        }
        
        // Save merged companionship
        await target.save();
        
        // Remove source companionship references from missionaries
        await Missionary.updateMany(
            { companionships: sourceId },
            { $pull: { companionships: sourceId } }
        );
        
        // Delete source companionship
        await Companionship.findByIdAndDelete(sourceId);
        
        console.log(`✅ Merged companionship ${sourceId} into ${targetId}`);
        
        res.json({ 
            success: true, 
            message: 'Companionships merged successfully',
            companionshipId: targetId
        });
    } catch (error) {
        console.error('Error merging companionships:', error);
        res.status(500).json({ success: false, message: 'Error merging companionships' });
    }
});

// Create area
router.post('/areas', ensureEBMAccess, async (req, res) => {
    try {
        const areaData = {
            ...req.body,
            addedBy: req.user._id
        };
        
        const area = new MissionArea(areaData);
        await area.save();
        
        res.json({ success: true, area, message: 'Area added successfully' });
    } catch (error) {
        console.error('Error creating area:', error);
        res.status(500).json({ success: false, error: 'Failed to add area' });
    }
});

// Update area
router.put('/areas/:id', ensureEBMAccess, async (req, res) => {
    try {
        const area = await MissionArea.findById(req.params.id);
        
        if (!area) {
            return res.status(404).json({ success: false, error: 'Area not found' });
        }
        
        Object.assign(area, req.body);
        area.lastEditedBy = req.user._id;
        await area.save();
        
        res.json({ success: true, area, message: 'Area updated successfully' });
    } catch (error) {
        console.error('Error updating area:', error);
        res.status(500).json({ success: false, error: 'Failed to update area' });
    }
});

// ==================== SEARCH & CONNECTIONS ====================

// Search across all data
router.get('/search', ensureEBMAccess, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 2) {
            return res.json({ 
                success: true, 
                missionaries: [], 
                areas: [], 
                companionships: [] 
            });
        }
        
        const regex = new RegExp(q, 'i');
        
        const [missionaries, areas] = await Promise.all([
            Missionary.find({
                $or: [
                    { firstName: regex },
                    { lastName: regex },
                    { maidenName: regex }
                ],
                isActive: true
            }).limit(20),
            MissionArea.find({
                $or: [
                    { name: regex },
                    { city: regex }
                ]
            }).limit(20)
        ]);
        
        res.json({ success: true, missionaries, areas });
    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});

// Connection visualization data
router.get('/connections/:missionaryId', ensureEBMAccess, async (req, res) => {
    try {
        const missionary = await Missionary.findById(req.params.missionaryId);
        
        if (!missionary) {
            return res.status(404).json({ success: false, error: 'Missionary not found' });
        }
        
        const companions = await Companionship.findCompanionsOf(missionary._id);
        
        res.json({ success: true, missionary, companions });
    } catch (error) {
        console.error('Error loading connections:', error);
        res.status(500).json({ success: false, error: 'Failed to load connections' });
    }
});

// ==================== DATA IMPORT/EXPORT ====================

// Data import page
router.get('/import', ensureEBMAccess, (req, res) => {
    res.render('ebm-import', {
        user: req.user,
        title: 'Import Data'
    });
});

// Handle CSV upload and import
router.post('/import', ensureEBMAccess, upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const importType = req.body.importType || 'missionaries';
        console.log(`📥 Processing ${importType} import`);

        const csvContent = req.file.buffer.toString('utf8');
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });

        if (parsed.errors.length > 0) {
            console.log('CSV parsing warnings:', parsed.errors.length);
        }

        if (parsed.data.length === 0) {
            return res.status(400).json({ success: false, error: 'No data found in CSV' });
        }

        let result;

        // Route to appropriate import handler
        switch (importType) {
            case 'missionaries':
                result = await importMissionaries(parsed.data, req.user);
                break;
            case 'areas':
                result = await importAreas(parsed.data, req.user);
                break;
            case 'missionary-areas':
                result = await importMissionaryAreas(parsed.data, req.user);
                break;
            case 'areabook':
                result = await importAreabook(parsed.data, req.user);
                break;
            case 'companionships':
                result = await importCompanionships(parsed.data, req.user);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid import type' });
        }

        // Save log file
        const logFilePath = writeImportLog(importType, result, parsed.data);
        result.logFile = logFilePath;

        res.json(result);

    } catch (error) {
        console.error('Error importing CSV:', error);
        res.status(500).json({ success: false, error: 'Import failed: ' + error.message });
    }
});

// Helper: Import Missionaries
async function importMissionaries(data, user) {
    let imported = 0;
    let updated = 0;
    let errors = [];

    try {
        // Helper functions
        const parseDate = (dateString) => {
            if (!dateString || dateString === 'NULL' || dateString === '' || dateString === '0000-00-00 00:00:00') return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
        };

        const parseChildren = (childrenString) => {
            if (!childrenString || childrenString.trim() === '' || childrenString === 'NULL') return [];
            const childArray = childrenString.split(/[,;]/).map(c => c.trim()).filter(c => c);
            return childArray.map(name => ({ name: name, gender: 'unknown' }));
        };

        for (const row of data) {
            try {
                // Skip rows without essential data
                if (!row.firstname || !row.lastname) {
                    continue;
                }

                // Build comprehensive notes
                const notesArray = [];
                if (row.other) notesArray.push(`Other: ${row.other}`);
                if (row.last_now) notesArray.push(`Last Known As: ${row.last_now}`);

                const missionaryData = {
                    firstName: row.firstname || '',
                    lastName: row.lastname || '',
                    maidenName: row.last_now || null,
                    missionName: 'England Birmingham Mission',
                    missionId: row.mission_id || null,
                    missionTitle: row.mis_title || null,
                    serviceStartDate: parseDate(row.start_date),
                    serviceEndDate: parseDate(row.end_date),
                    email: row.email || null,
                    badEmail: row.bad_email === '1' || row.bad_email === 1,
                    phone: row.cur_phone || null,
                    homepage: row.homepage || null,
                    currentAddress: {
                        address1: row.cur_add1 || null,
                        address2: row.cur_add2 || null,
                        city: row.cur_city || null,
                        state: row.cur_state || null,
                        zip: row.cur_zip || null,
                        country: row.cur_country || 'USA',
                        phone: row.cur_phone || null
                    },
                    currentCity: row.cur_city || null,
                    currentState: row.cur_state || null,
                    currentCountry: row.cur_country || 'USA',
                    permanentAddress: {
                        address1: row.pmt_add1 || null,
                        address2: row.pmt_add2 || null,
                        city: row.pmt_city || null,
                        state: row.pmt_state || null,
                        zip: row.pmt_zip || null,
                        country: row.pmt_country || null,
                        phone: row.pmt_phone || null
                    },
                    spouse: { name: row.spouse || null },
                    children: parseChildren(row.children),
                    missionPhoto: (row.photo && row.photo !== 'N' && row.photo !== 'NULL') ? {
                        url: row.photo,
                        uploadDate: new Date()
                    } : null,
                    occupation: row.occupation || null,
                    work: row.work || null,
                    workUrl: row.work_url || null,
                    areabook: row.areabook || row.area_book || row.area_companions || null,
                    notes: notesArray.join('\n') || null,
                    other: row.other || null,
                    legacyData: {
                        alumId: row.alum_id || null,
                        personId: row.person_id === 'NULL' ? null : row.person_id,
                        userId: row.userid || null,
                        password: row.password || null,
                        lastNow: row.last_now || null,
                        addDate: parseDate(row.add_date),
                        lastUpdate: parseDate(row.last_update),
                        lang1Counter: row.lang_1_counter ? parseInt(row.lang_1_counter) : null,
                        lang2Counter: row.lang_2_counter ? parseInt(row.lang_2_counter) : null
                    },
                    dataStatus: 'partial',
                    needsVerification: true,
                    dataSources: [{
                        source: 'import',
                        date: new Date(),
                        notes: `Web import from CSV. Alumni ID: ${row.alum_id || 'N/A'}`
                    }],
                    addedBy: req.user._id,
                    isActive: true
                };

                // Check if missionary already exists
                let existingMissionary = null;
                
                if (row.alum_id) {
                    existingMissionary = await Missionary.findOne({
                        'legacyData.alumId': row.alum_id
                    });
                }
                
                if (!existingMissionary) {
                    existingMissionary = await Missionary.findOne({
                        firstName: row.firstname,
                        lastName: row.lastname,
                        serviceStartDate: parseDate(row.start_date)
                    });
                }

                if (existingMissionary) {
                    Object.assign(existingMissionary, missionaryData);
                    existingMissionary.lastEditedBy = req.user._id;
                    await existingMissionary.save();
                    updated++;
                } else {
                    await Missionary.create(missionaryData);
                    imported++;
                }

            } catch (err) {
                errors.push({
                    name: `${row.firstname} ${row.lastname}`,
                    error: err.message
                });
            }
        }

        return {
            success: true,
            imported,
            updated,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully imported ${imported} and updated ${updated} missionaries`
        };
    } catch (error) {
        throw new Error('Missionary import failed: ' + error.message);
    }
}

// Helper: Import Areas
async function importAreas(data, user) {
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = [];
    let skippedDetails = [];
    let errorDetails = [];

    try {
        console.log(`\n🔍 Starting areas import with ${data.length} rows`);
        
        // Show sample CSV structure
        if (data.length > 0) {
            console.log('📋 Sample CSV rows:');
            for (let i = 0; i < Math.min(3, data.length); i++) {
                console.log(`  Row ${i + 1}:`, {
                    a_id: data[i].a_id,
                    area_id: data[i].area_id,
                    area_nam: data[i].area_nam,
                    area_name: data[i].area_name,
                    allKeys: Object.keys(data[i])
                });
            }
        }

        for (const row of data) {
            try {
                // Skip if no a_id (we're using a_id as primary identifier now)
                if (!row.a_id || row.a_id === 'NULL' || row.a_id === '0' || row.a_id.trim() === '') {
                    skipped++;
                    if (skippedDetails.length < 10) {
                        skippedDetails.push({ reason: 'Missing or invalid a_id', row });
                    }
                    continue;
                }

                // Extract area name (handle both area_nam and area_name columns)
                const areaName = row.area_nam || row.area_name || 'Unknown';
                
                // Skip null or empty names
                if (!areaName || areaName === 'NULL' || areaName === 'Null' || areaName.trim() === '') {
                    skipped++;
                    if (skippedDetails.length < 10) {
                        skippedDetails.push({ reason: 'Missing or NULL area name', row });
                    }
                    continue;
                }

                // Check if area already exists by a_id (specific variant)
                let area = await MissionArea.findOne({ legacyAId: row.a_id });

                if (area) {
                    // Update existing area variant
                    area.name = areaName;
                    area.legacyAreaId = row.area_id && row.area_id !== 'NULL' ? row.area_id : undefined;
                    area.lastEditedBy = user._id;
                    await area.save();
                    updated++;
                    if (updated <= 5) {
                        console.log(`   ↻ Updated: "${areaName}" (a_id: ${row.a_id}, area_id: ${row.area_id || 'NULL'})`);
                    }
                } else {
                    // Create new area variant
                    area = new MissionArea({
                        name: areaName,
                        city: areaName, // Default to same as name
                        legacyAId: row.a_id,
                        legacyAreaId: row.area_id && row.area_id !== 'NULL' ? row.area_id : undefined,
                        addedBy: user._id,
                        verified: false,
                        isCurrentArea: true,
                        isCanonical: false // Mark as non-canonical by default
                    });
                    await area.save();
                    imported++;
                    if (imported <= 5) {
                        console.log(`   ✓ Created: "${areaName}" (a_id: ${row.a_id}, area_id: ${row.area_id || 'NULL'})`);
                    }
                }

            } catch (err) {
                errors.push({
                    name: row.area_nam || row.area_name || `a_id: ${row.a_id}`,
                    error: err.message
                });
                if (errorDetails.length < 10) {
                    errorDetails.push({
                        a_id: row.a_id,
                        area_id: row.area_id,
                        name: row.area_nam || row.area_name,
                        error: err.message
                    });
                }
            }
        }

        console.log('\n📊 IMPORT SUMMARY:');
        console.log(`✓ New area variants created: ${imported}`);
        console.log(`↻ Existing variants updated: ${updated}`);
        console.log(`⊘ Skipped: ${skipped}`);
        console.log(`✗ Errors: ${errors.length}`);

        if (skippedDetails.length > 0) {
            console.log('\n📋 Sample skipped rows:');
            skippedDetails.slice(0, 5).forEach((detail, i) => {
                console.log(`  Row ${i + 1}:`, detail.reason, detail.row);
            });
        }

        if (errorDetails.length > 0) {
            console.log('\n📋 Sample errors:');
            errorDetails.slice(0, 5).forEach((detail, i) => {
                console.log(`  Error ${i + 1}:`, detail);
            });
        }

        return {
            success: true,
            imported,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            skippedDetails: skippedDetails.slice(0, 10),
            errorDetails: errorDetails.slice(0, 10),
            message: `Successfully imported ${imported} new area variants and updated ${updated} existing variants (skipped ${skipped})`
        };
    } catch (error) {
        throw new Error('Area import failed: ' + error.message);
    }
}

// Helper: Import Missionary-Area Relationships
async function importMissionaryAreas(data, user) {
    let linked = 0;
    let alreadyLinked = 0;
    let notFoundMissionary = 0;
    let notFoundArea = 0;
    let skipped = 0;
    let errors = [];
    const skippedDetails = [];
    const notFoundMissionaryDetails = [];
    const notFoundAreaDetails = [];

    try {
        console.log(`\n🔍 Starting missionary-area import with ${data.length} rows`);
        
        // Load all missionaries and areas into memory
        const missionaries = await Missionary.find({}).select('_id legacyData.alumId firstName lastName areasServed');
        const areas = await MissionArea.find({}).select('_id legacyAId legacyAreaId name');
        
        console.log(`📊 Loaded ${missionaries.length} missionaries and ${areas.length} areas from database`);
        
        // Create lookup maps
        const missionaryMap = new Map();
        missionaries.forEach(m => {
            if (m.legacyData && m.legacyData.alumId) {
                missionaryMap.set(m.legacyData.alumId, m);
                missionaryMap.set(m.legacyData.alumId.toString(), m); // Also store as string
            }
        });
        
        // Create maps for both a_id (specific variant) and area_id (normalized group)
        const areaByAIdMap = new Map();
        const areaByAreaIdMap = new Map();
        areas.forEach(a => {
            // Map by a_id (specific spelling variant)
            if (a.legacyAId) {
                areaByAIdMap.set(a.legacyAId, a);
                areaByAIdMap.set(a.legacyAId.toString(), a);
            }
            // Map by area_id (normalized group) - for backwards compatibility
            if (a.legacyAreaId) {
                // Store array of all variants for this area_id
                const key = a.legacyAreaId.toString();
                if (!areaByAreaIdMap.has(key)) {
                    areaByAreaIdMap.set(key, []);
                }
                areaByAreaIdMap.get(key).push(a);
            }
        });

        console.log(`📊 Created lookup maps: ${missionaryMap.size} missionaries, ${areaByAIdMap.size} a_id variants, ${areaByAreaIdMap.size} area_id groups`);
        
        // Log first few rows to see what we're working with
        if (data.length > 0) {
            console.log('📋 Sample CSV rows:');
            data.slice(0, 3).forEach((row, i) => {
                console.log(`  Row ${i + 1}:`, {
                    alum_id: row.alum_id,
                    a_id: row.a_id,
                    area_id: row.area_id,
                    allKeys: Object.keys(row)
                });
            });
        }

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                // Support both column naming conventions for missionary: alum_id OR a_id
                const alumIdValue = row.alum_id || row.a_id;
                // Support multiple possible column names for the specific area variant ID
                const aIdValue = row.alum_area_id || row.area_a_id || row.missionary_a_id || row.a_id; // Specific variant ID if provided
                const areaIdValue = row.area_id;  // Normalized group ID (fallback)
                
                // Debug first few rows
                if (i < 5) {
                    console.log(`\n📝 Row ${i + 1}:`, {
                        alumIdValue,
                        aIdValue,
                        areaIdValue,
                        rawRow: row
                    });
                }
                
                // Skip if missing required IDs
                if (!alumIdValue || alumIdValue === 'NULL' || alumIdValue === '' || (typeof alumIdValue === 'string' && alumIdValue.trim() === '')) {
                    skipped++;
                    skippedDetails.push({
                        row: i + 1,
                        reason: 'Missing or NULL alum_id',
                        data: { alum_id: alumIdValue, a_id: aIdValue, area_id: areaIdValue }
                    });
                    if (i < 5) console.log(`   ⊘ Skipped: Missing alum_id`);
                    continue;
                }
                
                if ((!aIdValue || aIdValue === 'NULL' || aIdValue === '') && 
                    (!areaIdValue || areaIdValue === 'NULL' || areaIdValue === '')) {
                    skipped++;
                    skippedDetails.push({
                        row: i + 1,
                        reason: 'Missing both a_id and area_id',
                        data: { alum_id: alumIdValue, a_id: aIdValue, area_id: areaIdValue }
                    });
                    if (i < 5) console.log(`   ⊘ Skipped: Missing both a_id and area_id`);
                    continue;
                }

                const alumId = String(alumIdValue).trim();
                
                if (i < 5) {
                    console.log(`   Searching for: alumId="${alumId}" (type: ${typeof alumId}), a_id="${aIdValue || 'N/A'}", area_id="${areaIdValue || 'N/A'}"`);
                }

                // Find missionary
                const missionary = missionaryMap.get(alumId);
                if (!missionary) {
                    notFoundMissionary++;
                    notFoundMissionaryDetails.push({
                        row: i + 1,
                        alumId: alumId,
                        aId: aIdValue,
                        areaId: areaIdValue
                    });
                    if (i < 5) console.log(`   ⚠️  Missionary not found for alumId="${alumId}"`);
                    continue;
                }

                // Find area - prefer specific variant (a_id) over normalized group (area_id)
                let area = null;
                if (aIdValue && aIdValue !== 'NULL' && aIdValue.toString().trim() !== '') {
                    // Look up by a_id (specific variant)
                    const aId = String(aIdValue).trim();
                    area = areaByAIdMap.get(aId);
                    if (area && i < 5) {
                        console.log(`   ✓ Found area by a_id: "${area.name}" (a_id: ${aId})`);
                    }
                }
                
                if (!area && areaIdValue && areaIdValue !== 'NULL' && areaIdValue.toString().trim() !== '') {
                    // Fallback to area_id (normalized group) - use first variant
                    const areaId = String(areaIdValue).trim();
                    const variants = areaByAreaIdMap.get(areaId);
                    if (variants && variants.length > 0) {
                        area = variants[0]; // Use first variant (ideally should be canonical)
                        if (i < 5) {
                            console.log(`   ⚠️  Using area_id fallback: "${area.name}" (area_id: ${areaId}, ${variants.length} variants available)`);
                        }
                    }
                }
                
                if (!area) {
                    notFoundArea++;
                    notFoundAreaDetails.push({
                        row: i + 1,
                        alumId: alumId,
                        aId: aIdValue,
                        areaId: areaIdValue
                    });
                    if (i < 5) console.log(`   ⚠️  Area not found for a_id="${aIdValue || 'N/A'}", area_id="${areaIdValue || 'N/A'}"`);
                    continue;
                }

                // Check if already linked
                const areaAlreadyLinked = missionary.areasServed.some(
                    aId => aId.toString() === area._id.toString()
                );

                if (areaAlreadyLinked) {
                    alreadyLinked++;
                    if (i < 5) console.log(`   ↷ Already linked: ${missionary.firstName} ${missionary.lastName} ↔ ${area.name}`);
                } else {
                    // Add area to missionary
                    missionary.areasServed.push(area._id);
                    await missionary.save();
                    linked++;
                    if (i < 5) console.log(`   ✓ Linked: ${missionary.firstName} ${missionary.lastName} ↔ ${area.name}`);
                }

            } catch (err) {
                errors.push({
                    name: `alumId: ${row.a_id || row.alum_id}, area_id: ${row.area_id}`,
                    error: err.message
                });
            }
        }

        console.log('\n📊 IMPORT SUMMARY:');
        console.log(`✓ Linked: ${linked}`);
        console.log(`↷ Already linked: ${alreadyLinked}`);
        console.log(`⊘ Skipped: ${skipped}`);
        console.log(`⚠️  Missionaries not found: ${notFoundMissionary}`);
        console.log(`⚠️  Areas not found: ${notFoundArea}`);
        console.log(`✗ Errors: ${errors.length}`);
        
        // Log sample details if there were issues
        if (skippedDetails.length > 0) {
            console.log('\n📋 Sample skipped rows:');
            skippedDetails.slice(0, 5).forEach(detail => {
                console.log(`  Row ${detail.row}: ${detail.reason}`, detail.data);
            });
        }
        
        if (notFoundMissionaryDetails.length > 0) {
            console.log('\n📋 Sample missionaries not found:');
            notFoundMissionaryDetails.slice(0, 5).forEach(detail => {
                console.log(`  Row ${detail.row}: alumId="${detail.alumId}" for area_id="${detail.areaId}"`);
            });
        }
        
        if (notFoundAreaDetails.length > 0) {
            console.log('\n📋 Sample areas not found:');
            notFoundAreaDetails.slice(0, 5).forEach(detail => {
                console.log(`  Row ${detail.row}: areaId="${detail.areaId}" for alumId="${detail.alumId}"`);
            });
        }

        return {
            success: true,
            linked,
            alreadyLinked,
            skipped,
            notFoundMissionary,
            notFoundArea,
            skippedDetails: skippedDetails.slice(0, 10),
            notFoundMissionaryDetails: notFoundMissionaryDetails.slice(0, 10),
            notFoundAreaDetails: notFoundAreaDetails.slice(0, 10),
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully linked ${linked} new missionary-area connections (${alreadyLinked} already linked, ${skipped} skipped, ${notFoundMissionary} missionaries not found, ${notFoundArea} areas not found)`
        };
    } catch (error) {
        throw new Error('Missionary-Area linking failed: ' + error.message);
    }
}

// Helper: Import Area Book (Companion/Area Notes)
async function importAreabook(data, user) {
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    const errors = [];
    const notFoundDetails = [];

    try {
        console.log(`\n🔍 Starting areabook import with ${data.length} rows`);

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                // Get alum_id
                const alumIdValue = row.alum_id || row.alumId || row.alumni_id;
                
                // Get areabook content
                const areabookValue = row.areabook || row.area_book || row.area_companions || row.areaBook;
                
                // Skip if missing alum_id
                if (!alumIdValue) {
                    skipped++;
                    continue;
                }
                
                // Skip if areabook is empty
                if (!areabookValue || areabookValue.trim() === '') {
                    skipped++;
                    continue;
                }
                
                // Find missionary by alumId
                const missionary = await Missionary.findOne({
                    'legacyData.alumId': alumIdValue.toString()
                });
                
                if (!missionary) {
                    notFound++;
                    notFoundDetails.push({
                        row: i + 1,
                        alumId: alumIdValue
                    });
                    continue;
                }
                
                // Update areabook field
                missionary.areabook = areabookValue.trim();
                missionary.lastEditedBy = user._id;
                await missionary.save();
                
                updated++;
                
                // Log progress every 100 records
                if (updated % 100 === 0) {
                    console.log(`✓ Updated ${updated} areabook records...`);
                }
                
            } catch (err) {
                errors.push({
                    row: i + 1,
                    alumId: row.alum_id || row.alumId,
                    error: err.message
                });
            }
        }

        console.log(`\n📊 AREABOOK IMPORT SUMMARY:`);
        console.log(`✓ Updated: ${updated}`);
        console.log(`⊘ Skipped: ${skipped}`);
        console.log(`⚠️  Missionaries not found: ${notFound}`);
        console.log(`✗ Errors: ${errors.length}`);
        
        if (notFoundDetails.length > 0) {
            console.log('\n📋 Sample missionaries not found:');
            notFoundDetails.slice(0, 5).forEach(detail => {
                console.log(`  Row ${detail.row}: alumId="${detail.alumId}"`);
            });
        }

        return {
            success: true,
            updated,
            skipped,
            notFound,
            notFoundDetails: notFoundDetails.slice(0, 10),
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully updated ${updated} areabook records (${skipped} skipped, ${notFound} missionaries not found)`
        };
    } catch (error) {
        throw new Error('Areabook import failed: ' + error.message);
    }
}

// Helper: Import Companionships
async function importCompanionships(data, user) {
    let created = 0;
    let alreadyExists = 0;
    let skipped = 0;
    let notFoundMissionary1 = 0;
    let notFoundMissionary2 = 0;
    let notFoundArea = 0;
    let errors = [];

    try {
        // Build lookup maps for missionaries and areas
        const missionaries = await Missionary.find({});
        const missionaryMap = new Map();
        missionaries.forEach(m => {
            if (m.legacyData && m.legacyData.alumId) {
                missionaryMap.set(m.legacyData.alumId, m);
            }
        });

        const areas = await MissionArea.find({});
        const areaMap = new Map();
        areas.forEach(a => {
            if (a.legacyAreaId) {
                areaMap.set(a.legacyAreaId, a);
            }
        });

        console.log(`Found ${missionaryMap.size} missionaries and ${areaMap.size} areas for companionship import`);
        console.log(`📊 Total rows in CSV: ${data.length}`);

        // Log first few rows to see structure
        if (data.length > 0) {
            console.log('📋 Sample CSV row structure:', Object.keys(data[0]));
            console.log('📋 First row data:', data[0]);
        }

        for (const row of data) {
            try {
                // Support both companicrm1_id and companionship_rm1_id variants
                const rm1IdValue = row.companicrm1_id || row.companionship_rm1_id || row.rm1_id;
                const rm2IdValue = row.rm2_id || row.companionship_rm2_id;
                const areaIdValue = row.area_id;

                // Skip if missing required missionary fields
                if (!rm1IdValue || !rm2IdValue || 
                    rm1IdValue === 'NULL' || rm2IdValue === 'NULL') {
                    skipped++;
                    if (skipped <= 5) {
                        console.log(`⊘ Skipping row (missing/NULL missionary fields): rm1=${rm1IdValue}, rm2=${rm2IdValue}`);
                    }
                    continue;
                }

                const rm1Id = rm1IdValue.toString().trim();
                const rm2Id = rm2IdValue.toString().trim();
                
                // Area is optional - handle NULL or missing values
                let areaId = null;
                if (areaIdValue && areaIdValue !== 'NULL' && areaIdValue !== '') {
                    areaId = areaIdValue.toString().trim();
                }

                // Find both missionaries
                const missionary1 = missionaryMap.get(rm1Id);
                if (!missionary1) {
                    notFoundMissionary1++;
                    continue;
                }

                const missionary2 = missionaryMap.get(rm2Id);
                if (!missionary2) {
                    notFoundMissionary2++;
                    continue;
                }

                // Find area (optional)
                let area = null;
                if (areaId) {
                    area = areaMap.get(areaId);
                    if (!area) {
                        notFoundArea++;
                        // Continue anyway - we'll create companionship without area
                    }
                }

                // Check if companionship already exists
                // Look for existing with same missionaries (and area if provided)
                const query = {
                    $and: [
                        { 'missionaries.missionary': missionary1._id },
                        { 'missionaries.missionary': missionary2._id }
                    ]
                };
                
                // Only filter by area if we have one
                if (area) {
                    query.area = area._id;
                }
                
                const existingComp = await Companionship.findOne(query);

                if (existingComp) {
                    alreadyExists++;
                    continue;
                }

                // Create new companionship
                const companionshipData = {
                    missionaries: [
                        { missionary: missionary1._id, role: 'senior' },
                        { missionary: missionary2._id, role: 'junior' }
                    ],
                    startDate: new Date('2000-01-01'), // Default date for legacy imports without dates
                    addedBy: user._id
                };
                
                // Add area only if we have one
                if (area) {
                    companionshipData.area = area._id;
                }
                
                const newCompanionship = new Companionship(companionshipData);

                await newCompanionship.save();

                // Add companionship reference to both missionaries
                if (!missionary1.companionships.includes(newCompanionship._id)) {
                    missionary1.companionships.push(newCompanionship._id);
                    await missionary1.save();
                }
                if (!missionary2.companionships.includes(newCompanionship._id)) {
                    missionary2.companionships.push(newCompanionship._id);
                    await missionary2.save();
                }

                created++;

            } catch (err) {
                errors.push({
                    name: `rm1: ${row.companicrm1_id}, rm2: ${row.rm2_id}, area: ${row.area_id}`,
                    error: err.message
                });
            }
        }

        console.log(`\n📊 Companionship Import Summary:`);
        console.log(`   ✅ Created: ${created}`);
        console.log(`   ↷ Already exists: ${alreadyExists}`);
        console.log(`   ⊘ Skipped (missing fields): ${skipped}`);
        console.log(`   ⚠️  Missionary 1 not found: ${notFoundMissionary1}`);
        console.log(`   ⚠️  Missionary 2 not found: ${notFoundMissionary2}`);
        console.log(`   ⚠️  Area not found: ${notFoundArea}`);
        console.log(`   ❌ Errors: ${errors.length}`);

        return {
            success: true,
            created,
            alreadyExists,
            skipped,
            notFoundMissionary1,
            notFoundMissionary2,
            notFoundArea,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully created ${created} companionships (${alreadyExists} already exist, ${skipped} skipped, ${notFoundMissionary1} missionary1 not found, ${notFoundMissionary2} missionary2 not found, ${notFoundArea} areas not found)`
        };
    } catch (error) {
        throw new Error('Companionship import failed: ' + error.message);
    }
}

// Export data
router.get('/export', ensureEBMAccess, async (req, res) => {
    try {
        const { type = 'all' } = req.query;
        
        let data = {};
        
        if (type === 'all' || type === 'missionaries') {
            data.missionaries = await Missionary.find({ isActive: true })
                .populate('companionships')
                .populate('areasServed');
        }
        
        if (type === 'all' || type === 'companionships') {
            data.companionships = await Companionship.find()
                .populate('missionaries.missionary')
                .populate('area');
        }
        
        if (type === 'all' || type === 'areas') {
            data.areas = await MissionArea.find();
        }
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ success: false, error: 'Export failed' });
    }
});

module.exports = router;
