// models/FoodItem.js
const mongoose = require('mongoose');

// Base food item schema - used in shopping and pantry
const foodItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Produce', 'Dairy', 'Meat', 'Seafood', 'Pantry', 'Frozen', 
      'Bakery', 'Beverages', 'Snacks', 'Condiments', 'Spices', 'Other'
    ],
    default: 'Other'
  },
  brand: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    enum: ['piece', 'lb', 'oz', 'kg', 'g', 'cup', 'tsp', 'tbsp', 'ml', 'l', 'can', 'package', 'box'],
    default: 'piece'
  },
  // Shopping specific fields
  price: {
    type: Number,
    default: 0
  },
  store: {
    type: String,
    default: ''
  },
  // Pantry specific fields
  quantity: {
    type: Number,
    default: 0
  },
  expirationDate: {
    type: Date,
    default: null
  },
  location: {
    type: String,
    enum: ['Pantry', 'Refrigerator', 'Freezer', 'Counter'],
    default: 'Pantry'
  },
  // Common fields
  notes: {
    type: String,
    default: ''
  },
  isOrganic: {
    type: Boolean,
    default: false
  },
  // Tracking fields
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
    ref: 'User'
  }
});

// Update the updatedAt field before saving
foodItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FoodItem', foodItemSchema);
