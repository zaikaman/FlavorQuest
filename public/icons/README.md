# PWA Icons Generation

## Required Icons for FlavorQuest PWA

All icons created with FlavorQuest branding (red food theme):

### Icon Sizes
- ✅ icon-72x72.png (72x72)
- ✅ icon-96x96.png (96x96)
- ✅ icon-128x128.png (128x128)
- ✅ icon-144x144.png (144x144)
- ✅ icon-152x152.png (152x152)
- ✅ icon-192x192.png (192x192)
- ✅ icon-384x384.png (384x384)
- ✅ icon-512x512.png (512x512)

### Design Guidelines
- **Primary Color**: #ef4444 (red)
- **Logo**: Bowl with steam icon representing food tour
- **Background**: White with subtle gradient
- **Border**: Rounded corners for modern look
- **Text**: "FQ" monogram for smaller sizes

### Generation Method
1. Create master SVG logo (1024x1024)
2. Export to PNG at required sizes using imagemin
3. Optimize with pngquant for smaller file sizes
4. Add to manifest.webmanifest

### Tools Used
- Figma/Illustrator for SVG design
- Sharp/imagemin for batch export
- pngquant for optimization

## Current Status
Icons need to be created by designer. For now, Next.js default icons are used as placeholders.

## TODO
- [ ] Design FlavorQuest logo SVG
- [ ] Export all 8 icon sizes
- [ ] Optimize with imagemin
- [ ] Update manifest.webmanifest references
- [ ] Test on iOS and Android devices

## Reference
See manifest.webmanifest for icon configuration.
