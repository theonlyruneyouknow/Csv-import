const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fetch = require('node-fetch');
const GreatestJoyMedia = require('../models/GreatestJoyMedia');
const FamilyCircle = require('../models/FamilyCircle');
const GooglePhotosHelper = require('../lib/googlePhotosHelper');
const { ensureAuthenticated } = require('../middleware/auth');

// OAuth credentials (should be in environment variables)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/greatestjoy/oauth/callback/google-photos';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

// Scopes for Google Photos
// Note: We need photoslibrary.sharing scope to create shared albums
const GOOGLE_PHOTOS_SCOPES = [
    'https://www.googleapis.com/auth/photoslibrary.readonly',
    'https://www.googleapis.com/auth/photoslibrary.sharing',  // Required for creating shared albums
    'https://www.googleapis.com/auth/userinfo.email'
];

// Scopes for Google Drive
const GOOGLE_DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
];

// Cloud import page
router.get('/cloud-import', ensureAuthenticated, async (req, res) => {
    try {
        // Get user's connected services from session or database
        const services = {
            googlePhotos: req.session.googlePhotos || null,
            googleDrive: req.session.googleDrive || null,
            icloud: null, // Coming soon
            onedrive: null, // Coming soon
            dropbox: null // Coming soon
        };
        
        // Get user's Family Circles for sharing options
        const circles = await FamilyCircle.find({
            'members.user': req.user._id
        }).select('name description');

        res.render('greatestjoy-cloud-import', {
            title: 'Import from Cloud - Greatest Joy',
            user: req.user,
            services,
            circles
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Initiate OAuth connection
router.get('/oauth/connect/:service', ensureAuthenticated, (req, res) => {
    const service = req.params.service;
    
    try {
        if (service === 'google-photos') {
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: GOOGLE_PHOTOS_SCOPES,
                state: JSON.stringify({ userId: req.user._id, service: 'google-photos' })
            });
            res.redirect(authUrl);
        } else if (service === 'google-drive') {
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: GOOGLE_DRIVE_SCOPES,
                state: JSON.stringify({ userId: req.user._id, service: 'google-drive' })
            });
            res.redirect(authUrl);
        } else {
            res.status(400).send('Service not supported yet');
        }
    } catch (error) {
        console.error('OAuth connection error:', error);
        res.status(500).send('Error connecting to service');
    }
});

// OAuth callback
router.get('/oauth/callback/:service', ensureAuthenticated, async (req, res) => {
    const { code, state } = req.query;
    const service = req.params.service;
    
    if (!code) {
        return res.redirect('/greatestjoy/cloud-import?error=access_denied');
    }
    
    try {
        const stateData = JSON.parse(state);
        
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        
        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        // Store tokens in session (in production, encrypt and store in database)
        if (service === 'google-photos') {
            req.session.googlePhotos = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date,
                email: userInfo.data.email
            };
        } else if (service === 'google-drive') {
            req.session.googleDrive = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date,
                email: userInfo.data.email
            };
        }
        
        res.redirect(`/greatestjoy/cloud-import?connected=${service}`);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/greatestjoy/cloud-import?error=auth_failed');
    }
});

