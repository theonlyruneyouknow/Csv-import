# Wild West Seed Catalog Module

## Overview

A modern, image-focused product catalog system for the Wild West Seed website. This module replaces text-only seed listings with beautiful image galleries, filtering, and comprehensive product information.

---

## 🎯 Features

### Public Catalog
- **Category Pages**: Vegetables, Flowers, Herbs, and Wildflower Mixes
- **Image Galleries**: Grid/card layout with hover effects
- **Product Detail Pages**: Full specifications, growing info, and multiple images
- **Search Functionality**: Text search across products
- **Filtering**: By subcategory, organic, featured, stock status
- **Related Products**: Automatic recommendations

### Admin Panel
- **Product Management**: Create, edit, delete products
- **Image Upload**: Drag-and-drop image upload with preview
- **Bulk Filtering**: Filter by category, search products
- **Statistics Dashboard**: Category counts, featured products, inventory status
- **Quick Actions**: Edit, view, delete from admin table

### Product Features
- Multiple images per product
- Scientific names support
- Growing information (days to maturity, sun/water requirements, etc.)
- Organic/Non-GMO certifications
- Featured product highlighting
- Stock availability tracking
- Variety types (Heirloom, Hybrid, Open Pollinated)
- Tags for enhanced filtering

---

## 📂 File Structure

```
models/
  └─ SeedProduct.js          # Product database schema

routes/
  └─ wildwestCatalog.js      # API routes and page handlers

views/
  ├─ wildwest-catalog-home.ejs      # Homepage with categories
  ├─ wildwest-catalog-category.ejs  # Category product listings
  ├─ wildwest-product-detail.ejs    # Individual product page
  ├─ wildwest-catalog-admin.ejs     # Admin dashboard
  └─ wildwest-product-form.ejs      # Add/edit product form

uploads/
  └─ wildwest-products/      # Product image storage

import-wildwest-samples.js   # Sample data import script
```

---

## 🚀 Getting Started

### 1. Routes Already Registered

The module is automatically loaded in `app.js`:

```javascript
// Line ~59
const wildwestCatalogRoutes = require('./routes/wildwestCatalog');

// Line ~1120
app.use('/wildwest', wildwestCatalogRoutes);
```

### 2. Import Sample Data

```powershell
node import-wildwest-samples.js
```

This imports 21 sample products:
- 6 Vegetable varieties
- 5 Flower varieties  
- 5 Herb varieties
- 5 Wildflower mixes

### 3. Access the Catalog

**Public Catalog:**
- Home: http://localhost:3001/wildwest
- Vegetables: http://localhost:3001/wildwest/category/vegetable-seeds
- Flowers: http://localhost:3001/wildwest/category/flower-seeds
- Herbs: http://localhost:3001/wildwest/category/herbs
- Wildflower Mixes: http://localhost:3001/wildwest/category/wild-flower-mixes

**Admin Panel:**
- Dashboard: http://localhost:3001/wildwest/admin
- Add Product: http://localhost:3001/wildwest/admin/new

---

## 📊 Database Schema

### SeedProduct Model

```javascript
{
  // Basic Info
  productName: String (required),
  scientificName: String,
  category: Enum ['Vegetable', 'Flower', 'Herb', 'Wildflower Mix'],
  subcategory: String,
  description: String,
  variety: String,  // 'Heirloom', 'Hybrid', 'Open Pollinated'
  
  // Images
  images: [{
    url: String,
    caption: String,
    isPrimary: Boolean,
    order: Number
  }],
  primaryImage: String,  // Quick access to main image
  
  // Growing Information
  growingInfo: {
    daysToMaturity: Number,
    plantingDepth: String,
    spacing: String,
    sunRequirement: String,
    waterRequirement: String,
    soilType: String,
    hardiness: String,
    height: String,
    spread: String
  },
  
  // Specifications
  specifications: {
    seedCount: String,
    weight: String,
    packageSize: String,
    organic: Boolean,
    nongmo: Boolean,
    certifications: [String]
  },
  
  // Pricing
  pricing: {
    retailPrice: Number,
    wholesalePrice: Number,
    bulkPrice: Number,
    currency: String (default: 'USD')
  },
  
  // Availability
  inStock: Boolean,
  availability: Enum,
  seasonalAvailability: [String],
  
  // Marketing
  featured: Boolean,
  newArrival: Boolean,
  badge: String,
  tags: [String],
  
  // SEO
  slug: String (unique, auto-generated),
  
  // Status
  isActive: Boolean,
  sortOrder: Number,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId (User),
  updatedBy: ObjectId (User)
}
```

