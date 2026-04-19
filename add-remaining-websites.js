// Script to add complete website URLs to all remaining seed partners
// Run with: node add-remaining-websites.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

// Complete website mappings with exact company names from database
const websiteUpdates = {
    // Belgium Companies
    'Beekenkamp Plants & Seeds': 'https://www.beekenkamp.nl',
    'Bejo Zaden Belgium': 'https://www.bejo.com',
    'Cebeco Seeds Belgium': 'https://www.cebeco.com',
    'De Bolster': 'https://www.bolster.nl',
    'Horti-Plan Belgium': 'https://www.horti-plan.be',
    'Semillas Belgium (Fitó Group)': 'https://www.semillasfito.com',
    'Vandaele Seeds & Bulbs': 'https://www.vandaeleseeds.be',
    'Vreeke\'s Zaden Belgium': 'https://www.vreekeszaden.nl',

    // France Companies
    'Clause (HM.CLAUSE)': 'https://www.clausevegetableseeds.com',
    'Florimond Desprez': 'https://www.florimond-desprez.com',
    'Graines Voltz': 'https://www.graines-voltz.com',
    'Limagrain': 'https://www.limagrain.com',
    'Syngenta Seeds (France)': 'https://www.syngenta.fr',
    'Truffaut (Semences Division)': 'https://www.truffaut.com',

    // Germany Companies
    'Bingenheimer Saatgut AG': 'https://www.bingenheimersaatgut.de',
    'Bruno Nebelung GmbH': 'https://www.nebelung.de',
    'Deutsche Saatveredelung AG (DSV)': 'https://www.dsv-saaten.de',
    'Feldsaaten Freudenberger GmbH & Co. KG': 'https://www.freudenberger.net',
    'Hild Samen GmbH': 'https://www.hildsamen.de',
    'KWS SAAT SE': 'https://www.kws.com',
    'Quedlinburger Saatgut GmbH': 'https://www.quedlinburger.de',
    'Saaten-Union GmbH': 'https://www.saaten-union.de',
    'Sperli GmbH': 'https://www.sperli.de',
    'Strube Research GmbH & Co. KG': 'https://www.strube.net',

    // Italy Companies
    'Blumen Group S.p.A.': 'https://www.blumengroup.com',
    'Dotto Sementi': 'https://www.dottosementi.it',
    'Eurosementi S.r.l.': 'https://www.eurosementi.com',
    'Franchi Sementi S.p.A.': 'https://www.franchisementi.it',
    'Hortus Sementi s.r.l.': 'https://www.hortus.it',
    'ISI Sementi S.p.A.': 'https://www.isisementi.com',
    'Ingegnoli Sementi': 'https://www.ingegnoli.it',
    'La Semiorto Sementi S.r.l.': 'https://www.lasemiorto.com',
    'Società Italiana Sementi (SIS)': 'https://www.sisfarm.it',
    'Suba Seeds S.r.l.': 'https://www.subaseeds.com',

    // Poland Companies
    'Małopolskie Centrum Hodowli i Nasiennictwa': 'https://www.mchin.pl',
    'PHRS (Przedsiębiorstwo Hodowli Roślin i Nasiennictwa)': 'https://www.nasiona.com.pl',
    'PNOS (Polska Nowa Odmiana Spółka)': 'https://www.pnos.pl',
    'POLAN (Przedsiębiorstwo Nasienne)': 'https://www.polan.pl',
    'Plantpol': 'https://www.plantpol.com.pl',
    'SEMO Polska': 'https://www.semo.pl',
    'Torseed (Toruńskie Nasiona)': 'https://www.torseed.pl',
    'W. Legutko (Firma Nasiennicza)': 'https://www.legutko.com.pl',

    // Portugal Companies
    'Agro-Sementes': 'https://www.agro-sementes.pt',
    'Atlantis Seeds': 'https://www.atlantisseeds.pt',
    'Fertiprado - Sementes e Nutrição Vegetal': 'https://www.fertiprado.com',
    'Horto Sementes': 'https://www.hortosementes.pt',
    'Lusosem - Lusitana de Sementes': 'https://www.lusosem.pt',
    'Natureza Bio Sementes': 'https://www.naturezabio.pt',
    'Sementes Hortícolas Portuguesas': 'https://www.shportuguesas.pt',
    'Sementes do Sul': 'https://www.sementesdosul.pt',
    'Vitaplan Sementes': 'https://www.vitaplan.pt',

    // Spain Companies  
    'Agrisem Ibérica': 'https://www.agrisem.com',
    'Eurosemillas S.A.': 'https://www.eurosemillas.com',
    'HM.CLAUSE Ibérica': 'https://www.clausevegetableseeds.com',
    'Intersemillas S.A.': 'https://www.intersemillas.es',
    'Ramiro Arnedo S.A.': 'https://www.ramiroarnedo.com',
    'Rocalba S.A.': 'https://www.rocalba.com',
    'Sais (Mascarell Semillas)': 'https://www.saissemillas.com',
    'Semillas Batlle S.A.': 'https://www.batlle.com',
    'Semillas Fitó S.A.': 'https://www.semillasfito.com',
    'Zeraim Ibérica (Syngenta)': 'https://www.syngenta.es',

    // Netherlands - Additional updates
    'Dutch Flower Group': 'https://www.dutchflowergroup.com',
    'HM Clause Netherlands': 'https://www.clausevegetableseeds.com',
    'S&G Seeds': 'https://www.sgseeds.nl'
};

async function updateWebsites() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        let updatedCount = 0;
        let notFoundCount = 0;
        const notFoundList = [];

        // Update each partner with their website
        for (const [companyName, websiteUrl] of Object.entries(websiteUpdates)) {
            const result = await SeedPartner.findOneAndUpdate(
                { companyName: companyName },
                { 
                    $set: { 
                        'businessDetails.website': websiteUrl 
                    } 
                },
                { new: true }
            );

            if (result) {
                console.log(`✅ ${companyName}`);
                updatedCount++;
            } else {
                console.log(`⚠️  Not found: ${companyName}`);
                notFoundCount++;
                notFoundList.push(companyName);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updatedCount} companies`);
        console.log(`⚠️  Not found: ${notFoundCount} companies`);

        if (notFoundList.length > 0) {
            console.log('\n⚠️  Companies not found in database:');
            notFoundList.forEach(name => console.log(`   - ${name}`));
        }

        // Show final count
        const totalPartners = await SeedPartner.countDocuments({});
        const withWebsites = await SeedPartner.countDocuments({ 'businessDetails.website': { $exists: true, $ne: '' } });
        const withoutWebsites = totalPartners - withWebsites;

        console.log('\n' + '='.repeat(60));
        console.log('🌐 WEBSITE COVERAGE');
        console.log('='.repeat(60));
        console.log(`Total Partners: ${totalPartners}`);
        console.log(`With Websites: ${withWebsites} (${Math.round(withWebsites/totalPartners*100)}%)`);
        console.log(`Without Websites: ${withoutWebsites}`);

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error updating websites:', error);
        process.exit(1);
    }
}

updateWebsites();
