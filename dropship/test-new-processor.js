const SimplifiedDropshipProcessor = require('./SimplifiedDropshipProcessor_New');

async function test() {
    try {
        console.log('🧪 Testing new simplified processor...');
        const processor = new SimplifiedDropshipProcessor();
        const result = await processor.processLatestFile();
        
        console.log('📊 Results:');
        console.log('- Success:', result.success);
        if (result.success) {
            console.log('- Orders processed:', result.ordersProcessed);
            console.log('- Items processed:', result.itemsProcessed);
            console.log('- CSV output:', result.csvOutput ? '✅ Generated' : '❌ Failed');
            console.log('- PDF output:', result.pdfOutput ? '✅ Generated' : '❌ Failed');
        } else {
            console.log('- Error:', result.error);
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

test();