---

## 🔌 API Endpoints

### Public Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wildwest` | Catalog home with categories |
| GET | `/wildwest/category/:category` | Category product listings |
| GET | `/wildwest/product/:slug` | Product detail page |
| GET | `/wildwest/search?q=term` | Search products |

### Admin Routes (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/wildwest/admin` | Admin dashboard |
| GET | `/wildwest/admin/new` | New product form |
| GET | `/wildwest/admin/edit/:id` | Edit product form |
| POST | `/wildwest/admin/create` | Create product |
| POST | `/wildwest/admin/update/:id` | Update product |
| POST | `/wildwest/admin/:id/upload-image` | Upload image |
| DELETE | `/wildwest/admin/:id/image/:index` | Delete image |
| DELETE | `/wildwest/admin/:id` | Delete product |

---

## 🖼️ Image Upload

### Supported Formats
- JPEG, PNG, WebP
- Max file size: 5MB
- Stored in: `/uploads/wildwest-products/`

### Upload Process
1. Navigate to product edit page
2. Click upload area or drag & drop image
3. Image automatically saved and added to product
4. First image becomes primary image
5. Reorder by managing in admin panel

### Image Naming
Images are automatically named with pattern:
```
product-{timestamp}-{random}.{ext}
```
Example: `product-1704067200000-123456789.jpg`

---

## 🎨 Customization

### Category Icons

Edit in `wildwest-catalog-home.ejs`:

```ejs
<!-- Vegetables -->
<i class="bi bi-basket"></i>

<!-- Flowers -->
<i class="bi bi-flower2"></i>

<!-- Herbs -->
<i class="bi bi-tree"></i>

<!-- Wildflower Mixes -->
<i class="bi bi-flower3"></i>
```

### Color Scheme

Primary gradient is defined in CSS:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Modify in view files as needed.

### Product Badges

Badges are automatically displayed based on:
1. Custom `badge` field (highest priority)
2. `newArrival` flag → "New"
3. `specifications.organic` → "Organic"
4. `featured` flag → "Featured"

---

## 🔍 Search & Filtering

### Text Search
Uses MongoDB full-text search on:
- Product name
- Scientific name
- Description

### Category Filters
- By category (Vegetable, Flower, Herb, Wildflower Mix)
- By subcategory (Beans - Bush, Sunflowers, etc.)
- Featured products only
- Organic products only
- In-stock products only

### Query Examples

```javascript
// Get all organic vegetables
GET /wildwest/category/vegetables?organic=true

// Get featured flowers
GET /wildwest/category/flowers?featured=true

// Get specific subcategory
GET /wildwest/category/vegetables?subcategory=Beans - Pole

// Search all products
GET /wildwest/search?q=sunflower

// Search within category
GET /wildwest/search?q=basil&category=Herb
```

---

## 📝 Adding Products

### Via Admin Panel (Recommended)

1. Go to http://localhost:3001/wildwest/admin
2. Click "New Product" button
3. Fill in required fields:
   - Product Name
   - Category
4. Optional fields:
   - Scientific Name
   - Subcategory
   - Description
   - Variety
5. Set toggles:
   - Active
   - In Stock
   - Featured
6. Click "Create Product"
7. On edit page, upload images

### Via Code

```javascript
const SeedProduct = require('./models/SeedProduct');

const product = new SeedProduct({
  productName: 'Cherokee Purple Tomato',
  scientificName: 'Solanum lycopersicum',
  category: 'Vegetable',
  subcategory: 'Tomatoes',
  description: 'Heirloom tomato with rich, sweet flavor...',
  variety: 'Heirloom',
  featured: true,
  inStock: true,
  specifications: {
    organic: true,
    nongmo: true
  },
  growingInfo: {
    daysToMaturity: 80,
    sunRequirement: 'Full Sun',
    waterRequirement: 'Medium'
  }
});

await product.save();
```

