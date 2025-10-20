const fs = require('fs');

// Restore dashboard from backup
console.log('📋 Restoring dashboard.ejs from dashboard_backup.ejs...');

const backupPath = './views/dashboard_backup.ejs';
const dashboardPath = './views/dashboard.ejs';

if (!fs.existsSync(backupPath)) {
    console.log('❌ Backup file not found!');
    process.exit(1);
}

const backup = fs.readFileSync(backupPath, 'utf8');
fs.writeFileSync(dashboardPath, backup, 'utf8');

console.log('✅ Dashboard restored from backup');
console.log('📊 File size:', backup.length, 'characters');
