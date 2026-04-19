const mongoose = require('mongoose');
require('dotenv').config();

// Import the SeedPartner model
const SeedPartner = require('./models/SeedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const franceSeedCompanies = [
  {
    companyName: 'Limagrain',
    partnerCode: 'LIM-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'France',
    region: 'Europe',
    city: 'Saint-Beauzire',
    address: 'Rue Henri Mondor',
    postalCode: '63360',
    primaryContact: {
      name: 'International Division',
      position: 'Global Sales Director',
      email: 'contact@limagrain.com',
      phone: '+33 4 73 63 40 00'
    },
    website: 'https://www.limagrain.com',
    seedTypes: ['Grain Seeds', 'Vegetable Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AFNOR',
        verified: true
      },
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 10000,
    establishedYear: 1942,
    description: 'Fourth largest seed company in the world. International agricultural cooperative group specializing in field seeds, vegetable seeds, and cereal products.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 8,
    minimumOrderValue: 20000,
    notes: 'Major global player with extensive breeding programs. Owns brands like Vilmorin, Clause, and HM.CLAUSE. Excellent for both field crops and vegetable seeds.'
  },
  {
    companyName: 'Vilmorin-Mikado',
    partnerCode: 'VIL-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'France',
    region: 'Europe',
    city: 'La Ménitré',
    address: 'Route du Manoir',
    postalCode: '49250',
    primaryContact: {
      name: 'Commercial Department',
      position: 'Export Manager',
      email: 'contact@vilmorin-mikado.com',
      phone: '+33 2 41 79 42 00'
    },
    website: 'https://www.vilmorin-mikado.com',
    seedTypes: ['Vegetable Seeds', 'Hybrid Seeds', 'Heirloom Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AFNOR',
        verified: true
      },
      {
        certificationType: 'ISTA (International Seed Testing)',
        issuingAuthority: 'ISTA',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 650,
    establishedYear: 1743,
    description: 'Historic French vegetable seed company, part of Limagrain group. One of the oldest seed companies in the world with expertise in carrots, leeks, and lettuce.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 10000,
    notes: 'Prestigious brand founded in 1743. World leader in carrot breeding. Excellent for European vegetable varieties.'
  },
  {
    companyName: 'Clause (HM.CLAUSE)',
    partnerCode: 'CLA-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'France',
    region: 'Europe',
    city: 'Portes-lès-Valence',
    address: 'Avenue Georges Dimitrov',
    postalCode: '26800',
    primaryContact: {
      name: 'International Sales',
      position: 'Business Development Director',
      email: 'contact@hmclause.com',
      phone: '+33 4 75 57 57 00'
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
    employeeCount: 2500,
    establishedYear: 1891,
    description: 'Global vegetable seed breeder and marketer, part of Limagrain. Specializes in tomatoes, peppers, melons, and cucurbits for professional growers worldwide.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 7,
    minimumOrderValue: 15000,
    notes: 'Major global brand with strong presence in tomato and melon breeding. Excellent for protected cultivation varieties.'
  },
  {
    companyName: 'RAGT Semences',
    partnerCode: 'RAGT-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'France',
    region: 'Europe',
    city: 'Rodez',
    address: 'Rue Emile Singla',
    postalCode: '12000',
    primaryContact: {
      name: 'Export Division',
      position: 'International Sales Manager',
      email: 'contact@ragt-semences.fr',
      phone: '+33 5 65 73 60 00'
    },
    website: 'https://www.ragt-semences.fr',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AFNOR',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 1800,
    establishedYear: 1919,
    description: 'Leading French seed company specializing in wheat, barley, corn, rapeseed, and sunflower seeds. Strong presence in European agricultural market.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 8,
    minimumOrderValue: 12000,
    notes: 'Excellent for cereal and oilseed varieties adapted to European growing conditions. Strong breeding programs.'
  },
  {
    companyName: 'Gautier Semences',
    partnerCode: 'GAU-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'France',
    region: 'Europe',
    city: 'Eyragues',
    address: 'Route d\'Avignon',
    postalCode: '13630',
    primaryContact: {
      name: 'Sales Department',
      position: 'Export Manager',
      email: 'info@gautiersemences.com',
      phone: '+33 4 90 94 00 27'
    },
    website: 'https://www.gautiersemences.com',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Organic Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'Ecocert',
        verified: true
      },
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 280,
    establishedYear: 1952,
    description: 'French vegetable seed company specializing in tomatoes, melons, salads, and organic seeds. Strong focus on organic and sustainable varieties.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 5,
    minimumOrderValue: 6000,
    notes: 'Excellent for organic vegetable seeds, particularly melons and tomatoes. Growing presence in organic market.'
  },
  {
    companyName: 'Syngenta Seeds (France)',
    partnerCode: 'SYN-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 5,
    country: 'France',
    region: 'Europe',
    city: 'Saint-Sauveur',
    address: 'Chemin de l\'Hobit',
    postalCode: '31790',
    primaryContact: {
      name: 'French Operations',
      position: 'Country Manager',
      email: 'contact.france@syngenta.com',
      phone: '+33 5 62 71 92 00'
    },
    website: 'https://www.syngenta.fr',
    seedTypes: ['Vegetable Seeds', 'Grain Seeds', 'Hybrid Seeds'],
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
    employeeCount: 850,
    establishedYear: 1920,
    description: 'French operations of global seed and crop protection leader. Strong presence in corn, sunflower, and vegetable seeds across European markets.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 7,
    minimumOrderValue: 18000,
    notes: 'Global leader with extensive French breeding programs. Excellent for hybrid corn and sunflower varieties.'
  },
  {
    companyName: 'Florimond Desprez',
    partnerCode: 'FLD-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'France',
    region: 'Europe',
    city: 'Cappelle-en-Pévèle',
    address: 'Route de Râches',
    postalCode: '59242',
    primaryContact: {
      name: 'Commercial Service',
      position: 'Director of Sales',
      email: 'contact@florimond-desprez.fr',
      phone: '+33 3 20 84 45 00'
    },
    website: 'https://www.florimond-desprez.com',
    seedTypes: ['Grain Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AFNOR',
        verified: true
      }
    ],
    companySize: 'Large',
    employeeCount: 950,
    establishedYear: 1830,
    description: 'Family-owned French seed company specializing in wheat, barley, sugar beet, and chicory. Leading breeder of cereal varieties for European agriculture.',
    currency: 'EUR',
    paymentTerms: 'Net 60',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 8,
    minimumOrderValue: 13000,
    notes: 'Historic family business with strong wheat breeding program. Excellent for European cereal varieties.'
  },
  {
    companyName: 'Voltz Maraîchers',
    partnerCode: 'VOL-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'France',
    region: 'Europe',
    city: 'Colmar',
    address: 'Avenue de la Foire aux Vins',
    postalCode: '68000',
    primaryContact: {
      name: 'Sales Team',
      position: 'Account Manager',
      email: 'info@voltzmaraichage.com',
      phone: '+33 3 89 20 18 00'
    },
    website: 'https://www.voltzmaraichage.com',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds'],
    companySize: 'Medium',
    employeeCount: 165,
    establishedYear: 1875,
    description: 'Alsatian seed distributor and breeder specializing in vegetable seeds for market gardeners. Strong regional presence in eastern France.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 4,
    minimumOrderValue: 3500,
    notes: 'Regional specialist with good selection of varieties for market gardeners. Strong technical support.'
  },
  {
    companyName: 'Truffaut (Semences Division)',
    partnerCode: 'TRU-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'France',
    region: 'Europe',
    city: 'Ivry-sur-Seine',
    address: 'Avenue Georges Pompidou',
    postalCode: '94200',
    primaryContact: {
      name: 'Buyer Department',
      position: 'Seed Category Manager',
      email: 'contact@truffaut.com',
      phone: '+33 1 46 70 84 84'
    },
    website: 'https://www.truffaut.com',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds', 'Lawn & Turf Seeds'],
    companySize: 'Large',
    employeeCount: 420,
    establishedYear: 1824,
    description: 'Historic French garden center chain with extensive seed selection for home gardeners. One of France\'s leading garden retailers.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 3,
    minimumOrderValue: 2500,
    notes: 'Major French retail brand established 1824. Good for retail garden seed market penetration in France.'
  },
  {
    companyName: 'Graines Voltz',
    partnerCode: 'GRV-FR-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'France',
    region: 'Europe',
    city: 'Colmar',
    address: 'Rue de l\'Industrie',
    postalCode: '68000',
    primaryContact: {
      name: 'International Sales',
      position: 'Export Director',
      email: 'contact@graines-voltz.com',
      phone: '+33 3 89 20 18 19'
    },
    website: 'https://www.graines-voltz.com',
    seedTypes: ['Flower Seeds', 'Vegetable Seeds', 'Herb Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'AFNOR',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 210,
    establishedYear: 1875,
    description: 'French horticultural seed specialist focusing on flower seeds, young plants, and vegetable seeds for professional growers and garden centers.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 5,
    minimumOrderValue: 5000,
    notes: 'Excellent for ornamental and flower seeds. Strong presence in European horticultural market.'
  }
];

async function addFranceSeedCompanies() {
  try {
    // Create all partners
    const results = await SeedPartner.insertMany(franceSeedCompanies);
    
    console.log(`\n✅ Created ${results.length} French seed companies:`);
    results.forEach(partner => {
      console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
    });
    
    console.log('\n📊 To view these partners, go to:');
    console.log('   http://localhost:3001/seed-partners?country=France');
    console.log('\n🇫🇷 France is now represented in your world seed partnership database!');
    
  } catch (error) {
    console.error('❌ Error creating French seed companies:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
addFranceSeedCompanies();
