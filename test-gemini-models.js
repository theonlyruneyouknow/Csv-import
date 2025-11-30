require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
    console.log('🔍 Testing Gemini API and listing available models...\n');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env file');
        return;
    }
    
    console.log('✅ API Key found:', apiKey.substring(0, 20) + '...\n');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
        console.log('📋 Attempting to list available models...\n');
        
        // Try to list models
        const models = await genAI.listModels();
        
        console.log('✅ Available models:\n');
        for (const model of models) {
            console.log(`  📦 ${model.name}`);
            console.log(`     Display Name: ${model.displayName}`);
            console.log(`     Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
            console.log('');
        }
        
        // Find models that support generateContent
        const contentModels = models.filter(m => 
            m.supportedGenerationMethods?.includes('generateContent')
        );
        
        console.log('\n✨ Models that support generateContent:');
        contentModels.forEach(m => {
            console.log(`  ✅ ${m.name.replace('models/', '')}`);
        });
        
        if (contentModels.length > 0) {
            console.log('\n💡 Recommended: Use one of these model names in your code');
            console.log(`   Example: genAI.getGenerativeModel({ model: '${contentModels[0].name.replace('models/', '')}' })`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Try common model names directly
        console.log('\n🔄 Testing common model names directly...\n');
        
        const modelsToTest = [
            'gemini-pro',
            'gemini-1.0-pro',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro-latest'
        ];
        
        for (const modelName of modelsToTest) {
            try {
                console.log(`Testing: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say "test" if you can read this.');
                const response = await result.response;
                console.log(`  ✅ ${modelName} WORKS!`);
                console.log(`     Response: ${response.text().substring(0, 50)}...`);
            } catch (err) {
                console.log(`  ❌ ${modelName} failed: ${err.message.substring(0, 100)}`);
            }
        }
    }
}

listAvailableModels().then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
}).catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
