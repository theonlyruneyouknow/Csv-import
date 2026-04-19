# Uploads Directory

This directory stores uploaded media files for the Greatest Joy application.

## Structure

- `/greatestjoy/` - Photos, videos, and audio recordings for Greatest Joy memories

## File Naming

Files are automatically named with timestamps to ensure uniqueness:
- Format: `{timestamp}-{random}.{extension}`
- Example: `1711234567890-123456789.jpg`

## Storage

Files are served statically from this directory via Express static middleware.

## Gitignore

This directory should be added to `.gitignore` to avoid committing user uploads to version control. Only this README is tracked.
