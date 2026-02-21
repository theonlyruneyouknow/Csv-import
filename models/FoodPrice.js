const mongoose = require('mongoose');

const foodPriceSchema = new mongoose.Schema({
    // References
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GroceryItem',
        required: true
    },
    
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    
    // Price Information
    price: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Unit price for comparison (calculated)
    unitPrice: {
        value: Number,
        unit: String // per oz, per lb, etc.
    },
    
    // Sale Information
    isOnSale: {
        type: Boolean,
        default: false
    },
    
    regularPrice: {
        type: Number,
        min: 0
    },
    
    saleDetails: {
        startDate: Date,
        endDate: Date,
        discount: {
            type: String, // "20% off", "Buy 1 Get 1", "$2 off", etc.
        }
    },
    
    // Price Date
    priceDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    
    // Entry method
    source: {
        type: String,
        enum: ['manual', 'auto', 'receipt', 'web-scrape', 'api'],
        default: 'manual'
    },
    
    // Verification
    verified: {
        type: Boolean,
        default: false
    },
    
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    verifiedAt: Date,
    
    // User who added this price
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Stock availability
    inStock: {
        type: Boolean,
        default: true
    },
    
    // Notes
    notes: String,
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient queries
foodPriceSchema.index({ item: 1, store: 1, priceDate: -1 });
foodPriceSchema.index({ user: 1, priceDate: -1 });
foodPriceSchema.index({ store: 1, priceDate: -1 });
foodPriceSchema.index({ isOnSale: 1, priceDate: -1 });

// Static method to get latest price for an item at a store
foodPriceSchema.statics.getLatestPrice = async function(itemId, storeId) {
    return await this.findOne({ item: itemId, store: storeId })
        .sort({ priceDate: -1 })
        .limit(1);
};

// Static method to get price history for an item at a store
foodPriceSchema.statics.getPriceHistory = async function(itemId, storeId, daysBack = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    return await this.find({
        item: itemId,
        store: storeId,
        priceDate: { $gte: startDate }
    }).sort({ priceDate: 1 });
};

// Static method to get best current price for an item across all stores
foodPriceSchema.statics.getBestPrice = async function(itemId) {
    // Get latest price from each store
    const prices = await this.aggregate([
        { $match: { item: mongoose.Types.ObjectId(itemId) } },
        { $sort: { priceDate: -1 } },
        {
            $group: {
                _id: '$store',
                latestPrice: { $first: '$$ROOT' }
            }
        },
        { $replaceRoot: { newRoot: '$latestPrice' } },
        { $sort: { price: 1 } },
        { $limit: 1 }
    ]);
    
    if (prices.length > 0) {
        return await this.findById(prices[0]._id)
            .populate('store')
            .populate('item');
    }
    return null;
};

// Pre-save hook to calculate unit price
foodPriceSchema.pre('save', async function(next) {
    if (this.isModified('price') || this.isModified('item')) {
        try {
            const GroceryItem = mongoose.model('GroceryItem');
            const item = await GroceryItem.findById(this.item);
            
            if (item && item.size && item.size.value) {
                this.unitPrice = {
                    value: (this.price / item.size.value).toFixed(4),
                    unit: `per ${item.size.unit}`
                };
            }
        } catch (error) {
            console.error('Error calculating unit price:', error);
        }
    }
    next();
});

module.exports = mongoose.model('FoodPrice', foodPriceSchema);
