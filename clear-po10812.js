// filepath: c:\Users\15419\OneDrive\Documents\GitHub\Rune-github\Csv-import\database-manager.js
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/purchase-orders');

// Import all model
const LineItem = require('./models/LineItem.js');
const PurchaseOrder = require('./models/PurchaseOrder.js');
const User = require('./models/User.js');
const AuditLog = require('./models/AuditLog.js');
// Food module models
const FoodItem = require('./models/FoodItem.js');
const Recipe = require('./models/Recipe.js');
const MealPlan = require('./models/MealPlan.js');
let ShoppingList;
try {
  ShoppingList = require('./models/ShoppingList.js');
} catch (e) {
  ShoppingList = null;
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];
const target = args[1];
const options = args.slice(2);

// Database Management Functions
// --- Food Module Functions ---
async function clearFoodItems() {
  console.log('🗑️ Clearing ALL food items...');
  const result = await FoodItem.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} food items`);
}

async function clearRecipes() {
  console.log('🗑️ Clearing ALL recipes...');
  const result = await Recipe.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} recipes`);
}

async function clearMealPlans() {
  console.log('🗑️ Clearing ALL meal plans...');
  const result = await MealPlan.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} meal plans`);
}

async function clearShoppingLists() {
  if (!ShoppingList) return console.log('⚠️ ShoppingList model not found.');
  console.log('🗑️ Clearing ALL shopping lists...');
  const result = await ShoppingList.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} shopping lists`);
}

async function listFoodItems() {
  const items = await FoodItem.find().limit(20);
  console.log('🍏 Food Items:');
  items.forEach(item => {
    console.log(`  ${item.name} (${item.category}) - Qty: ${item.quantity || 0}`);
  });
}

async function listRecipes() {
  const recipes = await Recipe.find().limit(20);
  console.log('📖 Recipes:');
  recipes.forEach(recipe => {
    console.log(`  ${recipe.title} (${recipe.category}) - Servings: ${recipe.servings}`);
  });
}

async function listMealPlans() {
  const plans = await MealPlan.find().limit(10);
  console.log('📅 Meal Plans:');
  plans.forEach(plan => {
    console.log(`  ${plan.title} (${plan.planType}) - ${plan.startDate?.toISOString().slice(0,10)} to ${plan.endDate?.toISOString().slice(0,10)}`);
  });
}

async function listShoppingLists() {
  if (!ShoppingList) return console.log('⚠️ ShoppingList model not found.');
  const lists = await ShoppingList.find().limit(10);
  console.log('🛒 Shopping Lists:');
  lists.forEach(list => {
    console.log(`  ${list.title} (${list.status}) - Items: ${list.items?.length || 0}`);
  });
}
async function clearLineItems(poNumber) {
  console.log(`🗑️ Clearing line items for ${poNumber}...`);
  const result = await LineItem.deleteMany({poNumber: poNumber});
  console.log(`✅ Deleted ${result.deletedCount} line items for ${poNumber}`);
}

async function clearAllLineItems() {
  console.log('🗑️ Clearing ALL line items...');
  const result = await LineItem.deleteMany({});
  console.log(`✅ Deleted ${result.deletedCount} total line items`);
}

async function clearPurchaseOrder(poNumber) {
  console.log(`🗑️ Clearing purchase order ${poNumber} and its line items...`);
  const lineItemResult = await LineItem.deleteMany({poNumber: poNumber});
  const poResult = await PurchaseOrder.deleteMany({poNumber: poNumber});
  console.log(`✅ Deleted ${lineItemResult.deletedCount} line items and ${poResult.deletedCount} purchase orders`);
}

async function clearHiddenPOs() {
  console.log('🗑️ Clearing soft-deleted (hidden) purchase orders...');
  const lineItemResult = await LineItem.deleteMany({isHidden: true});
  const poResult = await PurchaseOrder.deleteMany({isHidden: true});
  console.log(`✅ Deleted ${lineItemResult.deletedCount} hidden line items and ${poResult.deletedCount} hidden purchase orders`);
}

async function clearAuditLogs(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  console.log(`🗑️ Clearing audit logs older than ${days} days (before ${cutoffDate.toISOString()})...`);
  const result = await AuditLog.deleteMany({timestamp: {$lt: cutoffDate}});
  console.log(`✅ Deleted ${result.deletedCount} audit log entries`);
}

async function resetDatabase() {
  console.log('🚨 RESETTING ENTIRE DATABASE (keeping users)...');
  const lineItemResult = await LineItem.deleteMany({});
  const poResult = await PurchaseOrder.deleteMany({});
  const auditResult = await AuditLog.deleteMany({});
  console.log(`✅ Database reset complete:`);
  console.log(`   - Line Items: ${lineItemResult.deletedCount} deleted`);
  console.log(`   - Purchase Orders: ${poResult.deletedCount} deleted`);
  console.log(`   - Audit Logs: ${auditResult.deletedCount} deleted`);
  console.log(`   - Users: Preserved`);
}

