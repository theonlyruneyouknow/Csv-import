const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const PurchaseOrder = require('../models/PurchaseOrder');
const AccomplishmentReport = require('../models/AccomplishmentReport');

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
            estimatedHours,
            status,
            completedAt,
            completedBy
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
            status: status || 'pending',
            dueDate: new Date(dueDate),
            reminderDate: reminderDate ? new Date(reminderDate) : null,
            assignedTo,
            createdBy: 'User', // TODO: Replace with actual user system
            completedAt: completedAt ? new Date(completedAt) : null,
            completedBy: completedBy || null,
            relatedPOs: relatedPOs,
            relatedPONumbers: relatedPONumbers || [],
            relatedVendors: relatedVendors || [],
            relatedSeeds: relatedSeeds || [],
            relatedContacts: relatedContacts || [],
            tags: Array.isArray(tags) ? tags : (tags && typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []),
            estimatedHours: estimatedHours || 0
        });

        await task.save();
        
        if (completedAt) {
            console.log(`✅ Task created as COMPLETED: "${task.title}"`);
            console.log(`   📅 Received completedAt: ${completedAt}`);
            console.log(`   💾 Stored as: ${task.completedAt.toISOString()}`);
            console.log(`   🌐 PT Display: ${task.completedAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
        } else {
            console.log(`✅ Task created: "${task.title}"`);
        }
        
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
        const updateData = { ...req.body }; // Create a copy to avoid mutating the original

        console.log('📝 Updating task with data:', updateData);

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
            
            console.log(`🔗 Updated task with ${foundPOs.length} POs out of ${updateData.relatedPONumbers.length} requested`);
            console.log(`📋 PO Numbers requested: ${updateData.relatedPONumbers.join(', ')}`);
            console.log(`✅ POs found: ${foundPOs.map(po => po.poNumber).join(', ')}`);
        } else {
            // If no PO numbers provided, clear the related POs
            updateData.relatedPOs = [];
            console.log('� No PO numbers provided, clearing related POs');
        }

        // Remove the relatedPONumbers field as it's not part of the schema
        delete updateData.relatedPONumbers;

        const task = await Task.findByIdAndUpdate(id, updateData, { new: true })
            .populate('relatedPOs', 'poNumber vendor expectedShipDate');

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        console.log('✅ Task updated:', task.title);
        console.log('📊 Updated task data:', {
            category: task.category,
            relatedPOs: task.relatedPOs?.map(po => po.poNumber),
            relatedVendors: task.relatedVendors
        });
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

// API endpoint for getting a single task (for AJAX calls)
router.get('/api/:id', async (req, res) => {
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

// Get active reminders (tasks with reminders not snoozed or dismissed)
router.get('/api/reminders/active', async (req, res) => {
    try {
        const now = new Date();
        
        // Find tasks with reminders that should be shown
        const tasks = await Task.find({
            archived: { $ne: true },
            status: { $nin: ['completed', 'cancelled'] },
            $or: [
                {
                    // One-time reminders
                    reminderDate: { $lte: now },
                    reminderDismissed: { $ne: true },
                    $or: [
                        { reminderSnoozedUntil: { $exists: false } },
                        { reminderSnoozedUntil: null },
                        { reminderSnoozedUntil: { $lte: now } }
                    ]
                },
                {
                    // Recurring reminders
                    isRecurring: true,
                    recurringType: { $ne: 'none' },
                    $or: [
                        { reminderSnoozedUntil: { $exists: false } },
                        { reminderSnoozedUntil: null },
                        { reminderSnoozedUntil: { $lte: now } }
                    ]
                }
            ]
        })
        .select('title description priority dueDate isRecurring recurringType lastReminderShown')
        .lean();
        
        // Filter recurring tasks based on schedule
        const validReminders = tasks.filter(task => {
            if (!task.isRecurring) return true;
            
            // Check if we already showed a reminder today for this task
            if (task.lastReminderShown) {
                const lastShown = new Date(task.lastReminderShown);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                lastShown.setHours(0, 0, 0, 0);
                
                if (task.recurringType === 'daily' && lastShown.getTime() === today.getTime()) {
                    return false; // Already shown today
                }
                
                if (task.recurringType === 'weekly') {
                    const daysSinceLastShown = Math.floor((now - task.lastReminderShown) / (1000 * 60 * 60 * 24));
                    if (daysSinceLastShown < 7) {
                        return false; // Less than a week since last reminder
                    }
                }
            }
            
            return true;
        });
        
        res.json({ success: true, reminders: validReminders });
    } catch (error) {
        console.error('Get reminders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Snooze a reminder
router.post('/api/reminders/:id/snooze', async (req, res) => {
    try {
        const { id } = req.params;
        const { minutes = 60 } = req.body; // Default 1 hour
        
        const snoozeUntil = new Date();
        snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
        
        const task = await Task.findByIdAndUpdate(
            id,
            { 
                reminderSnoozedUntil: snoozeUntil,
                lastReminderShown: new Date()
            },
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ 
            success: true, 
            message: `Reminder snoozed for ${minutes} minutes`,
            snoozedUntil: snoozeUntil
        });
    } catch (error) {
        console.error('Snooze reminder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Dismiss a reminder (for one-time reminders)
router.post('/api/reminders/:id/dismiss', async (req, res) => {
    try {
        const { id } = req.params;
        
        const task = await Task.findByIdAndUpdate(
            id,
            { 
                reminderDismissed: true,
                lastReminderShown: new Date()
            },
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Reminder dismissed'
        });
    } catch (error) {
        console.error('Dismiss reminder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export accomplishments (completed tasks)
router.get('/api/export/accomplishments', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {
            status: 'completed',
            archived: { $ne: true }
        };
        
        // Add date range filter if provided
        if (startDate && endDate) {
            // Create dates in Pacific Time by parsing as local dates in PT context
            // This automatically handles PST (-08:00) vs PDT (-07:00)
            const startDateTime = `${startDate}T00:00:00`;
            const endDateTime = `${endDate}T23:59:59`;
            
            // Convert to PT using toLocaleString, then back to Date for MongoDB
            const ptStartString = new Date(startDateTime).toLocaleString('en-US', { 
                timeZone: 'America/Los_Angeles',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            const ptEndString = new Date(endDateTime).toLocaleString('en-US', { 
                timeZone: 'America/Los_Angeles',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            // Parse back to Date objects (these will be in server's local time but represent PT)
            const start = new Date(`${startDate}T00:00:00`);
            const end = new Date(`${endDate}T23:59:59.999`);
            
            console.log(`📅 Date filter - Start: ${startDate} (${start.toISOString()}) | End: ${endDate} (${end.toISOString()})`);
            
            dateFilter.completedAt = {
                $gte: start,
                $lte: end
            };
        }
        
        const completedTasks = await Task.find(dateFilter)
            .select('title description category priority completedAt createdAt assignedTo')
            .sort({ completedAt: -1 })
            .lean();
        
        console.log(`🔍 Found ${completedTasks.length} completed tasks`);
        if (completedTasks.length > 0) {
            completedTasks.forEach(task => {
                console.log(`   - "${task.title}" completed at ${task.completedAt.toISOString()} (PT: ${new Date(task.completedAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })})`);
            });
        }
        
        // Generate markdown content
        let reportContent = '# Task Accomplishments Report\n\n';
        reportContent += `Generated on: ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}\n`;
        if (startDate && endDate) {
            // Display dates in Pacific Time
            const displayStart = new Date(startDate + 'T00:00:00-08:00').toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
            const displayEnd = new Date(endDate + 'T00:00:00-08:00').toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
            reportContent += `Period: ${displayStart} - ${displayEnd}\n`;
        }
        reportContent += `\nTotal Completed Tasks: ${completedTasks.length}\n\n`;
        reportContent += '---\n\n';
        
        // Group by date (in Pacific Time)
        const tasksByDate = {};
        completedTasks.forEach(task => {
            const completedDate = task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) : 'Unknown';
            if (!tasksByDate[completedDate]) {
                tasksByDate[completedDate] = [];
            }
            tasksByDate[completedDate].push(task);
        });
        
        // Sort dates in reverse chronological order
        const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return new Date(b) - new Date(a);
        });
        
        sortedDates.forEach(date => {
            reportContent += `## ${date}\n\n`;
            tasksByDate[date].forEach(task => {
                reportContent += `- **${task.title}**\n`;
                if (task.description) {
                    reportContent += `  - ${task.description}\n`;
                }
                if (task.category) {
                    reportContent += `  - Category: ${task.category}\n`;
                }
                if (task.priority && task.priority !== 'medium') {
                    reportContent += `  - Priority: ${task.priority}\n`;
                }
                reportContent += '\n';
            });
            reportContent += '\n';
        });
        
        res.json({
            success: true,
            tasks: completedTasks,
            count: completedTasks.length,
            reportContent: reportContent,
            startDate: startDate || null,
            endDate: endDate || null
        });
    } catch (error) {
        console.error('Export accomplishments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save accomplishment report
router.post('/api/accomplishment-reports', async (req, res) => {
    try {
        const { startDate, endDate, tasks, reportContent, notes } = req.body;
        const username = req.user ? req.user.username : 'unknown';
        
        const report = new AccomplishmentReport({
            reportDate: new Date(),
            startDate: new Date(startDate || Date.now()),
            endDate: new Date(endDate || Date.now()),
            generatedBy: username,
            tasks: tasks,
            reportContent: reportContent,
            notes: notes || '',
            totalTasks: tasks.length
        });
        
        await report.save();
        
        res.json({
            success: true,
            message: 'Report saved successfully',
            reportId: report._id
        });
    } catch (error) {
        console.error('Save report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get accomplishment reports
router.get('/api/accomplishment-reports', async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;
        
        let filter = {};
        
        if (date) {
            // Get reports for specific date
            const targetDate = new Date(date);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            filter.reportDate = {
                $gte: targetDate,
                $lt: nextDay
            };
        } else if (startDate && endDate) {
            // Get reports within date range
            filter.reportDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        const reports = await AccomplishmentReport.find(filter)
            .sort({ reportDate: -1 })
            .limit(50)
            .lean();
        
        res.json({
            success: true,
            reports: reports,
            count: reports.length
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single accomplishment report
router.get('/api/accomplishment-reports/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const report = await AccomplishmentReport.findById(id).lean();
        
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        res.json({
            success: true,
            report: report
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Email accomplishment report
router.post('/api/email-accomplishments', async (req, res) => {
    try {
        const { email, startDate, endDate, reportContent } = req.body;
        
        if (!email || !reportContent) {
            return res.status(400).json({ error: 'Email and report content are required' });
        }
        
        const username = req.user ? req.user.username : 'System';
        
        // Format dates for email subject
        const startDateFormatted = startDate ? new Date(startDate).toLocaleDateString() : 'N/A';
        const endDateFormatted = endDate ? new Date(endDate).toLocaleDateString() : 'N/A';
        const dateRange = startDate === endDate ? startDateFormatted : `${startDateFormatted} - ${endDateFormatted}`;
        
        // Send email using the email service
        const emailService = require('../services/emailService');
        
        await emailService.sendMail({
            to: email,
            subject: `Task Accomplishments Report - ${dateRange}`,
            text: reportContent,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                    <h2 style="color: #667eea;">📊 Task Accomplishments Report</h2>
                    <p style="color: #6c757d;"><strong>Date Range:</strong> ${dateRange}</p>
                    <p style="color: #6c757d;"><strong>Generated by:</strong> ${username}</p>
                    <hr style="border: 1px solid #dee2e6; margin: 20px 0;">
                    <pre style="background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-family: 'Courier New', monospace; line-height: 1.6;">${reportContent}</pre>
                </div>
            `
        });
        
        res.json({
            success: true,
            message: `Report sent to ${email}`
        });
    } catch (error) {
        console.error('Email accomplishments error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;
