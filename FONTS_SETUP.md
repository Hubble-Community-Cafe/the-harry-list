# Adding AXIS Font to The Harry List

The AXIS font is a custom font used for titles in the Hubble & Meteor branding. Since it's a proprietary font, you'll need to obtain it from the brand assets.

## Steps to Add AXIS Font

### 1. Download the Font Files

Get the AXIS font files from the Google Drive folder:
https://drive.google.com/drive/folders/1fq9Yx7V08Nv1tF_tbl8Lr0JXFb2WmUKg

You'll need these formats for web compatibility:
- `AXIS.woff2` (preferred, smallest file size)
- `AXIS.woff` (fallback for older browsers)
- `AXIS.ttf` (optional fallback)

### 2. Convert Font Formats (if needed)

If you only have `.ttf` or `.otf` files, convert them using:
- https://transfonter.org/ (free online converter)
- https://www.fontsquirrel.com/tools/webfont-generator

### 3. Add Font Files to the Project

Copy the font files to both frontend projects:

```bash
# For public frontend
cp AXIS.woff2 the-harry-list-public/public/fonts/
cp AXIS.woff the-harry-list-public/public/fonts/

# For admin frontend  
cp AXIS.woff2 the-harry-list-admin/public/fonts/
cp AXIS.woff the-harry-list-admin/public/fonts/
```

### 4. Font Files Already Referenced

The CSS has already been configured to use AXIS font. Once you add the font files, titles will automatically use the AXIS font.

The @font-face rules are defined in:
- `the-harry-list-public/src/index.css`
- `the-harry-list-admin/src/index.css`

### 5. Font Usage in Tailwind

Use these classes for the AXIS font:
- `font-title` - For main titles (uses AXIS)
- `font-display` - For display text (uses AXIS)
- `font-sans` - For body text (uses Lato)
- `font-light` - For sub-text (uses Lato Light)

### Example Usage

```jsx
<h1 className="font-title text-2xl">Main Title</h1>
<p className="font-sans">Body text</p>
<span className="font-light text-sm">Sub text</span>
```

