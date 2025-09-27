const express = require('express');
const router = express.Router();
const EmailService = require('./EmailService');
const emailService = new EmailService();

// Email client dashboard
router.get('/', (req, res) => {
    res.render('email-client/dashboard', {
        title: 'Email Client',
        currentPage: 'email-client'
    });
});

// Setup email account
router.post('/setup', async (req, res) => {
    try {
        const { email, password, provider, imapHost, imapPort, smtpHost, smtpPort } = req.body;
        
        const accountConfig = {
            email,
            password,
            provider: provider || 'custom',
            imapHost,
            imapPort: parseInt(imapPort) || 993,
            smtpHost, 
            smtpPort: parseInt(smtpPort) || 587
        };

        const result = await emailService.setupAccount(accountConfig);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get emails from folder (with folder specified)
router.get('/emails/:email/:folder', async (req, res) => {
    try {
        const { email, folder } = req.params;
        const { limit } = req.query;
        
        const emails = await emailService.fetchEmails(
            decodeURIComponent(email), 
            folder, 
            parseInt(limit) || 50
        );
        
        res.json({ success: true, emails });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get emails from inbox (default folder)
router.get('/emails/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { limit } = req.query;
        
        const emails = await emailService.fetchEmails(
            decodeURIComponent(email), 
            'INBOX', 
            parseInt(limit) || 50
        );
        
        res.json({ success: true, emails });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get email folders
router.get('/folders/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const folders = await emailService.getFolders(decodeURIComponent(email));
        res.json({ success: true, folders });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Send email
router.post('/send', async (req, res) => {
    try {
        const emailData = req.body;
        const result = await emailService.sendEmail(emailData);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Mark email as read/unread
router.post('/mark/:email/:uid', async (req, res) => {
    try {
        const { email, uid } = req.params;
        const { flag, set } = req.body;
        
        const result = await emailService.markEmail(
            decodeURIComponent(email), 
            uid, 
            flag, 
            set !== false
        );
        
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete email
router.delete('/delete/:email/:uid', async (req, res) => {
    try {
        const { email, uid } = req.params;
        const result = await emailService.deleteEmail(decodeURIComponent(email), uid);
        res.json(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Close connection
router.post('/disconnect/:email', async (req, res) => {
    try {
        const { email } = req.params;
        await emailService.closeConnection(decodeURIComponent(email));
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;
