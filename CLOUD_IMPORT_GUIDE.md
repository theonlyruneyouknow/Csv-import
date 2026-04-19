# Cloud Import Feature - Quick Reference

## What's New

The Greatest Joy app now supports **importing photos directly from cloud services**!

### Supported Services
- ✅ **Google Photos** - Import your entire library
- ✅ **Google Drive** - Import photos from specific folders
- 🔜 **iCloud Photos** - Coming soon
- 🔜 **Microsoft OneDrive** - Coming soon
- 🔜 **Dropbox** - Coming soon

## How to Use

### For Users

1. **Go to Upload Menu**
   - Click Upload button in the dashboard
   - Select "Import from Cloud Service"

2. **Connect Your Account**
   - Click on Google Photos or Google Drive
   - Sign in with your Google account
   - Grant permissions (read-only access)

3. **Browse Your Photos**
   - See all your photos organized by albums
   - Filter by album or view all photos
   - Select multiple photos using checkboxes

4. **Import Selected Photos**
   - Click "Import Selected Photos"
   - Photos are added to your Greatest Joy gallery
   - Click any photo to add stories and voice recordings

### For Administrators/Setup

See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for complete setup instructions.

**Quick setup:**

1. **Install dependencies:**
   ```bash
   npm install googleapis node-fetch
   ```

2. **Create Google Cloud Project:**
   - Go to https://console.cloud.google.com/
   - Enable Google Photos API and Google Drive API
   - Create OAuth 2.0 credentials

3. **Add environment variables:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/greatestjoy/oauth/callback/google-photos
   ```

4. **Restart your app**

## Features

### Security
- **Read-only access** - Can't modify or delete your Google Photos
- **OAuth 2.0** - Industry standard authentication
- **No password storage** - Uses secure tokens
- **Revocable access** - Disconnect anytime from Google account settings

### Privacy
- Photos are linked, not copied (saves storage)
- Only you can see your imported photos
- Share with family circles as desired
- Disconnect service anytime from import page

### Performance
- Fast browsing with thumbnails
- Batch import support
- Progress indicators
- Handles large libraries (1000+ photos)

## File Structure

```
routes/
  greatestjoy-oauth.js          OAuth integration routes
views/
  greatestjoy-cloud-import.ejs  Cloud import interface
models/
  GreatestJoyMedia.js           Stores photo metadata
GOOGLE_OAUTH_SETUP.md           Complete setup guide
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/greatestjoy/cloud-import` | GET | Import page UI |
| `/greatestjoy/oauth/connect/:service` | GET | Initiate OAuth |
| `/greatestjoy/oauth/callback/:service` | GET | OAuth callback |
| `/greatestjoy/oauth/google-photos/photos` | GET | List photos |
| `/greatestjoy/oauth/import` | POST | Import selected |
| `/greatestjoy/oauth/disconnect/:service` | POST | Disconnect |

## Troubleshooting

### "Error: redirect_uri_mismatch"
- Check redirect URI in Google Console matches exactly
- Include port number for localhost
- Verify http vs https

### "Not connected to Google Photos"
- Session may have expired
- Click "Connect" again
- Check OAuth credentials in .env

### Photos not loading
- Verify Google Photos API is enabled in Google Cloud Console
- Check access token is valid
- Look in browser console for errors

### Import fails
- Check rate limits (10,000 requests/day)
- Verify permissions granted in Google account
- Check server logs for errors

## Future Enhancements

### Planned Features
- **Automatic sync** - Keep gallery updated with new photos
- **Album import** - Import entire albums at once
- **iCloud integration** - For Apple users
- **OneDrive integration** - For Microsoft users
- **Dropbox integration** - For Dropbox users
- **Scheduled imports** - Auto-import on schedule
- **Smart tagging** - Use Google's photo labels
- **Facial recognition** - Tag people automatically

### Technical Improvements
- Token encryption in database
- Background import queue
- Progressive loading for large libraries
- Caching for faster browsing
- Multiple account support

## Benefits Over Manual Upload

| Feature | Manual Upload | Cloud Import |
|---------|---------------|--------------|
| **Speed** | Slow (upload each file) | Fast (just metadata) |
| **Storage** | Uses your server space | Uses Google's space |
| **Organization** | Manual sorting | Keeps original albums |
| **Updates** | Re-upload for changes | Automatic |
| **Mobile friendly** | Difficult | Easy |
| **Batch operation** | Limited | Unlimited |

## Usage Tips

1. **Start with an album** - Easier to organize
2. **Use filters** - Don't get overwhelmed browsing 1000s of photos
3. **Import incrementally** - Do a few albums at a time
4. **Add stories right away** - While memories are fresh
5. **Disconnect when done** - Revoke access if not actively importing

## Support

For issues or questions:
1. Check [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for setup help
2. Check browser console for error messages
3. Review server logs for API errors
4. Verify Google Cloud Console configuration
5. Test with OAuth Playground: https://developers.google.com/oauthplayground/

## Cost

- **Free tier**: 10,000 API calls per day
- Plenty for typical family usage
- No additional charges from Google
- No storage costs (photos stay on Google)

## Migration Notes

If you previously used manual upload:
- Old photos remain unchanged
- Can mix manual and cloud imports
- Cloud imports are tagged "imported" and "google-photos"
- Both workflows are supported forever
