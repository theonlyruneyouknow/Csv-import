# Greatest Joy - Voice Recordings & Stories Feature

## Overview
The Greatest Joy application now supports a two-step workflow for preserving family memories:

1. **Upload photos/videos** from your albums (single or bulk upload)
2. **Add voice recordings and stories** to each photo after upload

## Workflow

### Step 1: Upload Photos

**Option A: Single Upload**
- Click "Upload" → "Single Photo/Video"
- Enter URL or paste link to photo/video
- Add basic info (title, date, location, people, tags)
- Save

**Option B: Bulk Upload from Folder**
- Click "Upload" → "Bulk Upload from Folder"
- Drag and drop multiple photos at once or click to browse
- Optionally apply common info to all photos (album name, location, date)
- Upload all at once
- Each photo is added to your gallery with basic information

### Step 2: Add Stories & Voice Recordings

After photos are uploaded:

1. **Browse your gallery** on the dashboard
2. **Click on any photo** to view details
3. **Add voice recordings:**
   - Click "Start Recording" to record directly in your browser
   - OR upload an audio file (.mp3, .wav, .m4a)
   - Add a title for the recording
   - Type or paste a transcript of what was said
   - Save the recording

4. **Add written stories:**
   - Write about the memories and context behind the photo
   - Add a title for the story
   - Save

5. **Multiple recordings and stories** can be added to each photo

## Features

### Voice Recordings
- **Record directly in browser** using your microphone
- **Upload audio files** from your computer
- **Add transcripts** to make stories searchable and preserve them
- **Multiple recordings per photo** - different family members can share their perspectives
- Recordings are stored with metadata (who recorded, when, duration)

### Written Stories
- **Rich text stories** about memories
- **Multiple stories per photo** - collect different viewpoints
- Stored with author and date information

### Benefits
- **Preserve oral history** - Capture stories in the voices of grandparents, parents
- **Searchable transcripts** - Find memories by searching text
- **Future generations** - Your grandchildren can hear your voice telling the stories
- **Multiple perspectives** - Different family members can contribute their memories of the same event
- **Context preservation** - Answer the "who, what, when, where, why" questions

## Technical Details

### Model Structure
Each media item (`GreatestJoyMedia`) now includes:

**voiceRecordings array:**
- `audioUrl` - Path to audio file
- `duration` - Length in seconds
- `recordedBy` - User who created it
- `recordedDate` - When it was recorded
- `title` - Name/description
- `transcript` - Text transcription with language and metadata

**stories array:**
- `title` - Story title
- `content` - Story text
- `author` - User who wrote it
- `writtenDate` - When it was written

### Routes
- `GET /greatestjoy/bulk-upload` - Bulk upload page
- `POST /greatestjoy/upload-file` - Handle file upload
- `GET /greatestjoy/media/:id` - View media details
- `POST /greatestjoy/media/:id/add-recording` - Add voice recording
- `POST /greatestjoy/media/:id/add-story` - Add written story

### File Storage
- Files uploaded to `/public/uploads/greatestjoy/`
- Unique filenames generated with timestamps
- Supports images (jpg, png, gif) and videos (mp4, mov, avi)
- Audio files (mp3, wav, m4a, webm)

## Future Enhancements

Potential improvements:
- Automatic speech-to-text transcription
- Video recording capability
- Audio waveform visualizations
- Timeline view of recordings
- Export recordings as podcast-style audio files
- Email notifications when family members add stories
-Collaborative editing of transcripts

## Usage Tips

1. **Start with bulk upload** if you have many photos from an album
2. **Add stories gradually** - you don't have to do all at once
3. **Encourage all family members** to add their perspectives
4. **Include context** - dates, places, relationships, events
5. **Transcribe as you record** - easier while memory is fresh
6. **Use descriptive titles** for recordings to make them easy to find later

## Example Use Cases

- **Wedding Album**: Upload 100 photos, then add grandma's voice telling the story of each moment
- **Baby's First Year**: Bulk upload monthly photos, add parents' recordings about milestones
- **Family Reunion**: Upload group photos, let each family member add their own story
- **Historical Photos**: Scan old photos, record oldest generation explaining who everyone is
- **Vacation Memories**: Upload trip photos, add narration about what happened each day
