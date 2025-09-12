// models/MealPlan.js
const mongoose = require('mongoose');

// Individual meal schema
const mealSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    required: true
  },
  recipe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  },
  customMeal: {
    type: String,
    default: '' // For quick meals without full recipes
  },
  servings: {
    type: Number,
    default: 1,
    min: 1
  },
  notes: {
    type: String,
    default: ''
  },
  isLeftover: {
    type: Boolean,
    default: false
  },
  isPrepared: {
    type: Boolean,
    default: false
  }
});

// Daily meal plan schema
const dailyMealPlanSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  meals: [mealSchema],
  notes: {
    type: String,
    default: ''
  },
  totalCalories: {
    type: Number,
    default: 0
  }
});

// Weekly/Monthly meal plan schema
const mealPlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  planType: {
    type: String,
    enum: ['Weekly', 'Monthly', 'Custom'],
    default: 'Weekly'
  },
  dailyPlans: [dailyMealPlanSchema],
  shoppingList: [{
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem'
    },
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    isPurchased: {
      type: Boolean,
      default: false
    },
    estimatedCost: {
      type: Number,
      default: 0
    }
  }],
  totalEstimatedCost: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Planning', 'Active', 'Completed', 'Archived'],
    default: 'Planning'
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Update the updatedAt field and calculate totals before saving
mealPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total estimated cost
  this.totalEstimatedCost = this.shoppingList.reduce((total, item) => {
    return total + (item.estimatedCost || 0);
  }, 0);
  
  next();
});

// Create indexes
mealPlanSchema.index({ startDate: 1, endDate: 1 });
mealPlanSchema.index({ createdBy: 1 });
mealPlanSchema.index({ status: 1 });
mealPlanSchema.index({ isTemplate: 1 });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
