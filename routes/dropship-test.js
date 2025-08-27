const express = require('express');
const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
    console.log('🧪 Test endpoint hit from dropship-test!');
    res.json({ success: true, message: 'Test endpoint working from dropship-test!' });
});

module.exports = router;
