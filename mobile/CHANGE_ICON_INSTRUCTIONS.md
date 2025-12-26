# How to Change App Icon

## Quick Steps:

1. **Prepare your icon image:**
   - Size: 1024x1024 pixels (PNG format)
   - Make it square with rounded corners optional
   - Background can be transparent or colored

2. **Replace the icon file:**
   - Location: `mobile/assets/images/icon.png`
   - Simply replace this file with your new icon
   - Keep the same filename: `icon.png`

3. **For Android Adaptive Icon (Optional but Recommended):**
   - `android-icon-foreground.png` - The main icon graphic (can have transparency)
   - `android-icon-background.png` - Background layer (solid color or image)
   - Both should be 1024x1024 pixels

4. **After replacing the files, rebuild your APK:**
   ```bash
   eas build -p android --profile preview
   ```

## Example Icon Requirements:

### Main Icon (`icon.png`):
- **Size:** 1024x1024 px
- **Format:** PNG
- **This is used for:** iOS app icon, Android legacy icon

### Android Adaptive Icons:
- **Foreground:** 1024x1024 px (your logo/symbol, can have transparency)
- **Background:** 1024x1024 px (solid color or pattern)

## Tips:
- Keep the design simple and recognizable when small
- Use high contrast colors
- Avoid text (it becomes unreadable when scaled down)
- Center important elements (safe zone is 80% of canvas)
- Test how it looks on both light and dark backgrounds

## Tools to Create Icons:
- **Online Generators:**
  - https://icon.kitchen/ (Free, generates all sizes)
  - https://easyappicon.com/ (Upload one image, get all sizes)
  - https://www.appicon.co/ (Professional icon generator)

- **Design Tools:**
  - Canva (Easy, has templates)
  - Figma (Professional)
  - Photoshop/GIMP (Advanced)

## After Changes:
Remember to rebuild your APK for changes to take effect!