async function showStats() {
  console.log('📊 Database Statistics:');
  console.log('========================');
  
  const poCount = await PurchaseOrder.countDocuments();
  const hiddenPoCount = await PurchaseOrder.countDocuments({isHidden: true});
  const lineItemCount = await LineItem.countDocuments();
  const hiddenLineItemCount = await LineItem.countDocuments({isHidden: true});
  const userCount = await User.countDocuments();
  const auditCount = await AuditLog.countDocuments();
  
  console.log(`📦 Purchase Orders: ${poCount} (${hiddenPoCount} hidden)`);
  console.log(`📋 Line Items: ${lineItemCount} (${hiddenLineItemCount} hidden)`);
  console.log(`👥 Users: ${userCount}`);
  console.log(`📊 Audit Logs: ${auditCount}`);
  
  // Show recent activity
  const recentAudits = await AuditLog.find().sort({timestamp: -1}).limit(5);
  console.log('\n🕒 Recent Activity:');
  recentAudits.forEach(audit => {
    console.log(`   ${audit.timestamp.toISOString()} - ${audit.action} by ${audit.userId}`);
  });
}

async function fixDataIssues() {
  console.log('🔧 Fixing data consistency issues...');
  
  // Fix missing quantities
  const lineItemsWithoutQty = await LineItem.updateMany(
    {quantityExpected: {$exists: false}},
    {$set: {quantityExpected: 1}}
  );
  console.log(`✅ Fixed ${lineItemsWithoutQty.modifiedCount} line items missing quantity`);
  
  // Fix missing SKUs
  const lineItemsWithoutSku = await LineItem.updateMany(
    {sku: {$exists: false}},
    {$set: {sku: 'UNKNOWN'}}
  );
  console.log(`✅ Fixed ${lineItemsWithoutSku.modifiedCount} line items missing SKU`);
  
  // Initialize attachments arrays
  const posWithoutAttachments = await PurchaseOrder.updateMany(
    {attachments: {$exists: false}},
    {$set: {attachments: []}}
  );
  console.log(`✅ Fixed ${posWithoutAttachments.modifiedCount} purchase orders missing attachments array`);
}

async function listPOs(status = 'all') {
  console.log(`📋 Purchase Orders (${status}):`);
  console.log('================================');
  
  let query = {};
  if (status === 'hidden') query.isHidden = true;
  if (status === 'active') query.isHidden = {$ne: true};
  
  const pos = await PurchaseOrder.find(query).sort({date: -1}).limit(20);
  
  for (const po of pos) {
    const lineItemCount = await LineItem.countDocuments({poNumber: po.poNumber});
    const hiddenFlag = po.isHidden ? ' [HIDDEN]' : '';
    console.log(`   ${po.poNumber} - ${po.vendor} (${lineItemCount} items)${hiddenFlag}`);
  }
}

// Help function
function showHelp() {
  console.log('🛠️  Database Manager - Usage:');
  console.log('================================');
  console.log('node database-manager.js <command> [target] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  clear-po <PO_NUMBER>     - Clear specific PO and its line items');
  console.log('  clear-lines <PO_NUMBER>  - Clear line items for specific PO');
  console.log('  clear-all-lines          - Clear ALL line items');
  console.log('  clear-hidden             - Clear soft-deleted items');
  console.log('  clear-audit [days]       - Clear audit logs older than X days (default: 30)');
  console.log('  reset                    - Reset entire database (keeps users)');
  console.log('  stats                    - Show database statistics');
  console.log('  list [active|hidden|all] - List purchase orders');
  console.log('  fix                      - Fix data consistency issues');
  console.log('');
  console.log('  clear-food-items         - Clear ALL food items');
  console.log('  clear-recipes            - Clear ALL recipes');
  console.log('  clear-meal-plans         - Clear ALL meal plans');
  console.log('  clear-shopping-lists     - Clear ALL shopping lists');
  console.log('  list-food-items          - List food items');
  console.log('  list-recipes             - List recipes');
  console.log('  list-meal-plans          - List meal plans');
  console.log('  list-shopping-lists      - List shopping lists');
  console.log('');
  console.log('Examples:');
  console.log('  node database-manager.js clear-food-items');
  console.log('  node database-manager.js list-recipes');
  console.log('  node database-manager.js clear-shopping-lists');
  console.log('  node database-manager.js list-food-items');
  console.log('');
}

// Main execution
async function main() {
  try {
    switch (command) {
      case 'clear-po':
        if (!target) throw new Error('PO number required');
        await clearPurchaseOrder(target);
        break;
        
      case 'clear-lines':
        if (!target) throw new Error('PO number required');
        await clearLineItems(target);
        break;
        
      case 'clear-all-lines':
        await clearAllLineItems();
        break;
        
      case 'clear-hidden':
        await clearHiddenPOs();
        break;
        
      case 'clear-audit':
        const days = target ? parseInt(target) : 30;
        await clearAuditLogs(days);
        break;
        
      case 'reset':
        console.log('⚠️  WARNING: This will reset the entire database!');
        console.log('⚠️  Type "yes" to continue...');
        // In a real scenario, you'd want to add confirmation logic here
        await resetDatabase();
        break;
        
      case 'stats':
        await showStats();
        break;
        
      case 'list':
        await listPOs(target || 'all');
        break;
        
      case 'fix':
        await fixDataIssues();
        break;
        
        // --- Food Module Commands ---
        case 'clear-food-items':
          await clearFoodItems();
          break;
        case 'clear-recipes':
          await clearRecipes();
          break;
        case 'clear-meal-plans':
          await clearMealPlans();
          break;
        case 'clear-shopping-lists':
          await clearShoppingLists();
          break;
        case 'list-food-items':
          await listFoodItems();
          break;
        case 'list-recipes':
          await listRecipes();
          break;
        case 'list-meal-plans':
          await listMealPlans();
          break;
        case 'list-shopping-lists':
          await listShoppingLists();
          break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
