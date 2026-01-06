// models/DailyStatistics.js
const mongoose = require('mongoose');

const dailyStatisticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  periodType: {
    type: String,
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'daily',
    required: true,
    index: true
  },
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  periodEnd: {
    type: Date,
    required: true,
    index: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Purchase Order Statistics
  purchaseOrders: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    newInPeriod: { type: Number, default: 0 },
    updatedInPeriod: { type: Number, default: 0 },
    byType: {
      seed: { type: Number, default: 0 },
      hardgood: { type: Number, default: 0 },
      greengood: { type: Number, default: 0 },
      supplies: { type: Number, default: 0 },
      dropship: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    byStatus: [{
      status: String,
      count: Number
    }],
    averageValue: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    // Detailed PO lists
    newPOsInPeriod: [{
      poNumber: String,
      vendor: String,
      type: String,
      createdDate: Date,
      itemCount: Number,
      totalValue: Number
    }],
    completedPOsInPeriod: [{
      poNumber: String,
      vendor: String,
      type: String,
      completedDate: Date,
      itemCount: Number,
      totalValue: Number,
      daysToComplete: Number
    }]
  },

  // Line Item Statistics
  lineItems: {
    total: { type: Number, default: 0 },
    unreceived: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    receivedInPeriod: { type: Number, default: 0 },
    partiallyReceived: { type: Number, default: 0 },
    overdueItems: { type: Number, default: 0 },
    noEtaItems: { type: Number, default: 0 },
    byUrgency: {
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      none: { type: Number, default: 0 }
    },
    averageDaysToReceive: { type: Number, default: 0 },
    medianDaysToReceive: { type: Number, default: 0 },
    fastestDelivery: { type: Number, default: 0 },
    slowestDelivery: { type: Number, default: 0 },
    // Detailed item lists
    topItemsByQuantity: [{
      itemName: String,
      poNumber: String,
      vendor: String,
      quantity: Number,
      received: Boolean,
      status: String
    }],
    itemsReceivedInPeriod: [{
      itemName: String,
      poNumber: String,
      vendor: String,
      quantity: Number,
      receivedDate: Date,
      daysToReceive: Number
    }],
    overdueItemsList: [{
      itemName: String,
      poNumber: String,
      vendor: String,
      eta: Date,
      daysOverdue: Number,
      urgency: String
    }],
    highValueItems: [{
      itemName: String,
      poNumber: String,
      vendor: String,
      quantity: Number,
      estimatedValue: Number,
      status: String
    }]
  },

  // Email Activity Statistics
  emails: {
    sentInPeriod: { type: Number, default: 0 },
    uniqueVendorsContacted: { type: Number, default: 0 },
    totalSentAllTime: { type: Number, default: 0 },
    byTemplate: [{
      templateName: String,
      count: Number
    }],
    topVendorsContacted: [{
      vendor: String,
      count: Number
    }]
  },

  // Vendor Statistics
  vendors: {
    total: { type: Number, default: 0 },
    activeVendors: { type: Number, default: 0 },
    vendorsWithOpenPOs: { type: Number, default: 0 },
    newVendors: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    topVendorsByVolume: [{
      vendor: String,
      poCount: Number,
      totalValue: Number
    }],
    // Detailed vendor lists
    vendorsWithOpenPOsList: [{
      vendorName: String,
      openPOCount: Number,
      openPONumbers: [String],
      totalOpenValue: Number,
      oldestPODate: Date,
      unreceiveItems: Number
    }],
    vendorsWithCompletedPOsList: [{
      vendorName: String,
      completedPOCount: Number,
      completedPONumbers: [String],
      totalCompletedValue: Number,
      completedInPeriod: Number,
      lastCompletionDate: Date
    }],
    vendorsCreatedInPeriod: [{
      vendorName: String,
      createdDate: Date,
      poCount: Number
    }]
  },

  // EAD (Estimated Arrival Date) Statistics
  ead: {
    // Item-level EAD statistics
    items: {
      withEAD: { type: Number, default: 0 },
      withoutEAD: { type: Number, default: 0 },
      arrivingThisWeek: { type: Number, default: 0 },
      arrivingThisMonth: { type: Number, default: 0 },
      arrivingThisQuarter: { type: Number, default: 0 },
      pastDue: { type: Number, default: 0 },
      byMonth: [{
        month: String, // "2026-01", "2026-02", etc.
        count: Number,
        totalQuantity: Number
      }],
      // Detailed lists
      itemsByEAD: [{
        itemName: String,
        poNumber: String,
        vendor: String,
        ead: String,
        eta: Date,
        quantity: Number,
        status: String,
        daysUntilArrival: Number
      }]
    },
    // PO-level EAD statistics
    pos: {
      withETA: { type: Number, default: 0 },
      withoutETA: { type: Number, default: 0 },
      arrivingThisWeek: { type: Number, default: 0 },
      arrivingThisMonth: { type: Number, default: 0 },
      pastDue: { type: Number, default: 0 },
      // Detailed lists
      posByETA: [{
        poNumber: String,
        vendor: String,
        eta: Date,
        itemCount: Number,
        status: String,
        daysUntilArrival: Number
      }]
    },
    // Vendor-level EAD statistics
    vendors: {
      withPendingDeliveries: { type: Number, default: 0 },
      onTimeRate: { type: Number, default: 0 },
      averageDaysEarly: { type: Number, default: 0 },
      averageDaysLate: { type: Number, default: 0 },
      // Detailed lists
      vendorPerformance: [{
        vendorName: String,
        pendingItems: Number,
        overdueItems: Number,
        avgDeliveryAccuracy: Number, // percentage
        earliestETA: Date,
        latestETA: Date
      }]
    }
  },

  // Tracking & Shipment Statistics
  tracking: {
    itemsInTransit: { type: Number, default: 0 },
    itemsDelivered: { type: Number, default: 0 },
    itemsDeliveredInPeriod: { type: Number, default: 0 },
    averageTransitTime: { type: Number, default: 0 },
    byCarrier: [{
      carrier: String,
      count: Number,
      averageTransitTime: Number
    }],
    trackingIssues: { type: Number, default: 0 }
  },

  // User Activity Statistics
  userActivity: {
    totalUpdates: { type: Number, default: 0 },
    notesAdded: { type: Number, default: 0 },
    statusChanges: { type: Number, default: 0 },
    etaUpdates: { type: Number, default: 0 },
    receivingActivities: { type: Number, default: 0 },
    byUser: [{
      username: String,
      updates: Number,
      notesAdded: Number,
      itemsReceived: Number
    }]
  },

  // Performance Metrics
  performance: {
    onTimeDeliveryRate: { type: Number, default: 0 },
    avgDaysFromOrderToStock: { type: Number, default: 0 },
    avgDaysFromOrderToShip: { type: Number, default: 0 },
    avgDaysFromShipToReceive: { type: Number, default: 0 },
    itemsArrivingNext7Days: { type: Number, default: 0 },
    itemsArrivingNext30Days: { type: Number, default: 0 },
    itemsOverdueByDays: [{
      range: String, // "1-7", "8-14", "15-30", "30+"
      count: Number
    }]
  },

  // Task & Notes Statistics
  tasks: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    pendingTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    tasksCreatedInPeriod: { type: Number, default: 0 },
    tasksCompletedInPeriod: { type: Number, default: 0 }
  },

  // Change Log Summary
  changes: {
    totalChanges: { type: Number, default: 0 },
    byType: [{
      changeType: String, // "status", "eta", "received", "notes", "tracking"
      count: Number
    }],
    mostActivePos: [{
      poNumber: String,
      changes: Number
    }]
  },

  // Issues & Alerts
  issues: {
    itemsMissingEta: { type: Number, default: 0 },
    itemsMissingTracking: { type: Number, default: 0 },
    overdueWithoutUpdate: { type: Number, default: 0 },
    partialShipmentPending: { type: Number, default: 0 },
    vendorsNotResponding: { type: Number, default: 0 }
  },

  // Snapshot Data (for trend analysis)
  snapshot: {
    totalInventoryValue: { type: Number, default: 0 },
    pendingOrderValue: { type: Number, default: 0 },
    completedOrderValue: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound index for unique period reports
dailyStatisticsSchema.index({ periodType: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

// Indexes for efficient querying
dailyStatisticsSchema.index({ date: -1 });
dailyStatisticsSchema.index({ periodType: 1 });
dailyStatisticsSchema.index({ generatedAt: -1 });

module.exports = mongoose.model('DailyStatistics', dailyStatisticsSchema);
