// services/gmailImapService.js
const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const EventEmitter = require('events');

class GmailImapService extends EventEmitter {
    constructor() {
        super();
        this.imap = null;
        this.isConnected = false;
        this.config = {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD, // Gmail App Password
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: {
                rejectUnauthorized: false
            },
            authTimeout: 30000,
            connTimeout: 30000
        };
    }

    // Connect to Gmail IMAP
    async connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected && this.imap) {
                return resolve();
            }

            console.log('📧 Connecting to Gmail IMAP...');
            this.imap = new Imap(this.config);

            this.imap.once('ready', () => {
                console.log('✅ Gmail IMAP connection ready');
                this.isConnected = true;
                resolve();
            });

            this.imap.once('error', (err) => {
                console.error('❌ Gmail IMAP error:', err);
                this.isConnected = false;
                reject(err);
            });

            this.imap.once('end', () => {
                console.log('📧 Gmail IMAP connection ended');
                this.isConnected = false;
            });

            try {
                this.imap.connect();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Disconnect from Gmail IMAP
    disconnect() {
        if (this.imap && this.isConnected) {
            this.imap.end();
            this.isConnected = false;
        }
    }

    // Open a specific mailbox
    async openMailbox(mailboxName = 'INBOX', readOnly = true) {
        if (!this.isConnected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            this.imap.openBox(mailboxName, readOnly, (err, box) => {
                if (err) {
                    console.error(`❌ Error opening mailbox ${mailboxName}:`, err);
                    reject(err);
                } else {
                    console.log(`📂 Opened mailbox: ${mailboxName} (${box.messages.total} messages)`);
                    resolve(box);
                }
            });
        });
    }

    // Fetch emails from current mailbox
    async fetchEmails(options = {}) {
        const {
            limit = 20,
            offset = 0,
            since = null,
            before = null,
            unseen = false,
            search = null
        } = options;

        if (!this.isConnected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            console.log(`🔍 Searching emails with limit: ${limit}, offset: ${offset}`);
            
            // Build search criteria - IMAP expects array format
            let searchCriteria = ['ALL'];
            
            if (unseen) {
                searchCriteria = ['UNSEEN'];
            }

            if (search) {
                searchCriteria = ['OR', ['SUBJECT', search], ['FROM', search]];
            }

            console.log('🔍 Search criteria:', searchCriteria);

            this.imap.search(searchCriteria, (err, results) => {
                if (err) {
                    console.error('❌ IMAP search error:', err);
                    return reject(err);
                }

                console.log(`✅ Search completed. Found ${results ? results.length : 0} results`);

                if (!results || results.length === 0) {
                    console.log('📭 No results found, returning empty array');
                    return resolve([]);
                }

                // Apply pagination - Get most recent emails
                const totalResults = results.length;
                const start = Math.max(0, totalResults - offset - limit);
                const end = Math.min(totalResults, totalResults - offset);
                const paginatedResults = results.slice(start, end).reverse();

                console.log(`📄 Pagination: total=${totalResults}, start=${start}, end=${end}, paginated=${paginatedResults.length}`);

                if (paginatedResults.length === 0) {
                    console.log('📭 No results after pagination, returning empty array');
                    return resolve([]);
                }

                console.log(`📨 Fetching ${paginatedResults.length} emails...`);

                const fetch = this.imap.fetch(paginatedResults, {
                    bodies: 'HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE MESSAGE-ID)',
                    struct: true
                });

                const emails = [];
                let processedCount = 0;

                fetch.on('message', (msg, seqno) => {
                    console.log(`📧 Processing message ${seqno}`);
                    const email = { seqno };
                    
                    msg.on('body', (stream, info) => {
                        let buffer = '';
                        
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf8');
                        });
                        
                        stream.once('end', () => {
                            try {
                                // Parse header fields
                                const lines = buffer.split('\r\n');
                                let subject = '';
                                let from = '';
                                let to = '';
                                let date = '';
                                let messageId = '';
                                
                                lines.forEach(line => {
                                    const lowerLine = line.toLowerCase();
                                    if (lowerLine.startsWith('subject:')) {
                                        subject = line.substring(8).trim();
                                    } else if (lowerLine.startsWith('from:')) {
                                        from = line.substring(5).trim();
                                    } else if (lowerLine.startsWith('to:')) {
                                        to = line.substring(3).trim();
                                    } else if (lowerLine.startsWith('date:')) {
                                        date = line.substring(5).trim();
                                    } else if (lowerLine.startsWith('message-id:')) {
                                        messageId = line.substring(11).trim();
                                    }
                                });
                                
                                email.messageId = messageId || `${seqno}@${Date.now()}`;
                                email.subject = subject || '(No Subject)';
                                email.from = from || 'Unknown';
                                email.to = to || '';
                                email.cc = '';
                                email.date = date ? new Date(date) : new Date();
                                email.text = '';
                                email.html = '';
                                email.attachments = [];
                                email.flags = [];
                                
                                // Create preview text
                                email.preview = `Email from ${email.from} - ${email.subject}`;
                                
                                processedCount++;
                                console.log(`✅ Processed email ${processedCount}: "${email.subject}" from ${email.from}`);
                                
                            } catch (parseError) {
                                console.error('❌ Error parsing email header:', parseError);
                                email.subject = 'Error parsing email';
                                email.from = 'Unknown';
                                email.preview = 'Unable to parse email content';
                                email.date = new Date();
                            }
                        });
                    });

                    msg.once('attributes', (attrs) => {
                        email.uid = attrs.uid;
                        email.flags = attrs.flags || [];
                        if (attrs.date) {
                            email.date = attrs.date;
                        }
                        emails.push(email);
                    });
                });

                fetch.once('error', (err) => {
                    console.error('❌ Fetch error:', err);
                    reject(err);
                });

                fetch.once('end', () => {
                    console.log(`✅ Fetch completed. Processed ${emails.length} emails`);
                    // Sort emails by date (newest first)
                    emails.sort((a, b) => new Date(b.date) - new Date(a.date));
                    resolve(emails);
                });
            });
        });
    }

    // Get email by UID
    async getEmailByUID(uid) {
        if (!this.isConnected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            console.log(`📧 Fetching email with UID: ${uid}`);
            
            const fetch = this.imap.fetch([uid], {
                bodies: '',
                struct: true
            });

            let email = null;

            fetch.on('message', (msg, seqno) => {
                msg.on('body', (stream, info) => {
                    let buffer = '';
                    
                    stream.on('data', (chunk) => {
                        buffer += chunk.toString('utf8');
                    });
                    
                    stream.once('end', async () => {
                        try {
                            const parsed = await simpleParser(buffer);
                            
                            email = {
                                uid,
                                messageId: parsed.messageId,
                                subject: parsed.subject || '(No Subject)',
                                from: parsed.from ? parsed.from.text : 'Unknown',
                                to: parsed.to ? parsed.to.text : '',
                                cc: parsed.cc ? parsed.cc.text : '',
                                bcc: parsed.bcc ? parsed.bcc.text : '',
                                date: parsed.date || new Date(),
                                text: parsed.text || '',
                                html: parsed.html || parsed.text || '',
                                attachments: parsed.attachments || [],
                                raw: buffer
                            };
                            
                            console.log(`✅ Parsed email: "${email.subject}"`);
                            
                        } catch (parseError) {
                            console.error('❌ Error parsing email:', parseError);
                            email = {
                                uid,
                                subject: 'Error parsing email',
                                from: 'Unknown',
                                error: parseError.message,
                                date: new Date()
                            };
                        }
                    });
                });

                msg.once('attributes', (attrs) => {
                    if (email) {
                        email.flags = attrs.flags || [];
                        email.date = attrs.date || email.date;
                    }
                });
            });

            fetch.once('error', (err) => {
                console.error('❌ Error fetching email by UID:', err);
                reject(err);
            });

            fetch.once('end', () => {
                console.log(`✅ Completed fetching email with UID: ${uid}`);
                resolve(email);
            });
        });
    }

    // Get mailbox statistics
    async getMailboxStats(mailboxName = 'INBOX') {
        try {
            const box = await this.openMailbox(mailboxName);
            
            return {
                total: box.messages.total,
                new: box.messages.new,
                unseen: box.messages.unseen,
                name: mailboxName
            };
        } catch (error) {
            console.error(`❌ Error getting mailbox stats for ${mailboxName}:`, error);
            throw error;
        }
    }

    // Mark email as read
    async markAsRead(uid) {
        if (!this.isConnected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            this.imap.addFlags([uid], ['\\Seen'], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Mark email as unread
    async markAsUnread(uid) {
        if (!this.isConnected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            this.imap.delFlags([uid], ['\\Seen'], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Delete email
    async deleteEmail(uid) {
        if (!this.isConnected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            this.imap.addFlags([uid], ['\\Deleted'], (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.imap.expunge((expungeErr) => {
                        if (expungeErr) {
                            reject(expungeErr);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }
}

module.exports = new GmailImapService();
