const mongoose = require('mongoose');
require('dotenv').config();

// Import the SeedPartner model
const SeedPartner = require('./models/SeedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const spainSeedCompanies = [
  {
    companyName: 'Semillas Fitó S.A.',
    partnerCode: 'FIT-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Spain',
    region: 'Europe',
    city: 'Barcelona',
    address: 'Carrer de Selva de Mar 111',
    postalCode: '08019',
    primaryContact: {
      name: 'International Sales',
      position: 'Export Director',
      email: 'fito@fito.es',
      phone: '+34 933 036 360'
    },
    website: 'https://www.semillasfito.com',
    seedTypes: ['Vegetable Seeds', 'Hybrid Seeds', 'Organic Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AENOR',
        verified: true
      },
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 850,
    establishedYear: 1880,
    description: 'Leading Spanish vegetable seed company with global presence. Specializes in tomatoes, peppers, melons, and watermelons for professional growers worldwide.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 6,
    minimumOrderValue: 10000,
    notes: 'Major Spanish seed company with strong international presence. Excellent breeding programs for Mediterranean vegetables and protected cultivation.'
  },
  {
    companyName: 'Ramiro Arnedo S.A.',
    partnerCode: 'RAM-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Spain',
    region: 'Europe',
    city: 'Calahorra',
    address: 'Ctra. de Arnedo km 2',
    postalCode: '26500',
    primaryContact: {
      name: 'Commercial Department',
      position: 'Sales Manager',
      email: 'info@ramiroarnedo.com',
      phone: '+34 941 132 030'
    },
    website: 'https://www.ramiroarnedo.com',
    seedTypes: ['Vegetable Seeds', 'Hybrid Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AENOR',
        verified: true
      },
      {
        certificationType: 'ISTA (International Seed Testing)',
        issuingAuthority: 'ISTA',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 420,
    establishedYear: 1948,
    description: 'Spanish vegetable seed breeder specializing in peppers, tomatoes, artichokes, and lettuce. Strong presence in Mediterranean and Latin American markets.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 5,
    minimumOrderValue: 7000,
    notes: 'Excellent for pepper varieties, particularly sweet peppers and pimientos. Strong technical support and breeding programs.'
  },
  {
    companyName: 'Semillas Batlle S.A.',
    partnerCode: 'BAT-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Spain',
    region: 'Europe',
    city: 'Molins de Rei',
    address: 'Carrer del Rec 49-51',
    postalCode: '08750',
    primaryContact: {
      name: 'Sales Office',
      position: 'Commercial Director',
      email: 'info@batlle.com',
      phone: '+34 936 680 912'
    },
    website: 'https://www.semillasbatlle.com',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AENOR',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 320,
    establishedYear: 1802,
    description: 'Historic Spanish seed company, one of the oldest in Spain. Specializes in seeds for home gardeners including vegetables, flowers, herbs, and lawn seeds.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 3000,
    notes: 'Prestigious Spanish brand established in 1802. Excellent for retail garden seed market in Spain and Latin America.'
  },
  {
    companyName: 'Intersemillas S.A.',
    partnerCode: 'INT-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Spain',
    region: 'Europe',
    city: 'Jerez de la Frontera',
    address: 'Polígono Industrial El Portal',
    postalCode: '11407',
    primaryContact: {
      name: 'Export Department',
      position: 'International Sales',
      email: 'info@intersemillas.es',
      phone: '+34 956 303 444'
    },
    website: 'https://www.intersemillas.es',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds'],
    companySize: 'Medium',
    employeeCount: 145,
    establishedYear: 1975,
    description: 'Southern Spanish vegetable seed company specializing in varieties for warm climates. Focus on melons, watermelons, peppers, and tomatoes.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'FOB',
    leadTimeWeeks: 4,
    minimumOrderValue: 4000,
    notes: 'Good source for varieties adapted to hot Mediterranean climate. Growing export business.'
  },
  {
    companyName: 'Zeraim Ibérica (Syngenta)',
    partnerCode: 'ZER-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Spain',
    region: 'Europe',
    city: 'El Ejido',
    address: 'Paraje Las Cuatro Higueras',
    postalCode: '04700',
    primaryContact: {
      name: 'Spanish Operations',
      position: 'Business Manager',
      email: 'contact.spain@syngenta.com',
      phone: '+34 950 487 091'
    },
    website: 'https://www.syngenta.es',
    seedTypes: ['Vegetable Seeds', 'Hybrid Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      },
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AENOR',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 380,
    establishedYear: 1950,
    description: 'Spanish operations of Zeraim/Syngenta, specialized in vegetable seeds for protected cultivation. Strong presence in Almería greenhouse region.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 6,
    minimumOrderValue: 12000,
    notes: 'Part of global Syngenta network. Excellent for greenhouse vegetable varieties, particularly tomatoes, peppers, and cucumbers.'
  },
  {
    companyName: 'Sais (Mascarell Semillas)',
    partnerCode: 'SAI-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Spain',
    region: 'Europe',
    city: 'Valencia',
    address: 'Camino Viejo de Liria',
    postalCode: '46160',
    primaryContact: {
      name: 'Sales Team',
      position: 'Account Manager',
      email: 'info@sais.es',
      phone: '+34 962 796 020'
    },
    website: 'https://www.sais.es',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AENOR',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 165,
    establishedYear: 1963,
    description: 'Valencian seed company specializing in vegetable seeds for fresh market production. Focus on peppers, tomatoes, and Spanish specialty vegetables.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 4,
    minimumOrderValue: 3500,
    notes: 'Regional specialist with excellent pepper varieties. Good technical support for growers in Mediterranean region.'
  },
  {
    companyName: 'Rocalba S.A.',
    partnerCode: 'ROC-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Spain',
    region: 'Europe',
    city: 'Girona',
    address: 'Apartat de Correus 283',
    postalCode: '17080',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Representative',
      email: 'info@rocalba.com',
      phone: '+34 972 405 008'
    },
    website: 'https://www.rocalba.com',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Medium',
    employeeCount: 95,
    establishedYear: 1935,
    description: 'Catalan seed company offering wide range of seeds for home gardeners and professional growers. Strong presence in Spanish retail market.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 3,
    minimumOrderValue: 2000,
    notes: 'Good for retail garden seed market. Wide variety selection for home gardeners.'
  },
  {
    companyName: 'HM.CLAUSE Ibérica',
    partnerCode: 'HMC-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'Spain',
    region: 'Europe',
    city: 'Almería',
    address: 'Paraje Cerrillos',
    postalCode: '04710',
    primaryContact: {
      name: 'Iberian Operations',
      position: 'Country Manager Spain',
      email: 'contact.spain@hmclause.com',
      phone: '+34 950 586 300'
    },
    website: 'https://www.hmclause.com',
    seedTypes: ['Vegetable Seeds', 'Hybrid Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      },
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'Bureau Veritas',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 450,
    establishedYear: 1970,
    description: 'Spanish operations of HM.CLAUSE (Limagrain group). Major breeding station in Almería for protected cultivation vegetables, especially tomatoes and peppers.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 6,
    minimumOrderValue: 15000,
    notes: 'Part of Limagrain group. World-class breeding programs for greenhouse production. Strategic location in Almería greenhouse belt.'
  },
  {
    companyName: 'Agrisem Ibérica',
    partnerCode: 'AGR-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Spain',
    region: 'Europe',
    city: 'Murcia',
    address: 'Polígono Industrial Oeste',
    postalCode: '30169',
    primaryContact: {
      name: 'Commercial Office',
      position: 'Sales Manager',
      email: 'info@agrisem.es',
      phone: '+34 968 865 200'
    },
    website: 'https://www.agrisem.es',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 115,
    establishedYear: 1988,
    description: 'Murcian seed company specializing in vegetable seeds for open field and protected cultivation. Focus on lettuce, leafy greens, and brassicas.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 4,
    minimumOrderValue: 3000,
    notes: 'Regional specialist for Murcia agricultural region. Good selection of leafy vegetable varieties.'
  },
  {
    companyName: 'Eurosemillas S.A.',
    partnerCode: 'EUS-ES-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Spain',
    region: 'Europe',
    city: 'Córdoba',
    address: 'Polígono Industrial Las Quemadas',
    postalCode: '14014',
    primaryContact: {
      name: 'Export Division',
      position: 'International Business Manager',
      email: 'info@eurosemillas.es',
      phone: '+34 957 325 201'
    },
    website: 'https://www.eurosemillas.com',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AENOR',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 380,
    establishedYear: 1973,
    description: 'Spanish seed company specializing in cereal seeds, sunflower, and forage crops. Strong presence in southern Spanish agricultural market.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 8,
    minimumOrderValue: 10000,
    notes: 'Excellent for cereal and oilseed varieties adapted to Mediterranean climate. Strong breeding programs for southern Europe.'
  }
];

async function addSpainSeedCompanies() {
  try {
    // Create all partners
    const results = await SeedPartner.insertMany(spainSeedCompanies);
    
    console.log(`\n✅ Created ${results.length} Spanish seed companies:`);
    results.forEach(partner => {
      console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
    });
    
    console.log('\n📊 To view these partners, go to:');
    console.log('   http://localhost:3001/seed-partners?country=Spain');
    console.log('\n🇪🇸 Spain is now represented in your world seed partnership database!');
    
  } catch (error) {
    console.error('❌ Error creating Spanish seed companies:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
addSpainSeedCompanies();
