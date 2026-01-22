# CSS Architecture

This project uses a modular CSS architecture for better maintainability and organization.

## File Structure

```
app/styles/
├── base.css          # Reset styles, body, container, utilities, scrollbars
├── header.css        # Header section, auth buttons, profile button
├── forms.css         # Search containers, inputs, clear buttons
├── buttons.css       # All button styles (preset, member, copy, secondary)
├── layout.css        # Page layout, cards, two-column grid, org info box
├── metadata.css      # Metadata types grid, checkboxes, members list
├── preview.css       # Package XML preview section
├── export.css        # Export button, status, progress bar, error messages
├── modal.css         # Modal overlay, content, header, body
├── footer.css        # Footer section, links, copyright
├── responsive.css    # Media queries for mobile/tablet responsiveness
└── animations.css    # Keyframe animations and transitions
```

## Loading Order

The CSS files are loaded in this order in `index.html`:

1. **base.css** - Foundation styles that other files depend on
2. **header.css** - Top section styles
3. **forms.css** - Form elements used throughout
4. **buttons.css** - Button components used throughout
5. **layout.css** - Page structure and containers
6. **metadata.css** - Metadata-specific components
7. **preview.css** - Preview section
8. **export.css** - Export section
9. **modal.css** - Modal dialogs
10. **footer.css** - Footer section
11. **responsive.css** - Responsive overrides
12. **animations.css** - Animations and transitions

## Benefits

- ✅ **Better Organization**: Each file has a single responsibility
- ✅ **Easier Maintenance**: Find and update styles quickly
- ✅ **Reduced Conflicts**: Isolated scopes reduce CSS conflicts
- ✅ **Improved Performance**: Browser can cache individual files
- ✅ **Team Collaboration**: Multiple developers can work on different files
- ✅ **Cleaner Git Diffs**: Changes are isolated to specific files

## Usage

To make changes:

1. Identify which component you're modifying
2. Open the corresponding CSS file
3. Make your changes
4. Test across different screen sizes
5. Check that responsive.css doesn't conflict

## File Responsibilities

### base.css
- CSS reset
- Body and HTML base styles
- Container widths
- Utility classes (.hidden, etc.)
- Custom scrollbar styles

### header.css
- Header layout and typography
- Authentication buttons
- Profile button
- Header content arrangement

### forms.css
- Search containers and icons
- Text inputs (metadata search, member search)
- Clear/close buttons for search fields
- Input focus states

### buttons.css
- Preset buttons (Select All, Clear)
- Member action buttons (All, None)
- Copy to clipboard button
- Secondary action buttons

### layout.css
- Main content area
- Card components
- Two-column layout grid
- Org info boxes
- Detail grids

### metadata.css
- Metadata type checkboxes
- Expandable metadata containers
- Member lists and checkboxes
- Member count badges
- Loading/error states

### preview.css
- Package XML code preview
- Preview header
- Syntax highlighting container

### export.css
- Primary export button
- Export status messages
- Progress bars
- Error message styling

### modal.css
- Modal overlay and backdrop
- Modal content containers
- Modal header and close button
- Modal body scrolling

### footer.css
- Footer layout
- Social links
- Copyright information
- Dark theme variants

### responsive.css
- Mobile breakpoints (< 768px)
- Tablet adjustments
- Column stacking
- Touch-friendly sizing

### animations.css
- Fade-in animations
- Loading spinners
- Smooth transitions
- Keyframe definitions

## Development Tips

1. **Keep specificity low**: Use single class selectors when possible
2. **Avoid !important**: Organize files to prevent the need for !important
3. **Use consistent naming**: Follow existing patterns (kebab-case)
4. **Comment sections**: Add comments for complex or non-obvious styles
5. **Test responsively**: Always check changes on mobile screens
