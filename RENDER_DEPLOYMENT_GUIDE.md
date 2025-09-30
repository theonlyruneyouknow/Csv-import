# Render Deployment Environment Variables Setup

## Required Environment Variables for Render

When deploying to Render, you need to set these environment variables in your Render dashboard:

### 1. MongoDB Configuration
```
MONGODB_URI=mongodb+srv://user:pass@cluster0.8elw1gh.mongodb.net/purchase-orders?retryWrites=true&w=majority
```

### 2. Session Security
```
SESSION_SECRET=your-super-secret-session-key-change-this-in-production-render-2024
```

### 3. Email Service Configuration
```
EMAIL_SERVICE=gmail
EMAIL_FROM=theonlyruneyouknow@gmail.com
EMAIL_USER=theonlyruneyouknow@gmail.com
EMAIL_PASSWORD=oosy cyqv uhjz xksa
```

### 4. Office 365 Configuration (for rlarsen@territorialseed.com)
```
OFFICE365_USER=rlarsen@territorialseed.com
OFFICE365_PASSWORD=your-office365-password
```

### 5. Application URL (Update with your actual Render URL)
```
APP_URL=https://your-app-name.onrender.com
```

## How to Set Environment Variables in Render

1. **Go to your Render Dashboard**
2. **Select your Web Service**
3. **Go to the Environment tab**
4. **Add each environment variable:**
   - Click "Add Environment Variable"
   - Enter the key (e.g., `EMAIL_USER`)
   - Enter the value (e.g., `theonlyruneyouknow@gmail.com`)
   - Repeat for all variables above, including:
     - `OFFICE365_USER`
     - `OFFICE365_PASSWORD`

## Gmail Setup Requirements

### Make sure your Gmail account has:
1. **2-Factor Authentication enabled**
2. **App Password created** (not your regular Gmail password)
3. **IMAP access enabled** in Gmail Settings

### Gmail IMAP Settings:
- Host: `imap.gmail.com`
- Port: `993`
- Security: `TLS`
- Authentication: App Password (not regular password)

## Troubleshooting

### If you get "Unable to connect to Gmail" error:

1. **Check Environment Variables:** Ensure all variables are set correctly in Render
2. **Verify App Password:** Make sure you're using the Gmail App Password, not regular password
3. **Check Gmail Settings:** Ensure IMAP is enabled in Gmail
4. **Check Logs:** Look at Render logs for specific error messages

### Common Issues:

1. **Missing Environment Variables:** 
   - Error: `Missing Gmail credentials in environment variables`
   - Solution: Set `EMAIL_USER` and `EMAIL_PASSWORD` in Render

2. **Wrong Password:**
   - Error: `Invalid credentials`
   - Solution: Generate a new Gmail App Password

3. **IMAP Disabled:**
   - Error: `Connection refused`
   - Solution: Enable IMAP in Gmail Settings > Forwarding and POP/IMAP

## Testing

After setting up environment variables:
1. Deploy your application to Render
2. Wait for deployment to complete
3. Visit your app URL
4. Login to the system
5. Navigate to `/email-client/inbox`
6. Should connect to Gmail and display emails

## Security Notes

- Never commit `.env` file to Git
- Use different App Passwords for different applications
- Regularly rotate your App Passwords
- Monitor Gmail security alerts for suspicious activity
