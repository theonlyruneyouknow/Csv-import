const mongoose = require('mongoose');
require('dotenv').config();

// Import the SeedPartner model
const SeedPartner = require('./models/SeedPartner');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const portugalSeedCompanies = [
  {
    companyName: 'Sementes Vivas',
    partnerCode: 'SEV-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Portugal',
    region: 'Europe',
    city: 'Beja',
    address: 'Apartado 136',
    postalCode: '7801-902',
    primaryContact: {
      name: 'Sales Department',
      position: 'Commercial Manager',
      email: 'info@sementesvivas.pt',
      phone: '+351 284 328 070'
    },
    website: 'https://www.sementesvivas.pt',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Organic Seeds', 'Heirloom Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'Sativa',
        verified: true
      }
    ],
    companySize: 'Small',
    employeeCount: 45,
    establishedYear: 2004,
    description: 'Portuguese organic and biodynamic seed company specializing in traditional Portuguese vegetable varieties and heritage seeds. Focus on biodiversity and seed conservation.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 1500,
    notes: 'Excellent source for Portuguese heirloom varieties and organic seeds. Strong focus on sustainable agriculture and biodiversity.'
  },
  {
    companyName: 'Lusosem - Lusitana de Sementes',
    partnerCode: 'LUS-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Portugal',
    region: 'Europe',
    city: 'Santarém',
    address: 'Quinta da França',
    postalCode: '2005-048',
    primaryContact: {
      name: 'Commercial Office',
      position: 'Sales Director',
      email: 'info@lusosem.pt',
      phone: '+351 243 309 440'
    },
    website: 'https://www.lusosem.pt',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'APCER',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 180,
    establishedYear: 1960,
    description: 'Portuguese seed company specializing in cereal seeds, forage crops, and agricultural seeds for Portuguese and Mediterranean markets.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FCA',
    leadTimeWeeks: 6,
    minimumOrderValue: 6000,
    notes: 'Leading Portuguese agricultural seed supplier. Good for cereals and forage varieties adapted to Portuguese climate.'
  },
  {
    companyName: 'Horto Sementes',
    partnerCode: 'HOR-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Portugal',
    region: 'Europe',
    city: 'Vila Nova de Gaia',
    address: 'Rua do Comércio',
    postalCode: '4400-098',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Manager',
      email: 'info@hortosementes.pt',
      phone: '+351 223 745 060'
    },
    website: 'https://www.hortosementes.pt',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
    companySize: 'Small',
    employeeCount: 55,
    establishedYear: 1985,
    description: 'Northern Portuguese seed distributor offering vegetable, flower, and herb seeds for professional growers and home gardeners.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 3,
    minimumOrderValue: 2000,
    notes: 'Regional distributor with good selection for Portuguese market. Focus on vegetable seeds for local growers.'
  },
  {
    companyName: 'Fertiprado - Sementes e Nutrição Vegetal',
    partnerCode: 'FER-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Portugal',
    region: 'Europe',
    city: 'Leiria',
    address: 'Zona Industrial',
    postalCode: '2430-028',
    primaryContact: {
      name: 'Sales Team',
      position: 'Business Development',
      email: 'info@fertiprado.pt',
      phone: '+351 244 820 310'
    },
    website: 'https://www.fertiprado.pt',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds', 'Lawn & Turf Seeds'],
    certifications: [
      {
        certificationType: 'ISO 9001',
        issuingAuthority: 'SGS',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 120,
    establishedYear: 1978,
    description: 'Portuguese agricultural company specializing in seeds and plant nutrition. Focus on pasture seeds, forage crops, and lawn seeds.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'FOB',
    leadTimeWeeks: 5,
    minimumOrderValue: 4500,
    notes: 'Good for pasture and forage seeds. Strong presence in Portuguese agricultural market.'
  },
  {
    companyName: 'Vitaplan Sementes',
    partnerCode: 'VIT-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Portugal',
    region: 'Europe',
    city: 'Coimbra',
    address: 'Quinta da Nora',
    postalCode: '3000-392',
    primaryContact: {
      name: 'Export Department',
      position: 'International Sales',
      email: 'info@vitaplan.pt',
      phone: '+351 239 802 190'
    },
    website: 'https://www.vitaplan.pt',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Organic Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'Certiplanet',
        verified: true
      }
    ],
    companySize: 'Small',
    employeeCount: 35,
    establishedYear: 1998,
    description: 'Portuguese organic seed specialist focusing on vegetable seeds and aromatic plants. Strong commitment to sustainable agriculture.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'CIP',
    leadTimeWeeks: 4,
    minimumOrderValue: 2500,
    notes: 'Excellent for organic and aromatic plant seeds. Growing presence in organic market.'
  },
  {
    companyName: 'Agro-Sementes',
    partnerCode: 'AGS-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Portugal',
    region: 'Europe',
    city: 'Évora',
    address: 'Herdade da Mitra',
    postalCode: '7002-554',
    primaryContact: {
      name: 'Commercial Department',
      position: 'Sales Representative',
      email: 'info@agrosementes.pt',
      phone: '+351 266 760 800'
    },
    website: 'https://www.agrosementes.pt',
    seedTypes: ['Grain Seeds', 'Cover Crop Seeds'],
    companySize: 'Medium',
    employeeCount: 85,
    establishedYear: 1982,
    description: 'Alentejo-based seed company specializing in cereal seeds and cover crops for dryland agriculture in southern Portugal.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 5,
    minimumOrderValue: 4000,
    notes: 'Good for dryland cereal varieties adapted to Alentejo climate. Regional specialist.'
  },
  {
    companyName: 'Sementes Hortícolas Portuguesas',
    partnerCode: 'SHP-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Portugal',
    region: 'Europe',
    city: 'Almeirim',
    address: 'Zona Industrial',
    postalCode: '2080-056',
    primaryContact: {
      name: 'Sales Office',
      position: 'Commercial Manager',
      email: 'info@shp.pt',
      phone: '+351 243 594 020'
    },
    website: 'https://www.shp.pt',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds'],
    companySize: 'Small',
    employeeCount: 48,
    establishedYear: 1990,
    description: 'Portuguese vegetable seed company focusing on traditional Portuguese varieties and modern hybrids for local market gardeners.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 4,
    minimumOrderValue: 2000,
    notes: 'Source for traditional Portuguese vegetable varieties. Good for local market needs.'
  },
  {
    companyName: 'Atlantis Seeds',
    partnerCode: 'ATL-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 4,
    country: 'Portugal',
    region: 'Europe',
    city: 'Porto',
    address: 'Avenida da Boavista',
    postalCode: '4100-140',
    primaryContact: {
      name: 'International Division',
      position: 'Export Manager',
      email: 'info@atlantisseeds.pt',
      phone: '+351 226 067 350'
    },
    website: 'https://www.atlantisseeds.pt',
    seedTypes: ['Vegetable Seeds', 'Flower Seeds', 'Herb Seeds'],
    certifications: [
      {
        certificationType: 'GlobalGAP',
        issuingAuthority: 'GlobalGAP',
        verified: true
      }
    ],
    companySize: 'Medium',
    employeeCount: 95,
    establishedYear: 2002,
    description: 'Modern Portuguese seed company with international focus. Specializes in vegetable and flower seeds for export to Portuguese-speaking markets.',
    currency: 'EUR',
    paymentTerms: 'Net 45',
    preferredIncoterms: 'CIF',
    leadTimeWeeks: 5,
    minimumOrderValue: 5000,
    notes: 'Growing international presence, particularly in Brazil and African Portuguese-speaking countries.'
  },
  {
    companyName: 'Natureza Bio Sementes',
    partnerCode: 'NAT-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Portugal',
    region: 'Europe',
    city: 'Braga',
    address: 'Quinta do Monte',
    postalCode: '4700-223',
    primaryContact: {
      name: 'Customer Service',
      position: 'Sales Manager',
      email: 'info@naturezabio.pt',
      phone: '+351 253 207 450'
    },
    website: 'https://www.naturezabio.pt',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Organic Seeds', 'Heirloom Seeds'],
    certifications: [
      {
        certificationType: 'EU Organic',
        issuingAuthority: 'Ecocert',
        verified: true
      }
    ],
    companySize: 'Small',
    employeeCount: 28,
    establishedYear: 2008,
    description: 'Small Portuguese organic seed company dedicated to preserving traditional Portuguese varieties and promoting organic agriculture.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'DAP',
    leadTimeWeeks: 3,
    minimumOrderValue: 1200,
    notes: 'Niche supplier focused on organic and heritage Portuguese seeds. Strong commitment to biodiversity.'
  },
  {
    companyName: 'Sementes do Sul',
    partnerCode: 'SDS-PT-001',
    partnershipType: 'International Supplier',
    status: 'Prospective',
    priority: 3,
    country: 'Portugal',
    region: 'Europe',
    city: 'Faro',
    address: 'Zona Industrial de Loulé',
    postalCode: '8100-272',
    primaryContact: {
      name: 'Sales Team',
      position: 'Account Manager',
      email: 'info@sementesdosul.pt',
      phone: '+351 289 416 320'
    },
    website: 'https://www.sementesdosul.pt',
    seedTypes: ['Vegetable Seeds', 'Herb Seeds', 'Cover Crop Seeds'],
    companySize: 'Small',
    employeeCount: 42,
    establishedYear: 1995,
    description: 'Algarve-based seed company specializing in seeds for southern Portuguese climate, including drought-tolerant varieties.',
    currency: 'EUR',
    paymentTerms: 'Net 30',
    preferredIncoterms: 'EXW',
    leadTimeWeeks: 4,
    minimumOrderValue: 1800,
    notes: 'Regional specialist for Algarve region. Good source for drought-tolerant Mediterranean varieties.'
  }
];

async function addPortugalSeedCompanies() {
  try {
    // Create all partners
    const results = await SeedPartner.insertMany(portugalSeedCompanies);
    
    console.log(`\n✅ Created ${results.length} Portuguese seed companies:`);
    results.forEach(partner => {
      console.log(`   - ${partner.companyName} (${partner.partnerCode})`);
    });
    
    console.log('\n📊 To view these partners, go to:');
    console.log('   http://localhost:3001/seed-partners?country=Portugal');
    console.log('\n🇵🇹 Portugal is now represented in your global seed partnership database!');
    
  } catch (error) {
    console.error('❌ Error creating Portuguese seed companies:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the function
addPortugalSeedCompanies();