---

## 🔐 Authentication

### Public Routes
All catalog viewing routes are **PUBLIC** - no authentication required.

### Admin Routes
Protected by middleware:
- `ensureAuthenticated` - User must be logged in
- `ensureApproved` - User must have approved status

To add authentication to public routes, modify in `app.js`:

```javascript
// Add authentication
app.use('/wildwest', ensureAuthenticated, wildwestCatalogRoutes);

// Or keep specific routes public
app.use('/wildwest', (req, res, next) => {
  // Apply auth only to /admin routes
  if (req.path.startsWith('/admin')) {
    return ensureAuthenticated(req, res, next);
  }
  next();
}, wildwestCatalogRoutes);
```

---

## 📊 Statistics & Reports

The admin dashboard displays:

- **Total Products**: Active products count
- **Category Counts**: Vegetables, Flowers, Herbs, Wildflowers
- **Featured Products**: Count of featured items
- **Products Without Images**: Products needing images

### Export Data

```javascript
// Get all products as JSON
const products = await SeedProduct.find({ isActive: true });

// Export to CSV
const csvData = products.map(p => ({
  name: p.productName,
  category: p.category,
  inStock: p.inStock,
  featured: p.featured
}));
```

---

## 🧪 Testing

### Create Test Products

```powershell
node import-wildwest-samples.js
```

### Manual Testing Checklist

- [ ] Home page loads with category cards
- [ ] Category pages show filtered products
- [ ] Product detail page displays all info
- [ ] Search returns relevant results
- [ ] Filters work correctly
- [ ] Admin dashboard loads
- [ ] Can create new product
- [ ] Can edit existing product
- [ ] Can upload images
- [ ] Can delete images
- [ ] Can delete products

---

## 🐛 Troubleshooting

### "Cannot find module './models/SeedProduct'"
- Ensure `models/SeedProduct.js` exists
- Check file path is correct in routes

### Images not uploading
- Check permissions on `/uploads/wildwest-products/` directory
- Verify multer is installed: `npm install multer`
- Check file size (max 5MB)
- Ensure file type is JPEG, PNG, or WebP

### Products not showing
- Check `isActive: true` in database
- Verify category name matches exactly
- Check MongoDB connection

### Admin access denied
- Ensure user is logged in
- Verify user has `approved: true` status
- Check middleware is applied correctly

---

## 🚀 Future Enhancements

### Planned Features
- [ ] CSV bulk import
- [ ] Product reviews/ratings
- [ ] Shopping cart integration
- [ ] Inventory management
- [ ] Price tiers (retail/wholesale/bulk)
- [ ] Seasonal availability calendar
- [ ] Growing zone compatibility
- [ ] Companion planting suggestions
- [ ] Product comparison tool
- [ ] Advanced search with facets
- [ ] Related products algorithm
- [ ] Image optimization/resizing
- [ ] CDN integration for images
- [ ] SEO meta tags
- [ ] Social media sharing
- [ ] Print-friendly catalog pages
- [ ] QR code generation

### Integration Ideas
- Link to existing vendor partnerships
- Connect to purchase order system
- Integrate with inventory tracking
- Add to email campaign system

---

## 📖 Usage Examples

### Display Featured Products on Homepage

```javascript
const featured = await SeedProduct.getFeaturedProducts(12);
```

### Get Products by Category

```javascript
const vegetables = await SeedProduct.getProductsByCategory('Vegetable', {
  organic: true,
  inStock: true
});
```

### Search Products

```javascript
const results = await SeedProduct.searchProducts('tomato', 'Vegetable');
```

### Get Product by Slug

```javascript
const product = await SeedProduct.findOne({
  slug: 'cherokee-purple-tomato',
  isActive: true
});
```

---

## 🔗 Related Modules

This module integrates with:
- **Seed Partnerships** (`/seed-partners`) - Vendor management
- **AI Seed Catalog** (`/seed-catalog`) - External seed catalog scraping
- **User Authentication** - Admin access control

---

## 📞 Support

For questions or issues:
1. Check this documentation
2. Review error logs
3. Check MongoDB connection
4. Verify all dependencies installed

---

## 📄 License

Part of the CSV Import project.

© 2024 - Wild West Seed Catalog Module
