# Google Gemini AI Integration Setup

## Quick Setup (5 minutes)

### 1. Get Your Free Gemini API Key

1. Visit: **https://makersuite.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key

### 2. Add API Key to Your Project

Open your `.env` file and add:

```
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual API key.

### 3. Restart Your Server

```powershell
npm start
```

## That's It!

Your AI Seed Catalog is now ready to use! 

Navigate to: **http://localhost:3001/seed-catalog/search**

## How to Use

1. **Vendor Name**: Enter the seed company name (e.g., "Johnny's Seeds", "Baker Creek")
2. **Category** (optional): Select Vegetable, Flower, Herb, etc.
3. **Search Query** (optional): Describe what you're looking for (e.g., "tomato varieties", "organic lettuce")
4. **Catalog URL** (recommended): Paste the vendor's catalog page URL for best results
5. **Max Results**: How many seed varieties to extract (default: 20)

Click **"Search with AI"** and Gemini will:
- Analyze the vendor's catalog
- Extract seed varieties, packet sizes, pricing
- Parse growing information (days to maturity, spacing, etc.)
- Save everything to your database

## Features

- ✅ **Automatic Data Extraction**: AI reads vendor catalogs and extracts structured data
- ✅ **Smart Parsing**: Identifies SKUs, varieties, packet sizes, pricing
- ✅ **Duplicate Detection**: Updates existing seeds instead of creating duplicates
- ✅ **Growing Info**: Extracts planting depth, spacing, sun requirements, hardiness zones
- ✅ **Organic Detection**: Identifies organic/heirloom/hybrid seed types

## API Limits

Gemini API Free Tier:
- **60 requests per minute**
- **1,500 requests per day**
- More than enough for daily seed catalog management!

## Troubleshooting

**"API key not configured" error?**
- Make sure your `.env` file has `GEMINI_API_KEY=...`
- Restart the server after adding the key

**No seeds found?**
- The catalog URL might be inaccessible to the AI
- Try providing more specific search queries
- Some vendor websites block automated access

**Invalid JSON response?**
- This can happen if the AI can't find seed products on the page
- Try a different catalog URL or add more specific search criteria

## Cost

The Gemini API is **FREE** for moderate usage, making it perfect for this seed catalog application!
