# Extension Icons

This directory contains icon files for the Salesforce Metadata Exporter Chrome Extension.

## Required Icons

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Icon Design Guidelines

### Design Requirements
- **Theme**: Salesforce cloud + metadata/export concept
- **Colors**: Salesforce blue (#0070D2) as primary color
- **Style**: Modern, clean, professional
- **Background**: Transparent PNG

### Recommended Design Elements
- Cloud icon (representing Salesforce)
- Download arrow or box icon (representing export)
- Metadata/code symbols (optional)

### Tools for Creating Icons
1. **Figma** (free, browser-based)
2. **Canva** (free tier available)
3. **Adobe Illustrator** (professional)
4. **GIMP** (free, open-source)

## Quick Start - Placeholder Icons

For development, you can create simple placeholder icons:

### Using ImageMagick (CLI)
```bash
# Create 16x16 blue placeholder
convert -size 16x16 xc:#0070D2 icon16.png

# Create 48x48 blue placeholder
convert -size 48x48 xc:#0070D2 icon48.png

# Create 128x128 blue placeholder
convert -size 128x128 xc:#0070D2 icon128.png
```

### Using Python (with Pillow)
```python
from PIL import Image

# Create blue placeholders
color = (0, 112, 210)  # Salesforce blue

Image.new('RGB', (16, 16), color).save('icon16.png')
Image.new('RGB', (48, 48), color).save('icon48.png')
Image.new('RGB', (128, 128), color).save('icon128.png')
```

### Using Online Tools
- **Favicon Generator**: https://favicon.io/
- **Icon Generator**: https://www.iconsgenerator.com/

## Production Icons

Before publishing to Chrome Web Store, replace these placeholders with professionally designed icons that follow Chrome Web Store design guidelines:
https://developer.chrome.com/docs/webstore/images/

## Current Status

⚠️ **Placeholder icons needed** - Add actual PNG files to this directory before loading the extension in Chrome.
