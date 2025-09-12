// models/ShoppingList.js
const mongoose = require('mongoose');

// Shopping list item schema
const shoppingItemSchema = new mongoose.Schema({
  foodItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['piece', 'lb', 'oz', 'kg', 'g', 'cup', 'tsp', 'tbsp', 'ml', 'l', 'can', 'package', 'box'],
    required: true
  },
  estimatedPrice: {
    type: Number,
    default: 0
  },
  actualPrice: {
    type: Number,
    default: 0
  },
  store: {
    type: String,
    default: ''
  },
  aisle: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  isPurchased: {
    type: Boolean,
    default: false
  },
  purchasedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  fromMealPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MealPlan',
    default: null
  },
  fromRecipe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    default: null
  }
});

// Main shopping list schema
const shoppingListSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  items: [shoppingItemSchema],
  totalEstimatedCost: {
    type: Number,
    default: 0
  },
  totalActualCost: {
    type: Number,
    default: 0
  },
  targetStore: {
    type: String,
    default: ''
  },
  shoppingDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Planning', 'Ready', 'Shopping', 'Completed', 'Archived'],
    default: 'Planning'
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  completedItems: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  },
  completionPercentage: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Calculate totals and completion before saving
shoppingListSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate totals
  this.totalEstimatedCost = this.items.reduce((total, item) => {
    return total + (item.estimatedPrice || 0);
  }, 0);
  
  this.totalActualCost = this.items.reduce((total, item) => {
    return total + (item.actualPrice || 0);
  }, 0);
  
  // Calculate completion stats
  this.totalItems = this.items.length;
  this.completedItems = this.items.filter(item => item.isPurchased).length;
  this.completionPercentage = this.totalItems > 0 ? 
    Math.round((this.completedItems / this.totalItems) * 100) : 0;
  
  // Set completed date if all items are purchased
  if (this.completionPercentage === 100 && !this.completedAt) {
    this.completedAt = Date.now();
    this.status = 'Completed';
  }
  
  next();
});

// Create indexes
shoppingListSchema.index({ createdBy: 1 });
shoppingListSchema.index({ status: 1 });
shoppingListSchema.index({ shoppingDate: 1 });
shoppingListSchema.index({ isTemplate: 1 });
shoppingListSchema.index({ tags: 1 });

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
