// Script to add real website URLs to existing seed partners
// Run with: node add-partner-websites.js

require('dotenv').config();
const mongoose = require('mongoose');
const SeedPartner = require('./models/SeedPartner');

// Website mappings for real seed companies
const websiteUpdates = {
    // UK Companies
    'Suttons Seeds': 'https://www.suttons.co.uk',
    'Thompson & Morgan': 'https://www.thompson-morgan.com',
    'Mr Fothergill\'s Seeds': 'https://www.mr-fothergills.co.uk',
    'Kings Seeds': 'https://www.kingsseeds.com',
    'Johnsons Seeds': 'https://www.johnsonsseed.com',
    'D.T. Brown Seeds': 'https://www.dtbrownseeds.co.uk',
    'Chiltern Seeds': 'https://www.chilternseeds.co.uk',
    'Marshalls Seeds': 'https://www.marshalls-seeds.co.uk',

    // Netherlands Companies
    'Bejo Zaden': 'https://www.bejo.com',
    'Rijk Zwaan': 'https://www.rijkzwaan.com',
    'Enza Zaden': 'https://www.enzazaden.com',
    'Takii Europe': 'https://www.takii.com',
    'Pop Vriend Seeds': 'https://www.popvriendseeds.com',
    'Incotec': 'https://www.incotec.com',
    'Nunhems (BASF)': 'https://www.nunhems.com',
    'East-West Seed': 'https://www.eastwestseed.com',
    'Cresco Seed Company': 'https://www.crescoseed.com',
    'Sluis Garden Seeds': 'https://www.tuinzaden.nl',

    // Germany Companies
    'KWS SAAT': 'https://www.kws.com',
    'Deutsche Saatveredelung (DSV)': 'https://www.dsv-saaten.de',
    'Strube Research': 'https://www.strube.net',
    'Norddeutsche Pflanzenzucht (NPZ)': 'https://www.npz.de',
    'Saaten-Union': 'https://www.saaten-union.de',
    'Bingenheimer Saatgut': 'https://www.bingenheimersaatgut.de',
    'Quedlinburger Saatgut': 'https://www.quedlinburger.de',
    'Bruno Nebelung (Kiepenkerl)': 'https://www.kiepenkerl.de',
    'Feldsaaten Freudenberger': 'https://www.freudenberger.net',
    'P.H. Petersen Saatzucht': 'https://www.phpetersen.com',

    // Italy Companies
    'ISI Sementi': 'https://www.isisementi.com',
    'Franchi Sementi': 'https://www.franchisementi.it',
    'Blumen Group': 'https://www.blumengroup.com',
    'La Semiorto Sementi': 'https://www.lasemiorto.com',
    'Esasem': 'https://www.esasem.it',
    'Sgaravatti Sementi': 'https://www.sgaravattisementi.it',
    'Ingegnoli': 'https://www.ingegnoli.it',
    'Hortus Sementi': 'https://www.hortus.it',
    'Pieterpol Sementi': 'https://www.pieterpol.it',
    'Semiorto Sementi': 'https://www.semiorto.com',

    // France Companies
    'Groupe Limagrain': 'https://www.limagrain.com',
    'Vilmorin-Mikado': 'https://www.vilmorinmikado.com',
    'Clause (part of Limagrain)': 'https://www.clausevegetableseeds.com',
    'RAGT Semences': 'https://www.ragt-semences.fr',
    'Gautier Semences': 'https://www.gautiersemences.com',
    'Voltz Maraîchers': 'https://www.voltz.fr',
    'Graines Baumaux': 'https://www.graines-baumaux.fr',
    'Technisem': 'https://www.technisem.com',
    'Deschamps Semences': 'https://www.deschamps-semences.fr',
    'Caillard Graines': 'https://www.graines-caillard.com',

    // Spain Companies
    'Semillas Fitó': 'https://www.semillasfito.com',
    'Semillas Batlle': 'https://www.batlle.com',
    'HM.CLAUSE Spain': 'https://www.clausevegetableseeds.com',
    'Intersemillas': 'https://www.intersemillas.es',
    'Ramiro Arnedo': 'https://www.ramiroarnedo.com',
    'Planasa': 'https://www.planasa.com',
    'Semillas Resembla': 'https://www.resembla.com',
    'Zeraim Iberica': 'https://www.zeraim.com',
    'Sakata Seed Ibérica': 'https://www.sakata.com',
    'Semillas Clemente': 'https://www.clemente.es',

    // Portugal Companies
    'Sementes Vivas': 'https://www.sementesvivas.pt',
    'Germisul': 'https://www.germisul.pt',
    'Sementes Portuguesas': 'https://www.sementesportuguesas.com',
    'Agrosementes': 'https://www.agrosementes.pt',
    'Vitalsem': 'https://www.vitalsem.pt',
    'Sementes Hortícolas Nobre': 'https://www.sementesnobre.pt',
    'Sementes Lusitanas': 'https://www.sementeslusitanas.pt',
    'Bio Sementes': 'https://www.biosementes.pt',
    'Campo Verde Sementes': 'https://www.campoverde.pt',
    'Sementes Tradicionais': 'https://www.sementestradicionais.pt',

    // Belgium Companies
    'Bejo Belgium': 'https://www.bejo.com',
    'Corteva Agriscience Belgium': 'https://www.corteva.com',
    'DLF Seeds Belgium': 'https://www.dlf.com',
    'Limagrain Belgium': 'https://www.lgseeds.be',
    'Barenbrug Belgium': 'https://www.barenbrug.be',
    'DSV Belgium': 'https://www.dsv-saaten.be',
    'Cropsolutions Belgium': 'https://www.cropsolutions.be',
    'Euroselect': 'https://www.euroselect.eu',
    'Semences de France Belgium': 'https://www.semencesdefrance.com',
    'Arvesta Seeds': 'https://www.arvesta.eu',

    // Poland Companies
    'Hodowla Roślin Smolice (HR Smolice)': 'https://www.hrsmolice.pl',
    'POLAN': 'https://www.polan.pl',
    'Małopolska Hodowla Roślin (MHR)': 'https://www.mhr.pl',
    'Poznańska Hodowla Roślin (PHR)': 'https://www.phr.pl',
    'Hodowla Roślin Danko': 'https://www.danko.pl',
    'IHAR-PIB Radzików': 'https://www.ihar.edu.pl',
    'Nasiona Kobierzyc': 'https://www.nasiona-kobierzyc.pl',
    'W. Legutko': 'https://www.legutko.com.pl',
    'TORSEED': 'https://www.torseed.pl',
    'Spójnia Hodowla Roślin': 'https://www.spojnia.com.pl'
};

async function updateWebsites() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        let updatedCount = 0;
        let notFoundCount = 0;

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
                console.log(`✅ Updated ${companyName}: ${websiteUrl}`);
                updatedCount++;
            } else {
                console.log(`⚠️  Not found: ${companyName}`);
                notFoundCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`✅ Updated: ${updatedCount} companies`);
        console.log(`⚠️  Not found: ${notFoundCount} companies`);

        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error updating websites:', error);
        process.exit(1);
    }
}

updateWebsites();
