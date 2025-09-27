const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// Simple email client dashboard
router.get('/', (req, res) => {
    res.render('email-client/simple-dashboard', {
        title: 'Email Client',
        currentPage: 'email-client',
        user: req.user
    });
});

// Send email
router.post('/send', async (req, res) => {
    try {
        const { to, subject, message, priority = 'normal' } = req.body;
        
        // Validate inputs
        if (!to || !subject || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'To, subject, and message are required' 
            });
        }

        // Prepare email content
        const emailOptions = {
            to: to,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px;">
                        <h2 style="color: #007bff; margin: 0;">TSC Purchase Order System</h2>
                        <p style="margin: 5px 0 0 0; color: #666;">From: ${req.user.firstName} ${req.user.lastName} (${req.user.email})</p>
                    </div>
                    
                    <div style="line-height: 1.6; color: #333;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                        <p>This email was sent from the TSC Purchase Order System by ${req.user.firstName} ${req.user.lastName}.</p>
                        ${priority !== 'normal' ? `<p><strong>Priority: ${priority.toUpperCase()}</strong></p>` : ''}
                    </div>
                </div>
            `,
            text: message
        };

        // Send email
        const result = await emailService.sendEmail(emailOptions);
        
        if (result.success) {
            // Log the email for tracking
            console.log(`📧 Email sent by ${req.user.username} to ${to}: "${subject}"`);
            
            res.json({ 
                success: true, 
                messageId: result.messageId,
                message: 'Email sent successfully!' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.error 
            });
        }
        
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get email templates
router.get('/templates', (req, res) => {
    const templates = [
        {
            id: 'vendor_inquiry',
            name: 'Vendor Inquiry',
            subject: 'Purchase Order Inquiry - {{poNumber}}',
            content: `Hi {{vendorName}},

I hope this email finds you well. I'm reaching out regarding Purchase Order {{poNumber}}.

{{inquiry}}

Please let me know if you need any additional information.

Best regards,
{{senderName}}`
        },
        {
            id: 'order_status',
            name: 'Order Status Update',
            subject: 'Status Update Request - PO {{poNumber}}',
            content: `Dear {{vendorName}},

Could you please provide a status update on Purchase Order {{poNumber}}?

Current Status: {{currentStatus}}
Expected Delivery: {{expectedDate}}

{{additionalNotes}}

Thank you for your attention to this matter.

Best regards,
{{senderName}}`
        },
        {
            id: 'delivery_confirmation',
            name: 'Delivery Confirmation',
            subject: 'Delivery Confirmation Required - PO {{poNumber}}',
            content: `Hello {{vendorName}},

We need to confirm the delivery details for Purchase Order {{poNumber}}.

Delivery Address:
{{deliveryAddress}}

Please confirm:
- Estimated delivery date
- Tracking information (if available)
- Any special delivery instructions

{{additionalInfo}}

Best regards,
{{senderName}}`
        }
    ];
    
    res.json({ success: true, templates });
});

module.exports = router;
