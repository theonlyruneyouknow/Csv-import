# Google Photos URL and Album Title Fixes

## Issues Fixed

### 1. Broken Image Previews in Shared Albums ✅
**Problem:** When importing photos from Google Photos with Family Circle sharing, the album's shareable URL (e.g., `https://photos.app.goo.gl/xxxxx`) was stored in the `url` field. This is a web page link, not a direct image URL, causing broken image previews in the media detail view.

**Root Cause:** In the Google Photos import route, the code was using:
```javascript
url: sharedAlbumUrl || (photo.baseUrl + '=d')
```
This stored the album URL instead of the individual photo URL when sharing was enabled.

**Solution:** Always store the direct image URL (baseUrl + parameters) in the `url` field:
```javascript
url: photo.baseUrl + '=d'  // Direct image URL for display
```

The shareable album URL is now kept in `googlePhotos.shareableUrl` for the "View Album in Google Photos" button.

### 2. Missing Album Title Detection in URL Upload ✅
**Problem:** When uploading a memory via URL link, there was no way to:
- Auto-detect the media type (photo vs video)
- Extract album title or metadata from the URL

**Solution:** Added "Auto-fill from URL" button that:
- **Auto-detects media type** from URL patterns (YouTube, image extensions, video extensions)
- **Extracts YouTube video titles** using YouTube oEmbed API
- **Suggests album names** for known services (Google Photos, YouTube channels)
- **Parses filenames** from URL paths for generic links
- **Offers cloud import** when detecting Google Photos URLs for better integration

## Files Modified

### 1. `routes/greatestjoy-oauth.js`
- **Line ~274:** Fixed URL storage to always use direct image URL (`photo.baseUrl + '=d'`)
- **Impact:** New imports will have working image previews

### 2. `views/greatestjoy-upload.ejs`
- **Line ~163:** Added "Auto-fill from URL" button next to URL input field
- **Line ~308+:** Added `fetchUrlMetadata()` function with URL pattern detection:
  - Video detection: YouTube, Vimeo, video file extensions
  - Image detection: Image file extensions, Google Photos, iCloud
  - YouTube title extraction via oEmbed API
  - Filename parsing from URL paths
  - Album name suggestions
- **Impact:** Users can now auto-detect metadata from URLs

### 3. `views/greatestjoy-media-detail.ejs`
- **Line ~159-164:** Added error handling (`onerror` attributes) to image and video elements
- **Line ~467+:** Added `handleImageError()` and `handleVideoError()` functions:
  - Shows helpful error messages with fallback options
  - For Google Photos shared albums, offers "View Album in Google Photos" button
  - Displays original URL for debugging
- **Line ~167-188:** Enhanced source information display:
  - Shows album name badge next to source type
  - Added support for 'url' source type display
  - Shows album link for local uploads with album field
- **Impact:** Better error handling and user feedback

## New Files Created

### `fix-google-photos-urls.js`
Migration script to fix existing media entries that have incorrect URL format.

**Usage:**
```bash
node fix-google-photos-urls.js
```

**What it does:**
- Finds all media with `sourceType: 'google-photos-shared'`
- Checks if URL contains album shareable links (photos.app.goo.gl)
- Reconstructs direct image URLs from `googlePhotos.baseUrl`
- Updates `url` and `thumbnailUrl` fields
- Reports how many entries were fixed vs skipped

## How It Works Now

### Google Photos Import Flow
1. User selects photos in cloud import
2. Chooses Family Circle(s) to share with
3. System creates shared album: "Greatest Joy - [Circle Name]"
4. Photos added to shared album
5. **Each photo stored with**:
   - `url`: Direct image URL (baseUrl + '=d') ← **FIXED**
   - `googlePhotos.shareableUrl`: Album web page link
   - `sourceType`: 'google-photos-shared'
   - Album name stored in `album` field

### URL Upload Flow  
1. User enters URL in upload form
2. Can click "Auto-fill from URL" to detect:
   - Media type (photo/video)
   - Title from YouTube or filename
   - Album name from service
3. System stores with:
   - `url`: The provided URL
   - `sourceType`: 'url'
   - Detected metadata in title/album fields

### Media Display
1. Detail view uses `media.url` for `<img src="">` or `<video src="">`
2. If image fails to load:
   - Shows error message with fallback options
   - For Google Photos: Offers "View Album in Google Photos" button
   - For others: Shows "Open in new tab" option
3. Source badge shows origin (Google Shared, Local, URL)
4. Album name displayed with source information

## Testing Steps

### 1. Test Existing Media Migration
```bash
node fix-google-photos-urls.js
```
Look for output showing fixed entries.

### 2. Test New Google Photos Import
1. Go to Cloud Import
2. Connect Google Photos
3. Select photos and a Family Circle
4. Import photos
5. Check detail view - images should display correctly
6. Verify "View Album in Google Photos" button works

### 3. Test URL Upload with Auto-fill
1. Go to Upload form
2. Paste a YouTube URL (e.g., `https://youtu.be/dQw4w9WgXcQ`)
3. Click "Auto-fill from URL"
4. Verify:
   - Media type set to "video"
   - Title filled with video title
   - Album suggests "YouTube Videos" or channel name

1. Paste an image URL with filename
2. Click "Auto-fill"
3. Verify title extracted from filename

### 4. Test Error Handling
1. Edit a media entry to have an invalid URL
2. View in detail page
3. Verify error message displays with helpful fallback options

## Production Considerations

### Current Limitations
- **Google Photos URLs expire:** The baseUrl + '=d' URLs are valid for ~60 minutes
- **Session storage:** OAuth tokens stored in session (temporary)

### Long-term Solutions
1. **For persistent access:** Store media in your own cloud storage (AWS S3, Cloudflare R2)
2. **For Google Photos:** Implement token refresh logic and re-fetch URLs when expired
3. **Database token storage:** Move OAuth tokens from session to encrypted database field

### Rate Limits
- Google Photos API: 10,000 requests/day (free tier)
- YouTube oEmbed: No strict limits, but implement caching for repeated requests

## Future Enhancements
- [ ] Add support for more URL patterns (iCloud, OneDrive, Dropbox metadata)
- [ ] Implement automatic URL refresh for expired Google Photos links
- [ ] Add bulk migration tool in admin panel
- [ ] Cache YouTube metadata to avoid repeated API calls
- [ ] Add preview thumbnails in URL upload form
- [ ] Support for Instagram, Facebook photo URLs

## Notes
- All changes are backward compatible
- Existing media with correct URLs will not be affected
- Migration script is idempotent (safe to run multiple times)
- Album titles are now preserved and displayed throughout the UI
