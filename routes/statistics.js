// routes/statistics.js
const express = require('express');
const router = express.Router();
const DailyStatistics = require('../models/DailyStatistics');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');
const Vendor = require('../models/Vendor');
const Task = require('../models/Task');
const EmailTemplate = require('../models/EmailTemplate');

// Helper function to get start and end of day
function getDayBounds(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Generate daily statistics report
router.post('/generate-daily-stats', async (req, res) => {
  try {
    const targetDate = req.body.date ? new Date(req.body.date) : new Date();
    const { start, end } = getDayBounds(targetDate);
    
    console.log(`📊 Generating daily statistics for ${targetDate.toDateString()}...`);

    // Check if stats already exist for this date
    const existingStats = await DailyStatistics.findOne({
      date: { $gte: start, $lte: end }
    });

    if (existingStats && !req.body.force) {
      return res.json({
        success: true,
        message: 'Statistics already exist for this date',
        stats: existingStats
      });
    }

    // Initialize statistics object
    const stats = {
      date: start,
      generatedAt: new Date(),
      purchaseOrders: {},
      lineItems: {},
      emails: {},
      vendors: {},
      tracking: {},
      userActivity: {},
      performance: {},
      tasks: {},
      changes: {},
      issues: {},
      snapshot: {}
    };

    // ========== PURCHASE ORDER STATISTICS ==========
    const allPOs = await PurchaseOrder.find().lean();
    const activePOs = allPOs.filter(po => po.status && !['Completed', 'Cancelled', 'Received'].includes(po.status));
    const completedPOs = allPOs.filter(po => ['Completed', 'Received'].includes(po.status));
    const newPOsToday = allPOs.filter(po => {
      const created = new Date(po.createdAt || po.date);
      return created >= start && created <= end;
    });
    const updatedPOsToday = allPOs.filter(po => {
      const updated = new Date(po.lastUpdate);
      return updated >= start && updated <= end;
    });

    // PO by type
    const poByType = {
      seed: 0,
      hardgood: 0,
      greengood: 0,
      supplies: 0,
      dropship: 0,
      other: 0
    };
    allPOs.forEach(po => {
      const type = (po.poType || 'other').toLowerCase();
      if (poByType.hasOwnProperty(type)) {
        poByType[type]++;
      } else {
        poByType.other++;
      }
    });

    // PO by status
    const statusCounts = {};
    allPOs.forEach(po => {
      const status = po.status || 'No Status';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const poByStatus = Object.keys(statusCounts).map(status => ({
      status,
      count: statusCounts[status]
    }));

    // PO values
    const totalValue = allPOs.reduce((sum, po) => sum + (po.amount || 0), 0);
    const averageValue = allPOs.length > 0 ? totalValue / allPOs.length : 0;

    stats.purchaseOrders = {
      total: allPOs.length,
      active: activePOs.length,
      completed: completedPOs.length,
      newToday: newPOsToday.length,
      updatedToday: updatedPOsToday.length,
      byType: poByType,
      byStatus: poByStatus,
      averageValue: Math.round(averageValue * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100
    };

    // ========== LINE ITEM STATISTICS ==========
    const allLineItems = await LineItem.find().lean();
    const receivedItems = allLineItems.filter(item => item.received === true);
    const unreceivedItems = allLineItems.filter(item => item.received === false);
    const receivedToday = receivedItems.filter(item => {
      const received = new Date(item.receivedDate);
      return received >= start && received <= end;
    });
    const partiallyReceived = allLineItems.filter(item => 
      item.partialShipmentStatus && item.partialShipmentStatus !== '' && !item.received
    );

    // Items overdue (ETA passed)
    const now = new Date();
    const overdueItems = unreceivedItems.filter(item => {
      if (!item.eta) return false;
      return new Date(item.eta) < now;
    });

    // Items without ETA
    const noEtaItems = unreceivedItems.filter(item => !item.eta);

    // By urgency
    const urgencyCounts = {
      high: unreceivedItems.filter(item => item.urgency === 'High').length,
      medium: unreceivedItems.filter(item => item.urgency === 'Medium').length,
      low: unreceivedItems.filter(item => item.urgency === 'Low').length,
      none: unreceivedItems.filter(item => !item.urgency || item.urgency === '').length
    };

    // Calculate average days from order to receive
    const itemsWithBothDates = receivedItems.filter(item => {
      return item.receivedDate && item.createdAt;
    });
    
    let daysToReceive = [];
    itemsWithBothDates.forEach(item => {
      const orderDate = new Date(item.createdAt);
      const receiveDate = new Date(item.receivedDate);
      const days = Math.floor((receiveDate - orderDate) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days < 365) { // Filter out invalid data
        daysToReceive.push(days);
      }
    });

    const avgDays = daysToReceive.length > 0
      ? daysToReceive.reduce((sum, days) => sum + days, 0) / daysToReceive.length
      : 0;

    daysToReceive.sort((a, b) => a - b);
    const medianDays = daysToReceive.length > 0
      ? daysToReceive[Math.floor(daysToReceive.length / 2)]
      : 0;

    stats.lineItems = {
      total: allLineItems.length,
      unreceived: unreceivedItems.length,
      received: receivedItems.length,
      receivedToday: receivedToday.length,
      partiallyReceived: partiallyReceived.length,
      overdueItems: overdueItems.length,
      noEtaItems: noEtaItems.length,
      byUrgency: urgencyCounts,
      averageDaysToReceive: Math.round(avgDays * 10) / 10,
      medianDaysToReceive: medianDays,
      fastestDelivery: daysToReceive.length > 0 ? daysToReceive[0] : 0,
      slowestDelivery: daysToReceive.length > 0 ? daysToReceive[daysToReceive.length - 1] : 0
    };

    // ========== EMAIL STATISTICS ==========
    const emailsSentToday = allPOs.filter(po => {
      if (!po.lastEmailSent) return false;
      const emailDate = new Date(po.lastEmailSent);
      return emailDate >= start && emailDate <= end;
    });

    const uniqueVendors = new Set(emailsSentToday.map(po => po.vendor));
    const totalEmailsSent = allPOs.filter(po => po.lastEmailSent).length;

    // Top vendors contacted
    const vendorEmailCounts = {};
    allPOs.forEach(po => {
      if (po.lastEmailSent) {
        vendorEmailCounts[po.vendor] = (vendorEmailCounts[po.vendor] || 0) + 1;
      }
    });
    const topVendorsContacted = Object.keys(vendorEmailCounts)
      .map(vendor => ({ vendor, count: vendorEmailCounts[vendor] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Email templates usage
    const templates = await EmailTemplate.find().lean();
    const templateUsage = templates.map(template => ({
      templateName: template.name,
      count: template.usageCount || 0
    })).sort((a, b) => b.count - a.count);

    stats.emails = {
      sentToday: emailsSentToday.length,
      uniqueVendorsContacted: uniqueVendors.size,
      totalSentAllTime: totalEmailsSent,
      byTemplate: templateUsage,
      topVendorsContacted
    };

    // ========== VENDOR STATISTICS ==========
    const allVendors = await Vendor.find().lean();
    const vendorsWithOpenPOs = new Set(activePOs.map(po => po.vendor)).size;
    const newVendorsToday = allVendors.filter(vendor => {
      const created = new Date(vendor.createdAt);
      return created >= start && created <= end;
    });

    // Top vendors by volume
    const vendorPOCounts = {};
    const vendorPOValues = {};
    allPOs.forEach(po => {
      vendorPOCounts[po.vendor] = (vendorPOCounts[po.vendor] || 0) + 1;
      vendorPOValues[po.vendor] = (vendorPOValues[po.vendor] || 0) + (po.amount || 0);
    });
    const topVendorsByVolume = Object.keys(vendorPOCounts)
      .map(vendor => ({
        vendor,
        poCount: vendorPOCounts[vendor],
        totalValue: Math.round(vendorPOValues[vendor] * 100) / 100
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    stats.vendors = {
      total: allVendors.length,
      activeVendors: allVendors.filter(v => v.isActive !== false).length,
      vendorsWithOpenPOs,
      newVendors: newVendorsToday.length,
      averageResponseTime: 0, // TODO: Implement when we track vendor response times
      topVendorsByVolume
    };

    // ========== TRACKING STATISTICS ==========
    const itemsWithTracking = allLineItems.filter(item => item.trackingNumber);
    const itemsInTransit = itemsWithTracking.filter(item => 
      item.trackingStatus && !['Delivered', 'delivered'].includes(item.trackingStatus) && !item.received
    );
    const itemsDelivered = itemsWithTracking.filter(item => 
      item.trackingStatus && ['Delivered', 'delivered'].includes(item.trackingStatus)
    );
    const itemsDeliveredToday = itemsDelivered.filter(item => {
      const deliveryDate = new Date(item.trackingLastUpdate);
      return deliveryDate >= start && deliveryDate <= end;
    });

    // By carrier
    const carrierCounts = {};
    itemsWithTracking.forEach(item => {
      const carrier = item.trackingCarrier || 'Unknown';
      carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
    });
    const byCarrier = Object.keys(carrierCounts).map(carrier => ({
      carrier,
      count: carrierCounts[carrier],
      averageTransitTime: 0 // TODO: Calculate from tracking history
    }));

    stats.tracking = {
      itemsInTransit: itemsInTransit.length,
      itemsDelivered: itemsDelivered.length,
      itemsDeliveredToday: itemsDeliveredToday.length,
      averageTransitTime: 0, // TODO: Calculate from tracking data
      byCarrier,
      trackingIssues: 0 // TODO: Detect tracking issues
    };

    // ========== USER ACTIVITY STATISTICS ==========
    const userUpdates = {};
    const userNotes = {};
    const userReceiving = {};

    // Count updates from POs
    allPOs.forEach(po => {
      if (po.lastUpdatedBy) {
        userUpdates[po.lastUpdatedBy] = (userUpdates[po.lastUpdatedBy] || 0) + 1;
      }
    });

    // Count from line items
    receivedToday.forEach(item => {
      if (item.receivedBy) {
        userReceiving[item.receivedBy] = (userReceiving[item.receivedBy] || 0) + 1;
      }
    });

    const byUser = Object.keys(userUpdates).map(username => ({
      username,
      updates: userUpdates[username] || 0,
      notesAdded: userNotes[username] || 0,
      itemsReceived: userReceiving[username] || 0
    })).sort((a, b) => b.updates - a.updates);

    stats.userActivity = {
      totalUpdates: Object.values(userUpdates).reduce((sum, count) => sum + count, 0),
      notesAdded: 0, // TODO: Track note additions
      statusChanges: updatedPOsToday.length,
      etaUpdates: 0, // TODO: Track ETA changes specifically
      receivingActivities: receivedToday.length,
      byUser
    };

    // ========== PERFORMANCE METRICS ==========
    const itemsWithEtaAndReceived = receivedItems.filter(item => item.eta && item.receivedDate);
    const onTimeDeliveries = itemsWithEtaAndReceived.filter(item => {
      const eta = new Date(item.eta);
      const received = new Date(item.receivedDate);
      return received <= eta;
    });
    const onTimeRate = itemsWithEtaAndReceived.length > 0
      ? (onTimeDeliveries.length / itemsWithEtaAndReceived.length) * 100
      : 0;

    // Items arriving in next 7 and 30 days
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const arrivingNext7 = unreceivedItems.filter(item => {
      if (!item.eta) return false;
      const eta = new Date(item.eta);
      return eta >= now && eta <= next7Days;
    });
    const arrivingNext30 = unreceivedItems.filter(item => {
      if (!item.eta) return false;
      const eta = new Date(item.eta);
      return eta >= now && eta <= next30Days;
    });

    // Overdue by days ranges
    const overdueRanges = {
      '1-7': 0,
      '8-14': 0,
      '15-30': 0,
      '30+': 0
    };
    overdueItems.forEach(item => {
      const eta = new Date(item.eta);
      const daysOverdue = Math.floor((now - eta) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 7) overdueRanges['1-7']++;
      else if (daysOverdue <= 14) overdueRanges['8-14']++;
      else if (daysOverdue <= 30) overdueRanges['15-30']++;
      else overdueRanges['30+']++;
    });

    stats.performance = {
      onTimeDeliveryRate: Math.round(onTimeRate * 10) / 10,
      avgDaysFromOrderToStock: Math.round(avgDays * 10) / 10,
      avgDaysFromOrderToShip: 0, // TODO: Calculate when tracking data available
      avgDaysFromShipToReceive: 0, // TODO: Calculate when tracking data available
      itemsArrivingNext7Days: arrivingNext7.length,
      itemsArrivingNext30Days: arrivingNext30.length,
      itemsOverdueByDays: Object.keys(overdueRanges).map(range => ({
        range,
        count: overdueRanges[range]
      }))
    };

    // ========== TASK STATISTICS ==========
    const allTasks = await Task.find().lean();
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const pendingTasks = allTasks.filter(task => task.status !== 'completed');
    const overdueTasks = pendingTasks.filter(task => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < now;
    });
    const tasksCreatedToday = allTasks.filter(task => {
      const created = new Date(task.createdAt);
      return created >= start && created <= end;
    });
    const tasksCompletedToday = completedTasks.filter(task => {
      const completed = new Date(task.completedAt || task.updatedAt);
      return completed >= start && completed <= end;
    });

    stats.tasks = {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      tasksCreatedToday: tasksCreatedToday.length,
      tasksCompletedToday: tasksCompletedToday.length
    };

    // ========== ISSUES & ALERTS ==========
    stats.issues = {
      itemsMissingEta: noEtaItems.length,
      itemsMissingTracking: unreceivedItems.filter(item => !item.trackingNumber).length,
      overdueWithoutUpdate: overdueItems.filter(item => {
        if (!item.updatedAt) return true;
        const daysSinceUpdate = Math.floor((now - new Date(item.updatedAt)) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate > 7;
      }).length,
      partialShipmentPending: partiallyReceived.length,
      vendorsNotResponding: 0 // TODO: Track vendor responsiveness
    };

    // ========== SNAPSHOT DATA ==========
    const pendingValue = activePOs.reduce((sum, po) => sum + (po.amount || 0), 0);
    const completedValue = completedPOs.reduce((sum, po) => sum + (po.amount || 0), 0);

    stats.snapshot = {
      totalInventoryValue: Math.round(totalValue * 100) / 100,
      pendingOrderValue: Math.round(pendingValue * 100) / 100,
      completedOrderValue: Math.round(completedValue * 100) / 100
    };

    // Save or update statistics
    if (existingStats) {
      await DailyStatistics.findByIdAndUpdate(existingStats._id, stats);
      console.log('✅ Daily statistics updated');
    } else {
      await DailyStatistics.create(stats);
      console.log('✅ Daily statistics created');
    }

    res.json({
      success: true,
      message: 'Daily statistics generated successfully',
      stats
    });

  } catch (error) {
    console.error('❌ Error generating daily statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics for a specific date
router.get('/daily-stats/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const { start, end } = getDayBounds(date);

    const stats = await DailyStatistics.findOne({
      date: { $gte: start, $lte: end }
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this date'
      });
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error fetching daily statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics for date range
router.get('/daily-stats', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const stats = await DailyStatistics.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    res.json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    console.error('❌ Error fetching daily statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get dashboard view of statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Get today's stats (generate if not exist)
    const today = new Date();
    const { start, end } = getDayBounds(today);
    
    let todayStats = await DailyStatistics.findOne({
      date: { $gte: start, $lte: end }
    });

    // Get last 30 days for trends
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentStats = await DailyStatistics.find({
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 }).limit(30);

    res.render('statistics-dashboard', {
      user: req.user,
      todayStats,
      recentStats,
      pageTitle: 'Daily Statistics Dashboard'
    });
  } catch (error) {
    console.error('❌ Error loading statistics dashboard:', error);
    res.status(500).render('error', {
      error: 'Failed to load statistics dashboard'
    });
  }
});

module.exports = router;
