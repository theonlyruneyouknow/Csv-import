require('dotenv').config();
const mongoose = require('mongoose');

const Doc = require('../models/HarvestIntakeDocument');
const parser = require('../services/harvestPdfExtractor');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);

    const docs = await Doc.find().sort({ createdAt: -1 }).limit(400);
    const ackDocs = docs.filter(doc =>
        doc &&
        doc.file &&
        typeof doc.file.originalName === 'string' &&
        /acknowledg/i.test(doc.file.originalName)
    );

    let updated = 0;

    for (const doc of ackDocs) {
        try {
            const extracted = await parser.extractFromFile(doc.file.filePath);
            doc.extracted = extracted;
            await doc.save();
            updated += 1;
            console.log('UPDATED', String(doc._id), doc.file.originalName, 'lines=', (extracted.lineItems || []).length);
        } catch (error) {
            console.log('SKIP', String(doc._id), doc.file.originalName, error.message);
        }
    }

    console.log('TOTAL_UPDATED', updated);
    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error(error);
    try {
        await mongoose.disconnect();
    } catch (_) {
        // no-op
    }
    process.exit(1);
});
