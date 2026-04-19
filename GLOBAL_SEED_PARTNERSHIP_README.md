# Global Seed Partnership Module

## Overview

The **Global Seed Partnership** module is a comprehensive system for managing international and domestic seed business partnerships. This module enables you to track potential suppliers, active clients, manage certifications, monitor communications, and build a global seed import/export network.

## Features

### 🌍 Partnership Management
- Track both **international** and **domestic** partners
- Support for **suppliers**, **clients**, or **dual-role** partners
- Multiple partnership statuses (Prospective, Active, On Hold, Inactive, Terminated)
- Priority rating system (1-5 stars)
- Regional organization (North America, Europe, Asia, Africa, etc.)

### 📋 Comprehensive Partner Profiles
Each partner profile includes:
- **Basic Information**: Company name, partner code, country, region
- **Contact Management**: Primary, secondary, and multiple additional contacts
- **Business Details**: Website, year established, employee count, company profile
- **Seed Specializations**: Track 13+ seed type categories
- **Financial Terms**: Currency, payment terms, credit limits, banking details
- **Trade Details**: Incoterms, shipping methods, lead times, MOQ
- **Certifications**: USDA Organic, EU Organic, GlobalGAP, Phytosanitary, etc.
- **Performance Metrics**: On-time delivery, quality rates, responsiveness ratings
- **Quality Tracking**: Germination rates, purity rates, audit history
- **Documents**: Upload and manage certificates, contracts, price lists
- **Communication Log**: Track all interactions with follow-up reminders

### 📊 Dashboard & Analytics
- **Real-time Statistics**:
  - Total partners count
  - International vs. domestic breakdown
  - Active vs. prospective partners
  - Total order value tracking
  - Geographic distribution

- **Advanced Filtering**:
  - Filter by status, type, region, or country
  - Search by company name, code, or tags
  - Quick access to filtered views

- **Regional Insights**:
  - Visual breakdown of partners by region
  - Country distribution statistics
  - Seed type specialization analysis

### 🔍 Partner Detail Pages
Complete partner profiles with tabbed interface:
- **Overview**: Key metrics, seed types, business summary
- **Contact Information**: All contact details with communication preferences
- **Certifications**: View certifications with expiry tracking
- **Communications**: Complete communication history with follow-ups
- **Documents**: Uploaded files and certificates
- **Performance**: Quality and delivery metrics

### 🚨 Alerts & Notifications
- Certificate expiration warnings (30-day advance notice)
- Follow-up reminders for communications
- Days since last order tracking

## Getting Started

### Installation

1. The module is already integrated into your application
2. Routes are automatically loaded in `app.js`
3. No additional dependencies required

### Initial Setup

Run the seed data script to create sample partners:

```bash
node create-sample-seed-partners.js
```

This will create 6 sample partner companies from different regions:
- 🇳🇱 Dutch Seeds International (Europe - Active Supplier)
- 🇨🇳 Pacific Seed Company (Asia - Active Supplier)  
- 🇺🇸 Heritage Seeds Co. (North America - Active Supplier)
- 🇦🇺 Australian Seed Growers (Australia - Active Client)
- 🇦🇷 BioSemillas Argentina (South America - Prospective)
- 🇰🇪 Kenya Seeds Ltd (Africa - Prospective Client)

### Access the Dashboard

Navigate to: `http://localhost:3000/seed-partners`

## File Structure

```
├── models/
│   └── SeedPartner.js          # Partner data model
├── routes/
│   └── seedPartners.js         # All routes and API endpoints
├── views/
│   ├── seed-partnership-dashboard.ejs   # Main dashboard
│   ├── seed-partner-detail.ejs          # Partner detail page
│   └── seed-partner-form.ejs            # Create/edit form
└── create-sample-seed-partners.js       # Sample data script
```

## API Endpoints

### Dashboard & Views
- `GET /seed-partners` - Main dashboard with filters
- `GET /seed-partners/new` - New partner form
- `GET /seed-partners/:id` - Partner detail page
- `GET /seed-partners/:id/edit` - Edit partner form

### API Routes
- `GET /seed-partners/api/partners` - Get all partners (JSON)
- `GET /seed-partners/api/partners/:id` - Get single partner (JSON)
- `POST /seed-partners/new` - Create new partner
- `POST /seed-partners/:id/edit` - Update partner
- `POST /seed-partners/:id/delete` - Soft delete partner
- `POST /seed-partners/:id/update-status` - Quick status update
- `POST /seed-partners/:id/update-priority` - Quick priority update

### Communication & Documents
- `POST /seed-partners/:id/communication` - Add communication log entry
- `POST /seed-partners/:id/documents` - Upload document
- `POST /seed-partners/:id/certifications` - Add certification

## Seed Type Categories

The system supports tracking 13 seed type specializations:
1. Vegetable Seeds
2. Flower Seeds
3. Herb Seeds
4. Grain Seeds
5. Cover Crop Seeds
6. Organic Seeds
7. Hybrid Seeds
8. Heirloom Seeds
9. GMO Seeds
10. Native Seeds
11. Wildflower Seeds
12. Lawn & Turf Seeds
13. Other

