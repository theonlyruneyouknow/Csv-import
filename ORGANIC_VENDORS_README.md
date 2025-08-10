# Organic Vendors Dashboard

## Overview
The Organic Vendors Dashboard is a comprehensive system for managing organic vendor certifications and compliance tracking. It provides full lifecycle management of organic vendors with certification tracking, document storage, and compliance monitoring.

## Features

### 📋 Vendor Management
- **Vendor Information**: Store vendor name, internal ID, contact details, and address
- **Certification Tracking**: Track last organic certification date and status
- **Status Management**: Active, Inactive, Pending Review, Certification Expired
- **TSC Integration**: Track TSC items and descriptions

### 🌱 Organic Seeds Management
- Track organic seed varieties per vendor
- Certification status for each seed type
- Categorized by seed type (vegetables, herbs, flowers, etc.)

### 📄 Document Management
- **Certificate Upload**: Store and view organic certificates (PDF, DOC, images)
- **Operations Profile**: Store vendor operations profiles
- **Document Viewer**: Built-in document viewer with modal display

### 🔗 External Integration
- **Official Organic Database**: Links to USDA organic database
- **Quick Database Search**: Direct links to find vendors in official database
- **Database ID Tracking**: Store official organic database IDs

### 📊 Dashboard Features
- **Statistics Overview**: Total vendors, active count, expired certifications
- **Filtering & Sorting**: Filter by status, sort by various fields
- **Search Functionality**: Search across vendor names, IDs, TSC items
- **Certification Status Indicators**: Visual status indicators (Current, Expiring Soon, Expired)

## Data Model

### OrganicVendor Schema
```javascript
{
  vendorName: String (required),
  internalId: String (required, unique),
  lastOrganicCertificationDate: Date (required),
  
  // Certificate and operations documents
  certificate: {
    filename: String,
    data: String (base64),
    mimeType: String,
    uploadDate: Date
  },
  
  operationsProfile: {
    filename: String,
    data: String (base64), 
    mimeType: String,
    uploadDate: Date
  },
  
  // Organic seeds tracking
  organicSeeds: [{
    name: String,
    variety: String,
    certificationStatus: String,
    notes: String
  }],
  
  // TSC information
  tscItem: String,
  tscDescription: String,
  
  // External database links
  organicDatabaseId: String,
  organicDatabaseUrl: String,
  
  // Contact information
  contactPerson: String,
  email: String,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  // Status and tracking
  status: String (enum),
  notes: String,
  createdAt: Date,
  updatedAt: Date,
  lastReviewDate: Date,
  nextReviewDate: Date
}
```

### Virtual Fields
- `daysSinceLastCertification`: Calculated days since last certification
- `certificationStatus`: Automatic status based on certification date
  - Current: < 330 days
  - Expiring Soon: 330-365 days  
  - Expired: > 365 days

## API Endpoints

### Dashboard Routes
- `GET /organic-vendors` - Main dashboard page
- `GET /organic-vendors/api/vendors` - AJAX API for filtered vendor data

### Vendor CRUD Operations  
- `POST /organic-vendors` - Create new vendor
- `PUT /organic-vendors/:id` - Update existing vendor
- `DELETE /organic-vendors/:id` - Delete vendor
- `GET /organic-vendors/:id` - Get single vendor details

### Document Management
- `GET /organic-vendors/:id/certificate` - Download/view certificate
- `GET /organic-vendors/:id/operations-profile` - Download/view operations profile

## File Upload Support
- **Supported formats**: PDF, DOC, DOCX, JPG, PNG
- **File size limit**: 10MB per file
- **Storage**: Base64 encoded in MongoDB
- **Security**: File type validation and size limits

## Dashboard Navigation
The organic vendors dashboard is accessible from the main purchase orders dashboard via the "🌱 Organic Vendors" button in the navigation bar.

## Sample Data
The system includes 5 sample vendors:
1. Green Fields Organic Farm (GF001)
2. Sunrise Organic Seeds Co. (SOS002)  
3. Heritage Organic Growers (HOG003)
4. Pacific Northwest Seeds (PNS004)
5. Desert Bloom Organics (DBO005)

## Usage Instructions

### Adding a New Vendor
1. Click "Add Vendor" button
2. Fill in required fields (name, internal ID, certification date)
3. Upload certificate and/or operations profile (optional)
4. Add organic seeds information
5. Set TSC item details
6. Save vendor

### Managing Documents
1. Click "Certificate" or "Operations" button on vendor row
2. Document opens in inline viewer
3. Click button again to close viewer

### Linking to Organic Database
1. If vendor has database URL, click "Organic DB" button
2. If no URL, click "Find in DB" to search USDA database
3. Update vendor record with found database ID and URL

### Filtering and Searching
- Use status filter dropdown to show specific vendor statuses
- Use search box to find vendors by name, ID, or TSC information
- Sort by any column using the sort dropdown

## Future Enhancements
- Automatic expiration notifications
- Bulk import from CSV
- Export to various formats
- Integration with email notifications
- Advanced reporting and analytics
- Certificate renewal tracking
- Audit trail for changes
