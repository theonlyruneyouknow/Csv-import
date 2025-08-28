const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const PurchaseOrder = require('../models/PurchaseOrder');

// Task dashboard - main view
router.get('/', async (req, res) => {
    try {
        const { 
            status = 'all', 
            priority = 'all', 
            category = 'all', 
            assignedTo = 'all',
            sortBy = 'dueDate',
            sortOrder = 'asc',
            search = ''
        } = req.query;

        // Build filter object
        let filter = {};
        
        if (status !== 'all') {
            filter.status = status;
        }
        if (priority !== 'all') {
            filter.priority = priority;
        }
        if (category !== 'all') {
            filter.category = category;
        }
        if (assignedTo !== 'all') {
            filter.assignedTo = assignedTo;
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Build sort object
        let sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Get tasks with related data
        const tasks = await Task.find(filter)
            .populate('relatedPOs', 'poNumber vendor expectedShipDate')
            .sort(sort)
            .lean();

        // Get summary statistics
        const stats = await getTaskStats();

        // Get unique values for filters
        const uniqueAssignees = await Task.distinct('assignedTo');
        const uniqueCategories = await Task.distinct('category');

        res.render('tasks-dashboard', {
            tasks,
            stats,
            filters: {
                status,
                priority,
                category,
                assignedTo,
                sortBy,
                sortOrder,
                search
            },
            uniqueAssignees: uniqueAssignees.filter(Boolean).sort(),
            uniqueCategories: uniqueCategories.filter(Boolean).sort(),
            currentDate: new Date()
        });
    } catch (error) {
        console.error('Task dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new task
router.post('/create', async (req, res) => {
    try {
        const {
            title,
            description,
            priority,
            category,
            dueDate,
            reminderDate,
            assignedTo,
            relatedPONumbers,
            relatedVendors,
            relatedSeeds,
            relatedContacts,
            tags,
            estimatedHours
        } = req.body;

        // Convert PO numbers to PO ObjectIds
        let relatedPOs = [];
        if (relatedPONumbers && relatedPONumbers.length > 0) {
            const foundPOs = await PurchaseOrder.find({ 
                poNumber: { $in: relatedPONumbers } 
            }).select('_id poNumber vendor');
            relatedPOs = foundPOs.map(po => po._id);
            
            console.log(`🔗 Found ${foundPOs.length} POs out of ${relatedPONumbers.length} requested`);
        }

        const task = new Task({
            title,
            description,
            priority,
            category,
            dueDate: new Date(dueDate),
            reminderDate: reminderDate ? new Date(reminderDate) : null,
            assignedTo,
            createdBy: 'User', // TODO: Replace with actual user system
            relatedPOs: relatedPOs,
            relatedVendors: relatedVendors || [],
            relatedSeeds: relatedSeeds || [],
            relatedContacts: relatedContacts || [],
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            estimatedHours: estimatedHours || 0
        });

        await task.save();
        console.log('✅ Task created:', task.title);
        res.json({ success: true, task });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update task
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Handle date fields
        if (updateData.dueDate) {
            updateData.dueDate = new Date(updateData.dueDate);
        }
        if (updateData.reminderDate) {
            updateData.reminderDate = new Date(updateData.reminderDate);
        }

        // Handle tags
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
        }

        // Convert PO numbers to PO ObjectIds if provided
        if (updateData.relatedPONumbers && updateData.relatedPONumbers.length > 0) {
            const foundPOs = await PurchaseOrder.find({ 
                poNumber: { $in: updateData.relatedPONumbers } 
            }).select('_id poNumber vendor');
            updateData.relatedPOs = foundPOs.map(po => po._id);
            
            // Remove the relatedPONumbers field as it's not part of the schema
            delete updateData.relatedPONumbers;
            
            console.log(`🔗 Updated task with ${foundPOs.length} POs`);
        }

        const task = await Task.findByIdAndUpdate(id, updateData, { new: true })
            .populate('relatedPOs', 'poNumber vendor expectedShipDate');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('✅ Task updated:', task.title);
        res.json({ success: true, task });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findByIdAndDelete(id);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add note to task
router.post('/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        task.notes.push({
            note,
            addedBy: 'User', // TODO: Replace with actual user system
            addedAt: new Date()
        });

        await task.save();
        res.json({ success: true, task });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get overdue tasks
router.get('/overdue', async (req, res) => {
    try {
        const overdueTasks = await Task.find({
            dueDate: { $lt: new Date() },
            status: { $nin: ['completed', 'cancelled'] }
        })
        .populate('relatedPOs', 'poNumber vendor expectedShipDate')
        .sort({ dueDate: 1 });

        res.json({ success: true, tasks: overdueTasks });
    } catch (error) {
        console.error('Overdue tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get tasks due soon (next 7 days)
router.get('/due-soon', async (req, res) => {
    try {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const dueSoonTasks = await Task.find({
            dueDate: { 
                $gte: new Date(),
                $lte: sevenDaysFromNow 
            },
            status: { $nin: ['completed', 'cancelled'] }
        })
        .populate('relatedPOs', 'poNumber vendor expectedShipDate')
        .sort({ dueDate: 1 });

        res.json({ success: true, tasks: dueSoonTasks });
    } catch (error) {
        console.error('Due soon tasks error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get task statistics
async function getTaskStats() {
    const total = await Task.countDocuments();
    const completed = await Task.countDocuments({ status: 'completed' });
    const pending = await Task.countDocuments({ status: 'pending' });
    const inProgress = await Task.countDocuments({ status: 'in-progress' });
    const overdue = await Task.countDocuments({
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] }
    });
    const critical = await Task.countDocuments({ priority: 'critical' });

    return {
        total,
        completed,
        pending,
        inProgress,
        overdue,
        critical,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

// Get task details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const task = await Task.findById(id)
            .populate('relatedPOs', 'poNumber vendor expectedShipDate totalValue');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ success: true, task });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for autocomplete/search
router.get('/api/search', async (req, res) => {
    try {
        const { q, type } = req.query;
        
        if (type === 'pos') {
            const pos = await PurchaseOrder.find({
                poNumber: { $regex: q, $options: 'i' }
            })
            .select('poNumber vendor expectedShipDate')
            .limit(10);
            
            res.json({ success: true, results: pos });
        } else {
            res.json({ success: true, results: [] });
        }
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
