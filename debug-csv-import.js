// CSV Import Simulation and Debugging for PO11322
require('dotenv').config();
const mongoose = require('mongoose');
const PurchaseOrder = require('./models/PurchaseOrder');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

async function debugCSVImport() {
  try {
    console.log('🔬 CSV IMPORT DEBUG: Simulating PO11322 Detection');
    console.log('=' + '='.repeat(60));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if there are any recent CSV files in uploads directory
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ No uploads directory found');
      return;
    }

    const files = fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => ({
        name: file,
        path: path.join(uploadsDir, file),
        stats: fs.statSync(path.join(uploadsDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime); // Sort by most recent

    if (files.length === 0) {
      console.log('❌ No CSV files found in uploads directory');
      console.log('\n🎯 MANUAL CSV ANALYSIS NEEDED:');
      console.log('Please provide a sample CSV file or paste CSV content for analysis');
      return;
    }

    console.log(`📂 Found ${files.length} CSV files:`);
    files.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.name} (${file.stats.mtime.toLocaleDateString()})`);
    });

    // Use the most recent CSV file for analysis
    const testFile = files[0];
    console.log(`\n🔍 Analyzing most recent: ${testFile.name}`);
    console.log('-'.repeat(50));

    const fileContent = fs.readFileSync(testFile.path, 'utf8');
    const parsed = Papa.parse(fileContent, { header: false });

    console.log(`📋 CSV Structure Analysis:`);
    console.log(`   Total rows: ${parsed.data.length}`);
    
    // Show first 15 rows to understand structure
    console.log('\n📋 CSV Content (first 15 rows):');
    parsed.data.slice(0, 15).forEach((row, i) => {
      const rowData = row.slice(0, 8).map(cell => `"${(cell || '').toString().substring(0, 20)}"`).join(' | ');
      console.log(`   Row ${String(i).padStart(2)}: ${rowData}`);
    });

    // Try to find PO11322 in the entire CSV
    console.log('\n🔍 SEARCHING FOR PO11322 IN ENTIRE CSV:');
    console.log('-'.repeat(50));
    
    let foundAtRows = [];
    parsed.data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell && cell.toString().includes('11322')) {
          foundAtRows.push({ rowIndex, colIndex, cell, row: row.slice(0, 8) });
        }
      });
    });

    if (foundAtRows.length > 0) {
      console.log(`✅ Found "11322" at ${foundAtRows.length} location(s):`);
      foundAtRows.forEach(location => {
        console.log(`   Row ${location.rowIndex}, Col ${location.colIndex}: "${location.cell}"`);
        console.log(`   Full row: ${location.row.map(c => `"${c}"`).join(' | ')}`);
      });
    } else {
      console.log('❌ PO11322 NOT FOUND anywhere in the CSV!');
      console.log('   This explains why it\'s not being resurrected.');
    }

    // Simulate the current import logic
    console.log('\n🔍 SIMULATING CURRENT IMPORT LOGIC:');
    console.log('-'.repeat(50));
    
    const reportDate = parsed.data[3] ? parsed.data[3][0] : 'Unknown';
    console.log(`📅 Report Date (Row 3, Col 0): "${reportDate}"`);
    
    const dataStartIndex = 8;
    let dataEndIndex = parsed.data.length;

    for (let i = dataStartIndex; i < parsed.data.length; i++) {
      if (parsed.data[i][0] && parsed.data[i][0].includes('Total')) {
        dataEndIndex = i;
        console.log(`🛑 Found "Total" at row ${i}, ending data parsing`);
        break;
      }
    }

    const dataRows = parsed.data.slice(dataStartIndex, dataEndIndex);
    console.log(`📊 Data rows extracted: ${dataRows.length} (from row ${dataStartIndex} to ${dataEndIndex - 1})`);

    // Check if any of these rows contain PO11322
    let po11322InDataRows = false;
    dataRows.forEach((row, i) => {
      const poNumber = row[2]; // Column 2 as per current logic
      if (poNumber && poNumber.toString().includes('11322')) {
        po11322InDataRows = true;
        console.log(`✅ PO11322 found in data rows at index ${i}: "${poNumber}"`);
      }
    });

    if (!po11322InDataRows) {
      console.log('❌ PO11322 NOT FOUND in the extracted data rows!');
      console.log('   This confirms why resurrection logic never runs.');
      
      // Check what IS in column 2 of the data rows
      console.log('\n📋 Sample PO numbers from Column 2 in data rows:');
      dataRows.slice(0, 10).forEach((row, i) => {
        const poNumber = row[2] || '(empty)';
        console.log(`   Data row ${i}: "${poNumber}"`);
      });
    }

    console.log('\n' + '='.repeat(62));
    console.log('🎯 CSV ANALYSIS COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error in CSV debug analysis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

debugCSVImport();
