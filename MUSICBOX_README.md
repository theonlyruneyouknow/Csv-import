# 🎵 MusicBox Module

A comprehensive media library management system for uploading, organizing, and playing audio and video files.

## Features

### 📤 File Upload
- Drag & drop or browse to upload
- Supports audio formats: MP3, WAV, OGG, AAC, FLAC
- Supports video formats: MP4, AVI, MOV, WebM
- File size limit: 500MB per file
- Progress tracking during upload

### 📋 Metadata Management
- **Required Fields:**
  - Song Name
  - Artist
  
- **Optional Fields:**
  - Composer
  - Genre
  - Description
  - Recording Date
  - Location (where recorded)
  - Tags (comma-separated)

### 🔍 Search & Filter
- Search by song name, artist, composer
- Filter by media type (audio/video)
- Sort by:
  - Upload date
  - Song name
  - Artist
  - Play count
- Ascending/descending order

### ▶️ Playback
- Built-in audio/video player
- Stream directly from server
- Supports seeking/scrubbing
- Play count tracking

### ⭐ Organization
- Mark favorites
- Tag-based categorization
- View detailed metadata
- Track play statistics

### 📊 Statistics Dashboard
- Total media files
- Audio vs video breakdown
- Total play count across library
- Real-time updates

## Usage

### Uploading Media

1. Navigate to MusicBox from the dashboard
2. Click "Upload Media" button
3. Drag & drop your file or click to browse
4. Fill in the required information:
   - Song name
   - Artist name
5. Add optional details:
   - Composer
   - Genre
   - Description
   - Recording date
   - Location
   - Tags
6. Click "Upload Media"
7. Wait for upload to complete

### Viewing & Playing

1. Click on any media card to view details
2. Use the built-in player to listen/watch
3. View all metadata and play statistics
4. Mark as favorite using the star button

### Managing Your Library

- **Search:** Use the search bar to find specific songs, artists, or composers
- **Filter:** Select media type (audio/video only)
- **Sort:** Choose how to organize your library
- **Delete:** Remove unwanted media files (cannot be undone)

## Technical Details

### Database Schema

```javascript
{
  filename: String,          // System filename
  originalFilename: String,  // User's original filename
  filePath: String,         // Full path on server
  fileType: String,         // 'audio' or 'video'
  mimeType: String,         // MIME type
  fileSize: Number,         // Size in bytes
  duration: Number,         // Duration in seconds
  
  songName: String,         // Song title
  artist: String,           // Artist name
  composer: String,         // Composer name
  
  description: String,      // User description
  recordingDate: Date,      // When recorded
  location: String,         // Where recorded
  
  uploadedBy: String,       // Username
  uploadedAt: Date,         // Upload timestamp
  
  genre: String,           // Music genre
  tags: [String],          // Search tags
  playCount: Number,       // Times played
  isFavorite: Boolean      // Favorite status
}
```

### API Endpoints

- `GET /musicbox` - Main library view
- `GET /musicbox/upload` - Upload page
- `POST /musicbox/upload` - Handle file upload
- `GET /musicbox/media/:id` - Get media details
- `GET /musicbox/stream/:id` - Stream media file
- `PUT /musicbox/media/:id` - Update metadata
- `POST /musicbox/media/:id/favorite` - Toggle favorite
- `DELETE /musicbox/media/:id` - Delete media
- `GET /musicbox/api/stats` - Get statistics

### File Storage

- Files stored in: `uploads/musicbox/`
- Format: `media-{timestamp}-{random}.{ext}`
- Original filenames preserved in database
- Files excluded from git via `.gitignore`

## Security

- Authentication required for all endpoints
- Only authenticated users can upload
- File type validation (audio/video only)
- File size limits enforced
- Uploaded files isolated per user session

## Future Enhancements

- [ ] Playlist creation
- [ ] Sharing capabilities
- [ ] Advanced audio waveform visualization
- [ ] Batch upload
- [ ] Export playlists
- [ ] Collaborative features
- [ ] Mobile-responsive player
- [ ] Album/collection grouping
- [ ] Lyrics support
- [ ] Audio normalization
- [ ] Thumbnail generation for videos
- [ ] Multi-user permissions

## Troubleshooting

### Upload fails
- Check file size (must be < 500MB)
- Verify file type is supported
- Ensure stable internet connection
- Check browser console for errors

### Media won't play
- Verify browser supports media format
- Check server has read permissions
- Try refreshing the page
- Check file wasn't corrupted during upload

### Slow loading
- Large media files take time to load
- Check your internet speed
- Consider reducing file sizes before upload
- Use appropriate compression for your media

## Credits

Built as part of the EBM Dashboard system by runet.
