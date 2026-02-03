const express = require('express');
const router = express.Router();
const Missionary = require('../models/Missionary');
const Companionship = require('../models/Companionship');
const MissionArea = require('../models/MissionArea');
const multer = require('multer');
const Papa = require('papaparse');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
        const { search, status, sort = 'lastName', order = 'asc' } = req.query;
        
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
        
        const sortOrder = order === 'desc' ? -1 : 1;
        const missionaries = await Missionary.find(query)
            .sort({ [sort]: sortOrder })
            .populate('addedBy', 'username')
            .populate('verifiedBy', 'username');
        
        res.render('ebm-missionaries', {
            user: req.user,
            missionaries,
            filters: { search, status, sort, order },
            title: 'Missionaries'
        });
    } catch (error) {
        console.error('Error loading missionaries:', error);
        res.status(500).render('error', { message: 'Error loading missionaries' });
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

// ==================== AREAS ====================

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

// Get area details
router.get('/areas/:id', ensureEBMAccess, async (req, res) => {
    try {
        const area = await MissionArea.findById(req.params.id)
            .populate('addedBy', 'username firstName lastName')
            .populate('verifiedBy', 'username firstName lastName');
        
        if (!area) {
            return res.status(404).render('error', { message: 'Area not found' });
        }
        
        const companionships = await Companionship.find({ area: area._id })
            .populate('missionaries.missionary', 'firstName lastName')
            .sort({ startDate: -1 });
        
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
            default:
                return res.status(400).json({ success: false, error: 'Invalid import type' });
        }

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

    try {
        for (const row of data) {
            try {
                // Skip if no area_id
                if (!row.area_id || row.area_id === 'NULL' || row.area_id.trim() === '') {
                    skipped++;
                    continue;
                }

                // Extract area name (handle both area_nam and area_name columns)
                const areaName = row.area_nam || row.area_name || 'Unknown';
                
                // Skip null or empty names
                if (!areaName || areaName === 'NULL' || areaName === 'Null' || areaName.trim() === '') {
                    skipped++;
                    continue;
                }

                // Check if area already exists by legacy ID
                let area = await MissionArea.findOne({ legacyAreaId: row.area_id });

                if (area) {
                    // Update existing area
                    area.name = areaName;
                    area.lastEditedBy = user._id;
                    await area.save();
                    updated++;
                } else {
                    // Create new area
                    area = new MissionArea({
                        name: areaName,
                        city: areaName, // Default to same as name
                        legacyAreaId: row.area_id,
                        addedBy: user._id,
                        verified: false,
                        isCurrentArea: true
                    });
                    await area.save();
                    imported++;
                }

            } catch (err) {
                errors.push({
                    name: row.area_nam || row.area_name || `area_id: ${row.area_id}`,
                    error: err.message
                });
            }
        }

        return {
            success: true,
            imported,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully imported ${imported} new areas and updated ${updated} existing areas (skipped ${skipped})`
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

    try {
        // Load all missionaries and areas into memory
        const missionaries = await Missionary.find({}).select('_id legacyData.alumId firstName lastName areasServed');
        const areas = await MissionArea.find({}).select('_id legacyAreaId name');
        
        // Create lookup maps
        const missionaryMap = new Map();
        missionaries.forEach(m => {
            if (m.legacyData && m.legacyData.alumId) {
                missionaryMap.set(m.legacyData.alumId, m);
            }
        });
        
        const areaMap = new Map();
        areas.forEach(a => {
            if (a.legacyAreaId) {
                areaMap.set(a.legacyAreaId, a);
            }
        });

        for (const row of data) {
            try {
                // Support both column naming conventions: a_id OR alum_id
                const alumIdValue = row.a_id || row.alum_id;
                
                // Skip if missing required IDs
                if (!alumIdValue || alumIdValue === 'NULL' || alumIdValue.trim() === '') {
                    skipped++;
                    continue;
                }
                
                if (!row.area_id || row.area_id === 'NULL' || row.area_id.trim() === '') {
                    skipped++;
                    continue;
                }

                const alumId = alumIdValue.trim();
                const areaId = row.area_id.trim();

                // Find missionary
                const missionary = missionaryMap.get(alumId);
                if (!missionary) {
                    notFoundMissionary++;
                    continue;
                }

                // Find area
                const area = areaMap.get(areaId);
                if (!area) {
                    notFoundArea++;
                    continue;
                }

                // Check if already linked
                const areaAlreadyLinked = missionary.areasServed.some(
                    aId => aId.toString() === area._id.toString()
                );

                if (areaAlreadyLinked) {
                    alreadyLinked++;
                } else {
                    // Add area to missionary
                    missionary.areasServed.push(area._id);
                    await missionary.save();
                    linked++;
                }

            } catch (err) {
                errors.push({
                    name: `alumId: ${row.a_id || row.alum_id}, area_id: ${row.area_id}`,
                    error: err.message
                });
            }
        }

        return {
            success: true,
            linked,
            alreadyLinked,
            skipped,
            notFoundMissionary,
            notFoundArea,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully linked ${linked} new missionary-area connections (${alreadyLinked} already linked, ${skipped} skipped, ${notFoundMissionary} missionaries not found, ${notFoundArea} areas not found)`
        };
    } catch (error) {
        throw new Error('Missionary-Area linking failed: ' + error.message);
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
