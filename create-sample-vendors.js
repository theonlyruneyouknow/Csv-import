const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/farming_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function createSampleVendors() {
    console.log('🌱 Creating sample vendor data...');

    const sampleVendors = [
        {
            vendorName: "Johnny's Selected Seeds",
            vendorCode: "JSS",
            vendorType: "Seeds",
            contactInfo: {
                primaryContact: {
                    name: "Sarah Johnson",
                    title: "Sales Representative",
                    email: "sarah.johnson@johnnyseeds.com",
                    phone: "(800) 854-2580",
                    mobile: "(555) 123-4567"
                },
                customerService: {
                    email: "orders@johnnyseeds.com",
                    phone: "(800) 854-2580",
                    hours: "Mon-Fri 8AM-6PM EST"
                }
            },
            address: {
                street: "955 Benton Ave",
                city: "Winslow",
                state: "ME",
                zipCode: "04901",
                country: "United States"
            },
            businessInfo: {
                website: "https://www.johnnyseeds.com",
                businessType: "Corporation"
            },
            paymentTerms: {
                terms: "Net 30",
                discount: "2% 10 Net 30"
            },
            items: [
                {
                    itemCode: "3028",
                    itemName: "Bolero Carrot",
                    description: "Nantes type carrot with excellent flavor",
                    category: "Seeds",
                    variety: "Bolero",
                    unitOfMeasure: "packet",
                    currentPrice: 4.95,
                    priceEffectiveDate: new Date(),
                    minimumOrder: 1,
                    leadTime: "7-10 days",
                    availability: "In Stock"
                },
                {
                    itemCode: "2851",
                    itemName: "Red Sails Lettuce",
                    description: "Heat tolerant loose leaf lettuce",
                    category: "Seeds",
                    variety: "Red Sails",
                    unitOfMeasure: "packet",
                    currentPrice: 3.50,
                    priceEffectiveDate: new Date(),
                    minimumOrder: 1,
                    leadTime: "7-10 days",
                    availability: "In Stock"
                }
            ],
            performance: {
                totalOrders: 15,
                totalSpent: 2500.00,
                averageOrderValue: 166.67,
                onTimeDelivery: 95,
                qualityRating: 5,
                overallRating: 5,
                lastOrderDate: new Date('2024-09-15'),
                firstOrderDate: new Date('2023-01-15')
            },
            status: "Active",
            notes: "Excellent quality seeds with fast shipping. Primary supplier for lettuce and carrot varieties."
        },
        {
            vendorName: "Southern Exposure Seed Exchange",
            vendorCode: "SESE",
            vendorType: "Organic Seeds",
            contactInfo: {
                primaryContact: {
                    name: "Mike Johnson",
                    title: "Customer Service Manager",
                    email: "mike@southernexposure.com",
                    phone: "(540) 894-9480"
                }
            },
            address: {
                street: "P.O. Box 460",
                city: "Mineral",
                state: "VA",
                zipCode: "23117",
                country: "United States"
            },
            businessInfo: {
                website: "https://www.southernexposure.com",
                businessType: "LLC"
            },
            paymentTerms: {
                terms: "Net 30"
            },
            items: [
                {
                    itemCode: "TOM001",
                    itemName: "Cherokee Purple Tomato",
                    description: "Heirloom beefsteak tomato with excellent flavor",
                    category: "Seeds",
                    variety: "Cherokee Purple",
                    unitOfMeasure: "packet",
                    currentPrice: 4.50,
                    priceEffectiveDate: new Date(),
                    minimumOrder: 1,
                    leadTime: "10-14 days",
                    availability: "In Stock"
                }
            ],
            performance: {
                totalOrders: 8,
                totalSpent: 450.00,
                averageOrderValue: 56.25,
                onTimeDelivery: 90,
                qualityRating: 4,
                overallRating: 4,
                lastOrderDate: new Date('2024-08-20'),
                firstOrderDate: new Date('2023-03-10')
            },
            status: "Active",
            notes: "Specializes in heirloom and organic varieties. Good source for unique tomato varieties."
        },
        {
            vendorName: "FarmTek Equipment",
            vendorCode: "FTE",
            vendorType: "Equipment",
            contactInfo: {
                primaryContact: {
                    name: "David Wilson",
                    title: "Sales Manager",
                    email: "david.wilson@farmtek.com",
                    phone: "(800) 327-6835"
                }
            },
            address: {
                street: "1440 Field of Dreams Way",
                city: "Dyersville",
                state: "IA",
                zipCode: "52040",
                country: "United States"
            },
            businessInfo: {
                website: "https://www.farmtek.com",
                businessType: "Corporation"
            },
            paymentTerms: {
                terms: "Net 45"
            },
            items: [
                {
                    itemCode: "GH2040",
                    itemName: "20x40 Greenhouse Kit",
                    description: "Commercial grade greenhouse with twin wall polycarbonate",
                    category: "Equipment",
                    unitOfMeasure: "each",
                    currentPrice: 12500.00,
                    priceEffectiveDate: new Date(),
                    minimumOrder: 1,
                    leadTime: "4-6 weeks",
                    availability: "In Stock"
                },
                {
                    itemCode: "IRR100",
                    itemName: "Drip Irrigation Kit",
                    description: "Complete drip irrigation system for 1 acre",
                    category: "Equipment",
                    unitOfMeasure: "kit",
                    currentPrice: 850.00,
                    priceEffectiveDate: new Date(),
                    minimumOrder: 1,
                    leadTime: "2-3 weeks",
                    availability: "Limited Stock"
                }
            ],
            performance: {
                totalOrders: 3,
                totalSpent: 15200.00,
                averageOrderValue: 5066.67,
                onTimeDelivery: 85,
                qualityRating: 4,
                overallRating: 4,
                lastOrderDate: new Date('2024-07-10'),
                firstOrderDate: new Date('2023-05-20')
            },
            status: "Active",
            notes: "Large equipment purchases. Longer lead times but good quality products."
        },
        {
            vendorName: "BioWorks Inc",
            vendorCode: "BWI",
            vendorType: "Supplies",
            contactInfo: {
                primaryContact: {
                    name: "Lisa Chen",
                    title: "Technical Sales Rep",
                    email: "lisa.chen@bioworks.com",
                    phone: "(800) 877-9443"
                }
            },
            address: {
                street: "100 Rawson Road",
                city: "Victor",
                state: "NY",
                zipCode: "14564",
                country: "United States"
            },
            businessInfo: {
                website: "https://www.bioworks.com",
                businessType: "Corporation"
            },
            paymentTerms: {
                terms: "Net 30"
            },
            items: [
                {
                    itemCode: "BT100",
                    itemName: "BotaniGard ES",
                    description: "Biological insecticide for aphid and whitefly control",
                    category: "Supplies",
                    unitOfMeasure: "gallon",
                    currentPrice: 245.00,
                    priceEffectiveDate: new Date(),
                    minimumOrder: 1,
                    leadTime: "5-7 days",
                    availability: "In Stock"
                }
            ],
            performance: {
                totalOrders: 12,
                totalSpent: 3200.00,
                averageOrderValue: 266.67,
                onTimeDelivery: 98,
                qualityRating: 5,
                overallRating: 5,
                lastOrderDate: new Date('2024-09-10'),
                firstOrderDate: new Date('2023-02-01')
            },
            status: "Active",
            notes: "Excellent biological pest control products. Very reliable shipping."
        },
        {
            vendorName: "Peaceful Valley Farm Supply",
            vendorCode: "PVFS",
            vendorType: "Organic Seeds",
            contactInfo: {
                primaryContact: {
                    name: "Janet Martinez",
                    title: "Organic Specialist",
                    email: "janet@groworganic.com",
                    phone: "(888) 784-1722"
                }
            },
            address: {
                street: "125 Clydesdale Court",
                city: "Grass Valley",
                state: "CA",
                zipCode: "95945",
                country: "United States"
            },
            businessInfo: {
                website: "https://www.groworganic.com",
                businessType: "LLC"
            },
            paymentTerms: {
                terms: "Net 30"
            },
            certifications: [
                {
                    type: "OMRI Listed",
                    number: "OMRI-2024-001",
                    issuer: "OMRI",
                    issueDate: new Date('2024-01-01'),
                    expirationDate: new Date('2024-12-31'),
                    status: "Active"
                }
            ],
            performance: {
                totalOrders: 6,
                totalSpent: 800.00,
                averageOrderValue: 133.33,
                onTimeDelivery: 92,
                qualityRating: 4,
                overallRating: 4,
                lastOrderDate: new Date('2024-08-05'),
                firstOrderDate: new Date('2023-04-15')
            },
            status: "Active",
            notes: "Great source for organic inputs and OMRI listed products."
        }
    ];

    try {
        // Clear existing vendors
        await Vendor.deleteMany({});
        console.log('✅ Cleared existing vendor data');

        // Insert sample vendors
        const vendors = await Vendor.insertMany(sampleVendors);
        console.log(`✅ Created ${vendors.length} sample vendors:`);
        
        vendors.forEach(vendor => {
            console.log(`   - ${vendor.vendorName} (${vendor.vendorCode})`);
        });

        console.log('\n🎉 Sample vendor data created successfully!');
        console.log('📊 Visit /vendors to see your new vendors dashboard');

    } catch (error) {
        console.error('❌ Error creating sample data:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the script
createSampleVendors();
