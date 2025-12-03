const express = require('express');
const router = express.Router();
const SeedCatalog = require('../models/SeedCatalog');
const SeedVendor = require('../models/SeedVendor');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// GET - Seed catalog search page
router.get('/search', async (req, res) => {
    try {
        console.log('📋 Loading seed catalog search page...');
        
        // Load active vendors from database
        const vendors = await SeedVendor.find({ active: true })
            .sort({ vendorName: 1 })
            .select('vendorName baseUrl discoveredCategories');
        
        res.render('seed-catalog-search', {
            title: 'AI Seed Catalog Search',
            user: req.user || { name: 'Admin' },
            apiKeyConfigured: !!process.env.GEMINI_API_KEY,
            vendors
        });
    } catch (error) {
        console.error('❌ Error loading search page:', error);
        res.status(500).send('Error loading search page');
    }
});

// POST - AI search for seeds
router.post('/ai-search', async (req, res) => {
    try {
        console.log('🔍 AI seed search initiated...');
        let { vendor, category, searchQuery, catalogUrl, maxResults, mode } = req.body;

        // Normalize catalog URL - add https:// if missing
        if (catalogUrl && !catalogUrl.match(/^https?:\/\//i)) {
            catalogUrl = 'https://' + catalogUrl;
            console.log('📎 Normalized URL to:', catalogUrl);
        }

        // Find vendor in database to check update timestamps
        const vendorDoc = await SeedVendor.findOne({ vendorName: vendor });
        let updateInstruction = '';
        
        if (mode === 'incremental' && vendorDoc && vendorDoc.lastIncrementalUpdate) {
            const lastUpdate = vendorDoc.lastIncrementalUpdate.toLocaleDateString();
            updateInstruction = `\n⚠️ INCREMENTAL UPDATE MODE: Only find products that are NEW or were added AFTER ${lastUpdate}. Do not include products you already extracted in previous searches.`;
            console.log(`➕ Incremental mode: Looking for products added after ${lastUpdate}`);
        } else if (mode === 'full') {
            updateInstruction = `\n⚠️ FULL REFRESH MODE: Extract ALL products including previously scanned ones. This is a complete catalog refresh.`;
            console.log(`♻️ Full refresh mode: Re-scanning all products`);
        }

        // Check if Gemini API is configured
        if (!genAI) {
            return res.status(400).json({
                success: false,
                error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file.',
                message: 'Get your free API key from https://makersuite.google.com/app/apikey'
            });
        }

        // Build AI prompt
        const aiPrompt = `
You are a seed catalog data extraction expert. Search for seed products from vendor "${vendor}".
${category ? `Focus on category: ${category}` : ''}
${searchQuery ? `Additional search criteria: ${searchQuery}` : ''}
${catalogUrl ? `Use this catalog URL to search: ${catalogUrl}` : ''}
${updateInstruction}

Your task:
1. If a catalog URL is provided, analyze that specific page for seed products
2. Extract detailed information about each seed variety found
3. Return ONLY valid JSON - no markdown, no explanations, just pure JSON

Return a JSON array of seed products with this EXACT structure:
[
  {
    "sku": "product SKU or item number",
    "varietyName": "specific variety name (e.g., 'Cherokee Purple', 'Buttercrunch')",
    "commonName": "common name (e.g., 'Tomato', 'Lettuce', 'Basil')",
    "botanicalName": "scientific name if available",
    "category": "Vegetable|Flower|Herb|Fruit|Other",
    "subcategory": "specific type (e.g., 'Cherry Tomato', 'Leaf Lettuce')",
    "description": "product description",
    "seedType": "Open Pollinated|Hybrid|Heirloom|Organic",
    "organic": true or false,
    "daysToMaturity": number (if available),
    "packets": [
      {
        "size": "packet size description",
        "quantity": number,
        "unit": "seeds|oz|lb|g|kg",
        "price": number,
        "currency": "USD",
        "availability": "In Stock|Out of Stock|Limited"
      }
    ],
    "plantingDepth": "planting depth if available",
    "spacing": "spacing requirements if available",
    "sunRequirement": "Full Sun|Partial Shade|Full Shade",
    "hardiness": "hardiness zone if available",
    "features": ["feature1", "feature2"],
    "sourceUrl": "${catalogUrl || 'vendor website'}"
  }
]

Find up to ${maxResults || 20} products. If you cannot access the URL or find products, return an empty array [].
IMPORTANT: Return ONLY the JSON array, nothing else.
`;

        console.log('📝 Sending request to Gemini AI...');

        // Call Gemini API - using gemini-2.5-flash (confirmed available)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(aiPrompt);
        const response = await result.response;
        let aiText = response.text();

        console.log('🤖 Raw AI Response:', aiText.substring(0, 200) + '...');

        // Clean up response - remove markdown code blocks if present
        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse AI response
        let extractedSeeds = [];
        try {
            extractedSeeds = JSON.parse(aiText);
            if (!Array.isArray(extractedSeeds)) {
                extractedSeeds = [extractedSeeds];
            }
        } catch (parseError) {
            console.error('❌ Failed to parse AI response as JSON:', parseError);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse AI response',
                rawResponse: aiText.substring(0, 500),
                message: 'AI did not return valid JSON. This might happen if no products were found or the URL is inaccessible.'
            });
        }

        console.log(`✅ Extracted ${extractedSeeds.length} seeds from AI`);

        // Enrich with metadata and save to database
        let savedCount = 0;
        let updatedCount = 0;
        const savedSeeds = [];

        for (const seedData of extractedSeeds) {
            try {
                // Add vendor and metadata
                const enrichedData = {
                    ...seedData,
                    vendor: vendor,
                    aiExtracted: true,
                    extractionNotes: `Extracted via Gemini AI on ${new Date().toISOString()}`,
                    addedBy: req.user ? req.user.username : 'system',
                    lastVerified: new Date()
                };

                // Check if seed already exists
                const existingQuery = seedData.sku
                    ? { vendor: vendor, sku: seedData.sku }
                    : { vendor: vendor, varietyName: seedData.varietyName };

                const existing = await SeedCatalog.findOne(existingQuery);

                if (existing) {
                    // Update existing seed
                    Object.assign(existing, {
                        ...enrichedData,
                        updatedBy: req.user ? req.user.username : 'system'
                    });
                    await existing.save();
                    savedSeeds.push(existing);
                    updatedCount++;
                    console.log(`✅ Updated seed: ${seedData.varietyName}`);
                } else {
                    // Create new seed
                    const newSeed = new SeedCatalog(enrichedData);
                    await newSeed.save();
                    savedSeeds.push(newSeed);
                    savedCount++;
                    console.log(`✅ Saved new seed: ${seedData.varietyName}`);
                }
            } catch (error) {
                console.error(`❌ Error saving seed ${seedData.varietyName}:`, error);
            }
        }

        // Update vendor timestamps based on mode
        if (vendorDoc && (savedCount > 0 || updatedCount > 0)) {
            const now = new Date();
            
            if (mode === 'incremental') {
                vendorDoc.lastIncrementalUpdate = now;
                console.log(`⏱️ Updated vendor lastIncrementalUpdate timestamp`);
            } else if (mode === 'full') {
                vendorDoc.lastFullRefresh = now;
                console.log(`⏱️ Updated vendor lastFullRefresh timestamp`);
            }
            
            // Update category-level timestamp if category specified
            if (category && vendorDoc.discoveredCategories) {
                const categoryIndex = vendorDoc.discoveredCategories.findIndex(c => c.name === category);
                if (categoryIndex !== -1) {
                    vendorDoc.discoveredCategories[categoryIndex].lastScanned = now;
                    vendorDoc.discoveredCategories[categoryIndex].seedCount = 
                        (vendorDoc.discoveredCategories[categoryIndex].seedCount || 0) + savedCount;
                    
                    if (mode === 'full') {
                        vendorDoc.discoveredCategories[categoryIndex].lastFullRefresh = now;
                    }
                }
            }
            
            vendorDoc.updatedBy = req.user ? req.user.username : 'system';
            await vendorDoc.save();
            console.log(`✅ Updated vendor ${vendor} with new timestamps`);
        }

        res.json({
            success: true,
            seeds: savedSeeds,
            stats: {
                found: extractedSeeds.length,
                saved: savedCount,
                updated: updatedCount
            },
            mode: mode || 'standard',
            message: `Successfully processed ${extractedSeeds.length} seeds using Gemini AI`
        });

    } catch (error) {
        console.error('❌ Error in AI search:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET - Browse all seeds
router.get('/browse', async (req, res) => {
    try {
        console.log('📚 Loading browse page...');
        const { vendor, category, search } = req.query;

        const query = {};
        if (vendor) query.vendor = new RegExp(vendor, 'i');
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { varietyName: new RegExp(search, 'i') },
                { commonName: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
        }

        const seeds = await SeedCatalog.find(query)
            .sort({ vendor: 1, category: 1, varietyName: 1 })
            .limit(200); // Limit to 200 for performance

        console.log(`📊 Found ${seeds.length} seeds`);

        res.render('seed-catalog-browse', {
            title: 'Browse Seed Catalog',
            user: req.user || { name: 'Admin' },
            seeds,
            vendorFilter: vendor || '',
            categoryFilter: category || '',
            searchFilter: search || ''
        });

    } catch (error) {
        console.error('❌ Error browsing seeds:', error);
        res.status(500).send('Error loading browse page');
    }
});

// ========== VENDOR MANAGEMENT ROUTES (Must come before parameterized routes) ==========

// GET - Vendor management page
router.get('/vendors', async (req, res) => {
    try {
        const vendors = await SeedVendor.find({}).sort({ vendorName: 1 });
        
        // Calculate seed counts for each vendor
        const vendorsWithCounts = await Promise.all(vendors.map(async (vendor) => {
            const seedCount = await SeedCatalog.countDocuments({ vendor: vendor.vendorName });
            return {
                ...vendor.toObject(),
                seedCount
            };
        }));
        
        res.render('seed-vendors', { vendors: vendorsWithCounts });
    } catch (error) {
        console.error('❌ Error loading vendors:', error);
        res.status(500).send('Error loading vendor management page');
    }
});

// GET - Single vendor (for editing)
router.get('/vendors/:id', async (req, res) => {
    try {
        const vendor = await SeedVendor.findById(req.params.id);
        
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        
        res.json({ success: true, vendor });
    } catch (error) {
        console.error('❌ Error getting vendor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Analyze vendor URL with AI
router.post('/vendors/analyze-url', async (req, res) => {
    try {
        if (!genAI) {
            return res.status(503).json({ 
                success: false, 
                message: 'Gemini AI is not configured. Please set GEMINI_API_KEY in environment.' 
            });
        }

        const { input } = req.body;

        if (!input) {
            return res.status(400).json({ success: false, message: 'Vendor name or URL is required' });
        }

        console.log(`🤖 AI searching for vendor: "${input}"...`);

        // Determine if input is a URL or just a name
        const isUrl = input.includes('.') || input.startsWith('http');
        const searchType = isUrl ? 'URL' : 'name';

        // AI prompt for finding and extracting vendor information
        const prompt = `You are helping find information about a seed company. The user provided: "${input}"

Your task is to identify this seed vendor and provide complete information:

${isUrl ? 
`This appears to be a URL or domain. Extract and provide:` : 
`This appears to be a vendor name. Search your knowledge base for seed companies matching this name and provide:`}

1. vendorName - The official full company name (e.g., "Johnny's Selected Seeds", "Baker Creek Heirloom Seeds")
2. baseUrl - The main website domain without https:// or paths (e.g., "johnnyseeds.com", "rareseeds.com")
3. seedCategoriesUrl - The likely URL to their seed catalog or vegetable seeds section (make an educated guess based on common patterns)
4. description - A brief 1-sentence description of what makes this vendor notable (specialties, organic, heirloom, etc.)
5. confidence - Your confidence level as a percentage (0-100) that this is the correct vendor

${!isUrl ? `
If multiple seed vendors could match this name, provide up to 3 suggestions as an array called "suggestions".
For example, if searching "High Mowing", you might find "High Mowing Organic Seeds" as the primary match.

Common seed vendors to consider:
- Johnny's Selected Seeds (johnnyseeds.com)
- Baker Creek Heirloom Seeds (rareseeds.com) 
- High Mowing Organic Seeds (highmowingseeds.com)
- Seed Savers Exchange (seedsavers.org)
- Territorial Seed Company (territorialseed.com)
- Fedco Seeds (fedcoseeds.com)
- Burpee (burpee.com)
- Park Seed (parkseed.com)
- Southern Exposure Seed Exchange (southernexposure.com)
- Peaceful Valley (groworganic.com)
` : ''}

Return ONLY valid JSON with no markdown formatting or extra text:

For single result:
{
  "vendorName": "Johnny's Selected Seeds",
  "baseUrl": "johnnyseeds.com",
  "seedCategoriesUrl": "johnnyseeds.com/vegetables",
  "description": "Employee-owned seed company specializing in organic and regionally adapted varieties",
  "confidence": 95
}

For multiple matches:
{
  "suggestions": [
    {
      "vendorName": "Primary Match Name",
      "baseUrl": "example.com",
      "seedCategoriesUrl": "example.com/seeds",
      "description": "Description",
      "confidence": 90
    },
    {
      "vendorName": "Alternative Match",
      "baseUrl": "alternative.com",
      "seedCategoriesUrl": "alternative.com/catalog",
      "description": "Description",
      "confidence": 70
    }
  ]
}

Focus on well-known seed vendors. If you cannot find a match with reasonable confidence (>60%), return an error message.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        console.log('📝 AI Response (first 300 chars):', text.substring(0, 300) + '...');
        
        // Clean up markdown formatting if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON response
        let vendorData;
        try {
            vendorData = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ Failed to parse AI response:', text);
            return res.status(500).json({ 
                success: false, 
                message: 'AI returned invalid format. Please try a more specific search.',
                rawResponse: text.substring(0, 500)
            });
        }

        // Check if we have suggestions (multiple matches)
        if (vendorData.suggestions && Array.isArray(vendorData.suggestions)) {
            console.log(`✅ Found ${vendorData.suggestions.length} vendor matches`);
            
            // Convert description to notes for each suggestion
            vendorData.suggestions.forEach(sugg => {
                if (sugg.description) {
                    sugg.notes = sugg.description;
                    delete sugg.description;
                }
            });
            
            return res.json({ 
                success: true, 
                message: `Found ${vendorData.suggestions.length} potential matches`,
                suggestions: vendorData.suggestions
            });
        }

        // Single result
        if (!vendorData.vendorName || !vendorData.baseUrl) {
            return res.status(404).json({ 
                success: false, 
                message: `Could not find vendor information for "${input}". Try including more details or the website domain.`
            });
        }

        // Check confidence level
        if (vendorData.confidence && vendorData.confidence < 60) {
            return res.status(404).json({ 
                success: false, 
                message: `Low confidence match (${vendorData.confidence}%). Please provide more specific information.`
            });
        }

        // Store description as notes
        if (vendorData.description) {
            vendorData.notes = vendorData.description;
            delete vendorData.description;
        }

        console.log(`✅ Found vendor: ${vendorData.vendorName} (${vendorData.baseUrl}) - ${vendorData.confidence}% confidence`);
        
        res.json({ 
            success: true, 
            message: 'Vendor information found successfully',
            vendorInfo: vendorData
        });
        
    } catch (error) {
        console.error('❌ Error finding vendor:', error);
        
        // Check if it's a quota/rate limit error
        if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
            return res.status(429).json({ 
                success: false, 
                message: 'AI service is temporarily at capacity. Please wait a moment and try again.',
                error: 'Rate limit exceeded'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Unable to analyze vendor. Please try again or enter details manually.',
            error: error.message 
        });
    }
});

// POST - Create new vendor
router.post('/vendors', async (req, res) => {
    try {
        const { vendorName, baseUrl, seedCategoriesUrl, notes } = req.body;
        
        // Check if vendor already exists
        const existing = await SeedVendor.findOne({ vendorName });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Vendor with this name already exists' });
        }
        
        // Normalize URLs
        const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
        const normalizedCategoriesUrl = seedCategoriesUrl && !seedCategoriesUrl.startsWith('http') 
            ? `https://${seedCategoriesUrl}` 
            : seedCategoriesUrl;
        
        const vendor = new SeedVendor({
            vendorName,
            baseUrl: normalizedBaseUrl,
            seedCategoriesUrl: normalizedCategoriesUrl,
            notes,
            addedBy: req.session.username || 'system'
        });
        
        await vendor.save();
        
        console.log(`✅ Created vendor: ${vendorName}`);
        res.json({ success: true, message: 'Vendor created successfully', vendor });
    } catch (error) {
        console.error('❌ Error creating vendor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT - Update vendor
router.put('/vendors/:id', async (req, res) => {
    try {
        const { vendorName, baseUrl, seedCategoriesUrl, notes, active } = req.body;
        
        // Normalize URLs
        const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
        const normalizedCategoriesUrl = seedCategoriesUrl && !seedCategoriesUrl.startsWith('http') 
            ? `https://${seedCategoriesUrl}` 
            : seedCategoriesUrl;
        
        const vendor = await SeedVendor.findByIdAndUpdate(
            req.params.id,
            {
                vendorName,
                baseUrl: normalizedBaseUrl,
                seedCategoriesUrl: normalizedCategoriesUrl,
                notes,
                active,
                updatedBy: req.session.username || 'system'
            },
            { new: true }
        );
        
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        
        console.log(`✅ Updated vendor: ${vendorName}`);
        res.json({ success: true, message: 'Vendor updated successfully', vendor });
    } catch (error) {
        console.error('❌ Error updating vendor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Delete vendor
router.delete('/vendors/:id', async (req, res) => {
    try {
        const vendor = await SeedVendor.findByIdAndDelete(req.params.id);
        
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        
        console.log(`✅ Deleted vendor: ${vendor.vendorName}`);
        res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting vendor:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Discover seed categories using AI
router.post('/vendors/:id/discover', async (req, res) => {
    try {
        if (!genAI) {
            return res.status(503).json({ 
                success: false, 
                message: 'Gemini AI is not configured. Please set GEMINI_API_KEY in environment.' 
            });
        }
        
        const vendor = await SeedVendor.findById(req.params.id);
        
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        
        // Use seedCategoriesUrl if available, otherwise baseUrl
        const urlToAnalyze = vendor.seedCategoriesUrl || vendor.baseUrl;
        
        console.log(`🔍 Discovering categories for ${vendor.vendorName} from ${urlToAnalyze}...`);
        
        // AI prompt for discovering seed categories
        const prompt = `You are analyzing the website "${urlToAnalyze}" for ${vendor.vendorName}, a seed company.

Your task is to identify all seed categories they offer (like "Tomatoes", "Peppers", "Corn", "Lettuce", etc.).

Based on common seed vendor website structures and the URL provided, list the likely seed categories this vendor would offer.

For each category, provide:
1. name - The seed category name (e.g., "Tomatoes", "Corn")
2. estimatedUrl - A likely URL path for that category based on the base URL structure

Return your response as a JSON array ONLY, with no additional text or markdown formatting:
[
  {
    "name": "Tomatoes",
    "estimatedUrl": "https://example.com/tomato-seeds"
  },
  {
    "name": "Peppers",
    "estimatedUrl": "https://example.com/pepper-seeds"
  }
]

Focus on common vegetable and herb seed categories. Be realistic about what categories would exist.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        console.log('📝 AI Response:', text.substring(0, 200) + '...');
        
        // Clean up markdown formatting if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON response
        let categories;
        try {
            categories = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ Failed to parse AI response:', text);
            return res.status(500).json({ 
                success: false, 
                message: 'AI returned invalid JSON format',
                rawResponse: text.substring(0, 500)
            });
        }
        
        if (!Array.isArray(categories)) {
            return res.status(500).json({ 
                success: false, 
                message: 'AI did not return an array of categories'
            });
        }
        
        // Transform to discoveredCategories format
        const discoveredCategories = categories.map(cat => ({
            name: cat.name,
            url: cat.estimatedUrl || cat.url || '',
            lastScanned: new Date(),
            seedCount: 0 // Will be updated when actual searches are performed
        }));
        
        // Update vendor with discovered categories
        vendor.discoveredCategories = discoveredCategories;
        vendor.updatedBy = req.session.username || 'system';
        await vendor.save();
        
        console.log(`✅ Discovered ${discoveredCategories.length} categories for ${vendor.vendorName}`);
        
        res.json({ 
            success: true, 
            message: `Discovered ${discoveredCategories.length} seed categories`,
            categories: discoveredCategories 
        });
        
    } catch (error) {
        console.error('❌ Error discovering categories:', error);
        
        // Check if it's a quota/rate limit error
        if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
            return res.status(429).json({ 
                success: false, 
                message: 'AI service is temporarily at capacity. Please wait a moment and try again.',
                error: 'Rate limit exceeded'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Unable to discover categories. You can add them manually after saving the vendor.',
            error: error.message 
        });
    }
});

// ========== SEED CATALOG ROUTES (Parameterized routes come AFTER specific routes) ==========

// GET - View single seed
router.get('/view/:id', async (req, res) => {
    try {
        const seed = await SeedCatalog.findById(req.params.id).populate('vendorId');

        if (!seed) {
            return res.status(404).json({ success: false, error: 'Seed not found' });
        }

        res.json({ success: true, seed });

    } catch (error) {
        console.error('❌ Error viewing seed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Edit seed page
router.get('/edit/:id', async (req, res) => {
    try {
        const seed = await SeedCatalog.findById(req.params.id);

        if (!seed) {
            return res.status(404).send('Seed not found');
        }

        res.render('seed-catalog-edit', {
            title: 'Edit Seed',
            seed,
            user: req.user || { name: 'Admin' }
        });

    } catch (error) {
        console.error('❌ Error loading edit page:', error);
        res.status(500).send('Error loading edit page');
    }
});

// PUT - Update seed
router.put('/:id', async (req, res) => {
    try {
        const seed = await SeedCatalog.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                updatedBy: req.user ? req.user.username : 'system'
            },
            { new: true, runValidators: true }
        );

        if (!seed) {
            return res.status(404).json({ success: false, error: 'Seed not found' });
        }

        res.json({ success: true, seed });

    } catch (error) {
        console.error('❌ Error updating seed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE - Delete seed
router.delete('/:id', async (req, res) => {
    try {
        const seed = await SeedCatalog.findByIdAndDelete(req.params.id);

        if (!seed) {
            return res.status(404).json({ success: false, error: 'Seed not found' });
        }

        res.json({ success: true, message: 'Seed deleted' });

    } catch (error) {
        console.error('❌ Error deleting seed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET - Manage seeds page
router.get('/manage', async (req, res) => {
    try {
        res.render('seed-catalog-manage', {
            title: 'Manage Seed Catalog',
            user: req.user || { name: 'Admin' }
        });
    } catch (error) {
        console.error('❌ Error loading manage page:', error);
        res.status(500).send('Error loading manage page');
    }
});

// GET - Stats
router.get('/stats', async (req, res) => {
    try {
        const totalSeeds = await SeedCatalog.countDocuments({ active: true });
        const totalVendors = await SeedCatalog.distinct('vendor');
        const byCategory = await SeedCatalog.aggregate([
            { $match: { active: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const organicCount = await SeedCatalog.countDocuments({ organic: true, active: true });

        res.json({
            success: true,
            stats: {
                totalSeeds,
                totalVendors: totalVendors.length,
                byCategory,
                organicCount
            }
        });

    } catch (error) {
        console.error('❌ Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

