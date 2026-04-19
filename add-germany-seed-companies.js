const mongoose = require('mongoose');
require('dotenv').config();

// Import the SeedPartner model
const SeedPartner = require('./models/SeedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const germanySeedCompanies = [
  {
    companyName: 'KWS SAAT SE',
    partnerCode: 'KWS-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Germany',
    region: 'Europe',
    city: 'Einbeck',
    address: 'Grimsehlstraße 31',
    postalCode: '37555',
    primaryContact: {
      name: 'International Sales',
      position: 'Sales Director',
      email: 'info@kws.com',
      phone: '+49 5561 311-0'
    },
    website: 'https://www.kws.com',
    seedTypes: ['Grain Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'TÜV',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 5800,
    establishedYear: 1856,
    description: 'Global leader in plant breeding and seed production, specializing in sugar beet, corn, cereals, and oilseed crops. One of the world\'s top seed companies.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 8,
    minimumOrderValue: 15000,
    notes: 'Major German seed company with strong international presence. Excellent breeding programs for sugar beet and corn.'
  },
  {
    companyName: 'Deutsche Saatveredelung AG (DSV)',
    partnerCode: 'DSV-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Germany',
    region: 'Europe',
    city: 'Lippstadt',
    address: 'Weissenburger Straße 5',
    postalCode: '59557',
    primaryContact: {
      name: 'Export Department',
      position: 'International Sales',
      email: 'info@dsv-saaten.de',
      phone: '+49 2941 296-0'
    },
    website: 'https://www.dsv-saaten.de',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds', 'Lawn & Turf Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'DQS',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 850,
    establishedYear: 1878,
    description: 'Leading European breeder and producer of forage crops, turf grass, and agricultural seeds. Strong focus on grassland and forage solutions.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 8000,
    notes: 'Excellent for forage crops and grass seeds. Strong presence in European market.'
  },
  {
    companyName: 'Feldsaaten Freudenberger GmbH & Co. KG',
    partnerCode: 'FSF-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Germany',
    region: 'Europe',
    city: 'Krefeld',
    address: 'In den Obstgärten 8',
    postalCode: '47809',
    primaryContact: {
      name: 'Sales Team',
      position: 'Business Development',
      email: 'info@freudenberger.net',
      phone: '+49 2151 4483-0'
    },
    website: 'https://www.freudenberger.net',
    seedTypes: ['Cover Crop Seeds', 'Lawn & Turf Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'TÜV Rheinland',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 280,
    establishedYear: 1948,
    description: 'Family-owned company specializing in grass seeds, forage crops, and intermediate crops. Strong expertise in sustainable agriculture.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 5,
    minimumOrderValue: 5000,
    notes: 'Good partner for sustainable agriculture solutions and cover crops.'
  },
  {
    companyName: 'Bruno Nebelung GmbH',
    partnerCode: 'BNG-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Germany',
    region: 'Europe',
    city: 'Everswinkel',
    address: 'Münsterstraße 43',
    postalCode: '48351',
    primaryContact: {
      name: 'International Sales',
      position: 'Export Manager',
      email: 'info@nebelung.de',
      phone: '+49 2582 67-0'
    },
    website: 'https://www.nebelung.de',
    seedTypes: ['Lawn & Turf Seeds', 'Vegetable Seeds', 'Flower Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'DQS',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 450,
    establishedYear: 1863,
    description: 'Major producer of turfgrass seeds and garden seeds under the Kiepenkerl brand. Strong position in European retail market.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 4,
    minimumOrderValue: 6000,
    notes: 'Excellent source for turf grass and retail garden seed products. Owner of Kiepenkerl brand.'
  },
  {
    companyName: 'Bingenheimer Saatgut AG',
    partnerCode: 'BSA-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Germany',
    region: 'Europe',
    city: 'Echzell',
    address: 'Kronstraße 24',
    postalCode: '61209',
    primaryContact: {
      name: 'Sales Department',
      position: 'Organic Sales',
      email: 'info@bingenheimersaatgut.de',
      phone: '+49 6035 1899-0'
    },
    website: 'https://www.bingenheimersaatgut.de',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Flower Seeds', 'Organic Seeds', 'Heirloom Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'EU',
        verified: true
      },
      {
        certificationType: 'USDA Organic',
        issuingAuthority: 'Demeter International',
        verified: true
      }
    ],
    companySize: 'Small',
    employeeCount: 75,
    establishedYear: 1954,
    description: 'Leading German organic and biodynamic seed company. Specializes in open-pollinated and heritage vegetable varieties.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 6,
    minimumOrderValue: 3000,
    notes: 'Premier source for certified organic and Demeter biodynamic seeds. Strong focus on biodiversity and sustainable varieties.'
  },
  {
    companyName: 'Quedlinburger Saatgut GmbH',
    partnerCode: 'QSG-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Germany',
    region: 'Europe',
    city: 'Quedlinburg',
    address: 'Chausseestraße 62',
    postalCode: '06484',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Representative',
      email: 'info@quedlinburger-saatgut.de',
      phone: '+49 3946 70550'
    },
    website: 'https://www.quedlinburger-saatgut.de',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Medium',
    employeeCount: 120,
    establishedYear: 1863,
    description: 'Traditional seed company from historic Quedlinburg seed region. Offers wide range of vegetable, flower, and herb seeds for home gardeners.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 2000,
    notes: 'Based in historic German seed production region. Good source for retail garden seed market.'
  },
  {
    companyName: 'Hild Samen GmbH',
    partnerCode: 'HSD-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Germany',
    region: 'Europe',
    city: 'Marbach',
    address: 'Schulstraße 35',
    postalCode: '71672',
    primaryContact: {
      name: 'Sales Office',
      position: 'Account Manager',
      email: 'info@hild-samen.de',
      phone: '+49 7144 8961-0'
    },
    website: 'https://www.hild-samen.de',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
    companySize: 'Small',
    employeeCount: 45,
    establishedYear: 1920,
    description: 'Family-owned seed company specializing in vegetable and flower seeds for professional growers and home gardeners.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 3,
    minimumOrderValue: 1500,
    notes: 'Good selection of vegetable seeds for both professional and retail markets.'
  },
  {
    companyName: 'Strube Research GmbH & Co. KG',
    partnerCode: 'STR-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Germany',
    region: 'Europe',
    city: 'Söllingen',
    address: 'Hauptstraße 1',
    postalCode: '38387',
    primaryContact: {
      name: 'International Business',
      position: 'Export Director',
      email: 'info@strube.net',
      phone: '+49 5354 809-0'
    },
    website: 'https://www.strube.net',
    seedTypes: ['Grain Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'TÜV',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 650,
    establishedYear: 1877,
    description: 'International plant breeding company specializing in sugar beet varieties. Strong research and development capabilities.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 8,
    minimumOrderValue: 10000,
    notes: 'Specialized in sugar beet breeding with excellent genetics and international distribution.'
  },
  {
    companyName: 'Sperli GmbH',
    partnerCode: 'SPL-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Germany',
    region: 'Europe',
    city: 'Everswinkel',
    address: 'Münsterstraße 58',
    postalCode: '48351',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Manager',
      email: 'info@sperli.de',
      phone: '+49 2582 67-263'
    },
    website: 'https://www.sperli.de',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Medium',
    employeeCount: 95,
    establishedYear: 1788,
    description: 'One of Germany\'s oldest seed companies. Specializes in seeds for home gardeners with wide variety selection.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 2500,
    notes: 'Historic German brand with strong retail presence. Excellent for home garden market.'
  },
  {
    companyName: 'Saaten-Union GmbH',
    partnerCode: 'SUG-DE-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Germany',
    region: 'Europe',
    city: 'Isernhagen',
    address: 'Eisenstraße 12',
    postalCode: '30916',
    primaryContact: {
      name: 'Sales Office',
      position: 'Business Development',
      email: 'info@saaten-union.de',
      phone: '+49 511 72666-0'
    },
    website: 'https://www.saaten-union.de',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'DQS',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 420,
    establishedYear: 1949,
    description: 'Major German plant breeding organization focusing on cereals, oilseeds, and forage crops. Strong European distribution network.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 7000,
    notes: 'Leading German breeder with excellent cereal and oilseed varieties. Strong agricultural focus.'
  }
];

async function addGermanSeedCompanies() {
  try {
    // Create all partners
    const results = await SeedPartner.insertMany(germanySeedCompanies);
    
    console.log(`\n✅ Created ${results.length} German seed companies:`);
    results.forEach(partner => {
      console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
    });
    
    console.log('\n📊 To view these partners, go to:');
    console.log('   http://localhost:3001/seed-partners?country=Germany');
    console.log('\n🇩🇪 Germany is now represented in your world seed partnership database!');
    
  } catch (error) {
    console.error('❌ Error creating German seed companies:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
addGermanSeedCompanies();
