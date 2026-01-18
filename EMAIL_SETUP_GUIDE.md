# Email Configuration Guide

## Quick Setup

Choose ONE of the email services below and uncomment the corresponding section in your `.env` file.

---

## Option 1: Gmail (Recommended for Small Business)

### Steps:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "TSC Management System"
   - Copy the 16-character password
3. Update `.env`:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_FROM=TSC Management <your-email@gmail.com>
```

**Note**: Use the App Password (16 characters), NOT your regular Gmail password.

---

## Option 2: Office 365 / Outlook (Recommended for Business)

### Steps:
1. Use your Office 365 email credentials
2. Update `.env`:

```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@territorialseed.com
SMTP_PASSWORD=your-password
EMAIL_FROM=TSC Management <your-email@territorialseed.com>
```

---

## Option 3: SendGrid (Professional Service)

### Steps:
1. Sign up at: https://sendgrid.com (Free tier: 100 emails/day)
2. Create an API key:
   - Go to Settings > API Keys
   - Create API Key with "Full Access"
   - Copy the API key
3. Verify sender email:
   - Go to Settings > Sender Authentication
   - Verify your email address
4. Update `.env`:

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=TSC Management <noreply@yourdomain.com>
```

---

## Testing Email Configuration

1. After updating `.env`, restart the server
2. Go to: `/auth/admin/test-email` (admin access required)
3. Enter your email address and click "Send Test Email"
4. Check your inbox (and spam folder)

---

## Troubleshooting

### Gmail Issues:
- **"Less secure app access"**: Use App Password instead
- **"Username and Password not accepted"**: Enable 2FA and generate App Password
- **Emails going to spam**: Use a custom domain or verified SendGrid

### Office 365 Issues:
- **Authentication failed**: Check if account requires MFA
- **Connection refused**: Verify SMTP settings with your IT department
- **TLS errors**: Try `SMTP_SECURE=true` with `SMTP_PORT=465`

### General Issues:
- **No emails sent**: Check `.env` file is saved and server restarted
- **Emails in spam**: Add SPF/DKIM records (requires domain access)
- **Timeout errors**: Check firewall/antivirus blocking port 587

---

## Production Deployment (Render)

### Add Environment Variables:
1. Go to your Render dashboard
2. Select your web service
3. Go to "Environment" tab
4. Add the email configuration variables (matching your `.env` setup)
5. Save and redeploy

**Important**: Never commit `.env` file with real credentials to Git!

---

## Recommended Settings by Use Case

### Personal/Testing:
- **Gmail** with App Password
- Simple setup, no cost

### Small Business:
- **Office 365** if you have it
- **SendGrid** free tier (100/day limit)

### Production/High Volume:
- **SendGrid** paid plan (40,000+/month)
- Better deliverability with SPF/DKIM
- Detailed analytics and bounce handling

---

## Need Help?

Check server logs for email errors:
```
📧 Email service: Development mode (Ethereal Email)  ← Not configured
📧 Email sent successfully!                          ← Configured correctly
❌ Email sending failed: Authentication failed       ← Wrong credentials
```