// Get photos from Google Photos
router.get('/oauth/google-photos/photos', ensureAuthenticated, async (req, res) => {
    try {
        if (!req.session.googlePhotos) {
            return res.status(401).json({ error: 'Not connected to Google Photos' });
        }
        
        // Set credentials
        oauth2Client.setCredentials({
            access_token: req.session.googlePhotos.accessToken,
            refresh_token: req.session.googlePhotos.refreshToken
        });
        
        const albumId = req.query.album;
        
        // Call Google Photos API
        const url = albumId 
            ? `https://photoslibrary.googleapis.com/v1/mediaItems:search`
            : 'https://photoslibrary.googleapis.com/v1/mediaItems';
        
        const options = {
            method: albumId ? 'POST' : 'GET',
            headers: {
                'Authorization': `Bearer ${req.session.googlePhotos.accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (albumId) {
            options.body = JSON.stringify({
                albumId: albumId,
                pageSize: 100
            });
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch photos');
        }
        
        // Transform photos to our format
        const photos = (data.mediaItems || []).map(item => ({
            id: item.id,
            title: item.filename,
            thumbnailUrl: item.baseUrl + '=w300-h300',
            fullUrl: item.baseUrl + '=d', // Download URL
            mimeType: item.mimeType,
            createdTime: item.mediaMetadata.creationTime,
            width: item.mediaMetadata.width,
            height: item.mediaMetadata.height
        }));
        
        // Get albums if requested
        let albums = [];
        if (!albumId) {
            const albumsResponse = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
                headers: {
                    'Authorization': `Bearer ${req.session.googlePhotos.accessToken}`
                }
            });
            const albumsData = await albumsResponse.json();
            albums = (albumsData.albums || []).map(album => ({
                id: album.id,
                title: album.title,
                count: parseInt(album.mediaItemsCount) || 0
            }));
        }
        
        res.json({ success: true, photos, albums });
    } catch (error) {
        console.error('Error fetching Google Photos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import selected photos
router.post('/oauth/import', ensureAuthenticated, async (req, res) => {
    try {
        const { service, photoIds, circles, visibility, albumTitle } = req.body;
        
        if (!photoIds || photoIds.length === 0) {
            return res.status(400).json({ error: 'No photos selected' });
        }
        
        let imported = 0;
        let sharedAlbumUrl = null;
        
        if (service === 'google-photos') {
            if (!req.session.googlePhotos) {
                return res.status(401).json({ error: 'Not connected to Google Photos' });
            }
            
            oauth2Client.setCredentials({
                access_token: req.session.googlePhotos.accessToken,
                refresh_token: req.session.googlePhotos.refreshToken
            });
            
            const helper = new GooglePhotosHelper(req.session.googlePhotos.accessToken);
            const shareWithCircles = visibility === 'circle' || visibility === 'family';
            let sharedAlbum = null;
            
            // If sharing, create a shared album for this Family Circle
            if (shareWithCircles && circles && circles.length > 0) {
                try {
                    // Get the first circle's name
                    const circle = await FamilyCircle.findById(circles[0]).select('name');
                    if (circle) {
                        console.log(`📸 Creating shared album for circle: ${circle.name}`);
                        sharedAlbum = await helper.getOrCreateGreatestJoyAlbum(circle.name, circles[0]);
                        
                        // Add all photos to the shared album
                        await helper.addMediaToAlbum(sharedAlbum.id, photoIds);
                        sharedAlbumUrl = sharedAlbum.shareableUrl;
                        
                        console.log(`✅ Photos added to shared album: ${sharedAlbumUrl}`);
                    }
                } catch (error) {
                    console.error('Error creating shared album:', error);
                    // Continue with import even if shared album creation fails
                }
            }
            
            // Import each photo
            for (const photoId of photoIds) {
                try {
                    // Get photo details
                    const photo = await helper.getMediaItem(photoId);
                    
                    // Create media entry
                    const newMedia = new GreatestJoyMedia({
                        title: photo.filename || 'Imported Photo',
                        description: photo.description || '',
                        mediaType: photo.mimeType.startsWith('video/') ? 'video' : 'photo',
                        
                        // Always use direct image URL for display (baseUrl with size parameters)
                        url: photo.baseUrl + '=d',
                        thumbnailUrl: photo.baseUrl + '=w500-h500',
                        
                        // Source tracking
                        sourceType: sharedAlbumUrl ? 'google-photos-shared' : 'google-photos',
                        sourceUrl: photo.baseUrl,
                        googlePhotos: {
                            mediaItemId: photo.id,
                            sharedAlbumId: sharedAlbum?.id || null,
                            shareableUrl: sharedAlbumUrl || null,
                            baseUrl: photo.baseUrl,
                            createdTime: photo.mediaMetadata?.creationTime
                        },
                        
                        uploadedBy: req.user._id,
                        captureDate: photo.mediaMetadata?.creationTime || new Date(),
                        visibility: visibility || 'circle',
                        circles: circles || [],
                        album: albumTitle || null,  // Store album title if provided
                        tags: ['imported', 'google-photos']
                    });
                    
                    await newMedia.save();
                    imported++;
                } catch (error) {
                    console.error(`Error importing photo ${photoId}:`, error);
                }
            }
        }
        
        res.json({ 
            success: true, 
            imported,
            sharedAlbumUrl: sharedAlbumUrl,
            message: sharedAlbumUrl ? 
                'Photos imported and added to shared album accessible by your Family Circle' :
                'Photos imported successfully'
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Disconnect service
router.post('/oauth/disconnect/:service', ensureAuthenticated, (req, res) => {
    const service = req.params.service;
    
    if (service === 'google-photos') {
        delete req.session.googlePhotos;
    } else if (service === 'google-drive') {
        delete req.session.googleDrive;
    }
    
    res.json({ success: true });
});

module.exports = router;
