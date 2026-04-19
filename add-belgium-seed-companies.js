const mongoose = require('mongoose');
require('dotenv').config();

// Import the SeedPartner model
const SeedPartner = require('./models/SeedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const belgiumSeedCompanies = [
  {
    companyName: 'Bejo Zaden Belgium',
    partnerCode: 'BEJ-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Belgium',
    region: 'Europe',
    city: 'Sint-Katelijne-Waver',
    address: 'Troonstraat 112',
    postalCode: '2860',
    primaryContact: {
      name: 'Belgian Operations',
      position: 'Country Manager',
      email: 'info.belgium@bejo.com',
      phone: '+32 15 55 86 00'
    },
    website: 'https://www.bejo.be',
    seedTypes: ['Vegetable Seeds', 'Hybrid Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      },
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'SGS',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 220,
    establishedYear: 1978,
    description: 'Belgian operations of Dutch seed giant Bejo. Specializes in vegetable seeds for professional growers, particularly lettuce, carrots, and brassicas.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 5,
    minimumOrderValue: 8000,
    notes: 'Part of major international Bejo group. Excellent for vegetable seeds with strong Belgian distribution network.'
  },
  {
    companyName: 'Corteva Agriscience Belgium',
    partnerCode: 'COR-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Belgium',
    region: 'Europe',
    city: 'Machelen',
    address: 'Pegasus Park',
    postalCode: '1831',
    primaryContact: {
      name: 'Belgian Division',
      position: 'Business Director',
      email: 'info.belgium@corteva.com',
      phone: '+32 2 721 21 11'
    },
    website: 'https://www.corteva.be',
    seedTypes: ['Grain Seeds', 'Hybrid Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'Bureau Veritas',
        verified: true
      },
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 380,
    establishedYear: 1952,
    description: 'Belgian operations of global agricultural leader Corteva (formerly Pioneer/DuPont). Specializes in corn, sunflower, and cereal seeds for European market.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 7,
    minimumOrderValue: 15000,
    notes: 'Global leader with strong Belgian presence. Excellent corn and cereal breeding programs. Part of Corteva Agriscience.'
  },
  {
    companyName: 'Vreeke\'s Zaden Belgium',
    partnerCode: 'VRE-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Belgium',
    region: 'Europe',
    city: 'Lier',
    address: 'Lispersteenweg 303',
    postalCode: '2500',
    primaryContact: {
      name: 'Sales Department',
      position: 'Account Manager',
      email: 'info@vreekes.be',
      phone: '+32 3 480 14 76'
    },
    website: 'https://www.vreekes.be',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
    companySize: 'Small',
    employeeCount: 45,
    establishedYear: 1968,
    description: 'Belgian vegetable and flower seed distributor serving professional growers and garden centers. Good selection of varieties for Belgian market.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 3,
    minimumOrderValue: 2000,
    notes: 'Regional distributor with good local market knowledge. Strong in Belgian horticultural sector.'
  },
  {
    companyName: 'De Bolster',
    partnerCode: 'BOL-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Belgium',
    region: 'Europe',
    city: 'Herent',
    address: 'Kapeldreef 60',
    postalCode: '3020',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Manager',
      email: 'info@debolster.be',
      phone: '+32 16 22 44 22'
    },
    website: 'https://www.debolster.be',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Organic Seeds', 'Heirloom Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'Certisys',
        verified: true
      }
    ],
    companySize: 'Small',
    employeeCount: 35,
    establishedYear: 1956,
    description: 'Belgian organic and biodynamic seed company specializing in traditional varieties and heritage seeds. Strong focus on biodiversity and sustainable gardening.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 1500,
    notes: 'Excellent source for organic and heritage seeds. Strong commitment to biodiversity and traditional varieties.'
  },
  {
    companyName: 'Limagrain Belgium',
    partnerCode: 'LIM-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Belgium',
    region: 'Europe',
    city: 'Melle',
    address: 'Brusselsesteenweg 456',
    postalCode: '9090',
    primaryContact: {
      name: 'Belgian Operations',
      position: 'Commercial Director',
      email: 'info.belgium@limagrain.com',
      phone: '+32 9 252 37 11'
    },
    website: 'https://www.lgseeds.be',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'Bureau Veritas',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 285,
    establishedYear: 1965,
    description: 'Belgian subsidiary of French seed giant Limagrain. Specializes in cereal seeds, corn, and forage crops for Belgian and Benelux markets.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 10000,
    notes: 'Part of world\'s 4th largest seed company. Excellent cereal and corn breeding programs for northern Europe.'
  },
  {
    companyName: 'Beekenkamp Plants & Seeds',
    partnerCode: 'BEE-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Belgium',
    region: 'Europe',
    city: 'Destelbergen',
    address: 'Industriepark 1',
    postalCode: '9070',
    primaryContact: {
      name: 'Sales Office',
      position: 'Business Development',
      email: 'info@beekenkamp.be',
      phone: '+32 9 355 70 00'
    },
    website: 'https://www.beekenkamp.be',
    seedTypes: ['Flower Seeds', 'Vegetable Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 145,
    establishedYear: 1980,
    description: 'Belgian operations of Dutch horticultural company. Specializes in flower seeds, young plants, and vegetable transplants for professional growers.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 4,
    minimumOrderValue: 4000,
    notes: 'Strong in ornamental seeds and young plants. Good for horticultural production.'
  },
  {
    companyName: 'Semillas Belgium (Fitó Group)',
    partnerCode: 'SFI-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Belgium',
    region: 'Europe',
    city: 'Antwerp',
    address: 'Haven 1025',
    postalCode: '2070',
    primaryContact: {
      name: 'Benelux Division',
      position: 'Regional Manager',
      email: 'benelux@fito.es',
      phone: '+32 3 543 12 34'
    },
    website: 'https://www.semillasfito.com',
    seedTypes: ['Vegetable Seeds', 'Hybrid Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 95,
    establishedYear: 1998,
    description: 'Belgian distribution center of Spanish seed company Fitó. Serves Benelux markets with vegetable seeds, particularly tomatoes and peppers.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 5,
    minimumOrderValue: 6000,
    notes: 'Part of Spanish Fitó group. Good for Mediterranean vegetable varieties in Benelux region.'
  },
  {
    companyName: 'Vandaele Seeds & Bulbs',
    partnerCode: 'VAN-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Belgium',
    region: 'Europe',
    city: 'Kortrijk',
    address: 'Industrieweg 82',
    postalCode: '8510',
    primaryContact: {
      name: 'Commercial Team',
      position: 'Sales Director',
      email: 'info@vandaeleseeds.be',
      phone: '+32 56 35 42 15'
    },
    website: 'https://www.vandaeleseeds.be',
    seedTypes: ['Flower Seeds', 'Vegetable Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Small',
    employeeCount: 52,
    establishedYear: 1972,
    description: 'West Flemish seed and bulb company specializing in flower seeds, vegetable seeds, and flower bulbs for retail and wholesale markets.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 3,
    minimumOrderValue: 2500,
    notes: 'Regional specialist with good flower seed and bulb selection. Strong in Belgian retail market.'
  },
  {
    companyName: 'Cebeco Seeds Belgium',
    partnerCode: 'CEB-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Belgium',
    region: 'Europe',
    city: 'Gent',
    address: 'Agriportstraat 1',
    postalCode: '9000',
    primaryContact: {
      name: 'Belgian Operations',
      position: 'Country Manager',
      email: 'info@cebeco.be',
      phone: '+32 9 264 78 00'
    },
    website: 'https://www.cebeco.be',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds', 'Lawn & Turf Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'Lloyd\'s Register',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 195,
    establishedYear: 1963,
    description: 'Belgian agricultural seed cooperative specializing in cereal seeds, grass seeds, and forage crops for Belgian farming sector.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 5,
    minimumOrderValue: 7000,
    notes: 'Agricultural cooperative with strong farmer relationships. Good for cereal and forage varieties.'
  },
  {
    companyName: 'Horti-Plan Belgium',
    partnerCode: 'HOP-BE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Belgium',
    region: 'Europe',
    city: 'Aalter',
    address: 'Lostraat 44',
    postalCode: '9880',
    primaryContact: {
      name: 'Sales Department',
      position: 'Account Manager',
      email: 'info@hortiplan.be',
      phone: '+32 9 374 68 90'
    },
    website: 'https://www.hortiplan.be',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Organic Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'Certisys',
        verified: true
      }
    ],
    companySize: 'Small',
    employeeCount: 38,
    establishedYear: 1989,
    description: 'Belgian organic vegetable seed specialist serving professional market gardeners. Focus on organic and sustainable production methods.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 2000,
    notes: 'Organic specialist with good technical support for organic growers. Growing presence in Belgian organic sector.'
  }
];

async function addBelgiumSeedCompanies() {
  try {
    // Create all partners
    const results = await SeedPartner.insertMany(belgiumSeedCompanies);
    
    console.log(`\n✅ Created ${results.length} Belgian seed companies:`);
    results.forEach(partner => {
      console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
    });
    
    console.log('\n📊 To view these partners, go to:');
    console.log('   http://localhost:3001/seed-partners?country=Belgium');
    console.log('\n🇧🇪 Belgium is now represented in your global seed partnership database!');
    console.log('\n💪 Small but mighty indeed - Belgium punches above its weight in seeds!');
    
  } catch (error) {
    console.error('❌ Error creating Belgian seed companies:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
addBelgiumSeedCompanies();
