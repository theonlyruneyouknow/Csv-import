// email-client/enhancedEmailRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Import email service (existing)
const emailService = require('../services/emailService');

// Import Gmail IMAP service for reading server emails
const gmailImapService = require('../services/gmailImapService');

// Try to import new models, but fall back gracefully if they don't exist
let EmailHistory, EmailContact, EmailSignature;
try {
    EmailHistory = require('../models/EmailHistory');
} catch (e) {
    console.log('📧 EmailHistory model not found, email history disabled');
}

try {
    EmailContact = require('../models/EmailContact');
} catch (e) {
    console.log('📧 EmailContact model not found, contact management disabled');
}

try {
    EmailSignature = require('../models/EmailSignature');
} catch (e) {
    console.log('📧 EmailSignature model not found, signatures disabled');
}

// Try to import OrganicVendor (existing model)
let OrganicVendor;
try {
    OrganicVendor = require('../models/OrganicVendor');
} catch (e) {
    console.log('📧 OrganicVendor model not found, vendor integration disabled');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/email-attachments');
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Please upload images, documents, or archives only.'));
        }
    }
});

// ===== MAIN DASHBOARD =====
router.get('/', async (req, res) => {
    try {
        // Use graceful fallbacks for models that might not exist
        const promises = [];
        
        // Recent emails
        if (EmailHistory) {
            promises.push(EmailHistory.find({ 'metadata.sentBy': req.user.username })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('metadata.relatedVendor', 'name'));
        } else {
            promises.push(Promise.resolve([]));
        }
        
        // Contacts
        if (EmailContact) {
            promises.push(EmailContact.find({ status: 'active' }).limit(20));
        } else {
            promises.push(Promise.resolve([]));
        }
        
        // Signatures
        if (EmailSignature) {
            promises.push(EmailSignature.getUserSignatures(req.user.username));
        } else {
            promises.push(Promise.resolve([]));
        }
        
        // Email stats
        if (EmailHistory) {
            promises.push(EmailHistory.getStats(30));
        } else {
            promises.push(Promise.resolve([{
                totalEmails: 0,
                sentEmails: 0,
                failedEmails: 0
            }]));
        }
        
        const [recentEmails, contacts, signatures, emailStats] = await Promise.all(promises);
        
        res.render('email-client/enhanced-dashboard', {
            title: 'Enhanced Email Client',
            user: req.user,
            recentEmails,
            contacts: contacts.slice(0, 10),
            signatures,
            stats: emailStats[0] || {
                totalEmails: 0,
                sentEmails: 0,
                failedEmails: 0
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== EMAIL COMPOSITION =====
router.get('/compose', async (req, res) => {
    try {
        const promises = [];
        
        // Contacts
        if (EmailContact) {
            promises.push(EmailContact.find({ status: 'active' }).sort({ 'name.display': 1 }));
        } else {
            promises.push(Promise.resolve([]));
        }
        
        // Signatures  
        if (EmailSignature) {
            promises.push(EmailSignature.getUserSignatures(req.user.username));
        } else {
            promises.push(Promise.resolve([]));
        }
        
        const [contacts, signatures] = await Promise.all(promises);
        
        res.render('email-client/enhanced-compose', {
            title: 'Compose Email',
            user: req.user,
            contacts,
            signatures,
            vendorId: req.query.vendorId,
            template: req.query.template
        });
    } catch (error) {
        console.error('Compose error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== SEND EMAIL =====
router.post('/send', upload.array('attachments', 10), async (req, res) => {
    try {
        const { 
            to, cc, bcc, subject, content, priority, 
            signatureId, templateName, templateVariables,
            relatedVendorId, relatedOrderId, emailType
        } = req.body;
        
        // Prepare recipients
        const recipients = [];
        if (to) {
            to.split(',').forEach(email => {
                recipients.push({ email: email.trim(), type: 'to' });
            });
        }
        if (cc) {
            cc.split(',').forEach(email => {
                recipients.push({ email: email.trim(), type: 'cc' });
            });
        }
        if (bcc) {
            bcc.split(',').forEach(email => {
                recipients.push({ email: email.trim(), type: 'bcc' });
            });
        }
        
        // Get signature if specified
        let signature = null;
        if (signatureId) {
            signature = await EmailSignature.findById(signatureId);
        } else {
            signature = await EmailSignature.getDefault(req.user.username);
        }
        
        // Prepare email content
        let emailHtml = content;
        let emailText = content.replace(/<[^>]*>/g, ''); // Strip HTML for text version
        
        // Add signature
        if (signature) {
            const renderedSignature = signature.render({
                name: req.user.fullName || req.user.username,
                email: req.user.email
            });
            emailHtml += '<br><br>' + renderedSignature.html;
            emailText += '\n\n' + renderedSignature.text;
            await signature.incrementUsage();
        }
        
        // Prepare attachments
        const attachments = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                attachments.push({
                    filename: file.originalname,
                    path: file.path
                });
            });
        }
        
        // Send email
        const emailOptions = {
            to: recipients.filter(r => r.type === 'to').map(r => r.email).join(','),
            cc: cc || undefined,
            bcc: bcc || undefined,
            subject,
            html: emailHtml,
            text: emailText,
            attachments: attachments.length > 0 ? attachments : undefined
        };
        
        const result = await emailService.sendEmail(emailOptions);
        
        // Save to email history
        const emailHistory = new EmailHistory({
            messageId: result.messageId,
            sender: {
                email: req.user.email || process.env.EMAIL_FROM,
                name: req.user.fullName || req.user.username
            },
            recipients,
            subject,
            content: {
                html: emailHtml,
                text: emailText
            },
            template: templateName ? {
                name: templateName,
                variables: templateVariables ? JSON.parse(templateVariables) : {}
            } : undefined,
            attachments: req.files ? req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype
            })) : [],
            priority: priority || 'normal',
            status: 'sent',
            metadata: {
                sentBy: req.user.username,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                relatedVendor: relatedVendorId || undefined,
                relatedOrder: relatedOrderId || undefined,
                emailType: emailType || 'manual'
            },
            timestamps: {
                sent: new Date()
            },
            response: {
                accepted: result.accepted || [],
                rejected: result.rejected || [],
                messageId: result.messageId,
                response: result.response
            }
        });
        
        await emailHistory.save();
        
        // Update contact email stats
        for (const recipient of recipients) {
            await EmailContact.findOneAndUpdate(
                { email: recipient.email },
                { 
                    $inc: { 'metadata.totalEmailsSent': 1 },
                    $set: { 'metadata.lastEmailSent': new Date() }
                }
            );
        }
        
        console.log(`📧 Email sent successfully by ${req.user.username} to ${to}`);
        console.log(`📧 Subject: ${subject}`);
        console.log(`📧 Message ID: ${result.messageId}`);
        
        res.json({ 
            success: true, 
            messageId: result.messageId,
            historyId: emailHistory._id,
            message: 'Email sent successfully!' 
        });
        
    } catch (error) {
        console.error('❌ Email sending error:', error);
        
        // Save failed email to history
        try {
            const failedEmail = new EmailHistory({
                messageId: 'failed-' + Date.now(),
                sender: {
                    email: req.user.email || process.env.EMAIL_FROM,
                    name: req.user.fullName || req.user.username
                },
                recipients: req.body.to ? [{ email: req.body.to, type: 'to' }] : [],
                subject: req.body.subject || 'No subject',
                content: {
                    html: req.body.content,
                    text: req.body.content
                },
                status: 'failed',
                metadata: {
                    sentBy: req.user.username,
                    emailType: 'manual'
                },
                response: {
                    response: error.message
                }
            });
            await failedEmail.save();
        } catch (historyError) {
            console.error('Failed to save error to history:', historyError);
        }
        
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to send email' 
        });
    }
});

// ===== EMAIL TEMPLATES =====
router.get('/templates', async (req, res) => {
    try {
        const templates = {
            business: [
                {
                    id: 'order_confirmation',
                    name: 'Order Confirmation',
                    category: 'Purchase Orders',
                    description: 'Confirm order details with vendor',
                    variables: ['vendorName', 'orderNumber', 'orderDate', 'totalAmount', 'items'],
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #2c3e50;">Order Confirmation</h2>
                            <p>Dear {{vendorName}},</p>
                            <p>We are pleased to confirm your order with the following details:</p>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <strong>Order Number:</strong> {{orderNumber}}<br>
                                <strong>Order Date:</strong> {{orderDate}}<br>
                                <strong>Total Amount:</strong> ${{totalAmount}}
                            </div>
                            <p>Please confirm receipt of this order and provide an estimated delivery date.</p>
                            <p>Thank you for your continued partnership.</p>
                        </div>
                    `
                },
                {
                    id: 'status_update',
                    name: 'Order Status Update',
                    category: 'Purchase Orders',
                    description: 'Update vendor on order status',
                    variables: ['vendorName', 'orderNumber', 'status', 'notes'],
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #27ae60;">Order Status Update</h2>
                            <p>Hi {{vendorName}},</p>
                            <p>This is an update regarding order #{{orderNumber}}:</p>
                            <div style="background: #e8f5e8; padding: 15px; border-left: 4px solid #27ae60; margin: 20px 0;">
                                <strong>Current Status:</strong> {{status}}
                            </div>
                            {{notes ? '<p><strong>Notes:</strong> ' + notes + '</p>' : ''}}
                            <p>Please let us know if you have any questions.</p>
                        </div>
                    `
                },
                {
                    id: 'payment_notification',
                    name: 'Payment Notification',
                    category: 'Finance',
                    description: 'Notify vendor of payment',
                    variables: ['vendorName', 'invoiceNumber', 'paymentAmount', 'paymentDate', 'paymentMethod'],
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #3498db;">Payment Notification</h2>
                            <p>Dear {{vendorName}},</p>
                            <p>This confirms that payment has been processed for invoice {{invoiceNumber}}.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr style="background: #f1f2f6;">
                                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number</strong></td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">{{invoiceNumber}}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Amount</strong></td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">${{paymentAmount}}</td>
                                </tr>
                                <tr style="background: #f1f2f6;">
                                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Date</strong></td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">{{paymentDate}}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Method</strong></td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">{{paymentMethod}}</td>
                                </tr>
                            </table>
                            <p>Thank you for your business!</p>
                        </div>
                    `
                }
            ],
            communication: [
                {
                    id: 'general_inquiry',
                    name: 'General Inquiry',
                    category: 'Communication',
                    description: 'General business inquiry template',
                    variables: ['recipientName', 'companyName', 'inquiryDetails'],
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #34495e;">Business Inquiry</h2>
                            <p>Dear {{recipientName}},</p>
                            <p>I hope this email finds you well. I am reaching out regarding {{inquiryDetails}}.</p>
                            <p>We would appreciate the opportunity to discuss this further at your convenience.</p>
                            <p>Please let us know if you need any additional information.</p>
                            <p>Best regards,</p>
                        </div>
                    `
                },
                {
                    id: 'follow_up',
                    name: 'Follow Up',
                    category: 'Communication',
                    description: 'Professional follow-up email',
                    variables: ['recipientName', 'previousSubject', 'followUpDetails'],
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #8e44ad;">Follow Up</h2>
                            <p>Hi {{recipientName}},</p>
                            <p>I wanted to follow up on {{previousSubject}} that we discussed.</p>
                            <p>{{followUpDetails}}</p>
                            <p>Please let me know if you have any questions or if there's anything else I can help with.</p>
                            <p>Looking forward to hearing from you.</p>
                        </div>
                    `
                }
            ]
        };
        
        res.json({ success: true, templates });
    } catch (error) {
        console.error('Templates error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== EMAIL HISTORY =====
router.get('/history', async (req, res) => {
    try {
        // Check if EmailHistory model exists
        if (!EmailHistory) {
            // Fallback: Show placeholder history page
            return res.render('email-client/history', {
                title: 'Email History',
                user: req.user,
                emails: [],
                total: 0,
                currentPage: 1,
                totalPages: 1,
                hasEmailHistory: false,
                message: 'Email history tracking is not yet enabled. Once activated, your sent emails will appear here.'
            });
        }
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const searchQuery = {
            'metadata.sentBy': req.user.username
        };
        
        // Add search filters
        if (req.query.search) {
            searchQuery.$or = [
                { subject: new RegExp(req.query.search, 'i') },
                { 'recipients.email': new RegExp(req.query.search, 'i') }
            ];
        }
        
        if (req.query.status) {
            searchQuery.status = req.query.status;
        }
        
        if (req.query.dateFrom || req.query.dateTo) {
            searchQuery.createdAt = {};
            if (req.query.dateFrom) searchQuery.createdAt.$gte = new Date(req.query.dateFrom);
            if (req.query.dateTo) searchQuery.createdAt.$lte = new Date(req.query.dateTo);
        }
        
        const [emails, total] = await Promise.all([
            EmailHistory.find(searchQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .populate('metadata.relatedVendor', 'name email')
                .populate('metadata.relatedOrder', 'orderNumber'),
            EmailHistory.countDocuments(searchQuery)
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json({
                success: true,
                emails,
                pagination: {
                    current: page,
                    total: totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                total
            });
        } else {
            res.render('email-client/history', {
                title: 'Email History',
                user: req.user,
                emails,
                total,
                currentPage: page,
                totalPages,
                hasEmailHistory: true,
                query: req.query
            });
        }
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== CONTACTS MANAGEMENT =====
router.get('/contacts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        
        const searchOptions = {
            sort: { 'name.display': 1 },
            limit,
            skip: (page - 1) * limit
        };
        
        const contacts = await EmailContact.searchContacts(req.query, searchOptions);
        const total = await EmailContact.countDocuments({ status: 'active' });
        
        res.render('email-client/contacts', {
            title: 'Contacts',
            user: req.user,
            contacts,
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('Contacts error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== SYNC VENDOR CONTACTS =====
router.post('/contacts/sync-vendors', async (req, res) => {
    try {
        const results = await EmailContact.syncWithVendors();
        res.json({ success: true, results });
    } catch (error) {
        console.error('Vendor sync error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== EMAIL API ENDPOINTS =====
router.post('/api/send', async (req, res) => {
    try {
        const { to, subject, content, priority, templateName, variables } = req.body;
        
        // Get default signature for API user
        const signature = await EmailSignature.getDefault(req.user.username);
        
        let emailHtml = content;
        if (signature) {
            const renderedSignature = signature.render(variables || {});
            emailHtml += '<br><br>' + renderedSignature.html;
        }
        
        const result = await emailService.sendEmail({
            to,
            subject,
            html: emailHtml
        });
        
        // Save to history
        const emailHistory = new EmailHistory({
            messageId: result.messageId,
            sender: {
                email: req.user.email || process.env.EMAIL_FROM,
                name: req.user.fullName || req.user.username
            },
            recipients: [{ email: to, type: 'to' }],
            subject,
            content: { html: emailHtml },
            template: templateName ? { name: templateName, variables } : undefined,
            priority: priority || 'normal',
            status: 'sent',
            metadata: {
                sentBy: req.user.username,
                emailType: 'api'
            },
            timestamps: { sent: new Date() },
            response: result
        });
        
        await emailHistory.save();
        
        res.json({ success: true, messageId: result.messageId });
    } catch (error) {
        console.error('API send error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== SIGNATURES MANAGEMENT =====
router.get('/signatures', async (req, res) => {
    try {
        const signatures = await EmailSignature.getUserSignatures(req.user.username);
        res.render('email-client/signatures', {
            title: 'Email Signatures',
            user: req.user,
            signatures
        });
    } catch (error) {
        console.error('Signatures error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== GMAIL INBOX ROUTES =====

// Get Gmail mailboxes (folders)
router.get('/mailboxes', async (req, res) => {
    try {
        const mailboxes = await gmailImapService.getMailboxes();
        res.json({ success: true, mailboxes });
    } catch (error) {
        console.error('Error fetching mailboxes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get emails from Gmail server
router.get('/inbox', async (req, res) => {
    try {
        const mailbox = req.query.mailbox || 'INBOX';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        // Open the specified mailbox
        const box = await gmailImapService.openMailbox(mailbox);
        
        // Fetch emails with pagination
        const emails = await gmailImapService.fetchEmails({
            limit,
            offset,
            search: req.query.search,
            unseen: req.query.unseen === 'true'
        });
        
        // Get mailbox stats
        const stats = await gmailImapService.getMailboxStats(mailbox);
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json({
                success: true,
                emails,
                stats,
                pagination: {
                    current: page,
                    limit,
                    total: Math.ceil(stats.total / limit)
                }
            });
        } else {
            res.render('email-client/inbox', {
                title: `${mailbox} - Gmail Inbox`,
                user: req.user,
                emails,
                stats,
                currentMailbox: mailbox,
                pagination: {
                    current: page,
                    limit,
                    total: Math.ceil(stats.total / limit)
                },
                query: req.query
            });
        }
    } catch (error) {
        console.error('Error fetching Gmail inbox:', error);
        res.status(500).render('error', {
            title: 'Gmail Connection Error',
            user: req.user,
            error: {
                message: 'Unable to connect to Gmail',
                details: error.message,
                suggestion: 'Please check your Gmail App Password and IMAP settings'
            }
        });
    }
});

// Get specific email by UID
router.get('/inbox/email/:uid', async (req, res) => {
    try {
        const uid = req.params.uid;
        const mailbox = req.query.mailbox || 'INBOX';
        
        // Open mailbox
        await gmailImapService.openMailbox(mailbox);
        
        // Fetch specific email
        const email = await gmailImapService.getEmailByUID(parseInt(uid));
        
        if (!email) {
            return res.status(404).json({ success: false, error: 'Email not found' });
        }
        
        // Mark as read if requested
        if (req.query.markRead === 'true') {
            await gmailImapService.markAsRead(parseInt(uid));
        }
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json({ success: true, email });
        } else {
            res.render('email-client/email-view', {
                title: email.subject,
                user: req.user,
                email,
                mailbox
            });
        }
    } catch (error) {
        console.error('Error fetching email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark email as read/unread
router.post('/inbox/email/:uid/mark', async (req, res) => {
    try {
        const uid = parseInt(req.params.uid);
        const action = req.body.action; // 'read' or 'unread'
        const mailbox = req.body.mailbox || 'INBOX';
        
        await gmailImapService.openMailbox(mailbox, false); // Open with write access
        
        if (action === 'read') {
            await gmailImapService.markAsRead(uid);
        } else if (action === 'unread') {
            await gmailImapService.markAsUnread(uid);
        } else {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }
        
        res.json({ success: true, message: `Email marked as ${action}` });
    } catch (error) {
        console.error('Error marking email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete email
router.delete('/inbox/email/:uid', async (req, res) => {
    try {
        const uid = parseInt(req.params.uid);
        const mailbox = req.body.mailbox || 'INBOX';
        
        await gmailImapService.openMailbox(mailbox, false); // Open with write access
        await gmailImapService.deleteEmail(uid);
        
        res.json({ success: true, message: 'Email deleted' });
    } catch (error) {
        console.error('Error deleting email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get mailbox statistics
router.get('/stats', async (req, res) => {
    try {
        const mailboxes = ['INBOX', '[Gmail]/Sent Mail', '[Gmail]/Drafts', '[Gmail]/Spam', '[Gmail]/Trash'];
        const stats = {};
        
        for (const mailbox of mailboxes) {
            try {
                stats[mailbox] = await gmailImapService.getMailboxStats(mailbox);
            } catch (error) {
                console.warn(`Could not get stats for ${mailbox}:`, error.message);
                stats[mailbox] = { total: 0, new: 0, unseen: 0, name: mailbox, error: true };
            }
        }
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
