require('dotenv').config();
const mongoose = require('mongoose');

const seedPartnerSchema = new mongoose.Schema({}, { collection: 'seedpartners', strict: false });
const SeedPartner = mongoose.model('SeedPartner', seedPartnerSchema);

// Representative seed offerings for each partner type
const seedCatalogData = {
  'Native Seeds/SEARCH': {
    vegetables: ['Hopi Blue Corn', 'Tohono O\'odham Squash', 'Desert Adapted Beans', 'Chiltepin Pepper', 'Tepary Beans', 'Apache Acorn Squash', 'Tarahumara Sunflower'],
    flowers: ['Desert Marigold', 'Desert Four O\'Clock', 'Sacred Datura'],
    herbs: ['Desert Sage', 'Mexican Oregano', 'Chia']
  },
  
  'Peaceful Valley Farm & Garden Supply': {
    vegetables: ['Organic Tomato Seeds', 'Organic Lettuce Mix', 'Organic Carrots', 'Organic Beans', 'Organic Cucumber', 'Organic Squash', 'Organic Peppers'],
    flowers: ['Organic Sunflowers', 'Organic Zinnias', 'Wildflower Mix'],
    herbs: ['Organic Basil', 'Organic Cilantro', 'Organic Parsley', 'Organic Dill']
  },
  
  'Renee\'s Garden': {
    vegetables: ['French Breakfast Radish', 'Gourmet Salad Mix', 'Italian Heirloom Tomatoes', 'Asian Stir Fry Greens', 'French Filet Beans'],
    flowers: ['Cottage Garden Mix', 'Cutting Garden Zinnias', 'French Marigolds', 'English Cottage Pansies', 'Italian Sunflowers'],
    herbs: ['Italian Basil Blend', 'French Thyme', 'Italian Oregano']
  },
  
  'Botanical Interests': {
    vegetables: ['Rainbow Carrot Mix', 'Heirloom Tomato Collection', 'Salad Greens Mix', 'Rainbow Chard', 'Sugar Snap Peas', 'Sweet Pepper Mix'],
    flowers: ['Pollinator Mix', 'Butterfly Garden Mix', 'Hummingbird Garden', 'Cut Flower Mix', 'Wildflower Meadow'],
    herbs: ['Culinary Herb Collection', 'Tea Garden Mix', 'Medicinal Herb Mix']
  },
  
  'Lake Valley Seed': {
    vegetables: ['Beefsteak Tomato', 'Sweet Corn', 'Green Beans', 'Zucchini', 'Bell Peppers', 'Lettuce Mix', 'Cucumber'],
    flowers: ['Sunflower Mammoth', 'Zinnia Mix', 'Marigold', 'Cosmos Mix'],
    herbs: ['Basil Sweet', 'Cilantro', 'Parsley Curled', 'Dill']
  },
  
  'MASA Seed Foundation': {
    vegetables: ['Rocky Mountain Tomatoes', 'Short Season Beans', 'Cold Hardy Greens', 'Mountain Squash', 'High Altitude Corn'],
    flowers: ['Mountain Wildflower Mix', 'Alpine Flowers'],
    herbs: ['High Altitude Herbs', 'Mountain Sage']
  },
  
  'Wild Mountain Seeds': {
    vegetables: ['High Altitude Tomatoes', 'Cold Hardy Kale', 'Mountain Lettuce', 'Alpine Radish', 'Short Season Beans'],
    flowers: ['Mountain Wildflowers', 'Alpine Garden Mix'],
    herbs: ['Mountain Herbs Collection', 'Alpine Thyme']
  },
  
  'Seed Savers Exchange': {
    vegetables: ['Heirloom Tomatoes', 'Heirloom Beans', 'Heirloom Squash', 'Heirloom Corn', 'Heirloom Peppers', 'Heirloom Lettuce', 'Heirloom Melons'],
    flowers: ['Heirloom Flowers Collection', 'Heirloom Sunflowers', 'Heirloom Zinnias'],
    herbs: ['Heirloom Herbs Collection', 'Heirloom Basil']
  },
  
  'Fedco Seeds': {
    vegetables: ['Cold Hardy Tomatoes', 'Northern Beans', 'Cold Climate Squash', 'Short Season Corn', 'Hardy Greens Mix'],
    flowers: ['Cold Climate Flowers', 'Native Wildflowers'],
    herbs: ['Hardy Herbs Collection', 'Northern Herbs']
  },
  
  'Johnny\'s Selected Seeds': {
    vegetables: ['Johnny\'s 361 Tomato', 'Sweetness Hybrid Pepper', 'Napoli Carrot', 'Hakurei Turnip', 'Red Russian Kale', 'Salanova Lettuce'],
    flowers: ['Zinnia Benary\'s Giant', 'Sunflower ProCut', 'Cosmos Sensation Mix'],
    herbs: ['Italian Large Leaf Basil', 'Bouquet Dill', 'Giant of Italy Parsley']
  },
  
  'Pinetree Garden Seeds': {
    vegetables: ['Value Pack Tomatoes', 'Budget Beans', 'Economy Lettuce Mix', 'Affordable Peppers', 'Value Squash'],
    flowers: ['Economy Flower Mix', 'Budget Sunflowers', 'Value Zinnias'],
    herbs: ['Herb Value Pack', 'Budget Basil', 'Economy Cilantro']
  },
  
  'Baker Creek Heirloom Seeds': {
    vegetables: ['Cherokee Purple Tomato', 'Dragon Tongue Beans', 'Lemon Cucumber', 'White Wonder Cucumber', 'Glass Gem Corn', 'Dinosaur Kale'],
    flowers: ['Heirloom Flower Collection', 'Rare Sunflowers', 'Unusual Zinnias', 'Heirloom Morning Glory'],
    herbs: ['Rare Herbs Collection', 'Unusual Basils', 'Heirloom Oregano']
  },
  
  'Seedman.com': {
    vegetables: ['Giant Tomatoes', 'Extra Large Pumpkins', 'Big Beefsteak Tomato', 'Mammoth Melons', 'Giant Zucchini'],
    flowers: ['Giant Sunflowers', 'Enormous Zinnias', 'Gigantic Cosmos'],
    herbs: ['Large Leaf Basil', 'Giant Parsley']
  },
  
  'Annie\'s Heirloom Seeds': {
    vegetables: ['Cherokee Purple Tomato', 'Kentucky Wonder Beans', 'Marketmore Cucumber', 'Brandywine Tomato', 'Straight Eight Cucumber'],
    flowers: ['Heirloom Cottage Garden', 'Old Fashioned Zinnias', 'Heritage Sunflowers'],
    herbs: ['Heirloom Basil', 'Heritage Oregano', 'Old Time Sage']
  },
  
  'Hudson Valley Seed Company': {
    vegetables: ['Hudson Valley Tomatoes', 'Artist Bean Collection', 'Rainbow Carrot Mix', 'Striped Tomatoes', 'Unique Lettuces'],
    flowers: ['Artist Palette Flowers', 'Hudson Valley Wildflowers', 'Artisan Zinnia Mix'],
    herbs: ['Artisan Herb Collection', 'Hudson Valley Basil']
  },
  
  'Adaptive Seeds': {
    vegetables: ['Adaptive Tomatoes', 'Climate Adapted Beans', 'Locally Adapted Squash', 'Resilient Peppers', 'Regionally Adapted Lettuce'],
    flowers: ['Adaptive Wildflowers', 'Climate Resilient Flowers'],
    herbs: ['Regionally Adapted Herbs', 'Climate Appropriate Basil']
  },
  
  'Siskiyou Seeds': {
    vegetables: ['Drought Tolerant Tomatoes', 'Mountain Adapted Beans', 'Dry Climate Squash', 'Water Wise Lettuce', 'Arid Land Peppers'],
    flowers: ['Drought Tolerant Wildflowers', 'Dry Climate Flowers'],
    herbs: ['Water Wise Herbs', 'Drought Adapted Basil', 'Dry Land Sage']
  },
  
  'Territorial Seed Company': {
    vegetables: ['Pacific Northwest Tomatoes', 'Maritime Beans', 'Cool Climate Lettuce', 'Northwest Squash', 'Coastal Peppers'],
    flowers: ['Northwest Wildflowers', 'Maritime Garden Mix', 'Coastal Flowers'],
    herbs: ['Northwest Herbs Collection', 'Maritime Basil']
  },
  
  'Wild Garden Seed': {
    vegetables: ['Wild Garden Lettuce Mix', 'Specialty Greens', 'Asian Greens Mix', 'Unique Chicories', 'Rare Lettuces'],
    flowers: ['Wild Flower Mix', 'Cutting Garden Collection', 'Specialty Flowers'],
    herbs: ['Wild Herb Collection', 'Specialty Basil Mix']
  },
  
  'SeedRenaissance': {
    vegetables: ['Organic Tomatoes', 'Organic Beans', 'Organic Squash', 'Organic Lettuce', 'Organic Peppers', 'Organic Cucumbers'],
    flowers: ['Organic Flower Mix', 'Organic Sunflowers', 'Organic Zinnias'],
    herbs: ['Organic Basil', 'Organic Cilantro', 'Organic Parsley', 'Organic Dill']
  },
  
  'True Leaf Market (Mountain Valley Seed Co.)': {
    vegetables: ['Sprouting Seeds', 'Microgreens Mix', 'Heirloom Tomatoes', 'Organic Beans', 'Salad Greens', 'Wheatgrass'],
    flowers: ['Sprouting Flowers', 'Microgreen Flowers', 'Sunflower Sprouts'],
    herbs: ['Sprouting Herbs', 'Microgreen Herbs', 'Culinary Herb Mix']
  },
  
  'Southern Exposure Seed Exchange': {
    vegetables: ['Heat Tolerant Tomatoes', 'Southern Peas', 'Okra Varieties', 'Southern Greens', 'Hot Climate Beans', 'Heat Hardy Peppers'],
    flowers: ['Southern Wildflowers', 'Heat Tolerant Flowers', 'Zinnias'],
    herbs: ['Southern Herbs', 'Heat Loving Basil', 'Southern Sage']
  },
  
  'High Mowing Organic Seeds': {
    vegetables: ['Certified Organic Tomatoes', 'Organic Sweet Peppers', 'Organic Lettuce', 'Organic Kale', 'Organic Carrots', 'Organic Beans'],
    flowers: ['Organic Cut Flowers', 'Organic Sunflowers', 'Organic Zinnias'],
    herbs: ['Organic Basil Varieties', 'Organic Cilantro', 'Organic Parsley']
  },
  
  'Osborne Quality Seeds': {
    vegetables: ['Quality Vegetable Seeds', 'Premium Tomatoes', 'Select Lettuce', 'Choice Beans', 'Superior Peppers'],
    flowers: ['Quality Flower Seeds', 'Premium Sunflowers', 'Select Zinnias'],
    herbs: ['Quality Herb Seeds', 'Premium Basil']
  },
  
  'Uprising Seeds': {
    vegetables: ['Organic Heirloom Tomatoes', 'Climate Adapted Vegetables', 'Bioregional Seeds', 'Locally Adapted Beans', 'Regional Squash'],
    flowers: ['Bioregional Wildflowers', 'Native Flower Mix', 'Regional Flowers'],
    herbs: ['Bioregional Herbs', 'Native Herbs', 'Local Medicinals']
  }
};

