const mongoose = require('mongoose');
require('dotenv').config();

// Import the SeedPartner model
const SeedPartner = require('./models/SeedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const italySeedCompanies = [
  {
    companyName: 'ISI Sementi S.p.A.',
    partnerCode: 'ISI-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Italy',
    region: 'Europe',
    city: 'Fidenza',
    address: 'Via Molino Vecchio 12',
    postalCode: '43036',
    primaryContact: {
      name: 'International Sales',
      position: 'Export Manager',
      email: 'info@isisementi.com',
      phone: '+39 0524 519611'
    },
    website: 'https://www.isisementi.com',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      },
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'RINA',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 450,
    establishedYear: 1972,
    description: 'Leading Italian seed company specializing in vegetable seeds for professional growers. Strong presence in Mediterranean and European markets.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 8000,
    notes: 'Excellent source for Italian vegetable varieties, especially processing tomatoes, peppers, and zucchini. Strong breeding programs.'
  },
  {
    companyName: 'Suba Seeds S.r.l.',
    partnerCode: 'SUB-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Italy',
    region: 'Europe',
    city: 'Longiano',
    address: 'Via Pinarella 26',
    postalCode: '47020',
    primaryContact: {
      name: 'Sales Department',
      position: 'Business Development',
      email: 'info@subaseeds.com',
      phone: '+39 0547 665007'
    },
    website: 'https://www.subaseeds.com',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'RINA',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 180,
    establishedYear: 1958,
    description: 'Family-owned Italian seed company specializing in vegetable seeds with focus on tomatoes, peppers, and leafy greens for fresh market and processing.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 5,
    minimumOrderValue: 5000,
    notes: 'Good partner for Mediterranean vegetable varieties. Strong technical support for growers.'
  },
  {
    companyName: 'Hortus Sementi s.r.l.',
    partnerCode: 'HOR-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Italy',
    region: 'Europe',
    city: 'Imola',
    address: 'Via Lume 2',
    postalCode: '40026',
    primaryContact: {
      name: 'Export Office',
      position: 'International Sales Manager',
      email: 'info@hortusementi.com',
      phone: '+39 0542 642014'
    },
    website: 'https://www.hortusementi.com',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 95,
    establishedYear: 1990,
    description: 'Italian vegetable seed specialist with expertise in baby leaf vegetables, salads, and Italian specialty vegetables for export markets.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'FOB',
    leadTimeWeeks: 4,
    minimumOrderValue: 3500,
    notes: 'Excellent for baby leaf and specialty Italian vegetable varieties. Growing export presence.'
  },
  {
    companyName: 'La Semiorto Sementi S.r.l.',
    partnerCode: 'SEM-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Italy',
    region: 'Europe',
    city: 'Sarno',
    address: 'Via Ingegno 35',
    postalCode: '84087',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Representative',
      email: 'info@lasemiorto.it',
      phone: '+39 081 943245'
    },
    website: 'https://www.lasemiorto.it',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds'],
    companySize: 'Medium',
    employeeCount: 120,
    establishedYear: 1975,
    description: 'Southern Italian seed company specializing in traditional Italian vegetable varieties including tomatoes, eggplants, peppers, and zucchini.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 4,
    minimumOrderValue: 3000,
    notes: 'Good source for authentic southern Italian vegetable varieties popular in Mediterranean cuisine.'
  },
  {
    companyName: 'Blumen Group S.p.A.',
    partnerCode: 'BLU-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Italy',
    region: 'Europe',
    city: 'Valmadrera',
    address: 'Via per Colle Brianza 49',
    postalCode: '23868',
    primaryContact: {
      name: 'International Division',
      position: 'Export Director',
      email: 'info@blumengroup.com',
      phone: '+39 0341 581225'
    },
    website: 'https://www.blumengroup.com',
    seedTypes: ['Flower Seeds', 'Vegetable Seeds', 'Herb Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'RINA',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 380,
    establishedYear: 1962,
    description: 'Major Italian seed company and garden products distributor. Strong presence in flower seeds, ornamental plants, and vegetable seeds for retail market.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 5,
    minimumOrderValue: 6000,
    notes: 'Leading Italian distributor with excellent flower seed selection. Good for retail garden market entry.'
  },
  {
    companyName: 'Società Italiana Sementi (SIS)',
    partnerCode: 'SIS-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Italy',
    region: 'Europe',
    city: 'Bologna',
    address: 'Via Amendola 11',
    postalCode: '40121',
    primaryContact: {
      name: 'Commercial Department',
      position: 'Business Development Manager',
      email: 'info@sisementi.it',
      phone: '+39 051 6493840'
    },
    website: 'https://www.sisementi.it',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'DNV',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 520,
    establishedYear: 1947,
    description: 'Cooperative of Italian seed producers specializing in cereal seeds, forage crops, and agriculture seeds. Strong presence in Italian agricultural sector.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 8,
    minimumOrderValue: 12000,
    notes: 'Major player in Italian agricultural seeds. Excellent for cereal and forage crop varieties adapted to Mediterranean climate.'
  },
  {
    companyName: 'Franchi Sementi S.p.A.',
    partnerCode: 'FRA-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Italy',
    region: 'Europe',
    city: 'Bergamo',
    address: 'Via Valgandino 3',
    postalCode: '24126',
    primaryContact: {
      name: 'Export Sales',
      position: 'International Account Manager',
      email: 'info@franchisementi.it',
      phone: '+39 035 328142'
    },
    website: 'https://www.franchisementi.it',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Heirloom Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'ICEA',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 145,
    establishedYear: 1783,
    description: 'Historic Italian seed company, one of the oldest in Europe. Specializes in traditional Italian vegetable varieties, herbs, and flower seeds for home gardeners.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 4,
    minimumOrderValue: 2500,
    notes: 'Prestigious historic brand founded in 1783. Excellent for authentic Italian heirloom varieties and organic seeds. Strong retail presence.'
  },
  {
    companyName: 'Ingegnoli Sementi',
    partnerCode: 'ING-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Italy',
    region: 'Europe',
    city: 'Milan',
    address: 'Via O. Salomone 65',
    postalCode: '20138',
    primaryContact: {
      name: 'Sales Office',
      position: 'Commercial Manager',
      email: 'info@ingegnoli.it',
      phone: '+39 02 580521'
    },
    website: 'https://www.ingegnoli.it',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Medium',
    employeeCount: 85,
    establishedYear: 1817,
    description: 'Historic Milanese seed company with over 200 years of tradition. Offers wide range of vegetable, flower, and herb seeds for professional and home gardeners.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 3,
    minimumOrderValue: 2000,
    notes: 'Historic Italian brand established 1817. Good selection of traditional Italian varieties and garden seeds.'
  },
  {
    companyName: 'Dotto Sementi',
    partnerCode: 'DOT-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Italy',
    region: 'Europe',
    city: 'Udine',
    address: 'Via Nazionale 62',
    postalCode: '33050',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Manager',
      email: 'info@dottosementi.it',
      phone: '+39 0432 675311'
    },
    website: 'https://www.dottosementi.it',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
    companySize: 'Small',
    employeeCount: 55,
    establishedYear: 1920,
    description: 'Northern Italian seed company specializing in vegetable and flower seeds for professional growers and garden centers in Friuli-Venezia Giulia region.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 3,
    minimumOrderValue: 1500,
    notes: 'Regional Italian supplier with good local varieties adapted to northern Italian growing conditions.'
  },
  {
    companyName: 'Eurosementi S.r.l.',
    partnerCode: 'EUR-IT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Italy',
    region: 'Europe',
    city: 'Cesena',
    address: 'Via Romagna 15',
    postalCode: '47522',
    primaryContact: {
      name: 'International Sales',
      position: 'Export Manager',
      email: 'info@eurosementi.com',
      phone: '+39 0547 384920'
    },
    website: 'https://www.eurosementi.com',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Organic Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'ICEA',
        verified: true
      },
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 110,
    establishedYear: 1985,
    description: 'Modern Italian seed company focusing on organic and conventional vegetable seeds. Strong export orientation with presence in Mediterranean and Middle Eastern markets.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 5,
    minimumOrderValue: 4500,
    notes: 'Good source for organic vegetable seeds. Growing international presence with focus on export markets.'
  }
];

async function addItalySeedCompanies() {
  try {
    // Create all partners
    const results = await SeedPartner.insertMany(italySeedCompanies);
    
    console.log(`\n✅ Created ${results.length} Italian seed companies:`);
    results.forEach(partner => {
      console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
    });
    
    console.log('\n📊 To view these partners, go to:');
    console.log('   http://localhost:3001/seed-partners?country=Italy');
    console.log('\n🇮🇹 Italy is now represented in your world seed partnership database!');
    
  } catch (error) {
    console.error('❌ Error creating Italian seed companies:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
addItalySeedCompanies();
