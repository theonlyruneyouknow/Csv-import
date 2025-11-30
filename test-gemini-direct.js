require('dotenv').config();
const https = require('https');

async function testGeminiDirectAPI() {
    console.log('🔍 Testing Gemini API with direct HTTPS request...\n');

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env file');
        return;
    }

    console.log('✅ API Key found:', apiKey.substring(0, 20) + '...\n');

    // Test 1: List models using v1 API
    console.log('📋 Test 1: Listing models using v1 API...\n');

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1/models?key=${apiKey}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`Status Code: ${res.statusCode}\n`);

                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        console.log('✅ Success! Available models:\n');

                        if (parsed.models && parsed.models.length > 0) {
                            parsed.models.forEach(model => {
                                console.log(`  📦 ${model.name}`);
                                console.log(`     Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
                                console.log('');
                            });

                            // Find models that support generateContent
                            const contentModels = parsed.models.filter(m =>
                                m.supportedGenerationMethods?.includes('generateContent')
                            );

                            if (contentModels.length > 0) {
                                console.log('\n✨ Models that support generateContent:');
                                contentModels.forEach(m => {
                                    const modelName = m.name.replace('models/', '');
                                    console.log(`  ✅ ${modelName}`);
                                });

                                console.log('\n💡 Use this in your code:');
                                console.log(`   const model = genAI.getGenerativeModel({ model: '${contentModels[0].name.replace('models/', '')}' });`);
                            }
                        } else {
                            console.log('⚠️ No models returned');
                        }

                        resolve();
                    } catch (err) {
                        console.error('❌ Failed to parse response:', err.message);
                        console.log('Raw response:', data.substring(0, 500));
                        reject(err);
                    }
                } else {
                    console.error(`❌ HTTP ${res.statusCode}`);
                    console.log('Response:', data);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
}

testGeminiDirectAPI().then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
}).catch(err => {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
});
