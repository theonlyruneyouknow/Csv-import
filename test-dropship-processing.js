const path = require('path');
const DropshipProcessor = require('./dropship/DropshipProcessor');

async function testProcessing() {
    try {
        console.log('🚀 Starting manual dropship processing test...');
        
        const uploadsDir = path.join(__dirname, 'dropship/uploads');
        console.log('📁 Uploads directory:', uploadsDir);
        
        const processor = new DropshipProcessor(uploadsDir);
        console.log('✅ DropshipProcessor created successfully');
        
        const results = await processor.processAllFiles();
        console.log('✅ Processing completed:', results.success);
        
        if (results.success) {
            console.log('✅ Files processed successfully!');
            console.log('📊 Analysis summary:');
            console.log('  - Input files:', results.analysis.inputFiles.length);
            console.log('  - Output files:', results.analysis.outputFiles.length);
            
            // Show data structure details
            console.log('📋 Data structure details:');
            for (const [filename, fileData] of Object.entries(results.analysis.dataStructure)) {
                console.log(`  📄 ${filename}:`);
                if (fileData.data && fileData.data.type === 'Excel') {
                    console.log(`    - Type: Excel`);
                    console.log(`    - Sheets: ${Object.keys(fileData.data.sheets || {}).length}`);
                    for (const [sheetName, sheetData] of Object.entries(fileData.data.sheets || {})) {
                        console.log(`      📊 Sheet "${sheetName}": ${sheetData.rowCount} rows`);
                        console.log(`        Headers: ${sheetData.headers.join(', ')}`);
                    }
                } else {
                    console.log(`    - Type: ${fileData.data?.type || 'Unknown'}`);
                }
            }
            
            console.log('📋 Processing Plan:');
            console.log('  - Steps:', results.plan.steps.length);
            console.log('  - Output targets:', results.plan.outputTargets.length);
            
            console.log('📄 Results:', results.results.length, 'output files generated');
        } else {
            console.log('❌ Processing failed:', results.error);
        }
    } catch (error) {
        console.error('💥 Processing error:', error);
    }
}

testProcessing();
