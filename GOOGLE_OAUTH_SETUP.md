# Google Photos & Google Drive OAuth Setup Guide

## Overview
This guide will help you set up OAuth authentication to allow users to import photos directly from Google Photos and Google Drive into Greatest Joy.

## Prerequisites
- Google Cloud Platform account
- Node.js packages: `googleapis` and `node-fetch`

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create Project**
3. Name it "Greatest Joy" (or your preferred name)
4. Click **Create**

## Step 2: Enable APIs

1. In your project, go to **APIs & Services** → **Library**
2. Search for and enable these APIs:
   - **Google Photos Library API**
   - **Google Drive API**
   - **Google People API** (for user info)

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: External (or Internal if using Google Workspace)
   - **App name**: Greatest Joy
   - **User support email**: your email
   - **Developer contact email**: your email
   - **Scopes**: Add these scopes:
     - `../auth/photoslibrary.readonly` (View your Google Photos library)
     - `../auth/photoslibrary.sharing` (Create shared albums for Family Circle sharing)
     - `../auth/drive.readonly` (View files in your Google Drive)
     - `../auth/userinfo.email` (View your email address)
   - **Test users**: Add your email and any testers
   - Click **Save and Continue**

4. Back in **Credentials**, click **Create Credentials** → **OAuth client ID**
5. **Application type**: Web application
6. **Name**: Greatest Joy Web Client
7. **Authorized redirect URIs**: Add these URLs:
   ```
   http://localhost:3001/greatestjoy/oauth/callback/google-photos
   http://localhost:3001/greatestjoy/oauth/callback/google-drive
   ```
   (Update with your production domain when deploying)

8. Click **Create**
9. You'll see your **Client ID** and **Client Secret** - save these!

## Step 4: Add Environment Variables

Add these to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3001/greatestjoy/oauth/callback/google-photos

# For production, use your domain:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/greatestjoy/oauth/callback/google-photos
```

## Step 5: Install Required Packages

```bash
npm install googleapis node-fetch
```

## Step 6: Register Routes in app.js

Add this line with your other route imports:

```javascript
const greatestjoyOAuthRoutes = require('./routes/greatestjoy-oauth');
app.use('/greatestjoy', ensureAuthenticated, greatestjoyOAuthRoutes);
```

## Step 7: Test the Integration

1. Start your application
2. Go to http://localhost:3001/greatestjoy/cloud-import
3. Click **Google Photos** or **Google Drive**
4. You should be redirected to Google's consent screen
5. Sign in and grant permissions
6. You'll be redirected back with access to browse photos

## How It Works

### OAuth Flow
1. User clicks "Connect to Google Photos"
2. Redirects to Google's OAuth consent screen
3. User grants permissions
4. Google redirects back with an authorization code
5. Your app exchanges code for access token and refresh token
6. Tokens stored in session (or database for production)
7. App uses access token to call Google Photos API

### Photo Import Process
1. User browses their Google Photos library
2. Selects photos to import
3. Chooses sharing settings:
   - **Private**: Only the uploader can view
   - **Family Circles**: Shared with specific Family Circles
   - **All Family**: Shared with all user's Family Circles
   - **Public**: Anyone can view
4. For Family Circle sharing:
   - App creates a **shared album** in user's Google Photos (e.g., "Greatest Joy - Smith Family")
   - Adds selected photos to the shared album
   - Gets the **shareableUrl** (publicly accessible, no auth required)
   - Stores the shareableUrl in the database
5. Creates `GreatestJoyMedia` entries with:
   - `sourceType`: 'google-photos-shared' (for Family Circle) or 'google-photos' (private)
   - `url`: Shareable album URL (works for all Family Circle members)
   - `googlePhotos.shareableUrl`: Link to view in Google Photos
6. Photos appear in the gallery with source badges
7. **Family Circle members can view** shared photos without authentication
8. User can click to add stories and voice recordings

**Key Benefits:**
- ✅ No storage needed on your server
- ✅ Family Circle members can view shared photos
- ✅ Photos remain in user's Google Photos
- ✅ High-quality photos (not compressed)
- ✅ Secure (unlisted URLs, only Family Circle members have access)
- ✅ Leverages Google's CDN for fast loading

### API Endpoints Created
- `GET /greatestjoy/cloud-import` - Main import page
- `GET /greatestjoy/oauth/connect/:service` - Initiate OAuth
- `GET /greatestjoy/oauth/callback/:service` - OAuth callback
- `GET /greatestjoy/oauth/google-photos/photos` - List photos
- `POST /greatestjoy/oauth/import` - Import selected photos
- `POST /greatestjoy/oauth/disconnect/:service` - Disconnect service

## Production Considerations

### Security
1. **Store tokens securely**: 
   - Encrypt tokens before storing in database
   - Use a User model field for OAuth tokens
   - Never commit tokens to git

2. **Refresh tokens**: 
   - Access tokens expire after 1 hour
   - Implement automatic refresh using refresh tokens
   - Handle token expiration errors

3. **Environment variables**:
   - Use different credentials for development and production
   - Update redirect URIs for your production domain

### User Model Updates
Consider adding this to your User model:

```javascript
oauthConnections: {
    googlePhotos: {
        accessToken: String, // Encrypted
        refreshToken: String, // Encrypted
        expiryDate: Date,
        email: String
    },
    googleDrive: {
        accessToken: String,
        refreshToken: String,
        expiryDate: Date,
        email: String
    }
}
```

### Rate Limits
- Google Photos API: 10,000 requests per day
- For large imports, implement:
  - Progress indicators
  - Batch processing
  - Queue system for background importing

## Future Enhancements

### iCloud Photos
- Requires Apple Developer account
- Uses CloudKit Web Services
- More complex authentication (no official API)

### Microsoft OneDrive
- Similar OAuth flow
- Microsoft Graph API
- OneDrive SDK available

### Dropbox
- Dropbox API v2
- OAuth 2.0 flow
- Well-documented SDK

## Troubleshooting

### "Error: redirect_uri_mismatch"
- Make sure redirect URI in Google Console exactly matches your app
- Include port number for localhost
- Check for http vs https

### "Access token expired"
- Implement token refresh logic
- Check expiry date before API calls
- Use refresh token to get new access token

### "Insufficient permissions"
- Verify all required scopes are enabled
- Re-authorize the app
- Check OAuth consent screen configuration

### Photos not loading
- Check Google Photos API is enabled
- Verify access token is valid
- Check browser console for errors
- Look at network tab in dev tools

## Support Resources

- [Google Photos API Documentation](https://developers.google.com/photos)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth Playground](https://developers.google.com/oauthplayground/) - Test API calls

## Cost
- Google Photos API is **free** for most use cases
- Free tier: 10,000 reads per day
- Sufficient for family photo app usage

## Privacy & Compliance
- Only request read-only access
- Explain to users what data you access
- Include privacy policy
- Support account disconnection
- Delete user OAuth tokens when accounts are deleted
