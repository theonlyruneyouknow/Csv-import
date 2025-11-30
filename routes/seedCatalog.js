const express = require('express');
const router = express.Router();
const SeedCatalog = require('../models/SeedCatalog');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// GET - Seed catalog search page
router.get('/search', async (req, res) => {
    try {
        console.log('📋 Loading seed catalog search page...');
        res.render('seed-catalog-search', {
            title: 'AI Seed Catalog Search',
            user: req.user || { name: 'Admin' },
            apiKeyConfigured: !!process.env.GEMINI_API_KEY
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
        let { vendor, category, searchQuery, catalogUrl, maxResults } = req.body;

        // Normalize catalog URL - add https:// if missing
        if (catalogUrl && !catalogUrl.match(/^https?:\/\//i)) {
            catalogUrl = 'https://' + catalogUrl;
            console.log('📎 Normalized URL to:', catalogUrl);
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

        res.json({
            success: true,
            seeds: savedSeeds,
            stats: {
                found: extractedSeeds.length,
                saved: savedCount,
                updated: updatedCount
            },
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
