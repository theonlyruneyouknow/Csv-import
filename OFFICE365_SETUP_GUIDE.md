# Office 365 / Microsoft 365 Email Setup Guide

## Authentication Issue: LOGIN Failed

The error "LOGIN failed" for Office 365 typically means one of these issues:

### 1. **Password Not Set**
Currently your `.env` file has:
```
OFFICE365_PASSWORD=your-office365-password-here
```
This needs to be replaced with your actual password.

### 2. **Basic Authentication Disabled** (Most Common)
Many Office 365 organizations disable basic authentication (username/password) for security reasons.

## 🔧 **Solution Options:**

### **Option A: App Password (Recommended)**

1. **Enable Multi-Factor Authentication (MFA):**
   - Log into your Territorial Seed Office 365 account
   - Go to Security Settings
   - Enable MFA/2FA

2. **Generate App Password:**
   - Go to Office 365 Security Settings
   - Look for "App Passwords" or "Additional Security Verification"
   - Generate a new App Password for "Mail" or "IMAP"
   - Copy the generated password (looks like: `abcd efgh ijkl mnop`)

3. **Update .env file:**
   ```
   OFFICE365_PASSWORD=abcd efgh ijkl mnop
   ```

### **Option B: Check Basic Auth Status**

Ask your IT administrator if Basic Authentication is enabled for IMAP on your account.

### **Option C: Alternative IMAP Settings**

Sometimes Office 365 uses different IMAP settings:

```
Host: outlook.office365.com (current)
Alternative: imap-mail.outlook.com
Port: 993 (current)
Security: TLS/SSL (current)
```

### **Option D: OAuth2 Modern Authentication**

This is more complex but more secure. Would require:
- Azure app registration
- OAuth2 token management
- More complex setup

## 🧪 **Testing Steps:**

1. **First, try with your regular password:**
   - Update `OFFICE365_PASSWORD=your-actual-password`
   - Test at: http://localhost:3002/email-client/test-office365

2. **If that fails, try App Password:**
   - Generate App Password as described above
   - Update `OFFICE365_PASSWORD=your-app-password`
   - Test again

3. **Check with IT Department:**
   - Ask about IMAP access policy
   - Ask about Basic Auth vs Modern Auth requirements
   - Ask about any special configuration needed

## 📋 **Current Configuration:**

```
Email: rlarsen@territorialseed.com
Host: outlook.office365.com
Port: 993
Security: TLS
Authentication: Basic (username/password)
```

## 🚨 **Common Corporate Restrictions:**

Many organizations:
- ✅ Disable basic authentication 
- ✅ Require App Passwords
- ✅ Require Modern Authentication (OAuth2)
- ✅ Block IMAP access entirely
- ✅ Restrict to approved applications only

## 📞 **Next Steps:**

1. **Try your regular password first**
2. **If fails, contact Territorial Seed IT department**
3. **Ask specifically about IMAP access and authentication requirements**
4. **Consider using Outlook Web App if IMAP is blocked**
