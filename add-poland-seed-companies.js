const mongoose = require('mongoose');
require('dotenv').config();

// Import the SeedPartner model
const SeedPartner = require('./models/SeedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const polandSeedCompanies = [
  {
    companyName: 'POLAN (Przedsiębiorstwo Nasienne)',
    partnerCode: 'POL-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Poland',
    region: 'Europe',
    city: 'Poznań',
    address: 'ul. Kasztanowa 3',
    postalCode: '60-124',
    primaryContact: {
      name: 'Export Department',
      position: 'International Sales Director',
      email: 'export@polan.com.pl',
      phone: '+48 61 847 72 00'
    },
    website: 'https://www.polan.com.pl',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'TÜV',
        verified: true
      },
      {
        certificationType: 'ISTA (International Seed Testing)',
        issuingAuthority: 'ISTA',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 520,
    establishedYear: 1951,
    description: 'Leading Polish seed company specializing in cereal seeds, rapeseed, and forage crops. Major player in Central European agricultural seed market.',
    currency: 'PLN',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 8000,
    notes: 'Major Polish agricultural seed producer with strong breeding programs. Excellent for Central European cereal varieties.'
  },
  {
    companyName: 'Hodowla Roślin Smolice (HR Smolice)',
    partnerCode: 'HRS-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Poland',
    region: 'Europe',
    city: 'Smolice',
    address: 'ul. Parkowa 1',
    postalCode: '63-740',
    primaryContact: {
      name: 'Commercial Department',
      position: 'Sales Director',
      email: 'info@hrsmolice.pl',
      phone: '+48 62 761 55 00'
    },
    website: 'https://www.hrsmolice.pl',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'Bureau Veritas',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 680,
    establishedYear: 1982,
    description: 'Premier Polish plant breeding company specializing in cereals, rapeseed, and legumes. One of the largest breeding stations in Central Europe.',
    currency: 'PLN',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 7,
    minimumOrderValue: 10000,
    notes: 'Top Polish breeding company with excellent winter wheat, rapeseed, and barley varieties. Strong R&D capabilities.'
  },
  {
    companyName: 'PHRS (Przedsiębiorstwo Hodowli Roślin i Nasiennictwa)',
    partnerCode: 'PHR-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Poland',
    region: 'Europe',
    city: 'Strzelce',
    address: 'Główna 20',
    postalCode: '99-307',
    primaryContact: {
      name: 'Sales Office',
      position: 'Commercial Manager',
      email: 'sprzedaz@phrs.pl',
      phone: '+48 24 281 42 00'
    },
    website: 'https://www.phrs.pl',
    seedTypes: ['Grain Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'TÜV',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 280,
    establishedYear: 1951,
    description: 'Polish seed breeding and production company focusing on cereal varieties, particularly wheat and triticale for Polish conditions.',
    currency: 'PLN',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 6,
    minimumOrderValue: 6000,
    notes: 'Specialized in cereal breeding for Polish and Central European climate. Good triticale varieties.'
  },
  {
    companyName: 'PNOS (Polska Nowa Odmiana Spółka)',
    partnerCode: 'PNO-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Poland',
    region: 'Europe',
    city: 'Ożarów Mazowiecki',
    address: 'ul. Poznańska 129',
    postalCode: '05-850',
    primaryContact: {
      name: 'Export Division',
      position: 'International Business Manager',
      email: 'export@pnos.pl',
      phone: '+48 22 722 98 00'
    },
    website: 'https://www.pnos.pl',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'DEKRA',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 450,
    establishedYear: 1989,
    description: 'Major Polish seed company with comprehensive portfolio of cereal, rapeseed, and corn varieties. Strong distribution network across Poland.',
    currency: 'PLN',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 9000,
    notes: 'Large distributor with good variety selection. Strong presence in Polish agricultural market.'
  },
  {
    companyName: 'Plantpol',
    partnerCode: 'PLT-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Poland',
    region: 'Europe',
    city: 'Zielonki',
    address: 'ul. Krakowska 16',
    postalCode: '32-087',
    primaryContact: {
      name: 'Sales Department',
      position: 'Sales Manager',
      email: 'info@plantpol.pl',
      phone: '+48 12 285 23 45'
    },
    website: 'https://www.plantpol.pl',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 185,
    establishedYear: 1992,
    description: 'Polish vegetable and flower seed company serving professional growers and retail market. Focus on varieties suited to Polish climate.',
    currency: 'PLN',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 4000,
    notes: 'Good selection of vegetable seeds for Polish and Central European markets. Growing export business.'
  },
  {
    companyName: 'W. Legutko (Firma Nasiennicza)',
    partnerCode: 'LEG-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Poland',
    region: 'Europe',
    city: 'Jutrosin',
    address: 'ul. Kurpińskiego 15',
    postalCode: '63-930',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Representative',
      email: 'biuro@legutko.com.pl',
      phone: '+48 65 547 21 45'
    },
    website: 'https://www.legutko.com.pl',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Medium',
    employeeCount: 120,
    establishedYear: 1880,
    description: 'Historic Polish seed company, one of the oldest in Poland. Specializes in vegetable, flower, and herb seeds for home gardeners and professionals.',
    currency: 'PLN',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 3,
    minimumOrderValue: 2000,
    notes: 'Historic Polish brand established in 1880. Strong retail presence with good variety selection for home gardeners.'
  },
  {
    companyName: 'Torseed (Toruńskie Nasiona)',
    partnerCode: 'TOR-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Poland',
    region: 'Europe',
    city: 'Toruń',
    address: 'ul. Szosa Chełmińska 242',
    postalCode: '87-100',
    primaryContact: {
      name: 'Commercial Office',
      position: 'Business Development',
      email: 'export@torseed.pl',
      phone: '+48 56 658 25 00'
    },
    website: 'https://www.torseed.pl',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Organic Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'Ekogwarancja',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 145,
    establishedYear: 1994,
    description: 'Polish seed company specializing in vegetable, flower, and herb seeds. Growing focus on organic and heritage varieties.',
    currency: 'PLN',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 4,
    minimumOrderValue: 3500,
    notes: 'Good organic seed selection. Strong presence in Polish retail and professional markets.'
  },
  {
    companyName: 'SEMO Polska',
    partnerCode: 'SEM-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Poland',
    region: 'Europe',
    city: 'Warszawa',
    address: 'ul. Cybernetyki 7b',
    postalCode: '02-677',
    primaryContact: {
      name: 'Polish Operations',
      position: 'Country Manager',
      email: 'info@semo.pl',
      phone: '+48 22 844 53 00'
    },
    website: 'https://www.semo.pl',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'TÜV',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 95,
    establishedYear: 1996,
    description: 'Polish subsidiary of Czech seed company SEMO. Offers wide range of vegetable and flower seeds for Polish market.',
    currency: 'PLN',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 3000,
    notes: 'Part of Czech SEMO group. Good distribution in Poland with Central European varieties.'
  },
  {
    companyName: 'Małopolskie Centrum Hodowli i Nasiennictwa',
    partnerCode: 'MCH-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Poland',
    region: 'Europe',
    city: 'Kobierzyce',
    address: 'ul. Parkowa 4',
    postalCode: '55-040',
    primaryContact: {
      name: 'Sales Team',
      position: 'Account Manager',
      email: 'sprzedaz@mchin.pl',
      phone: '+48 71 318 02 00'
    },
    website: 'https://www.mchin.pl',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    companySize: 'Medium',
    employeeCount: 165,
    establishedYear: 1951,
    description: 'Polish breeding and seed production company specializing in cereals and legumes for southern Polish regions.',
    currency: 'PLN',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 5,
    minimumOrderValue: 5000,
    notes: 'Regional breeder with varieties adapted to southern Polish conditions. Good for highland agriculture.'
  },
  {
    companyName: 'Nasiona Kobierzyc',
    partnerCode: 'NAK-PL-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Poland',
    region: 'Europe',
    city: 'Wrocław',
    address: 'ul. Fabryczna 5',
    postalCode: '53-609',
    primaryContact: {
      name: 'Commercial Department',
      position: 'Sales Manager',
      email: 'info@nasiona.pl',
      phone: '+48 71 351 45 00'
    },
    website: 'https://www.nasiona.pl',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Small',
    employeeCount: 68,
    establishedYear: 1989,
    description: 'Polish seed distributor offering vegetable, flower, and lawn seeds for retail and professional markets in southwestern Poland.',
    currency: 'PLN',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 3,
    minimumOrderValue: 2500,
    notes: 'Regional distributor with good local market knowledge. Focus on Lower Silesia region.'
  }
];

async function addPolandSeedCompanies() {
  try {
    // Create all partners
    const results = await SeedPartner.insertMany(polandSeedCompanies);
    
    console.log(`\n✅ Created ${results.length} Polish seed companies:`);
    results.forEach(partner => {
      console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
    });
    
    console.log('\n📊 To view these partners, go to:');
    console.log('   http://localhost:3001/seed-partners?country=Poland');
    console.log('\n🇵🇱 Poland is now represented in your global seed partnership database!');
    console.log('\n🌾 Poland has a strong breeding tradition - excellent cereal genetics!');
    
  } catch (error) {
    console.error('❌ Error creating Polish seed companies:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
addPolandSeedCompanies();
