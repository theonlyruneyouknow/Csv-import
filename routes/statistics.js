// routes/statistics.js
const express = require('express');
const router = express.Router();
const DailyStatistics = require('../models/DailyStatistics');
const PurchaseOrder = require('../models/PurchaseOrder');
const LineItem = require('../models/LineItem');
const Vendor = require('../models/Vendor');
const Task = require('../models/Task');
const EmailTemplate = require('../models/EmailTemplate');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');

// Helper function to build flexible date query to handle timezone variations
function buildFlexibleDateQuery(periodType, start, end) {
  return {
    periodType,
    $or: [
      { periodStart: start, periodEnd: end },  // Exact match
      { periodStart: { $lte: start }, periodEnd: { $gte: end } },  // Contains range
      { periodStart: { $lte: end }, periodEnd: { $gte: start } }  // Overlaps range
    ]
  };
}

// Helper function to calculate period bounds
function getPeriodBounds(periodType, referenceDate = new Date()) {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  
  let start, end;
  
  switch (periodType) {
    case 'daily':
      start = new Date(date);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'weekly':
      // Start from Sunday
      start = new Date(date);
      start.setDate(date.getDate() - date.getDay());
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'bi-weekly':
      // Start from Sunday, 14-day period
      start = new Date(date);
      start.setDate(date.getDate() - date.getDay());
      // Adjust to bi-weekly period (every other week)
      const weeksSinceEpoch = Math.floor(start.getTime() / (7 * 24 * 60 * 60 * 1000));
      if (weeksSinceEpoch % 2 !== 0) {
        start.setDate(start.getDate() - 7);
      }
      end = new Date(start);
      end.setDate(start.getDate() + 13);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'monthly':
      start = new Date(date.getFullYear(), date.getMonth(), 1);
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3);
      start = new Date(date.getFullYear(), quarter * 3, 1);
      end = new Date(date.getFullYear(), quarter * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      break;
      
    case 'yearly':
      start = new Date(date.getFullYear(), 0, 1);
      end = new Date(date.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
      
    default:
      throw new Error('Invalid period type');
  }
  
  return { start, end };
}

// Helper function to get period label
function getPeriodLabel(periodType, start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  switch (periodType) {
    case 'daily':
      return startDate.toLocaleDateString();
    case 'weekly':
      return `Week of ${startDate.toLocaleDateString()}`;
    case 'bi-weekly':
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    case 'monthly':
      return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case 'quarterly':
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${quarter} ${startDate.getFullYear()}`;
    case 'yearly':
      return startDate.getFullYear().toString();
    default:
      return 'Unknown Period';
  }
}

// Generate statistics for any period type
router.post('/generate-stats', async (req, res) => {
  try {
    console.log('📊 Generate stats request received:', req.body);
    
    const periodType = req.body.periodType || 'daily';
    const targetDate = req.body.referenceDate ? new Date(req.body.referenceDate) : 
                       req.body.date ? new Date(req.body.date) : 
                       new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);
    
    const periodLabel = getPeriodLabel(periodType, start, end);
    console.log(`📊 Generating ${periodType} statistics for ${periodLabel}...`);
    console.log(`   Period: ${start.toISOString()} to ${end.toISOString()}`);

    // Check if stats already exist for this period
    const existingStats = await DailyStatistics.findOne({
      periodType,
      periodStart: start,
      periodEnd: end
    });

    if (existingStats && !req.body.force) {
      return res.json({
        success: true,
        message: 'Statistics already exist for this period',
        stats: existingStats
      });
    }

    // Initialize statistics object
    const stats = {
      date: start,
      periodType,
      periodStart: start,
      periodEnd: end,
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
    const newPOsInPeriod = allPOs.filter(po => {
      const created = new Date(po.createdAt || po.date);
      return created >= start && created <= end;
    });
    const updatedPOsInPeriod = allPOs.filter(po => {
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

    // Build detailed PO lists
    const newPOsDetailList = newPOsInPeriod.map(po => ({
      poNumber: po.poNumber,
      vendor: po.vendor,
      type: po.type || 'N/A',
      createdDate: po.createdAt || po.date,
      itemCount: po.items ? po.items.length : 0,
      totalValue: po.amount || 0
    }));

    const completedPOsInPeriod = completedPOs.filter(po => {
      const updated = new Date(po.lastUpdate || po.updatedAt);
      return updated >= start && updated <= end;
    });

    const completedPOsDetailList = completedPOsInPeriod.map(po => {
      const created = new Date(po.createdAt || po.date);
      const completed = new Date(po.lastUpdate || po.updatedAt);
      const daysToComplete = Math.floor((completed - created) / (1000 * 60 * 60 * 24));
      return {
        poNumber: po.poNumber,
        vendor: po.vendor,
        type: po.type || 'N/A',
        completedDate: completed,
        itemCount: po.items ? po.items.length : 0,
        totalValue: po.amount || 0,
        daysToComplete: daysToComplete >= 0 ? daysToComplete : 0
      };
    });

    stats.purchaseOrders = {
      total: allPOs.length,
      active: activePOs.length,
      completed: completedPOs.length,
      newInPeriod: newPOsInPeriod.length,
      updatedInPeriod: updatedPOsInPeriod.length,
      byType: poByType,
      byStatus: poByStatus,
      averageValue: Math.round(averageValue * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      newPOsInPeriod: newPOsDetailList,
      completedPOsInPeriod: completedPOsDetailList
    };

    // ========== LINE ITEM STATISTICS ==========
    const allLineItems = await LineItem.find().lean();
    const receivedItems = allLineItems.filter(item => item.received === true);
    const unreceivedItems = allLineItems.filter(item => item.received === false);
    const receivedInPeriod = receivedItems.filter(item => {
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

    // Build detailed item lists
    const topItemsByQuantity = allLineItems
      .map(item => ({
        itemName: item.itemName || item.description || 'Unknown',
        poNumber: item.poNumber,
        vendor: item.vendor || 'Unknown',
        quantity: item.quantityExpected || item.quantity || 0,
        received: item.received || false,
        status: item.status || 'N/A'
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);

    const itemsReceivedInPeriodList = receivedInPeriod.map(item => {
      const orderDate = new Date(item.createdAt);
      const receiveDate = new Date(item.receivedDate);
      const daysToReceive = Math.floor((receiveDate - orderDate) / (1000 * 60 * 60 * 24));
      return {
        itemName: item.itemName || item.description || 'Unknown',
        poNumber: item.poNumber,
        vendor: item.vendor || 'Unknown',
        quantity: item.quantityExpected || item.quantity || 0,
        receivedDate: item.receivedDate,
        daysToReceive: daysToReceive >= 0 ? daysToReceive : 0
      };
    }).slice(0, 50);

    const overdueItemsList = overdueItems.map(item => {
      const eta = new Date(item.eta);
      const daysOverdue = Math.floor((now - eta) / (1000 * 60 * 60 * 24));
      return {
        itemName: item.itemName || item.description || 'Unknown',
        poNumber: item.poNumber,
        vendor: item.vendor || 'Unknown',
        eta: item.eta,
        daysOverdue: daysOverdue,
        urgency: item.urgency || 'None'
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 50);

    // High value items (estimate based on quantity - could be improved with actual pricing)
    const highValueItems = allLineItems
      .filter(item => (item.quantityExpected || item.quantity || 0) > 100)
      .map(item => ({
        itemName: item.itemName || item.description || 'Unknown',
        poNumber: item.poNumber,
        vendor: item.vendor || 'Unknown',
        quantity: item.quantityExpected || item.quantity || 0,
        estimatedValue: 0, // Could be populated if pricing data available
        status: item.status || 'N/A'
      }))
      .slice(0, 20);

    stats.lineItems = {
      total: allLineItems.length,
      unreceived: unreceivedItems.length,
      received: receivedItems.length,
      receivedInPeriod: receivedInPeriod.length,
      partiallyReceived: partiallyReceived.length,
      overdueItems: overdueItems.length,
      noEtaItems: noEtaItems.length,
      byUrgency: urgencyCounts,
      averageDaysToReceive: Math.round(avgDays * 10) / 10,
      medianDaysToReceive: medianDays,
      fastestDelivery: daysToReceive.length > 0 ? daysToReceive[0] : 0,
      slowestDelivery: daysToReceive.length > 0 ? daysToReceive[daysToReceive.length - 1] : 0,
      topItemsByQuantity,
      itemsReceivedInPeriod: itemsReceivedInPeriodList,
      overdueItemsList,
      highValueItems
    };

    // ========== EMAIL STATISTICS ==========
    const emailsSentInPeriod = allPOs.filter(po => {
      if (!po.lastEmailSent) return false;
      const emailDate = new Date(po.lastEmailSent);
      return emailDate >= start && emailDate <= end;
    });

    const uniqueVendors = new Set(emailsSentInPeriod.map(po => po.vendor));
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
      sentInPeriod: emailsSentInPeriod.length,
      uniqueVendorsContacted: uniqueVendors.size,
      totalSentAllTime: totalEmailsSent,
      byTemplate: templateUsage,
      topVendorsContacted
    };

    // ========== VENDOR STATISTICS ==========
    const allVendors = await Vendor.find().lean();
    const vendorsWithOpenPOs = new Set(activePOs.map(po => po.vendor)).size;
    const newVendorsInPeriod = allVendors.filter(vendor => {
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

    // Build detailed vendor lists
    const vendorOpenPOsMap = {};
    const vendorCompletedPOsMap = {};

    activePOs.forEach(po => {
      if (!vendorOpenPOsMap[po.vendor]) {
        vendorOpenPOsMap[po.vendor] = {
          vendorName: po.vendor,
          openPONumbers: [],
          totalOpenValue: 0,
          oldestPODate: new Date(po.createdAt || po.date),
          unreceiveItems: 0
        };
      }
      vendorOpenPOsMap[po.vendor].openPONumbers.push(po.poNumber);
      vendorOpenPOsMap[po.vendor].totalOpenValue += (po.amount || 0);
      const poDate = new Date(po.createdAt || po.date);
      if (poDate < vendorOpenPOsMap[po.vendor].oldestPODate) {
        vendorOpenPOsMap[po.vendor].oldestPODate = poDate;
      }
      // Count unreceived items for this PO
      const poUnreceivedItems = allLineItems.filter(item => 
        item.poNumber === po.poNumber && !item.received
      );
      vendorOpenPOsMap[po.vendor].unreceiveItems += poUnreceivedItems.length;
    });

    completedPOs.forEach(po => {
      if (!vendorCompletedPOsMap[po.vendor]) {
        vendorCompletedPOsMap[po.vendor] = {
          vendorName: po.vendor,
          completedPONumbers: [],
          totalCompletedValue: 0,
          completedInPeriod: 0,
          lastCompletionDate: null
        };
      }
      vendorCompletedPOsMap[po.vendor].completedPONumbers.push(po.poNumber);
      vendorCompletedPOsMap[po.vendor].totalCompletedValue += (po.amount || 0);
      
      const completedDate = new Date(po.lastUpdate || po.updatedAt);
      if (completedDate >= start && completedDate <= end) {
        vendorCompletedPOsMap[po.vendor].completedInPeriod++;
      }
      
      if (!vendorCompletedPOsMap[po.vendor].lastCompletionDate || 
          completedDate > vendorCompletedPOsMap[po.vendor].lastCompletionDate) {
        vendorCompletedPOsMap[po.vendor].lastCompletionDate = completedDate;
      }
    });

    const vendorsWithOpenPOsList = Object.values(vendorOpenPOsMap).map(v => ({
      ...v,
      openPOCount: v.openPONumbers.length,
      totalOpenValue: Math.round(v.totalOpenValue * 100) / 100
    })).sort((a, b) => b.openPOCount - a.openPOCount);

    const vendorsWithCompletedPOsList = Object.values(vendorCompletedPOsMap).map(v => ({
      ...v,
      completedPOCount: v.completedPONumbers.length,
      totalCompletedValue: Math.round(v.totalCompletedValue * 100) / 100
    })).sort((a, b) => b.completedPOCount - a.completedPOCount);

    const vendorsCreatedInPeriodList = newVendorsInPeriod.map(vendor => ({
      vendorName: vendor.vendorName || vendor.name || 'Unknown',
      createdDate: vendor.createdAt,
      poCount: allPOs.filter(po => po.vendor === (vendor.vendorName || vendor.name)).length
    }));

    stats.vendors = {
      total: allVendors.length,
      activeVendors: allVendors.filter(v => v.isActive !== false).length,
      vendorsWithOpenPOs,
      newVendors: newVendorsInPeriod.length,
      averageResponseTime: 0, // TODO: Implement when we track vendor response times
      topVendorsByVolume,
      vendorsWithOpenPOsList,
      vendorsWithCompletedPOsList,
      vendorsCreatedInPeriod: vendorsCreatedInPeriodList
    };

    // ========== TRACKING STATISTICS ==========
    const itemsWithTracking = allLineItems.filter(item => item.trackingNumber);
    const itemsInTransit = itemsWithTracking.filter(item => 
      item.trackingStatus && !['Delivered', 'delivered'].includes(item.trackingStatus) && !item.received
    );
    const itemsDelivered = itemsWithTracking.filter(item => 
      item.trackingStatus && ['Delivered', 'delivered'].includes(item.trackingStatus)
    );
    const itemsDeliveredInPeriod = itemsDelivered.filter(item => {
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
      itemsDeliveredInPeriod: itemsDeliveredInPeriod.length,
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
    receivedInPeriod.forEach(item => {
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
      statusChanges: updatedPOsInPeriod.length,
      etaUpdates: 0, // TODO: Track ETA changes specifically
      receivingActivities: receivedInPeriod.length,
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
    const tasksCreatedInPeriod = allTasks.filter(task => {
      const created = new Date(task.createdAt);
      return created >= start && created <= end;
    });
    const tasksCompletedInPeriod = completedTasks.filter(task => {
      const completed = new Date(task.completedAt || task.updatedAt);
      return completed >= start && completed <= end;
    });

    stats.tasks = {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasks.length,
      tasksCreatedInPeriod: tasksCreatedInPeriod.length,
      tasksCompletedInPeriod: tasksCompletedInPeriod.length
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

    // ========== EAD (ESTIMATED ARRIVAL DATE) STATISTICS ==========
    const itemsWithEAD = allLineItems.filter(item => item.ead && item.ead.trim() !== '');
    const itemsWithETA = unreceivedItems.filter(item => item.eta);
    const itemsWithoutEAD = unreceivedItems.filter(item => !item.ead || item.ead.trim() === '');
    
    // Calculate time-based arrival counts for items
    const thisWeekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const thisQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
    
    const itemsArrivingThisWeek = itemsWithETA.filter(item => {
      const eta = new Date(item.eta);
      return eta >= now && eta <= thisWeekEnd;
    });
    
    const itemsArrivingThisMonth = itemsWithETA.filter(item => {
      const eta = new Date(item.eta);
      return eta >= now && eta <= thisMonthEnd;
    });
    
    const itemsArrivingThisQuarter = itemsWithETA.filter(item => {
      const eta = new Date(item.eta);
      return eta >= now && eta <= thisQuarterEnd;
    });
    
    const itemsPastDue = overdueItems.length;
    
    // Group items by month
    const itemsByMonth = {};
    itemsWithETA.forEach(item => {
      const eta = new Date(item.eta);
      const monthKey = `${eta.getFullYear()}-${String(eta.getMonth() + 1).padStart(2, '0')}`;
      if (!itemsByMonth[monthKey]) {
        itemsByMonth[monthKey] = {
          count: 0,
          totalQuantity: 0
        };
      }
      itemsByMonth[monthKey].count++;
      itemsByMonth[monthKey].totalQuantity += (item.quantityExpected || item.quantity || 0);
    });
    
    const itemsByMonthArray = Object.keys(itemsByMonth).map(month => ({
      month,
      count: itemsByMonth[month].count,
      totalQuantity: itemsByMonth[month].totalQuantity
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    // Build detailed items by EAD list
    const itemsByEADList = itemsWithETA.map(item => {
      const eta = new Date(item.eta);
      const daysUntil = Math.floor((eta - now) / (1000 * 60 * 60 * 24));
      return {
        itemName: item.itemName || item.description || 'Unknown',
        poNumber: item.poNumber,
        vendor: item.vendor || 'Unknown',
        ead: item.ead || 'Not specified',
        eta: item.eta,
        quantity: item.quantityExpected || item.quantity || 0,
        status: item.received ? 'Received' : (item.partialShipmentStatus ? 'Partial' : 'Pending'),
        daysUntilArrival: daysUntil
      };
    }).sort((a, b) => a.daysUntilArrival - b.daysUntilArrival).slice(0, 100);
    
    // PO-level EAD statistics
    const posWithETA = allPOs.filter(po => po.eta);
    const posWithoutETA = activePOs.filter(po => !po.eta);
    
    const posArrivingThisWeek = posWithETA.filter(po => {
      const eta = new Date(po.eta);
      return eta >= now && eta <= thisWeekEnd;
    });
    
    const posArrivingThisMonth = posWithETA.filter(po => {
      const eta = new Date(po.eta);
      return eta >= now && eta <= thisMonthEnd;
    });
    
    const posPastDue = posWithETA.filter(po => {
      const eta = new Date(po.eta);
      return eta < now && !['Completed', 'Received', 'Cancelled'].includes(po.status);
    });
    
    // Build detailed POs by ETA list
    const posByETAList = posWithETA.map(po => {
      const eta = new Date(po.eta);
      const daysUntil = Math.floor((eta - now) / (1000 * 60 * 60 * 24));
      const poItems = allLineItems.filter(item => item.poNumber === po.poNumber);
      return {
        poNumber: po.poNumber,
        vendor: po.vendor || 'Unknown',
        eta: po.eta,
        itemCount: poItems.length,
        status: po.status || 'Unknown',
        daysUntilArrival: daysUntil
      };
    }).sort((a, b) => a.daysUntilArrival - b.daysUntilArrival).slice(0, 50);
    
    // Vendor-level EAD statistics
    const vendorEADMap = {};
    
    itemsWithETA.forEach(item => {
      const vendor = item.vendor || 'Unknown';
      if (!vendorEADMap[vendor]) {
        vendorEADMap[vendor] = {
          pendingItems: 0,
          overdueItems: 0,
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          earlyDeliveries: 0,
          totalDeliveries: 0,
          etaDates: []
        };
      }
      
      if (!item.received) {
        vendorEADMap[vendor].pendingItems++;
        const eta = new Date(item.eta);
        if (eta < now) {
          vendorEADMap[vendor].overdueItems++;
        }
        vendorEADMap[vendor].etaDates.push(eta);
      } else if (item.receivedDate) {
        // Calculate delivery performance
        const eta = new Date(item.eta);
        const received = new Date(item.receivedDate);
        vendorEADMap[vendor].totalDeliveries++;
        
        if (received <= eta) {
          vendorEADMap[vendor].onTimeDeliveries++;
          if (received < eta) {
            vendorEADMap[vendor].earlyDeliveries++;
          }
        } else {
          vendorEADMap[vendor].lateDeliveries++;
        }
      }
    });
    
    const vendorPerformanceList = Object.keys(vendorEADMap).map(vendor => {
      const data = vendorEADMap[vendor];
      const avgAccuracy = data.totalDeliveries > 0 
        ? (data.onTimeDeliveries / data.totalDeliveries) * 100 
        : 0;
      
      const sortedDates = data.etaDates.sort((a, b) => a - b);
      const earliestETA = sortedDates.length > 0 ? sortedDates[0] : null;
      const latestETA = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
      
      return {
        vendorName: vendor,
        pendingItems: data.pendingItems,
        overdueItems: data.overdueItems,
        avgDeliveryAccuracy: Math.round(avgAccuracy * 10) / 10,
        earliestETA,
        latestETA
      };
    }).sort((a, b) => b.pendingItems - a.pendingItems).slice(0, 50);
    
    // Calculate overall vendor-level metrics
    let totalOnTime = 0;
    let totalDeliveries = 0;
    let totalDaysEarly = 0;
    let totalDaysLate = 0;
    let earlyCount = 0;
    let lateCount = 0;
    
    receivedItems.forEach(item => {
      if (item.eta && item.receivedDate) {
        const eta = new Date(item.eta);
        const received = new Date(item.receivedDate);
        const daysDiff = Math.floor((received - eta) / (1000 * 60 * 60 * 24));
        
        totalDeliveries++;
        if (received <= eta) {
          totalOnTime++;
          if (daysDiff < 0) {
            totalDaysEarly += Math.abs(daysDiff);
            earlyCount++;
          }
        } else {
          totalDaysLate += daysDiff;
          lateCount++;
        }
      }
    });
    
    const overallOnTimeRate = totalDeliveries > 0 ? (totalOnTime / totalDeliveries) * 100 : 0;
    const avgDaysEarly = earlyCount > 0 ? totalDaysEarly / earlyCount : 0;
    const avgDaysLate = lateCount > 0 ? totalDaysLate / lateCount : 0;
    
    stats.ead = {
      items: {
        withEAD: itemsWithEAD.length,
        withoutEAD: itemsWithoutEAD.length,
        arrivingThisWeek: itemsArrivingThisWeek.length,
        arrivingThisMonth: itemsArrivingThisMonth.length,
        arrivingThisQuarter: itemsArrivingThisQuarter.length,
        pastDue: itemsPastDue,
        byMonth: itemsByMonthArray,
        itemsByEAD: itemsByEADList
      },
      pos: {
        withETA: posWithETA.length,
        withoutETA: posWithoutETA.length,
        arrivingThisWeek: posArrivingThisWeek.length,
        arrivingThisMonth: posArrivingThisMonth.length,
        pastDue: posPastDue.length,
        posByETA: posByETAList
      },
      vendors: {
        withPendingDeliveries: Object.keys(vendorEADMap).length,
        onTimeRate: Math.round(overallOnTimeRate * 10) / 10,
        averageDaysEarly: Math.round(avgDaysEarly * 10) / 10,
        averageDaysLate: Math.round(avgDaysLate * 10) / 10,
        vendorPerformance: vendorPerformanceList
      }
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
      const updated = await DailyStatistics.findByIdAndUpdate(existingStats._id, stats, { new: true });
      console.log(`✅ ${periodType.charAt(0).toUpperCase() + periodType.slice(1)} statistics updated for ${periodLabel}`);
      console.log(`   Stats ID: ${updated._id}, POs: ${updated.purchaseOrders?.total || 0}, Items: ${updated.lineItems?.total || 0}`);
    } else {
      const created = await DailyStatistics.create(stats);
      console.log(`✅ ${periodType.charAt(0).toUpperCase() + periodType.slice(1)} statistics created for ${periodLabel}`);
      console.log(`   Stats ID: ${created._id}, POs: ${created.purchaseOrders?.total || 0}, Items: ${created.lineItems?.total || 0}`);
    }

    res.json({
      success: true,
      message: `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} statistics generated successfully`,
      stats,
      debug: {
        periodType,
        periodStart: start,
        periodEnd: end,
        totalPOs: stats.purchaseOrders?.total || 0,
        totalItems: stats.lineItems?.total || 0
      }
    });

  } catch (error) {
    console.error(`❌ Error generating ${req.body.periodType || 'daily'} statistics:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get existing stats without generating (for navigation)
router.post('/get-stats', async (req, res) => {
  try {
    const periodType = req.body.periodType || 'daily';
    const targetDate = req.body.referenceDate ? new Date(req.body.referenceDate) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);
    
    const stats = await DailyStatistics.findOne({
      periodType,
      periodStart: start,
      periodEnd: end
    });

    if (stats) {
      return res.json({
        success: true,
        stats,
        periodLabel: getPeriodLabel(periodType, start, end)
      });
    } else {
      return res.json({
        success: false,
        message: 'No statistics found for this period'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
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
    const { start, end } = getPeriodBounds('daily', date);

    const stats = await DailyStatistics.findOne({
      periodType: 'daily',
      periodStart: start,
      periodEnd: end
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
    // Get period type and date from query params or use defaults
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);
    
    console.log(`📊 Dashboard loading for ${periodType}, date: ${targetDate.toISOString()}`);
    console.log(`   Looking for stats between ${start.toISOString()} and ${end.toISOString()}`);
    
    // Find stats where the period overlaps with our target period
    // This is more flexible than exact match
    let todayStats = await DailyStatistics.findOne({
      periodType: periodType,
      $or: [
        // Exact match
        { periodStart: start, periodEnd: end },
        // Or period that contains our target date
        { 
          periodStart: { $lte: start },
          periodEnd: { $gte: end }
        },
        // Or period that overlaps with our range
        {
          periodStart: { $lte: end },
          periodEnd: { $gte: start }
        }
      ]
    }).sort({ periodStart: -1 });
    
    if (todayStats) {
      console.log(`✅ Found stats: ${todayStats._id}, period: ${todayStats.periodStart.toISOString()} to ${todayStats.periodEnd.toISOString()}`);
    } else {
      console.log(`⚠️ No stats found for this period`);
    }

    // Get last 30 days for trends (daily stats only)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentStats = await DailyStatistics.find({
      periodType: 'daily',
      periodStart: { $gte: thirtyDaysAgo }
    }).sort({ periodStart: -1 }).limit(30);

    res.render('statistics-dashboard', {
      user: req.user,
      todayStats,
      recentStats,
      pageTitle: 'Statistics Dashboard',
      currentPeriodType: periodType,
      currentDate: targetDate.toISOString()
    });
  } catch (error) {
    console.error('❌ Error loading statistics dashboard:', error);
    res.status(500).render('error', {
      error: 'Failed to load statistics dashboard'
    });
  }
});

// Export statistics to Excel
router.post('/export-excel', async (req, res) => {
  try {
    const { periodType, referenceDate } = req.body;
    const targetDate = referenceDate ? new Date(referenceDate) : new Date();
    const { start, end } = getPeriodBounds(periodType || 'daily', targetDate);
    const periodLabel = getPeriodLabel(periodType || 'daily', start, end);

    const stats = await DailyStatistics.findOne({
      periodType: periodType || 'daily',
      periodStart: start,
      periodEnd: end
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CSV Import System';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    // Style header row
    summarySheet.getRow(1).font = { bold: true, size: 12 };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add summary data
    summarySheet.addRow({ metric: 'Report Period', value: periodLabel });
    summarySheet.addRow({ metric: 'Generated', value: new Date().toLocaleString() });
    summarySheet.addRow({ metric: '', value: '' }); // Blank row

    // Purchase Orders section
    summarySheet.addRow({ metric: 'PURCHASE ORDERS', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Total POs', value: stats.purchaseOrders.total });
    summarySheet.addRow({ metric: 'Active POs', value: stats.purchaseOrders.active });
    summarySheet.addRow({ metric: 'New in Period', value: stats.purchaseOrders.newInPeriod });
    summarySheet.addRow({ metric: 'Updated in Period', value: stats.purchaseOrders.updatedInPeriod });
    summarySheet.addRow({ metric: 'Completed', value: stats.purchaseOrders.completed });
    summarySheet.addRow({ metric: 'Overdue Items', value: stats.purchaseOrders.overdueItems });
    summarySheet.addRow({ metric: '', value: '' }); // Blank row

    // Line Items section
    summarySheet.addRow({ metric: 'LINE ITEMS', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Total Items', value: stats.lineItems.total });
    summarySheet.addRow({ metric: 'Unreceived', value: stats.lineItems.unreceived });
    summarySheet.addRow({ metric: 'Received', value: stats.lineItems.received });
    summarySheet.addRow({ metric: 'Received in Period', value: stats.lineItems.receivedInPeriod });
    summarySheet.addRow({ metric: 'Partially Received', value: stats.lineItems.partiallyReceived });
    summarySheet.addRow({ metric: '', value: '' }); // Blank row

    // Emails section
    summarySheet.addRow({ metric: 'EMAILS', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Sent in Period', value: stats.emails.sentInPeriod });
    summarySheet.addRow({ metric: 'Unique Vendors Contacted', value: stats.emails.uniqueVendorsContacted });
    summarySheet.addRow({ metric: 'Total Sent (All Time)', value: stats.emails.totalSentAllTime });
    summarySheet.addRow({ metric: '', value: '' }); // Blank row

    // Vendors section
    summarySheet.addRow({ metric: 'VENDORS', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Total Vendors', value: stats.vendors.total });
    summarySheet.addRow({ metric: 'Active Vendors', value: stats.vendors.activeVendors });
    summarySheet.addRow({ metric: 'Vendors with Open POs', value: stats.vendors.vendorsWithOpenPOs });
    summarySheet.addRow({ metric: 'New Vendors', value: stats.vendors.newVendors });
    summarySheet.addRow({ metric: '', value: '' }); // Blank row

    // Performance section
    summarySheet.addRow({ metric: 'PERFORMANCE', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Avg Days Order to Stock', value: (stats.performance.avgDaysOrderToStock || 0).toFixed(1) });
    summarySheet.addRow({ metric: 'On-Time Delivery Rate', value: `${(stats.performance.onTimeDeliveryRate || 0).toFixed(1)}%` });
    summarySheet.addRow({ metric: '', value: '' }); // Blank row

    // Tasks section
    summarySheet.addRow({ metric: 'TASKS', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Total Tasks', value: stats.tasks.totalTasks });
    summarySheet.addRow({ metric: 'Completed Tasks', value: stats.tasks.completedTasks });
    summarySheet.addRow({ metric: 'Pending Tasks', value: stats.tasks.pendingTasks });
    summarySheet.addRow({ metric: 'Overdue Tasks', value: stats.tasks.overdueTasks });
    summarySheet.addRow({ metric: 'Created in Period', value: stats.tasks.tasksCreatedInPeriod });
    summarySheet.addRow({ metric: 'Completed in Period', value: stats.tasks.tasksCompletedInPeriod });

    // Top Vendors Sheet
    if (stats.vendors.topVendorsByVolume && stats.vendors.topVendorsByVolume.length > 0) {
      const vendorsSheet = workbook.addWorksheet('Top Vendors');
      vendorsSheet.columns = [
        { header: 'Rank', key: 'rank', width: 10 },
        { header: 'Vendor', key: 'vendor', width: 30 },
        { header: 'PO Count', key: 'poCount', width: 15 },
        { header: 'Total Value', key: 'totalValue', width: 20 }
      ];

      vendorsSheet.getRow(1).font = { bold: true };
      vendorsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      vendorsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      stats.vendors.topVendorsByVolume.forEach((vendor, index) => {
        vendorsSheet.addRow({
          rank: index + 1,
          vendor: vendor.vendor,
          poCount: vendor.poCount,
          totalValue: `$${(vendor.totalValue || 0).toFixed(2)}`
        });
      });
    }

    // Email Templates Sheet
    if (stats.emails.byTemplate && stats.emails.byTemplate.length > 0) {
      const templatesSheet = workbook.addWorksheet('Email Templates');
      templatesSheet.columns = [
        { header: 'Template Name', key: 'templateName', width: 35 },
        { header: 'Usage Count', key: 'count', width: 15 }
      ];

      templatesSheet.getRow(1).font = { bold: true };
      templatesSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      templatesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      stats.emails.byTemplate.forEach(template => {
        templatesSheet.addRow({
          templateName: template.templateName,
          count: template.count
        });
      });
    }

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Statistics_${periodType || 'daily'}_${start.toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('❌ Error exporting statistics to Excel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Email statistics report
router.post('/email-report', async (req, res) => {
  try {
    const { periodType, referenceDate, recipients } = req.body;
    
    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one recipient email address'
      });
    }

    const targetDate = referenceDate ? new Date(referenceDate) : new Date();
    const { start, end } = getPeriodBounds(periodType || 'daily', targetDate);
    const periodLabel = getPeriodLabel(periodType || 'daily', start, end);

    const stats = await DailyStatistics.findOne({
      periodType: periodType || 'daily',
      periodStart: start,
      periodEnd: end
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    // Create Excel file for attachment
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CSV Import System';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.getRow(1).font = { bold: true, size: 12 };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    summarySheet.addRow({ metric: 'Report Period', value: periodLabel });
    summarySheet.addRow({ metric: 'Generated', value: new Date().toLocaleString() });
    summarySheet.addRow({ metric: '', value: '' });

    summarySheet.addRow({ metric: 'PURCHASE ORDERS', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Total POs', value: stats.purchaseOrders.total });
    summarySheet.addRow({ metric: 'Active POs', value: stats.purchaseOrders.active });
    summarySheet.addRow({ metric: 'New in Period', value: stats.purchaseOrders.newInPeriod });
    summarySheet.addRow({ metric: 'Updated in Period', value: stats.purchaseOrders.updatedInPeriod });
    summarySheet.addRow({ metric: '', value: '' });

    summarySheet.addRow({ metric: 'LINE ITEMS', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Total Items', value: stats.lineItems.total });
    summarySheet.addRow({ metric: 'Unreceived', value: stats.lineItems.unreceived });
    summarySheet.addRow({ metric: 'Received in Period', value: stats.lineItems.receivedInPeriod });
    summarySheet.addRow({ metric: '', value: '' });

    summarySheet.addRow({ metric: 'PERFORMANCE', value: '' }).font = { bold: true };
    summarySheet.addRow({ metric: 'Avg Days Order to Stock', value: (stats.performance.avgDaysOrderToStock || 0).toFixed(1) });
    summarySheet.addRow({ metric: 'On-Time Delivery Rate', value: `${(stats.performance.onTimeDeliveryRate || 0).toFixed(1)}%` });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Statistics_${periodType || 'daily'}_${start.toISOString().split('T')[0]}.xlsx`;

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #4472C4; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .metric-section { margin: 20px 0; }
          .metric-section h2 { color: #4472C4; border-bottom: 2px solid #4472C4; padding-bottom: 5px; }
          .metric-row { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; }
          .metric-label { font-weight: bold; }
          .metric-value { color: #2E75B6; }
          .highlight { background: #FFF9E6; padding: 15px; border-left: 4px solid #FFB900; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Statistics Report</h1>
          <p>${periodLabel}</p>
        </div>
        <div class="content">
          <div class="metric-section">
            <h2>📦 Purchase Orders</h2>
            <div class="metric-row">
              <span class="metric-label">Total POs:</span>
              <span class="metric-value">${stats.purchaseOrders.total}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Active POs:</span>
              <span class="metric-value">${stats.purchaseOrders.active}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">New in Period:</span>
              <span class="metric-value">${stats.purchaseOrders.newInPeriod}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Updated in Period:</span>
              <span class="metric-value">${stats.purchaseOrders.updatedInPeriod}</span>
            </div>
          </div>

          <div class="metric-section">
            <h2>📋 Line Items</h2>
            <div class="metric-row">
              <span class="metric-label">Total Items:</span>
              <span class="metric-value">${stats.lineItems.total}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Unreceived:</span>
              <span class="metric-value">${stats.lineItems.unreceived}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Received in Period:</span>
              <span class="metric-value">${stats.lineItems.receivedInPeriod}</span>
            </div>
          </div>

          <div class="metric-section">
            <h2>📧 Emails</h2>
            <div class="metric-row">
              <span class="metric-label">Sent in Period:</span>
              <span class="metric-value">${stats.emails.sentInPeriod}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Unique Vendors Contacted:</span>
              <span class="metric-value">${stats.emails.uniqueVendorsContacted}</span>
            </div>
          </div>

          <div class="metric-section">
            <h2>📊 Performance</h2>
            <div class="metric-row">
              <span class="metric-label">Avg Days Order to Stock:</span>
              <span class="metric-value">${(stats.performance.avgDaysOrderToStock || 0).toFixed(1)} days</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">On-Time Delivery Rate:</span>
              <span class="metric-value">${(stats.performance.onTimeDeliveryRate || 0).toFixed(1)}%</span>
            </div>
          </div>

          <div class="highlight">
            <strong>⚠️ Attention Required:</strong><br>
            Overdue Items: ${stats.purchaseOrders.overdueItems}<br>
            Overdue Tasks: ${stats.tasks.overdueTasks}
          </div>
        </div>
        <div class="footer">
          <p>This report was automatically generated by the CSV Import System</p>
          <p>Detailed statistics are attached as an Excel file</p>
        </div>
      </body>
      </html>
    `;

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Statistics System" <statistics@csvimport.com>',
      to: recipients.join(', '),
      subject: `📊 Statistics Report - ${periodLabel}`,
      html: emailHtml,
      attachments: [
        {
          filename: filename,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    });

    console.log('✅ Statistics report emailed:', info.messageId);

    res.json({
      success: true,
      message: `Report sent to ${recipients.length} recipient(s)`,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error emailing statistics report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trend data for charts (last N periods)
router.get('/trends/:periodType/:count', async (req, res) => {
  try {
    const { periodType, count } = req.params;
    const limit = parseInt(count) || 30;

    const stats = await DailyStatistics.find({ periodType })
      .sort({ periodStart: -1 })
      .limit(limit);

    // Reverse to get chronological order
    const trendData = stats.reverse().map(stat => ({
      period: getPeriodLabel(stat.periodType, stat.periodStart, stat.periodEnd),
      date: stat.periodStart,
      newPOs: stat.purchaseOrders.newInPeriod,
      updatedPOs: stat.purchaseOrders.updatedInPeriod,
      receivedItems: stat.lineItems.receivedInPeriod,
      emailsSent: stat.emails.sentInPeriod,
      avgDaysToStock: stat.performance.avgDaysOrderToStock || 0,
      onTimeDelivery: stat.performance.onTimeDeliveryRate || 0,
      tasksCreated: stat.tasks.tasksCreatedInPeriod,
      tasksCompleted: stat.tasks.tasksCompletedInPeriod
    }));

    res.json({
      success: true,
      periodType,
      count: trendData.length,
      data: trendData
    });

  } catch (error) {
    console.error('❌ Error fetching trend data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Compare two specific periods
router.post('/compare', async (req, res) => {
  try {
    const { period1Type, period1Date, period2Type, period2Date } = req.body;

    const bounds1 = getPeriodBounds(period1Type, new Date(period1Date));
    const bounds2 = getPeriodBounds(period2Type, new Date(period2Date));

    const [stats1, stats2] = await Promise.all([
      DailyStatistics.findOne({
        periodType: period1Type,
        periodStart: bounds1.start,
        periodEnd: bounds1.end
      }),
      DailyStatistics.findOne({
        periodType: period2Type,
        periodStart: bounds2.start,
        periodEnd: bounds2.end
      })
    ]);

    if (!stats1 || !stats2) {
      return res.status(404).json({
        success: false,
        message: 'Statistics not found for one or both periods'
      });
    }

    // Calculate differences and percentages
    const comparison = {
      period1: {
        label: getPeriodLabel(period1Type, bounds1.start, bounds1.end),
        stats: stats1
      },
      period2: {
        label: getPeriodLabel(period2Type, bounds2.start, bounds2.end),
        stats: stats2
      },
      differences: {
        newPOs: {
          value: stats2.purchaseOrders.newInPeriod - stats1.purchaseOrders.newInPeriod,
          percent: calculatePercentChange(stats1.purchaseOrders.newInPeriod, stats2.purchaseOrders.newInPeriod)
        },
        updatedPOs: {
          value: stats2.purchaseOrders.updatedInPeriod - stats1.purchaseOrders.updatedInPeriod,
          percent: calculatePercentChange(stats1.purchaseOrders.updatedInPeriod, stats2.purchaseOrders.updatedInPeriod)
        },
        receivedItems: {
          value: stats2.lineItems.receivedInPeriod - stats1.lineItems.receivedInPeriod,
          percent: calculatePercentChange(stats1.lineItems.receivedInPeriod, stats2.lineItems.receivedInPeriod)
        },
        emailsSent: {
          value: stats2.emails.sentInPeriod - stats1.emails.sentInPeriod,
          percent: calculatePercentChange(stats1.emails.sentInPeriod, stats2.emails.sentInPeriod)
        },
        avgDaysToStock: {
          value: (stats2.performance.avgDaysOrderToStock || 0) - (stats1.performance.avgDaysOrderToStock || 0),
          percent: calculatePercentChange(stats1.performance.avgDaysOrderToStock || 0, stats2.performance.avgDaysOrderToStock || 0)
        },
        onTimeDelivery: {
          value: (stats2.performance.onTimeDeliveryRate || 0) - (stats1.performance.onTimeDeliveryRate || 0),
          percent: calculatePercentChange(stats1.performance.onTimeDeliveryRate || 0, stats2.performance.onTimeDeliveryRate || 0)
        }
      }
    };

    res.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('❌ Error comparing periods:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to calculate percent change
function calculatePercentChange(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return Math.round(((newValue - oldValue) / oldValue) * 100);
}

// Period-over-period comparison (this period vs previous period)
router.get('/period-over-period/:periodType', async (req, res) => {
  try {
    const { periodType } = req.params;
    const referenceDate = req.query.date ? new Date(req.query.date) : new Date();

    // Get current period
    const currentBounds = getPeriodBounds(periodType, referenceDate);
    
    // Calculate previous period
    let previousDate = new Date(referenceDate);
    switch (periodType) {
      case 'daily':
        previousDate.setDate(previousDate.getDate() - 1);
        break;
      case 'weekly':
        previousDate.setDate(previousDate.getDate() - 7);
        break;
      case 'bi-weekly':
        previousDate.setDate(previousDate.getDate() - 14);
        break;
      case 'monthly':
        previousDate.setMonth(previousDate.getMonth() - 1);
        break;
      case 'quarterly':
        previousDate.setMonth(previousDate.getMonth() - 3);
        break;
      case 'yearly':
        previousDate.setFullYear(previousDate.getFullYear() - 1);
        break;
    }
    
    const previousBounds = getPeriodBounds(periodType, previousDate);

    const [currentStats, previousStats] = await Promise.all([
      DailyStatistics.findOne({
        periodType,
        periodStart: currentBounds.start,
        periodEnd: currentBounds.end
      }),
      DailyStatistics.findOne({
        periodType,
        periodStart: previousBounds.start,
        periodEnd: previousBounds.end
      })
    ]);

    if (!currentStats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for current period'
      });
    }

    const comparison = {
      current: {
        label: getPeriodLabel(periodType, currentBounds.start, currentBounds.end),
        stats: currentStats
      },
      previous: previousStats ? {
        label: getPeriodLabel(periodType, previousBounds.start, previousBounds.end),
        stats: previousStats
      } : null,
      changes: previousStats ? calculateChanges(previousStats, currentStats) : null
    };

    res.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('❌ Error in period-over-period comparison:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to calculate all changes between two periods
function calculateChanges(oldStats, newStats) {
  return {
    purchaseOrders: {
      newInPeriod: {
        value: newStats.purchaseOrders.newInPeriod - oldStats.purchaseOrders.newInPeriod,
        percent: calculatePercentChange(oldStats.purchaseOrders.newInPeriod, newStats.purchaseOrders.newInPeriod),
        trend: getTrend(oldStats.purchaseOrders.newInPeriod, newStats.purchaseOrders.newInPeriod)
      },
      updatedInPeriod: {
        value: newStats.purchaseOrders.updatedInPeriod - oldStats.purchaseOrders.updatedInPeriod,
        percent: calculatePercentChange(oldStats.purchaseOrders.updatedInPeriod, newStats.purchaseOrders.updatedInPeriod),
        trend: getTrend(oldStats.purchaseOrders.updatedInPeriod, newStats.purchaseOrders.updatedInPeriod)
      }
    },
    lineItems: {
      receivedInPeriod: {
        value: newStats.lineItems.receivedInPeriod - oldStats.lineItems.receivedInPeriod,
        percent: calculatePercentChange(oldStats.lineItems.receivedInPeriod, newStats.lineItems.receivedInPeriod),
        trend: getTrend(oldStats.lineItems.receivedInPeriod, newStats.lineItems.receivedInPeriod)
      }
    },
    emails: {
      sentInPeriod: {
        value: newStats.emails.sentInPeriod - oldStats.emails.sentInPeriod,
        percent: calculatePercentChange(oldStats.emails.sentInPeriod, newStats.emails.sentInPeriod),
        trend: getTrend(oldStats.emails.sentInPeriod, newStats.emails.sentInPeriod)
      }
    },
    performance: {
      avgDaysOrderToStock: {
        value: (newStats.performance.avgDaysOrderToStock || 0) - (oldStats.performance.avgDaysOrderToStock || 0),
        percent: calculatePercentChange(oldStats.performance.avgDaysOrderToStock || 0, newStats.performance.avgDaysOrderToStock || 0),
        trend: getTrend(oldStats.performance.avgDaysOrderToStock || 0, newStats.performance.avgDaysOrderToStock || 0, true) // Lower is better
      },
      onTimeDeliveryRate: {
        value: (newStats.performance.onTimeDeliveryRate || 0) - (oldStats.performance.onTimeDeliveryRate || 0),
        percent: calculatePercentChange(oldStats.performance.onTimeDeliveryRate || 0, newStats.performance.onTimeDeliveryRate || 0),
        trend: getTrend(oldStats.performance.onTimeDeliveryRate || 0, newStats.performance.onTimeDeliveryRate || 0)
      }
    },
    tasks: {
      tasksCreatedInPeriod: {
        value: newStats.tasks.tasksCreatedInPeriod - oldStats.tasks.tasksCreatedInPeriod,
        percent: calculatePercentChange(oldStats.tasks.tasksCreatedInPeriod, newStats.tasks.tasksCreatedInPeriod),
        trend: getTrend(oldStats.tasks.tasksCreatedInPeriod, newStats.tasks.tasksCreatedInPeriod)
      },
      tasksCompletedInPeriod: {
        value: newStats.tasks.tasksCompletedInPeriod - oldStats.tasks.tasksCompletedInPeriod,
        percent: calculatePercentChange(oldStats.tasks.tasksCompletedInPeriod, newStats.tasks.tasksCompletedInPeriod),
        trend: getTrend(oldStats.tasks.tasksCompletedInPeriod, newStats.tasks.tasksCompletedInPeriod)
      }
    }
  };
}

// Helper function to determine trend direction
function getTrend(oldValue, newValue, lowerIsBetter = false) {
  if (newValue > oldValue) return lowerIsBetter ? 'down' : 'up';
  if (newValue < oldValue) return lowerIsBetter ? 'up' : 'down';
  return 'stable';
}

// ========== DETAILED LIST ENDPOINTS ==========

// Get vendors with open POs
router.get('/vendors/open-pos', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      vendors: stats.vendors.vendorsWithOpenPOsList || [],
      summary: {
        totalVendors: stats.vendors.vendorsWithOpenPOsList?.length || 0,
        totalOpenPOs: stats.vendors.vendorsWithOpenPOsList?.reduce((sum, v) => sum + v.openPOCount, 0) || 0,
        totalValue: stats.vendors.vendorsWithOpenPOsList?.reduce((sum, v) => sum + v.totalOpenValue, 0) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching vendors with open POs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get vendors with completed POs
router.get('/vendors/completed-pos', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      vendors: stats.vendors.vendorsWithCompletedPOsList || [],
      summary: {
        totalVendors: stats.vendors.vendorsWithCompletedPOsList?.length || 0,
        totalCompletedPOs: stats.vendors.vendorsWithCompletedPOsList?.reduce((sum, v) => sum + v.completedPOCount, 0) || 0,
        totalValue: stats.vendors.vendorsWithCompletedPOsList?.reduce((sum, v) => sum + v.totalCompletedValue, 0) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching vendors with completed POs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get new POs created in period
router.get('/pos/new', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      pos: stats.purchaseOrders.newPOsInPeriod || [],
      summary: {
        totalPOs: stats.purchaseOrders.newPOsInPeriod?.length || 0,
        totalValue: stats.purchaseOrders.newPOsInPeriod?.reduce((sum, po) => sum + po.totalValue, 0) || 0,
        totalItems: stats.purchaseOrders.newPOsInPeriod?.reduce((sum, po) => sum + po.itemCount, 0) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching new POs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get completed POs in period
router.get('/pos/completed', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      pos: stats.purchaseOrders.completedPOsInPeriod || [],
      summary: {
        totalPOs: stats.purchaseOrders.completedPOsInPeriod?.length || 0,
        totalValue: stats.purchaseOrders.completedPOsInPeriod?.reduce((sum, po) => sum + po.totalValue, 0) || 0,
        avgDaysToComplete: stats.purchaseOrders.completedPOsInPeriod?.length > 0
          ? stats.purchaseOrders.completedPOsInPeriod.reduce((sum, po) => sum + po.daysToComplete, 0) / stats.purchaseOrders.completedPOsInPeriod.length
          : 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching completed POs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get items received in period
router.get('/items/received', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      items: stats.lineItems.itemsReceivedInPeriod || [],
      summary: {
        totalItems: stats.lineItems.itemsReceivedInPeriod?.length || 0,
        totalQuantity: stats.lineItems.itemsReceivedInPeriod?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        avgDaysToReceive: stats.lineItems.averageDaysToReceive || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching received items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get overdue items
router.get('/items/overdue', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      items: stats.lineItems.overdueItemsList || [],
      summary: {
        totalOverdue: stats.lineItems.overdueItemsList?.length || 0,
        avgDaysOverdue: stats.lineItems.overdueItemsList?.length > 0
          ? stats.lineItems.overdueItemsList.reduce((sum, item) => sum + item.daysOverdue, 0) / stats.lineItems.overdueItemsList.length
          : 0,
        byUrgency: {
          high: stats.lineItems.overdueItemsList?.filter(i => i.urgency === 'High').length || 0,
          medium: stats.lineItems.overdueItemsList?.filter(i => i.urgency === 'Medium').length || 0,
          low: stats.lineItems.overdueItemsList?.filter(i => i.urgency === 'Low').length || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching overdue items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top items by quantity
router.get('/items/top-by-quantity', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      items: stats.lineItems.topItemsByQuantity || []
    });
  } catch (error) {
    console.error('❌ Error fetching top items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== EAD (ESTIMATED ARRIVAL DATE) ENDPOINTS ==========

// Get items by EAD
router.get('/ead/items', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      items: stats.ead?.items?.itemsByEAD || [],
      summary: {
        withEAD: stats.ead?.items?.withEAD || 0,
        withoutEAD: stats.ead?.items?.withoutEAD || 0,
        arrivingThisWeek: stats.ead?.items?.arrivingThisWeek || 0,
        arrivingThisMonth: stats.ead?.items?.arrivingThisMonth || 0,
        arrivingThisQuarter: stats.ead?.items?.arrivingThisQuarter || 0,
        pastDue: stats.ead?.items?.pastDue || 0,
        byMonth: stats.ead?.items?.byMonth || []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching EAD items:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get POs by ETA
router.get('/ead/pos', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      pos: stats.ead?.pos?.posByETA || [],
      summary: {
        withETA: stats.ead?.pos?.withETA || 0,
        withoutETA: stats.ead?.pos?.withoutETA || 0,
        arrivingThisWeek: stats.ead?.pos?.arrivingThisWeek || 0,
        arrivingThisMonth: stats.ead?.pos?.arrivingThisMonth || 0,
        pastDue: stats.ead?.pos?.pastDue || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching EAD POs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get vendor EAD performance
router.get('/ead/vendors', async (req, res) => {
  try {
    const periodType = req.query.periodType || 'daily';
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getPeriodBounds(periodType, targetDate);

    const stats = await DailyStatistics.findOne(
      buildFlexibleDateQuery(periodType, start, end)
    ).sort({ periodStart: -1 });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No statistics found for this period'
      });
    }

    res.json({
      success: true,
      vendors: stats.ead?.vendors?.vendorPerformance || [],
      summary: {
        withPendingDeliveries: stats.ead?.vendors?.withPendingDeliveries || 0,
        onTimeRate: stats.ead?.vendors?.onTimeRate || 0,
        averageDaysEarly: stats.ead?.vendors?.averageDaysEarly || 0,
        averageDaysLate: stats.ead?.vendors?.averageDaysLate || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching EAD vendor performance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Diagnostic endpoint to check what statistics exist
router.get('/debug/list-all', async (req, res) => {
  try {
    const allStats = await DailyStatistics.find()
      .select('periodType periodStart periodEnd generatedAt purchaseOrders.total lineItems.total')
      .sort({ periodStart: -1 })
      .limit(50);
    
    console.log(`📊 Found ${allStats.length} statistics records in database`);
    
    res.json({
      success: true,
      count: allStats.length,
      stats: allStats.map(s => ({
        id: s._id,
        periodType: s.periodType,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        generatedAt: s.generatedAt,
        totalPOs: s.purchaseOrders?.total || 0,
        totalItems: s.lineItems?.total || 0
      }))
    });
  } catch (error) {
    console.error('❌ Error listing statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

