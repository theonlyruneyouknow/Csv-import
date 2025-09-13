const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    chainName: String, // e.g., "CVS", "Walgreens", "Independent"
    
    // Contact Information
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: 'USA'
        }
    },
    
    contact: {
        phoneNumber: {
            type: String,
            required: true
        },
        faxNumber: String,
        email: String,
        website: String
    },
    
    // Operating Hours
    hours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String }
    },
    
    // Services
    services: [{
        type: String,
        enum: ['drive-thru', 'delivery', 'mail-order', 'compounding', 'immunizations', 'consultation', '24-hour', 'auto-refill']
    }],
    
    // Insurance and Payment
    acceptedInsurance: [String],
    paymentMethods: [String],
    
    // User-specific information
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Preferences
    isPrimary: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Additional Information
    notes: String,
    pharmacistName: String,
    
    // Ratings and Reviews (user's personal rating)
    rating: {
        overall: {
            type: Number,
            min: 1,
            max: 5
        },
        service: {
            type: Number,
            min: 1,
            max: 5
        },
        speed: {
            type: Number,
            min: 1,
            max: 5
        },
        convenience: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    
    // Statistics
    totalPrescriptions: {
        type: Number,
        default: 0
    },
    lastUsed: Date
}, {
    timestamps: true
});

// Virtual for full address
pharmacySchema.virtual('fullAddress').get(function() {
    if (!this.address.street) return '';
    
    const parts = [
        this.address.street,
        this.address.city,
        this.address.state,
        this.address.zipCode
    ].filter(Boolean);
    
    return parts.join(', ');
});

// Virtual for formatted phone
pharmacySchema.virtual('formattedPhone').get(function() {
    if (!this.contact.phoneNumber) return '';
    
    const phone = this.contact.phoneNumber.replace(/\D/g, '');
    if (phone.length === 10) {
        return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return this.contact.phoneNumber;
});

// Method to check if pharmacy is open now
pharmacySchema.methods.isOpenNow = function() {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];
    
    const todayHours = this.hours[today];
    if (!todayHours || !todayHours.open || !todayHours.close) return false;
    
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const openTime = parseInt(todayHours.open.replace(':', ''));
    const closeTime = parseInt(todayHours.close.replace(':', ''));
    
    return currentTime >= openTime && currentTime <= closeTime;
};

// Method to get next opening time
pharmacySchema.methods.getNextOpening = function() {
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        const dayName = dayNames[checkDate.getDay()];
        
        const dayHours = this.hours[dayName];
        if (dayHours && dayHours.open) {
            if (i === 0) {
                // Check if still open today
                const currentTime = now.getHours() * 100 + now.getMinutes();
                const openTime = parseInt(dayHours.open.replace(':', ''));
                const closeTime = parseInt(dayHours.close.replace(':', ''));
                
                if (currentTime < openTime) {
                    return { day: dayName, time: dayHours.open, date: checkDate };
                } else if (currentTime <= closeTime) {
                    return { status: 'open-now' };
                }
            } else {
                return { day: dayName, time: dayHours.open, date: checkDate };
            }
        }
    }
    
    return { status: 'closed' };
};

// Indexes
pharmacySchema.index({ user: 1, isPrimary: 1 });
pharmacySchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
