# React-Select Styling Guide

## Overview
React-select uses a `styles` prop that accepts an object with style functions for different components. Each style function receives the base styles and should return an object with CSS properties.

## Key Style Properties

### Font-Size Customization
You can set font-size using any CSS unit:
- `px` - Pixels (e.g., `"14px"`)
- `rem` - Relative to root font (e.g., `"0.875rem"`)
- `em` - Relative to parent font (e.g., `"1.2em"`)
- `%` - Percentage (e.g., `"90%"`)

### Padding Customization
Padding can be set using:
- Single value: `"8px"` (applies to all sides)
- Two values: `"8px 12px"` (vertical horizontal)
- Four values: `"8px 12px 8px 12px"` (top right bottom left)

## Main Style Components

### 1. `control` - Main Input Container
```javascript
control: (base) => ({
    ...base,
    padding: "8px 12px",        // Internal padding
    minHeight: "48px",          // Minimum height
    fontSize: "16px",           // Font size for the container
})
```

### 2. `input` - Text Input Field
```javascript
input: (base) => ({
    ...base,
    fontSize: "16px",           // Font size for typed text
    padding: "0",               // Remove default padding
    margin: "0",                // Remove default margin
})
```

### 3. `placeholder` - Placeholder Text
```javascript
placeholder: (base) => ({
    ...base,
    fontSize: "16px",           // Font size for placeholder
    fontWeight: "400",          // Font weight
})
```

### 4. `option` - Dropdown Options
```javascript
option: (base, state) => ({
    ...base,
    padding: "12px 16px",       // Padding for each option
    fontSize: "14px",           // Font size for options
    cursor: "pointer",          // Cursor style
})
```

### 5. `singleValue` - Selected Single Value
```javascript
singleValue: (base) => ({
    ...base,
    fontSize: "16px",           // Font size for selected value
    fontWeight: "500",          // Font weight
})
```

### 6. `multiValue` - Multi-Select Tags
```javascript
multiValue: (base) => ({
    ...base,
    padding: "4px 8px",         // Padding for tags
    margin: "2px 4px",          // Margin between tags
    borderRadius: "4px",        // Border radius
})
```

### 7. `multiValueLabel` - Text Inside Tags
```javascript
multiValueLabel: (base) => ({
    ...base,
    fontSize: "13px",           // Font size for tag text
    padding: "2px 4px",         // Internal padding
    fontWeight: "500",          // Font weight
})
```

### 8. `multiValueRemove` - Remove Button in Tags
```javascript
multiValueRemove: (base) => ({
    ...base,
    fontSize: "12px",           // Font size for remove button
    padding: "2px 4px",         // Padding for button
})
```

### 9. `menuList` - Dropdown Menu Container
```javascript
menuList: (base) => ({
    ...base,
    padding: "8px",             // Padding around menu items
    maxHeight: "300px",         // Maximum height
})
```

## Usage Examples

### Basic Usage
```javascript
import { SELECT_STYLES } from './constants/styles'

<Select
    styles={SELECT_STYLES}
    // ... other props
/>
```

### Custom Styles
```javascript
const customStyles = {
    control: (base) => ({
        ...base,
        padding: "12px 16px",
        fontSize: "18px",
        minHeight: "56px",
    }),
    option: (base) => ({
        ...base,
        padding: "16px 20px",
        fontSize: "16px",
    }),
}

<Select
    styles={customStyles}
    // ... other props
/>
```

### Responsive Font Sizes
```javascript
const responsiveStyles = {
    control: (base) => ({
        ...base,
        fontSize: window.innerWidth < 768 ? "14px" : "16px",
        padding: window.innerWidth < 768 ? "8px 12px" : "12px 16px",
    }),
}
```

### Dark Mode Styles
```javascript
const darkModeStyles = {
    control: (base) => ({
        ...base,
        backgroundColor: isDarkMode ? "#1E1E1E" : "#fff",
        color: isDarkMode ? "#fff" : "#000",
        fontSize: "16px",
        padding: "12px 16px",
    }),
}
```

## Common Font-Size Values

| Size | px | rem | Use Case |
|------|----|-----|----------|
| Extra Small | 10px | 0.625rem | Compact UI |
| Small | 12px | 0.75rem | Secondary text |
| Medium | 14px | 0.875rem | Body text |
| Large | 16px | 1rem | Primary text |
| Extra Large | 18px | 1.125rem | Headers |
| XXL | 20px | 1.25rem | Large headers |

## Common Padding Values

| Size | Value | Use Case |
|------|-------|----------|
| Compact | 4px 8px | Tight spacing |
| Normal | 8px 12px | Standard spacing |
| Comfortable | 12px 16px | Touch-friendly |
| Large | 16px 20px | Prominent elements |

## Tips

1. **Consistency**: Keep font-sizes consistent across related components
2. **Accessibility**: Ensure minimum 16px font-size for good readability
3. **Touch Targets**: Use at least 44px height for mobile-friendly touch targets
4. **Responsive**: Consider different sizes for mobile vs desktop
5. **Theme Integration**: Use CSS variables for consistent theming

## Available Style Presets

The project includes several preset styles:
- `SELECT_STYLES` - Default styles with good balance
- `SELECT_STYLES_SMALL` - Compact styling for tight spaces
- `SELECT_STYLES_LARGE` - Large, prominent styling
- `SELECT_STYLES_COMPACT` - Minimal spacing for dense layouts
