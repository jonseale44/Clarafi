# System Dependencies for Document Processing

## Required System Packages

The Clarafi document processing system requires the following system-level dependencies for full functionality:

### 1. ImageMagick
- **Purpose**: Multi-page image processing and format conversion
- **Command**: `convert` 
- **Used for**: Processing multi-page TIFF files and other complex image formats
- **Installation**: `imagemagick` package

### 2. Poppler
- **Purpose**: PDF processing and page extraction
- **Command**: `pdftoppm`
- **Used for**: Converting PDF pages to images for analysis
- **Installation**: `poppler` package

## Installation on Replit

These dependencies are automatically installed via the Replit package manager:

```javascript
// In packager_tool
language_or_system: "system"
dependency_list: ["imagemagick", "poppler"]
```

## Functionality Impact

### With Dependencies Installed:
- ✅ Full PDF page extraction and processing
- ✅ Multi-page TIFF support
- ✅ Advanced image format conversions
- ✅ Batch page processing for documents

### Without Dependencies (Fallback Mode):
- ⚠️ Single-page image processing only
- ⚠️ No PDF page extraction (manual upload required)
- ⚠️ Limited to basic image formats
- ⚠️ Reduced processing capabilities

## Production Deployment Notes

For AWS App Runner or other deployment platforms, ensure these packages are installed:

```bash
# Debian/Ubuntu
apt-get update && apt-get install -y imagemagick poppler-utils

# Alpine Linux
apk add --no-cache imagemagick poppler-utils

# Docker
RUN apt-get update && apt-get install -y imagemagick poppler-utils
```

## Verification

To verify the dependencies are installed correctly:

```bash
# Check ImageMagick
convert --version

# Check Poppler
pdftoppm -v
```

## Related Files
- `/server/attachment-chart-processor.ts` - Main document processing logic
- `/server/routes.ts` - Document analysis endpoints
- `/client/src/components/patient/patient-attachments.tsx` - Frontend document handling