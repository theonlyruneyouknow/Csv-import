const nodemailer = require('nodemailer');
const imaps = require('imap-simple');

class EmailService {
    constructor() {
        this.connections = new Map(); // Store connections per user
        this.transporter = null;
    }

    // Configure email account connection
    async setupAccount(accountConfig) {
        const { 
            email, 
            password, 
            imapHost, 
            imapPort = 993, 
            smtpHost, 
            smtpPort = 587,
            provider = 'custom' 
        } = accountConfig;

        console.log('🔧 Setting up email account:', { email, provider, imapHost, smtpHost });

        // Validation
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Predefined configurations for popular providers
        const providerConfigs = {
            gmail: {
                imapHost: 'imap.gmail.com',
                imapPort: 993,
                smtpHost: 'smtp.gmail.com',
                smtpPort: 587
            },
            outlook: {
                imapHost: 'outlook.office365.com',
                imapPort: 993,
                smtpHost: 'smtp.office365.com',
                smtpPort: 587
            },
            yahoo: {
                imapHost: 'imap.mail.yahoo.com',
                imapPort: 993,
                smtpHost: 'smtp.mail.yahoo.com',
                smtpPort: 587
            }
        };

        let config;
        if (provider !== 'custom') {
            config = providerConfigs[provider];
            if (!config) {
                throw new Error(`Unknown provider: ${provider}`);
            }
            console.log('📋 Using predefined configuration for:', provider);
        } else {
            if (!imapHost || !smtpHost) {
                throw new Error('For custom configuration, IMAP and SMTP hosts are required');
            }
            config = { imapHost, imapPort, smtpHost, smtpPort };
            console.log('🔧 Using custom configuration');
        }

        // IMAP configuration
        const imapConfig = {
            imap: {
                user: email,
                password: password,
                host: config.imapHost,
                port: config.imapPort,
                tls: true,
                authTimeout: 10000,
                tlsOptions: { rejectUnauthorized: false }
            }
        };

        // SMTP configuration
        const smtpConfig = {
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,
            auth: {
                user: email,
                pass: password
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        try {
            console.log('📧 Testing IMAP connection to:', config.imapHost + ':' + config.imapPort);
            
            // Test IMAP connection with timeout
            const connection = await Promise.race([
                imaps.connect(imapConfig),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('IMAP connection timeout')), 15000)
                )
            ]);
            
            console.log('📥 Opening INBOX...');
            await connection.openBox('INBOX');
            console.log('✅ IMAP connection successful');
            
            // Store connection
            this.connections.set(email, { imap: imapConfig, connection });
            
            console.log('📤 Testing SMTP connection to:', config.smtpHost + ':' + config.smtpPort);
            
            // Test SMTP connection
            const transporter = nodemailer.createTransporter(smtpConfig);
            await Promise.race([
                transporter.verify(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('SMTP connection timeout')), 15000)
                )
            ]);
            
            console.log('✅ SMTP connection successful');
            this.transporter = transporter;

            console.log(`✅ Email account ${email} configured successfully`);
            return { success: true, email, provider };
        } catch (error) {
            console.error('❌ Email configuration failed:', error);
            
            // Clean up any partial connections
            if (this.connections.has(email)) {
                try {
                    const conn = this.connections.get(email);
                    if (conn.connection) {
                        conn.connection.end();
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
                this.connections.delete(email);
            }
            
            // Provide more specific error messages
            let errorMessage = error.message;
            if (error.message.includes('ENOTFOUND')) {
                errorMessage = `Cannot resolve server address. Check your ${error.message.includes(config.imapHost) ? 'IMAP' : 'SMTP'} host settings.`;
            } else if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Connection refused. Check your server host and port settings.';
            } else if (error.message.includes('Application-specific password required') || 
                       error.message.includes('support.google.com/accounts/answer/185833')) {
                errorMessage = 'Gmail requires an App Password. Please:\n1. Go to Google Account Settings → Security\n2. Enable 2-Step Verification\n3. Generate an App Password for Mail\n4. Use that 16-character password instead of your regular password';
            } else if (error.message.includes('authentication') || error.message.includes('Invalid credentials')) {
                errorMessage = 'Authentication failed. For Gmail/Outlook, use an App Password instead of your regular password.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Connection timeout. Check your network connection and server settings.';
            }
            
            throw new Error(errorMessage);
        }
    }

    // Fetch emails from a folder
    async fetchEmails(userEmail, folder = 'INBOX', limit = 50) {
        try {
            const userConnection = this.connections.get(userEmail);
            if (!userConnection) {
                throw new Error('Email account not configured');
            }

            const connection = userConnection.connection;
            await connection.openBox(folder);

            // Search for emails (get recent ones)
            const searchCriteria = ['ALL'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT'],
                markSeen: false,
                struct: true
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            
            // Sort by date (newest first) and limit
            const sortedMessages = messages
                .sort((a, b) => new Date(b.attributes.date) - new Date(a.attributes.date))
                .slice(0, limit);

            const emails = sortedMessages.map(message => {
                const header = message.parts.find(part => part.which === 'HEADER');
                const body = message.parts.find(part => part.which === 'TEXT');
                
                return {
                    uid: message.attributes.uid,
                    subject: header.body.subject?.[0] || 'No Subject',
                    from: header.body.from?.[0] || 'Unknown Sender',
                    to: header.body.to?.[0] || '',
                    date: new Date(message.attributes.date),
                    flags: message.attributes.flags,
                    body: body ? body.body : 'No content available',
                    seen: message.attributes.flags.includes('\\Seen'),
                    size: message.attributes.size
                };
            });

            return emails;
        } catch (error) {
            console.error('❌ Failed to fetch emails:', error);
            throw error;
        }
    }

    // Send email
    async sendEmail(emailData) {
        const { to, cc, bcc, subject, text, html, attachments } = emailData;

        try {
            if (!this.transporter) {
                throw new Error('SMTP not configured');
            }

            const mailOptions = {
                to: Array.isArray(to) ? to.join(', ') : to,
                cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
                bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
                subject,
                text,
                html,
                attachments
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            throw error;
        }
    }

    // Get email folders
    async getFolders(userEmail) {
        try {
            const userConnection = this.connections.get(userEmail);
            if (!userConnection) {
                throw new Error('Email account not configured');
            }

            const connection = userConnection.connection;
            const folders = await connection.getBoxes();
            
            return this.parseFolders(folders);
        } catch (error) {
            console.error('❌ Failed to get folders:', error);
            throw error;
        }
    }

    // Helper to parse folder structure
    parseFolders(folders, prefix = '') {
        const result = [];
        
        for (const [name, info] of Object.entries(folders)) {
            const fullName = prefix ? `${prefix}/${name}` : name;
            result.push({
                name: fullName,
                displayName: name,
                attributes: info.attribs,
                hasChildren: info.children && Object.keys(info.children).length > 0
            });
            
            if (info.children) {
                result.push(...this.parseFolders(info.children, fullName));
            }
        }
        
        return result;
    }

    // Mark email as read/unread
    async markEmail(userEmail, uid, flag, set = true) {
        try {
            const userConnection = this.connections.get(userEmail);
            if (!userConnection) {
                throw new Error('Email account not configured');
            }

            const connection = userConnection.connection;
            const flags = set ? [flag] : [`!${flag}`];
            await connection.addFlags(uid, flags);
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to mark email:', error);
            throw error;
        }
    }

    // Delete email (move to trash)
    async deleteEmail(userEmail, uid) {
        try {
            const userConnection = this.connections.get(userEmail);
            if (!userConnection) {
                throw new Error('Email account not configured');
            }

            const connection = userConnection.connection;
            await connection.addFlags(uid, ['\\Deleted']);
            await connection.expunge();
            
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to delete email:', error);
            throw error;
        }
    }

    // Close connection
    async closeConnection(userEmail) {
        try {
            const userConnection = this.connections.get(userEmail);
            if (userConnection && userConnection.connection) {
                userConnection.connection.end();
                this.connections.delete(userEmail);
            }
        } catch (error) {
            console.error('❌ Error closing connection:', error);
        }
    }
}

module.exports = EmailService;
