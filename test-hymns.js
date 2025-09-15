const mongoose = require('mongoose');
const Hymn = require('./models/Hymn');
require('dotenv').config();

async function testHymns() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');
        
        const count = await Hymn.countDocuments();
        console.log('Total hymns in database:', count);
        
        if (count > 0) {
            const firstHymn = await Hymn.findOne({ number: 1 });
            console.log('First hymn:', firstHymn);
            
            const searchTest = await Hymn.find({ number: 1 });
            console.log('Search for hymn 1:', searchTest);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testHymns();
