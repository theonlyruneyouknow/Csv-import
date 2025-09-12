// models/Recipe.js
const mongoose = require('mongoose');

// Ingredient schema for recipes
const ingredientSchema = new mongoose.Schema({
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
  preparation: {
    type: String,
    default: '', // e.g., "diced", "sliced", "chopped"
  },
  optional: {
    type: Boolean,
    default: false
  }
});

// Recipe schema
const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: [
      'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 
      'Appetizer', 'Side Dish', 'Beverage', 'Sauce', 'Other'
    ],
    default: 'Other'
  },
  cuisine: {
    type: String,
    default: '' // e.g., "Italian", "Mexican", "Asian"
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  servings: {
    type: Number,
    default: 4,
    min: 1
  },
  prepTime: {
    type: Number, // in minutes
    default: 0
  },
  cookTime: {
    type: Number, // in minutes
    default: 0
  },
  totalTime: {
    type: Number, // automatically calculated
    default: 0
  },
  ingredients: [ingredientSchema],
  instructions: [{
    step: {
      type: Number,
      required: true
    },
    instruction: {
      type: String,
      required: true
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  nutritionInfo: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 }, // grams
    carbs: { type: Number, default: 0 }, // grams
    fat: { type: Number, default: 0 }, // grams
    fiber: { type: Number, default: 0 }, // grams
    sugar: { type: Number, default: 0 } // grams
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    default: '' // website, cookbook, etc.
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isFavorite: {
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

// Calculate total time before saving
recipeSchema.pre('save', function(next) {
  this.totalTime = this.prepTime + this.cookTime;
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better search performance
recipeSchema.index({ title: 'text', description: 'text', tags: 'text' });
recipeSchema.index({ category: 1 });
recipeSchema.index({ createdBy: 1 });
recipeSchema.index({ isFavorite: 1 });

module.exports = mongoose.model('Recipe', recipeSchema);