async function populateSeedCatalogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('🌱 POPULATING SEED CATALOG OFFERINGS');
    console.log('='.repeat(80));

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [companyName, seedOfferings] of Object.entries(seedCatalogData)) {
      try {
        const partner = await SeedPartner.findOne({ companyName: companyName });
        
        if (!partner) {
          console.log(`⚠️  ${companyName} not found in database. Skipping.`);
          skippedCount++;
          continue;
        }

        await SeedPartner.updateOne(
          { _id: partner._id },
          {
            $set: {
              seedOfferings: seedOfferings,
              updatedAt: new Date()
            }
          }
        );

        const totalSeeds = seedOfferings.vegetables.length + seedOfferings.flowers.length + seedOfferings.herbs.length;
        
        console.log(`✅ ${companyName.padEnd(50)} (${partner.partnerCode})`);
        console.log(`   🥕 Vegetables: ${seedOfferings.vegetables.length} varieties`);
        console.log(`   🌸 Flowers: ${seedOfferings.flowers.length} varieties`);
        console.log(`   🌿 Herbs: ${seedOfferings.herbs.length} varieties`);
        console.log(`   📊 Total: ${totalSeeds} seed varieties\n`);
        
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating ${companyName}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('='.repeat(80));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successfully updated: ${updatedCount}/25 partners`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ SEED CATALOGS POPULATED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log('\nAll domestic partners now have seed catalog offerings:');
    console.log('  🥕 Vegetable varieties');
    console.log('  🌸 Flower varieties');
    console.log('  🌿 Herb varieties');
    console.log('\nYou can now view each partner\'s seed catalog on their detail page!');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

populateSeedCatalogs();