## Certification Types Supported

- USDA Organic
- EU Organic
- GlobalGAP
- ISTA (International Seed Testing)
- Phytosanitary
- Non-GMO Project
- OMRI Listed
- ISO 9001
- Other (custom)

## Incoterms Support

The module supports all major international trade terms:
- **EXW** (Ex Works)
- **FCA** (Free Carrier)
- **CPT** (Carriage Paid To)
- **CIP** (Carriage and Insurance Paid To)
- **DAP** (Delivered at Place)
- **DPU** (Delivered at Place Unloaded)
- **DDP** (Delivered Duty Paid)
- **FAS** (Free Alongside Ship)
- **FOB** (Free on Board)
- **CFR** (Cost and Freight)
- **CIF** (Cost, Insurance and Freight)

## Usage Examples

### Creating a New Partner

1. Click "Add New Partner" button on dashboard
2. Fill in required fields:
   - Company Name
   - Partner Code (unique identifier)
   - Partnership Type
   - Country & Region
3. Add seed specializations (check all applicable)
4. Fill in contact information
5. Set financial and trade terms
6. Click "Create Partner"

### Filtering Partners

Use the filters section to:
- View only active suppliers
- Filter by specific region (e.g., "Europe")
- Search by company name or code
- Combine multiple filters

### Logging Communication

1. Open partner detail page
2. Go to "Communications" tab
3. Click "Add Communication"
4. Select method (Email, Phone, Video Call, etc.)
5. Add subject and summary
6. Set follow-up reminder if needed

### Uploading Documents

1. Open partner detail page
2. Go to "Documents" tab
3. Click "Upload Document"
4. Select document type
5. Choose file
6. Add notes and expiry date (if applicable)

## Integration with PO Dashboard

The Global Seed Partnership module is designed to work alongside your existing Purchase Order Dashboard (P.O.D.). Future enhancements may include:

- Direct PO creation from partner profiles
- Automatic vendor linking
- Order history tracking
- Performance metrics based on PO data
- Shipment tracking integration

## Best Practices

### Partner Codes
Use a consistent format for partner codes:
- **Format**: `[3-LETTER-CODE]-[COUNTRY]-[NUMBER]`
- **Example**: `DSI-NL-001` (Dutch Seeds International, Netherlands, #001)

### Priority Ratings
- **Priority 1**: Critical partners, high volume, strategic importance
- **Priority 2**: Important regular partners
- **Priority 3**: Standard partners
- **Priority 4**: Occasional partners
- **Priority 5**: Low-volume or backup partners

### Communication Logging
- Log all significant communications
- Set follow-up dates proactively
- Review communication history before reaching out
- Update contact preferences based on responses

### Certificate Management
- Upload certificates as soon as received
- Set expiry dates to receive advance warnings
- Verify certificates before marking as verified
- Keep physical copies in secure location

## Security Considerations

⚠️ **Important**: This module stores sensitive business information including:
- Banking details
- Payment terms
- Trade secrets
- Contact information

**Recommendations**:
1. Ensure authentication is enabled (`ensureAuthenticated` middleware)
2. Consider encrypting banking details in production
3. Implement role-based access control
4. Regular backup of partner data
5. Audit trail for sensitive changes

## Future Enhancements

Potential additions for future versions:
- [ ] Order history timeline integration
- [ ] Automated email templates for communications
- [ ] Calendar integration for follow-ups
- [ ] Multi-currency conversion
- [ ] Advanced analytics and reporting
- [ ] Bulk import from CSV
- [ ] Export partner directory
- [ ] Contract management system
- [ ] Compliance checklist tracking
- [ ] Integration with shipping carriers

## Support & Customization

### Customizing Seed Types
Edit `models/SeedPartner.js`, lines 46-61 to add/modify seed types.

### Customizing Regions
Edit `models/SeedPartner.js`, lines 39-41 to add/modify regions.

### Customizing Certifications
Edit `models/SeedPartner.js`, lines 74-85 to add/modify certification types.

## Troubleshooting

### Dashboard not showing
1. Verify MongoDB connection
2. Check if routes are properly loaded in `app.js`
3. Ensure authentication middleware is working
4. Check browser console for JavaScript errors

### Partners not saving
1. Check MongoDB connection
2. Verify all required fields are filled
3. Ensure unique constraints (companyName, partnerCode)
4. Check server logs for validation errors

### Sample data not loading
1. Verify MongoDB connection string in `.env`
2. Run with: `node create-sample-seed-partners.js`
3. Check for duplicate partner codes
4. Review console output for errors

## License

This module is part of your proprietary application. All rights reserved.

## Version History

- **v1.0.0** (Current) - Initial release
  - Complete dashboard
  - Partner CRUD operations
  - Communication logging
  - Document management
  - Certification tracking
  - Performance metrics
  - Sample data generation

---

**Created**: April 2026  
**Module Type**: Business Partnership Management  
**Status**: Production Ready
