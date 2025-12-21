// Migration script to move localStorage favorites to MongoDB
// Run this in the browser console on the unreceived-items or waiting-for-approval pages

async function migrateLocalStorageFavorites(reportType) {
    // Get favorites from localStorage
    const storageKey = `${reportType}Favorites`;
    const favorites = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (favorites.length === 0) {
        console.log(`No favorites found in localStorage for ${reportType}`);
        return;
    }
    
    console.log(`Found ${favorites.length} favorites in localStorage for ${reportType}`);
    
    try {
        const response = await fetch('/api/report-configs/migrate-from-localstorage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reportType: reportType,
                favorites: favorites
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Migration complete!`);
            console.log(`   - ${result.results.success} favorites saved to database`);
            console.log(`   - ${result.results.skipped} favorites skipped (already exist)`);
            
            if (result.results.errors.length > 0) {
                console.log(`   - ${result.results.errors.length} errors occurred:`);
                result.results.errors.forEach(err => {
                    console.error(`     • ${err.name}: ${err.error}`);
                });
            }
            
            // Optionally clear localStorage after successful migration
            if (confirm(`Migration successful! Clear localStorage for ${reportType}?`)) {
                localStorage.removeItem(storageKey);
                console.log(`✅ localStorage cleared for ${reportType}`);
            }
        } else {
            console.error('❌ Migration failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

// Usage examples:
// For Unreceived Items page:
// migrateLocalStorageFavorites('unreceivedItems');

// For Waiting for Approval page:
// migrateLocalStorageFavorites('waitingForApproval');

console.log('Migration helper loaded. Run:');
console.log('  migrateLocalStorageFavorites("unreceivedItems")');
console.log('  or');
console.log('  migrateLocalStorageFavorites("waitingForApproval")');
