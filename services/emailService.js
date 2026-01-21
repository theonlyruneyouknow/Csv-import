// services/emailService.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
    constructor() {
        this.transporter = null;
        this.initPromise = this.init();
    }

    async init() {
        // Support both EMAIL_* and GMAIL_* naming conventions (for Render compatibility)
        const emailService = process.env.EMAIL_SERVICE || process.env.GMAIL_SERVICE;
        const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
        const emailPassword = process.env.EMAIL_PASSWORD || process.env.GMAIL_PASSWORD || process.env.TSC2;
        const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_FROM;
        
        console.log('📧 ========== EMAIL SERVICE INITIALIZATION ==========');
        console.log('📧 EMAIL_SERVICE env var:', emailService);
        console.log('📧 EMAIL_USER:', emailUser);
        console.log('📧 EMAIL_PASSWORD set:', !!emailPassword);
        console.log('📧 Using password from:', process.env.TSC2 ? 'TSC2' : process.env.GMAIL_PASSWORD ? 'GMAIL_PASSWORD' : 'EMAIL_PASSWORD');
        console.log('📧 ================================================');
        
        // Initialize email transporter based on configuration
        if (emailService === 'sendgrid') {
            // SendGrid configuration
            console.log('📧 Using SendGrid configuration');
            this.transporter = nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                }
            });
        } else if (emailService === 'gmail') {
            // Gmail configuration
            console.log('📧 Using Gmail configuration');
            console.log('📧 Gmail user:', emailUser);
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPassword // Use App Password for Gmail
                }
            });
            console.log('📧 Gmail transporter created successfully');
        } else if (emailService === 'smtp') {
            // Generic SMTP configuration
            console.log('📧 Using generic SMTP configuration');
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD
                }
            });
        } else {
            // Development mode - use Ethereal Email (fake SMTP)
            console.log('📧 Email service: Development mode (Ethereal Email)');
            const testAccount = await nodemailer.createTestAccount();
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
        }
        
        console.log('📧 Email service initialized successfully');
    }

    async sendEmail(options) {
        try {
            // Ensure initialization is complete
            if (this.initPromise) {
                await this.initPromise;
            }
            
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            console.log('📧 Sending email to:', options.to);
            console.log('📧 Using transporter:', this.transporter.transporter ? this.transporter.transporter.name : 'unknown');

            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.GMAIL_FROM || 'noreply@purchaseorder-system.com',
                to: options.to,
                subject: options.subject,
                html: options.html || options.text,
                text: options.text
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            // Log preview URL for development mode
            if (process.env.NODE_ENV !== 'production') {
                console.log('📧 Email sent successfully!');
                console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(result));
            }

            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Welcome email for new users
    async sendWelcomeEmail(user) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #007bff;">Welcome to Purchase Order System!</h1>
                <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
                <p>Your account has been created successfully. Here are your account details:</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Role:</strong> ${user.role}</p>
                    <p><strong>Status:</strong> ${user.status}</p>
                </div>
                ${user.status === 'pending' ? `
                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <p><strong>⏳ Account Pending Approval</strong></p>
                        <p>Your account is pending approval from an administrator. You will receive another email once your account is approved and you can start using the system.</p>
                    </div>
                ` : `
                    <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
                        <p><strong>✅ Account Ready</strong></p>
                        <p>Your account is approved and ready to use!</p>
                        <p><a href="${process.env.APP_URL || 'http://localhost:3001'}/auth/login" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a></p>
                    </div>
                `}
                <p>If you have any questions, please contact your system administrator.</p>
                <p>Best regards,<br>Purchase Order System Team</p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: 'Welcome to Purchase Order System',
            html
        });
    }

    // Account approval notification
    async sendApprovalEmail(user) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #28a745;">🎉 Account Approved!</h1>
                <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
                <p>Great news! Your account has been approved and you can now access the Purchase Order System.</p>
                <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                    <p><strong>✅ You can now:</strong></p>
                    <ul>
                        <li>Access the purchase order dashboard</li>
                        <li>Manage line items (if permitted)</li>
                        <li>View and update order statuses</li>
                        <li>Access system features based on your role: <strong>${user.role}</strong></li>
                    </ul>
                </div>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL || 'http://localhost:3001'}/auth/login" 
                       style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                        Login to Your Account
                    </a>
                </p>
                <p>If you have any questions about using the system, please contact your administrator.</p>
                <p>Best regards,<br>Purchase Order System Team</p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: '🎉 Your Account Has Been Approved - Purchase Order System',
            html
        });
    }

    // Admin notification for new user registration
    async sendAdminNotification(newUser, adminEmails) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #ffc107;">👤 New User Registration</h1>
                <p>A new user has registered and is pending approval:</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Name:</strong> ${newUser.firstName} ${newUser.lastName}</p>
                    <p><strong>Username:</strong> ${newUser.username}</p>
                    <p><strong>Email:</strong> ${newUser.email}</p>
                    <p><strong>Registration Date:</strong> ${new Date(newUser.createdAt).toLocaleString()}</p>
                </div>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL || 'http://localhost:3001'}/auth/admin/users" 
                       style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                        Review User Account
                    </a>
                </p>
                <p>Please review and approve/reject this user account in the admin panel.</p>
                <p>Best regards,<br>Purchase Order System</p>
            </div>
        `;

        // Send to all admin emails
        const emailPromises = adminEmails.map(email => 
            this.sendEmail({
                to: email,
                subject: '👤 New User Registration Pending Approval',
                html
            })
        );

        return await Promise.all(emailPromises);
    }

    // Password reset email
    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3001'}/auth/reset-password/${resetToken}`;
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc3545;">🔒 Password Reset Request</h1>
                <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
                <p>You requested a password reset for your Purchase Order System account.</p>
                <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                    <p><strong>⚠️ Security Notice:</strong></p>
                    <p>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
                <p>To reset your password, click the button below:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px;">
                        Reset Password
                    </a>
                </p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px;">${resetUrl}</p>
                <p>Best regards,<br>Purchase Order System Team</p>
            </div>
        `;

        return await this.sendEmail({
            to: user.email,
            subject: '🔒 Password Reset Request - Purchase Order System',
            html
        });
    }

    // System alert email
    async sendSystemAlert(subject, message, adminEmails) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc3545;">🚨 System Alert</h1>
                <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                    <h3>${subject}</h3>
                    <p>${message}</p>
                </div>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p>Please review this alert and take appropriate action if necessary.</p>
                <p>Best regards,<br>Purchase Order System</p>
            </div>
        `;

        const emailPromises = adminEmails.map(email => 
            this.sendEmail({
                to: email,
                subject: `🚨 System Alert: ${subject}`,
                html
            })
        );

        return await Promise.all(emailPromises);
    }

    // Test email functionality
    async sendTestEmail(toEmail) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #007bff;">📧 Email Test Successful!</h1>
                <p>This is a test email from the Purchase Order System.</p>
                <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>✅ Email Configuration Working</strong></p>
                    <p>Your email service is properly configured and working correctly.</p>
                </div>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                <p>Best regards,<br>Purchase Order System Team</p>
            </div>
        `;

        return await this.sendEmail({
            to: toEmail,
            subject: '📧 Email Test - Purchase Order System',
            html
        });
    }
}

module.exports = new EmailService();
