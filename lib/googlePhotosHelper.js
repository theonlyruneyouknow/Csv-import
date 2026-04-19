/**
 * Google Photos Helper - Shared Album Management
 * 
 * This utility helps create and manage shared albums in Google Photos
 * for Family Circle photo sharing without requiring authentication
 * from other users.
 */

const fetch = require('node-fetch');

class GooglePhotosHelper {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseApiUrl = 'https://photoslibrary.googleapis.com/v1';
    }

    /**
     * Create a shared album in the user's Google Photos
     * @param {string} title - Album title
     * @returns {Promise<Object>} Album object with shareableUrl
     */
    async createSharedAlbum(title) {
        try {
            // Step 1: Create the album
            const createResponse = await fetch(`${this.baseApiUrl}/albums`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    album: {
                        title: title
                    }
                })
            });

            if (!createResponse.ok) {
                const error = await createResponse.json();
                throw new Error(`Failed to create album: ${error.error?.message || 'Unknown error'}`);
            }

            const album = await createResponse.json();
            console.log(`✅ Created album: ${album.title} (${album.id})`);

            // Step 2: Share the album
            const shareResponse = await fetch(`${this.baseApiUrl}/albums/${album.id}:share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sharedAlbumOptions: {
                        isCollaborative: false,  // Others can't add photos
                        isCommentable: false     // Others can't comment (they can comment in GreatestJoy)
                    }
                })
            });

            if (!shareResponse.ok) {
                const error = await shareResponse.json();
                throw new Error(`Failed to share album: ${error.error?.message || 'Unknown error'}`);
            }

            const shareInfo = await shareResponse.json();
            console.log(`✅ Shared album, URL: ${shareInfo.shareableUrl}`);

            return {
                id: album.id,
                title: album.title,
                shareableUrl: shareInfo.shareableUrl,
                shareToken: shareInfo.shareToken
            };
        } catch (error) {
            console.error('Error creating shared album:', error);
            throw error;
        }
    }

    /**
     * Add media items to a shared album
     * @param {string} albumId - Album ID
     * @param {Array<string>} mediaItemIds - Array of Google Photos media item IDs
     * @returns {Promise<boolean>}
     */
    async addMediaToAlbum(albumId, mediaItemIds) {
        try {
            // Google Photos API allows adding media via batchAddMediaItems
            const response = await fetch(`${this.baseApiUrl}/albums/${albumId}:batchAddMediaItems`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mediaItemIds: mediaItemIds
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to add media to album: ${error.error?.message || 'Unknown error'}`);
            }

            console.log(`✅ Added ${mediaItemIds.length} photos to album ${albumId}`);
            return true;
        } catch (error) {
            console.error('Error adding media to album:', error);
            throw error;
        }
    }

    /**
     * Get or create a shared album for Greatest Joy imports
     * Creates one shared album per Family Circle for organization
     * @param {string} circleName - Family Circle name
     * @param {string} circleId - Family Circle ID
     * @returns {Promise<Object>} Album info with shareableUrl
     */
    async getOrCreateGreatestJoyAlbum(circleName, circleId) {
        try {
            const albumTitle = `Greatest Joy - ${circleName}`;

            // Try to find existing album first
            const listResponse = await fetch(`${this.baseApiUrl}/albums`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (listResponse.ok) {
                const data = await listResponse.json();
                const existingAlbum = (data.albums || []).find(
                    album => album.title === albumTitle
                );

                if (existingAlbum) {
                    console.log(`📁 Using existing shared album: ${albumTitle}`);
                    
                    // Get share info if not already shared
                    if (!existingAlbum.shareInfo) {
                        const shareResponse = await fetch(`${this.baseApiUrl}/albums/${existingAlbum.id}:share`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${this.accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                sharedAlbumOptions: {
                                    isCollaborative: false,
                                    isCommentable: false
                                }
                            })
                        });

                        if (shareResponse.ok) {
                            const shareInfo = await shareResponse.json();
                            return {
                                id: existingAlbum.id,
                                title: existingAlbum.title,
                                shareableUrl: shareInfo.shareableUrl,
                                shareToken: shareInfo.shareToken
                            };
                        }
                    }

                    return {
                        id: existingAlbum.id,
                        title: existingAlbum.title,
                        shareableUrl: existingAlbum.shareInfo?.shareableUrl,
                        shareToken: existingAlbum.shareInfo?.shareToken
                    };
                }
            }

            // Create new album if not found
            return await this.createSharedAlbum(albumTitle);
        } catch (error) {
            console.error('Error getting/creating Greatest Joy album:', error);
            throw error;
        }
    }

    /**
     * Get media item details from Google Photos
     * @param {string} mediaItemId - Google Photos media item ID
     * @returns {Promise<Object>} Media item details
     */
    async getMediaItem(mediaItemId) {
        try {
            const response = await fetch(
                `${this.baseApiUrl}/mediaItems/${mediaItemId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to get media item: ${error.error?.message || 'Unknown error'}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting media item:', error);
            throw error;
        }
    }

    /**
     * Get shareable URL for a photo in a shared album
     * The URL from the album share is public and doesn't require auth
     * @param {string} albumShareUrl - The shareable album URL
     * @param {string} mediaItemId - The specific photo ID
     * @returns {string} Direct photo URL
     */
    getSharedPhotoUrl(albumShareUrl, mediaItemId) {
        // Note: Google Photos shared album URLs give access to all photos in the album
        // Individual photo URLs within shared albums are publicly accessible
        // We store the album's shareableUrl as the base for access
        return albumShareUrl;
    }
}

module.exports = GooglePhotosHelper;
