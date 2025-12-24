# Figma Plugin API Research - Text & Auto Layout

Research conducted: 2024-12-24

## Text Nodes

### Creating Text
```javascript
const text = figma.createText();
text.x = 50;
text.y = 50;

// CRITICAL: Must load font before modifying text properties
await figma.loadFontAsync(text.fontName);
// or specific font:
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

text.characters = "Hello world!";
text.fontSize = 18;
```

### Key Text Properties

| Property | Type | Description |
|----------|------|-------------|
| `characters` | string | The text content |
| `fontSize` | number | Font size in pixels |
| `fontName` | FontName | `{ family: string, style: string }` |
| `textAlignHorizontal` | "LEFT" \| "CENTER" \| "RIGHT" \| "JUSTIFIED" | Horizontal alignment |
| `textAlignVertical` | "TOP" \| "CENTER" \| "BOTTOM" | Vertical alignment |
| `textAutoResize` | "NONE" \| "WIDTH_AND_HEIGHT" \| "HEIGHT" \| "TRUNCATE" | Auto-resize behavior |
| `textCase` | "ORIGINAL" \| "UPPER" \| "LOWER" \| "TITLE" \| "SMALL_CAPS" | Text transformation |
| `textDecoration` | "NONE" \| "UNDERLINE" \| "STRIKETHROUGH" | Text decoration |
| `letterSpacing` | LetterSpacing | `{ value: number, unit: "PIXELS" \| "PERCENT" }` |
| `lineHeight` | LineHeight | `{ value: number, unit: "PIXELS" \| "PERCENT" \| "AUTO" }` |
| `paragraphIndent` | number | First line indent |
| `paragraphSpacing` | number | Space between paragraphs |

### Range-based Text Styling
```javascript
// For mixed text styles
text.setRangeFontSize(0, 5, 24); // First 5 chars at 24px
text.setRangeFills(0, 5, [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]);

// Get styled segments
const segments = text.getStyledTextSegments(['fontSize', 'fontName', 'fills']);
```

**Sources:**
- [Working with Text | Figma Plugin API](https://www.figma.com/plugin-docs/working-with-text/)
- [createText | Figma Developer Docs](https://www.figma.com/plugin-docs/api/properties/figma-createtext/)
- [TextNode | Figma Plugin API](https://www.figma.com/plugin-docs/api/TextNode/)
- [loadFontAsync | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/figma-loadfontasync/)

---

## Auto Layout

### Enabling Auto Layout
```javascript
const frame = figma.createFrame();
frame.layoutMode = "HORIZONTAL"; // or "VERTICAL"
```

### Core Auto Layout Properties

| Property | Values | Description |
|----------|--------|-------------|
| **`layoutMode`** | "NONE" \| "HORIZONTAL" \| "VERTICAL" | Enable and set direction |
| **`primaryAxisSizingMode`** | "FIXED" \| "AUTO" | Main axis sizing (direction of layout) |
| **`counterAxisSizingMode`** | "FIXED" \| "AUTO" | Cross axis sizing |
| **`primaryAxisAlignItems`** | "MIN" \| "CENTER" \| "MAX" \| "SPACE_BETWEEN" | Alignment along main axis |
| **`counterAxisAlignItems`** | "MIN" \| "CENTER" \| "MAX" \| "BASELINE" | Alignment along cross axis |
| **`itemSpacing`** | number | Gap between children |
| **`layoutWrap`** | "NO_WRAP" \| "WRAP" | Enable wrapping |
| **`counterAxisSpacing`** | number | Gap between wrapped rows (if WRAP) |

### Padding Properties

| Property | Type | Description |
|----------|------|-------------|
| `paddingLeft` | number | Left padding |
| `paddingRight` | number | Right padding |
| `paddingTop` | number | Top padding |
| `paddingBottom` | number | Bottom padding |

### Child Layout Properties

Set on children inside auto layout frames:

| Property | Values | Description |
|----------|--------|-------------|
| **`layoutAlign`** | "INHERIT" \| "STRETCH" \| "MIN" \| "CENTER" \| "MAX" | How child aligns in counter axis |
| **`layoutPositioning`** | "AUTO" \| "ABSOLUTE" | Take out of flow (absolute) |
| **`layoutSizingHorizontal`** | "FIXED" \| "HUG" \| "FILL" | Horizontal sizing (UI shorthand) |
| **`layoutSizingVertical`** | "FIXED" \| "HUG" \| "FILL" | Vertical sizing (UI shorthand) |

### Complete Example
```javascript
const frame = figma.createFrame();

// Enable horizontal auto layout
frame.layoutMode = "HORIZONTAL";
frame.primaryAxisSizingMode = "AUTO"; // Hug contents
frame.counterAxisSizingMode = "FIXED"; // Fixed height
frame.resize(400, 100); // Set fixed height

// Spacing & alignment
frame.itemSpacing = 16;
frame.paddingLeft = 24;
frame.paddingRight = 24;
frame.paddingTop = 16;
frame.paddingBottom = 16;
frame.primaryAxisAlignItems = "CENTER";
frame.counterAxisAlignItems = "CENTER";

// Add children
const child1 = figma.createRectangle();
child1.resize(50, 50);
child1.layoutSizingHorizontal = "FIXED";
frame.appendChild(child1);

const child2 = figma.createRectangle();
child2.layoutSizingHorizontal = "FILL"; // Fill available space
frame.appendChild(child2);
```

### Wrapping Auto Layout
```javascript
frame.layoutMode = "HORIZONTAL";
frame.layoutWrap = "WRAP";
frame.itemSpacing = 8; // Horizontal gap
frame.counterAxisSpacing = 12; // Vertical gap between rows
```

**Sources:**
- [layoutMode | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-layoutmode/)
- [primaryAxisSizingMode | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-primaryaxissizingmode/)
- [counterAxisSizingMode | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-counteraxissizingmode/)
- [itemSpacing | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-itemspacing/)
- [layoutAlign | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-layoutalign/)
- [layoutWrap | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-layoutwrap/)

---

## Frame Properties

### Visual Properties

| Property | Type | Description |
|----------|------|-------------|
| **`fills`** | Paint[] | Background fills (replaces deprecated `backgrounds`) |
| **`strokes`** | Paint[] | Stroke paints |
| **`strokeWeight`** | number | Stroke thickness (can be per-side) |
| **`strokeAlign`** | "INSIDE" \| "OUTSIDE" \| "CENTER" | Stroke alignment |
| **`effects`** | Effect[] | Shadows, blurs |
| **`cornerRadius`** | number | Uniform corner radius |
| **`topLeftRadius`** | number | Individual corner radius |
| **`topRightRadius`** | number | Individual corner radius |
| **`bottomLeftRadius`** | number | Individual corner radius |
| **`bottomRightRadius`** | number | Individual corner radius |
| **`clipsContent`** | boolean | Clip children to bounds |
| **`opacity`** | number | Opacity (0-1) |
| **`blendMode`** | BlendMode | How layer blends with below |

### Paint Types

**SolidPaint:**
```javascript
{
  type: 'SOLID',
  color: { r: 1, g: 0.5, b: 0 }, // RGB 0-1
  opacity: 0.8, // Optional, default 1
  visible: true // Optional, default true
}
```

**GradientPaint:**
```javascript
{
  type: 'GRADIENT_LINEAR', // or GRADIENT_RADIAL, GRADIENT_ANGULAR, GRADIENT_DIAMOND
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ],
  gradientTransform: [[...], [...]], // 2x3 transform matrix
  opacity: 1
}
```

**ImagePaint:**
```javascript
{
  type: 'IMAGE',
  imageHash: 'abc123...', // Image reference
  scaleMode: 'FILL', // or FIT, CROP, TILE
  imageTransform: [[...], [...]],
  opacity: 1
}
```

**Utility Function:**
```javascript
// Create solid paint from CSS color
const paint = figma.util.solidPaint('#FF5733');
// or
const paint = figma.util.solidPaint('rgb(255, 87, 51)');
```

**Sources:**
- [FrameNode | Figma Plugin API](https://www.figma.com/plugin-docs/api/FrameNode/)
- [Paint | Figma Developer Docs](https://developers.figma.com/docs/plugins/api/Paint/)
- [Shared Node Properties | Figma Plugin API](https://www.figma.com/plugin-docs/api/node-properties/)
- [fills | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-fills/)

---

## Constraints & Resizing

### Constraints
```javascript
node.constraints = {
  horizontal: "MIN", // LEFT, CENTER, RIGHT, LEFT_RIGHT (stretch), SCALE
  vertical: "MIN"    // TOP, CENTER, BOTTOM, TOP_BOTTOM (stretch), SCALE
};
```

### Resizing Methods

**resize(width, height):**
- Applies constraints recursively to children
- Triggers auto-layout parent resize if applicable
- More expensive but respects layout rules

**resizeWithoutConstraints(width, height):**
- Children never resized (constraints ignored)
- Faster performance
- Still triggers parent auto-layout resize

**Sources:**
- [layoutPositioning | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-layoutpositioning/)
- [resize | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-resize/)
- [resizeWithoutConstraints | Figma Plugin API](https://www.figma.com/plugin-docs/api/properties/nodes-resizewithoutconstraints/)
- [Constraints | Figma Plugin API](https://www.figma.com/plugin-docs/api/Constraints/)

---

## Summary

**Text Creation Workflow:**
1. Create text node
2. Load font (REQUIRED before any text property changes)
3. Set properties (characters, fontSize, etc.)

**Auto Layout Workflow:**
1. Create frame
2. Set layoutMode (HORIZONTAL/VERTICAL)
3. Configure sizing modes (primaryAxisSizingMode, counterAxisSizingMode)
4. Set spacing and padding
5. Add children and configure their layout properties

**Common Patterns:**
- Always load fonts before modifying text
- Use `fills` not `backgrounds` (deprecated)
- Auto layout children use layoutSizingHorizontal/Vertical for UI-like sizing
- Absolutely positioned children: set `layoutPositioning = "ABSOLUTE"`

---

## Styles API

Research conducted: 2024-12-24

### Overview

Figma supports four types of styles:
- **TextStyle** - Text properties (font, size, spacing, alignment)
- **PaintStyle** - Fill and stroke paints (colors, gradients, images)
- **EffectStyle** - Effects (shadows, blurs, noise)
- **GridStyle** - Layout grids

All styles share the base type `BaseStyle` which is a union: `PaintStyle | TextStyle | EffectStyle | GridStyle`

### Creating Styles

**Text Style:**
```javascript
const textStyle = figma.createTextStyle();
textStyle.name = 'Heading/H1';
textStyle.fontSize = 32;
textStyle.fontName = { family: 'Inter', style: 'Bold' };
textStyle.lineHeight = { value: 120, unit: 'PERCENT' };
textStyle.letterSpacing = { value: -0.5, unit: 'PIXELS' };
textStyle.textCase = 'ORIGINAL'; // UPPER, LOWER, TITLE, SMALL_CAPS
textStyle.textDecoration = 'NONE'; // UNDERLINE, STRIKETHROUGH
textStyle.paragraphIndent = 0;
textStyle.paragraphSpacing = 16;
```

**Paint Style (Fill/Stroke):**
```javascript
const paintStyle = figma.createPaintStyle();
paintStyle.name = 'Brand/Primary';
paintStyle.paints = [{
  type: 'SOLID',
  color: { r: 0.2, g: 0.5, b: 1 },
  opacity: 1
}];

// Gradient example
const gradientStyle = figma.createPaintStyle();
gradientStyle.name = 'Brand/Gradient';
gradientStyle.paints = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]]
}];
```

**Effect Style (Shadows/Blurs):**
```javascript
const effectStyle = figma.createEffectStyle();
effectStyle.name = 'Shadow/Card';
effectStyle.effects = [{
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.15 },
  offset: { x: 0, y: 4 },
  radius: 8,
  spread: 0, // Only works on rectangles, ellipses, or frames with fills
  visible: true,
  blendMode: 'NORMAL',
  showShadowBehindNode: false // Drop shadow only
}];

// Multiple effects (up to 8 drop shadows + 8 inner shadows per layer)
effectStyle.effects = [
  { type: 'DROP_SHADOW', color: {...}, offset: {...}, radius: 8 },
  { type: 'DROP_SHADOW', color: {...}, offset: {...}, radius: 16 },
  { type: 'INNER_SHADOW', color: {...}, offset: {...}, radius: 4 }
];
```

### Effect Types

| Type | Properties | Description |
|------|-----------|-------------|
| **DROP_SHADOW** | color, offset, radius, spread, blendMode, visible, showShadowBehindNode | External shadow |
| **INNER_SHADOW** | color, offset, radius, spread, blendMode, visible | Internal shadow |
| **LAYER_BLUR** | radius, visible | Blur entire layer |
| **BACKGROUND_BLUR** | radius, visible | Blur content behind layer |

### Getting Existing Styles

**IMPORTANT:** Use async versions to avoid exceptions with `"documentAccess": "dynamic-page"` manifest setting.

```javascript
// Get all local styles (ASYNC - recommended)
const textStyles = await figma.getLocalTextStylesAsync();
const paintStyles = await figma.getLocalPaintStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
const gridStyles = await figma.getLocalGridStylesAsync();

// Find specific style by name
const headingStyle = textStyles.find(s => s.name === 'Heading/H1');

// DEPRECATED (will throw exception with dynamic-page):
// const textStyles = figma.getLocalTextStyles();
```

### Applying Styles to Nodes

**Text Style:**
```javascript
const text = figma.createText();
await figma.loadFontAsync(text.fontName);

// Apply text style (ASYNC required)
await text.setTextStyleIdAsync(textStyle.id);

// Get current text style
const currentStyleId = text.textStyleId; // string | symbol
```

**Paint Style (Fill):**
```javascript
const rect = figma.createRectangle();

// Apply fill style (ASYNC required)
await rect.setFillStyleIdAsync(paintStyle.id);

// Get current fill style
const currentFillStyleId = rect.fillStyleId; // string | symbol
```

**Paint Style (Stroke):**
```javascript
// Apply stroke style (ASYNC required)
await rect.setStrokeStyleIdAsync(paintStyle.id);

// Get current stroke style
const currentStrokeStyleId = rect.strokeStyleId; // string | symbol
```

**Effect Style:**
```javascript
const frame = figma.createFrame();

// Apply effect style (ASYNC required)
await frame.setEffectStyleIdAsync(effectStyle.id);

// Get current effect style
const currentEffectStyleId = frame.effectStyleId; // string | symbol
```

### Organizing Styles in Folders

Styles support folder hierarchies using forward slashes in names:

```javascript
textStyle.name = 'Typography/Headings/H1';  // Creates folders: Typography → Headings → H1
paintStyle.name = 'Brand/Primary/Blue';     // Creates folders: Brand → Primary → Blue
effectStyle.name = 'Shadows/Card/Elevated'; // Creates folders: Shadows → Card → Elevated
```

### Style Properties

**Common Properties (All Styles):**
- `id` - Unique identifier (string)
- `name` - Display name (can include folder paths)
- `type` - Style type: 'TEXT' | 'PAINT' | 'EFFECT' | 'GRID'
- `description` - Optional description
- `documentationLinks` - Array of URLs for documentation
- `remote` - Boolean, true if from team library (read-only)
- `key` - Unique key for published styles

**Methods:**
- `getStyleConsumersAsync()` - Get all nodes using this style
- `remove()` - Delete the style
- `setPluginData(key, value)` - Store plugin-specific data
- `getPluginData(key)` - Retrieve plugin-specific data

**Sources:**
- [TextStyle | Figma Plugin API](https://www.figma.com/plugin-docs/api/TextStyle/)
- [PaintStyle | Figma Plugin API](https://www.figma.com/plugin-docs/api/PaintStyle/)
- [EffectStyle | Figma Plugin API](https://www.figma.com/plugin-docs/api/EffectStyle/)
- [BaseStyle | Figma Plugin API](https://www.figma.com/plugin-docs/api/BaseStyle/)
- [Effect | Figma Plugin API](https://www.figma.com/plugin-docs/api/Effect/)

---

## Variables API

Research conducted: 2024-12-24

### Overview

Variables in Figma are reusable values that can be bound to node properties. Variables belong to collections and support modes (e.g., Light/Dark themes).

**Variable Types:**
- `COLOR` - RGBA colors
- `FLOAT` - Numbers (dimensions, opacity, etc.)
- `STRING` - Text values
- `BOOLEAN` - True/false values

### Creating Variables

**1. Create Variable Collection:**
```javascript
const collection = figma.variables.createVariableCollection('Design Tokens');

// Add modes (default has one mode)
const darkMode = collection.addMode('Dark');
const lightMode = collection.modes[0]; // Default mode
collection.renameMode(lightMode.modeId, 'Light');
```

**2. Create Variables:**
```javascript
// Color variable
const primaryColor = figma.variables.createVariable('colors/primary', collection, 'COLOR');
primaryColor.setValueForMode(lightMode.modeId, { r: 0.2, g: 0.5, b: 1, a: 1 });
primaryColor.setValueForMode(darkMode.modeId, { r: 0.4, g: 0.7, b: 1, a: 1 });

// Float variable (dimensions, spacing)
const spacing = figma.variables.createVariable('spacing/base', collection, 'FLOAT');
spacing.setValueForMode(lightMode.modeId, 8);
spacing.setValueForMode(darkMode.modeId, 8); // Same in all modes

// String variable
const brandName = figma.variables.createVariable('text/brand', collection, 'STRING');
brandName.setValueForMode(lightMode.modeId, 'Acme Corp');

// Boolean variable
const showDebug = figma.variables.createVariable('flags/debug', collection, 'BOOLEAN');
showDebug.setValueForMode(lightMode.modeId, false);
```

**3. Variable Aliases (Reference Other Variables):**
```javascript
const secondaryColor = figma.variables.createVariable('colors/secondary', collection, 'COLOR');

// Set as alias to primary color
const aliasValue = {
  type: 'VARIABLE_ALIAS',
  id: primaryColor.id
};
secondaryColor.setValueForMode(lightMode.modeId, aliasValue);
```

### Binding Variables to Node Properties

**Simple Fields (Direct Binding):**

Use `setBoundVariable(field, variable)` for simple properties:

```javascript
const rect = figma.createRectangle();

// Bind dimensions
rect.setBoundVariable('width', widthVariable);
rect.setBoundVariable('height', heightVariable);

// Bind opacity
rect.setBoundVariable('opacity', opacityVariable);

// Bind spacing (for auto layout)
const frame = figma.createFrame();
frame.layoutMode = 'HORIZONTAL';
frame.setBoundVariable('itemSpacing', spacingVariable);
frame.setBoundVariable('paddingLeft', paddingVariable);
frame.setBoundVariable('paddingTop', paddingVariable);

// Bind radius
rect.setBoundVariable('topLeftRadius', radiusVariable);
rect.setBoundVariable('cornerRadius', radiusVariable); // All corners

// Unbind (pass null)
rect.setBoundVariable('width', null);
```

**Bindable Node Fields:**

Complete list of `VariableBindableNodeField`:
- **Size:** `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`
- **Spacing:** `itemSpacing`, `counterAxisSpacing`, `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`
- **Radius:** `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius`
- **Stroke:** `strokeWeight`, `strokeTopWeight`, `strokeRightWeight`, `strokeBottomWeight`, `strokeLeftWeight`
- **Other:** `opacity`, `visible`, `characters` (text content)

**Complex Fields (Fills/Strokes):**

Fills and strokes require special handling via `setBoundVariableForPaint`:

```javascript
const rect = figma.createRectangle();

// Get fills array (immutable - must clone)
const fillsCopy = [...rect.fills];

// Bind color variable to first fill
fillsCopy[0] = figma.variables.setBoundVariableForPaint(
  fillsCopy[0],
  'color',
  colorVariable
);

// Apply modified fills back
rect.fills = fillsCopy;

// Same for strokes
const strokesCopy = [...rect.strokes];
strokesCopy[0] = figma.variables.setBoundVariableForPaint(
  strokesCopy[0],
  'color',
  strokeColorVariable
);
rect.strokes = strokesCopy;
```

**Typography Variables (Text Properties):**

Bind typography variables to text nodes:

```javascript
const text = figma.createText();
await figma.loadFontAsync(text.fontName);

// Bind typography properties
text.setBoundVariable('fontFamily', fontFamilyVariable);
text.setBoundVariable('fontStyle', fontStyleVariable);
text.setBoundVariable('fontWeight', fontWeightVariable);
text.setBoundVariable('fontSize', fontSizeVariable);
text.setBoundVariable('lineHeight', lineHeightVariable);
text.setBoundVariable('letterSpacing', letterSpacingVariable);
text.setBoundVariable('paragraphSpacing', paragraphSpacingVariable);
text.setBoundVariable('paragraphIndent', paragraphIndentVariable);

// Range-based binding (for mixed text)
text.setRangeBoundVariable(0, 10, 'fontSize', fontSizeVariable);
```

**Effect Variables:**

Bind variables to effect properties (shadows, blurs):

```javascript
const frame = figma.createFrame();
frame.effects = [{
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.2 },
  offset: { x: 0, y: 4 },
  radius: 8,
  visible: true,
  blendMode: 'NORMAL'
}];

// Bind shadow color
const effectsCopy = [...frame.effects];
effectsCopy[0] = figma.variables.setBoundVariableForEffect(
  effectsCopy[0],
  'color',
  shadowColorVariable
);
frame.effects = effectsCopy;
```

**Layout Grid Variables:**

Bind variables to grid properties:

```javascript
const frame = figma.createFrame();
frame.layoutGrids = [{
  pattern: 'COLUMNS',
  count: 12,
  gutterSize: 20,
  offset: 0,
  visible: true
}];

const gridsCopy = [...frame.layoutGrids];
gridsCopy[0] = figma.variables.setBoundVariableForLayoutGrid(
  gridsCopy[0],
  'gutterSize',
  gutterVariable
);
frame.layoutGrids = gridsCopy;
```

### Getting Bound Variables

**Check Existing Bindings:**

```javascript
// Get all bound variables for a node
const boundVars = node.boundVariables;
// Returns object like:
// {
//   width: { id: 'variable-id-123' },
//   opacity: { id: 'variable-id-456' }
// }

// Check specific field
if (node.boundVariables?.width) {
  const widthVarId = node.boundVariables.width.id;
  const widthVar = figma.variables.getVariableById(widthVarId);
}

// For text ranges
const rangeBoundVars = text.getRangeBoundVariable(0, 10, 'fontSize');
```

### Getting Existing Variables

```javascript
// Get all local variables
const variables = await figma.variables.getLocalVariablesAsync();

// Get all collections
const collections = await figma.variables.getLocalVariableCollectionsAsync();

// Get variable by ID
const variable = figma.variables.getVariableById('variable-id');

// Get collection by ID
const collection = figma.variables.getVariableCollectionById('collection-id');

// Filter by type
const colorVariables = variables.filter(v => v.resolvedType === 'COLOR');
const floatVariables = variables.filter(v => v.resolvedType === 'FLOAT');
```

### Variable Properties

**Variable Object:**
- `id` - Unique identifier
- `name` - Variable name (can include slashes for grouping: 'colors/primary')
- `variableCollectionId` - Parent collection ID
- `resolvedType` - 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
- `valuesByMode` - Object mapping mode IDs to values
- `description` - Optional description
- `hiddenFromPublishing` - Boolean
- `scopes` - Array of where variable can be used
- `remote` - Boolean, true if from library

**Methods:**
- `setValueForMode(modeId, value)` - Set value for specific mode
- `remove()` - Delete variable
- `setVariableCodeSyntax(platform, code)` - Set code syntax for export

### Type Requirements

**IMPORTANT:** Variables must match the data type of the field they're bound to:

```javascript
// ✓ CORRECT
rect.setBoundVariable('width', floatVariable);      // width is number
rect.setBoundVariable('opacity', floatVariable);    // opacity is number
rect.setBoundVariable('visible', booleanVariable);  // visible is boolean
text.setBoundVariable('characters', stringVariable); // characters is string

// ✗ WRONG - Type mismatch will fail
rect.setBoundVariable('width', colorVariable);  // ERROR: width needs FLOAT, not COLOR
```

**Sources:**
- [Working with Variables | Figma Plugin API](https://developers.figma.com/docs/plugins/working-with-variables/)
- [setBoundVariable | Figma Plugin API](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/)
- [Variable | Figma Plugin API](https://developers.figma.com/docs/plugins/api/Variable/)
- [VariableBindableNodeField | Figma Plugin API](https://www.figma.com/plugin-docs/api/VariableBindableNodeField/)

---

## Complete Workflow Examples

### Example 1: Create Text Style + Apply Variable

```javascript
// 1. Create text style
const headingStyle = figma.createTextStyle();
headingStyle.name = 'Typography/Heading 1';
headingStyle.fontSize = 32;
headingStyle.fontName = { family: 'Inter', style: 'Bold' };

// 2. Create color variable
const collection = figma.variables.createVariableCollection('Tokens');
const primaryColor = figma.variables.createVariable('colors/primary', collection, 'COLOR');
primaryColor.setValueForMode(collection.modes[0].modeId, { r: 0.2, g: 0.5, b: 1, a: 1 });

// 3. Create text node
const text = figma.createText();
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
text.characters = 'Hello World';

// 4. Apply text style
await text.setTextStyleIdAsync(headingStyle.id);

// 5. Bind color variable to text fill
const fillsCopy = [...text.fills];
fillsCopy[0] = figma.variables.setBoundVariableForPaint(fillsCopy[0], 'color', primaryColor);
text.fills = fillsCopy;
```

### Example 2: Create Shadow Effect Style + Apply

```javascript
// 1. Create shadow color variable
const shadowColor = figma.variables.createVariable('effects/shadow-color', collection, 'COLOR');
shadowColor.setValueForMode(collection.modes[0].modeId, { r: 0, g: 0, b: 0, a: 0.15 });

// 2. Create effect style
const shadowStyle = figma.createEffectStyle();
shadowStyle.name = 'Shadows/Card Elevated';
shadowStyle.effects = [{
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.15 },
  offset: { x: 0, y: 8 },
  radius: 16,
  spread: 0,
  visible: true,
  blendMode: 'NORMAL'
}];

// 3. Create frame and apply effect style
const frame = figma.createFrame();
frame.resize(200, 200);
await frame.setEffectStyleIdAsync(shadowStyle.id);

// 4. Optionally bind shadow color to variable
const effectsCopy = [...frame.effects];
effectsCopy[0] = figma.variables.setBoundVariableForEffect(
  effectsCopy[0],
  'color',
  shadowColor
);
frame.effects = effectsCopy;
```

---

## Screenshots & Export API

**Research Date:** 2024-12-24
**API:** `exportAsync()` method on all node types

### Overview

Figma's Plugin API provides the `exportAsync()` method to export any node as an image, SVG, PDF, or JSON. This enables taking "screenshots" of components, frames, or any node by ID.

**Key Capability:** ✅ **Yes, you can take screenshots of any component/frame/node by ID**

### Method Signatures

```typescript
// 1. Export as image (PNG/JPG) - returns Uint8Array
node.exportAsync(settings?: ExportSettings): Promise<Uint8Array>

// 2. Export as SVG string - returns string
node.exportAsync(settings: ExportSettingsSVGString): Promise<string>

// 3. Export as REST JSON - returns Object
node.exportAsync(settings: ExportSettingsREST): Promise<Object>
```

### Supported Node Types

Works with **35+ node types** including:
- Basic shapes: RECTANGLE, ELLIPSE, POLYGON, STAR, LINE, VECTOR
- Containers: FRAME, GROUP, SECTION
- Components: COMPONENT, COMPONENT_SET, INSTANCE
- Text: TEXT
- Complex: PAGE, SLICE, BOOLEAN_OPERATION
- Advanced: TABLE, WIDGET, STICKY, CONNECTOR

### Export Formats

| Format | Returns | Use Case |
|--------|---------|----------|
| **PNG** | `Uint8Array` | Raster images with transparency |
| **JPG** | `Uint8Array` | Raster images, smaller file size |
| **SVG** | `string` | Vector graphics as SVG markup |
| **SVG_STRING** | `string` | Same as SVG but explicit |
| **PDF** | `Uint8Array` | Print-ready documents |
| **JSON_REST_V1** | `Object` | Node data structure |

### Default Behavior

```javascript
// Export as PNG at 1x resolution (default)
const bytes = await node.exportAsync();
```

**Default settings:**
- Format: PNG
- Resolution: 1x (100%)
- Contents only: true
- Color profile: DOCUMENT

### Export Settings Options

#### Common Properties (All Formats)

```javascript
{
  format: 'PNG' | 'JPG' | 'SVG' | 'SVG_STRING' | 'PDF' | 'JSON_REST_V1',
  contentsOnly: boolean,        // Default: true
  useAbsoluteBounds: boolean,   // Default: false
  suffix: string,               // Default: ""
  colorProfile: 'DOCUMENT' | 'SRGB' | 'DISPLAY_P3_V4'  // Default: 'DOCUMENT'
}
```

**Property Details:**
- **contentsOnly** - If `true`, exports only the node's contents. If `false`, includes overlapping layers in the same area.
- **useAbsoluteBounds** - If `true`, exports full node dimensions regardless of cropping.
- **suffix** - Text appended to the exported filename.
- **colorProfile** - Color space handling for export.

#### Image Export Settings (PNG/JPG)

```javascript
{
  format: 'PNG' | 'JPG',
  constraint?: {
    type: 'SCALE' | 'WIDTH' | 'HEIGHT',
    value: number
  }
}
```

**Constraint Types:**

| Type | Behavior | Example |
|------|----------|---------|
| **SCALE** | Proportional scaling | `{ type: 'SCALE', value: 2 }` → 200% size |
| **WIDTH** | Fixed width in pixels | `{ type: 'WIDTH', value: 800 }` → 800px wide |
| **HEIGHT** | Fixed height in pixels | `{ type: 'HEIGHT', value: 600 }` → 600px tall |

**Examples:**

```javascript
// Export at 2x resolution (retina)
const bytes = await node.exportAsync({
  format: 'PNG',
  constraint: { type: 'SCALE', value: 2 }
});

// Export with fixed width of 1200px
const bytes = await node.exportAsync({
  format: 'PNG',
  constraint: { type: 'WIDTH', value: 1200 }
});

// Export as JPG at 3x for high-DPI displays
const bytes = await node.exportAsync({
  format: 'JPG',
  constraint: { type: 'SCALE', value: 3 }
});
```

#### SVG Export Settings

```javascript
{
  format: 'SVG' | 'SVG_STRING',
  svgOutlineText?: boolean,      // Default: true
  svgIdAttribute?: boolean,      // Default: false
  svgSimplifyStroke?: boolean    // Default: true
}
```

**SVG Options:**
- **svgOutlineText** - If `true`, converts text to outlines (guarantees visual accuracy but reduces editability).
- **svgIdAttribute** - If `true`, adds `id` attributes to SVG elements for referencing.
- **svgSimplifyStroke** - If `true`, approximates inside/outside stroke rendering.

**Example:**

```javascript
// Export as editable SVG with IDs
const svgString = await node.exportAsync({
  format: 'SVG_STRING',
  svgOutlineText: false,     // Keep text editable
  svgIdAttribute: true,      // Add IDs for element selection
  svgSimplifyStroke: false   // Preserve exact stroke rendering
});
```

#### PDF Export Settings

```javascript
{
  format: 'PDF'
}
```

No additional properties beyond common settings.

**Example:**

```javascript
// Export frame as PDF
const pdfBytes = await frame.exportAsync({
  format: 'PDF'
});
```

#### REST JSON Export

```javascript
{
  format: 'JSON_REST_V1'
}
```

Returns the equivalent REST API response for the node, useful for serializing large node hierarchies.

**Example:**

```javascript
// Export node structure as JSON
const nodeData = await component.exportAsync({
  format: 'JSON_REST_V1'
});
```

### Getting Node by ID

To export a specific node by ID:

```javascript
// Get node by ID
const node = figma.getNodeById('123:456');

if (node) {
  // Export as PNG at 2x
  const bytes = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 2 }
  });

  // bytes is Uint8Array - can be saved to file or sent over network
}
```

### Complete Examples

#### Example 1: Screenshot Component by ID and Save

```javascript
async function screenshotComponent(componentId, scale = 2) {
  // 1. Get component by ID
  const component = figma.getNodeById(componentId);

  if (!component) {
    throw new Error(`Component not found: ${componentId}`);
  }

  // 2. Export as PNG at specified scale
  const bytes = await component.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
    contentsOnly: true
  });

  // 3. Return metadata
  return {
    nodeId: component.id,
    nodeName: component.name,
    nodeType: component.type,
    bytes: bytes,
    size: bytes.length,
    format: 'PNG',
    scale: scale
  };
}

// Usage
const screenshot = await screenshotComponent('54:123', 2);
console.log(`Exported ${screenshot.nodeName} (${screenshot.size} bytes)`);
```

#### Example 2: Export Multiple Nodes with Different Formats

```javascript
async function exportMultipleFormats(nodeId) {
  const node = figma.getNodeById(nodeId);

  if (!node) {
    throw new Error('Node not found');
  }

  // Export PNG at 1x, 2x, 3x
  const png1x = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 1 }
  });

  const png2x = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 2 }
  });

  const png3x = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: 3 }
  });

  // Export SVG
  const svg = await node.exportAsync({
    format: 'SVG_STRING',
    svgOutlineText: true
  });

  // Export PDF
  const pdf = await node.exportAsync({
    format: 'PDF'
  });

  return {
    png: {
      '1x': png1x,
      '2x': png2x,
      '3x': png3x
    },
    svg: svg,
    pdf: pdf
  };
}
```

#### Example 3: Screenshot All Components in a Page

```javascript
async function screenshotAllComponents(page, scale = 2) {
  const screenshots = [];

  // Find all components recursively
  function findComponents(node, results = []) {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      results.push(node);
    }
    if ('children' in node) {
      for (const child of node.children) {
        findComponents(child, results);
      }
    }
    return results;
  }

  const components = findComponents(page);

  // Export each component
  for (const component of components) {
    const bytes = await component.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: scale }
    });

    screenshots.push({
      id: component.id,
      name: component.name,
      type: component.type,
      bytes: bytes,
      size: bytes.length
    });
  }

  return screenshots;
}

// Usage
const screenshots = await screenshotAllComponents(figma.currentPage, 2);
console.log(`Exported ${screenshots.length} component screenshots`);
```

#### Example 4: Export Frame with Fixed Dimensions

```javascript
async function exportFrameWithSize(frameId, width, height) {
  const frame = figma.getNodeById(frameId);

  if (!frame || frame.type !== 'FRAME') {
    throw new Error('Frame not found');
  }

  // Export with fixed width
  const byWidth = await frame.exportAsync({
    format: 'PNG',
    constraint: { type: 'WIDTH', value: width }
  });

  // Export with fixed height
  const byHeight = await frame.exportAsync({
    format: 'PNG',
    constraint: { type: 'HEIGHT', value: height }
  });

  return {
    byWidth,
    byHeight,
    originalSize: {
      width: frame.width,
      height: frame.height
    }
  };
}
```

### Important Limitations & Best Practices

**1. Dynamic Pages Require loadAsync:**
```javascript
// For pages with dynamic access enabled
await page.loadAsync();
const bytes = await page.exportAsync();
```

**2. Async Operations:**
All export operations are asynchronous and must be awaited:
```javascript
// ✅ Correct
const bytes = await node.exportAsync();

// ❌ Wrong - will fail
const bytes = node.exportAsync();
```

**3. Memory Considerations:**
Large exports can consume significant memory. Consider:
- Exporting at appropriate scales (2x for retina, not 10x)
- Processing exports in batches
- Clearing unused byte arrays

**4. File Size vs Quality:**
```javascript
// JPG - smaller files, lossy compression
const jpgBytes = await node.exportAsync({ format: 'JPG' });

// PNG - larger files, lossless compression, supports transparency
const pngBytes = await node.exportAsync({ format: 'PNG' });
```

**5. SVG Considerations:**
- Use `svgOutlineText: true` for consistent rendering across systems
- Use `svgOutlineText: false` to keep text editable in design tools
- SVG exports may not perfectly match Figma rendering for complex effects

**6. Constraint Behavior:**
```javascript
// SCALE maintains aspect ratio
{ type: 'SCALE', value: 2 }  // 2x width AND height

// WIDTH/HEIGHT may distort if aspect ratio differs
{ type: 'WIDTH', value: 1000 }  // Forces 1000px width, height scales proportionally
```

### Use Cases

**1. Design System Documentation:**
- Export all components as PNG thumbnails
- Generate SVG assets for web
- Create PDF spec sheets

**2. Asset Pipeline:**
- Export icons at 1x, 2x, 3x for iOS/Android
- Generate responsive image sets
- Create favicons and app icons

**3. Version Control:**
- Screenshot components for visual regression testing
- Export snapshots before/after changes
- Generate visual diffs

**4. Presentation:**
- Export high-resolution PNGs for slides
- Create PDFs for client reviews
- Generate SVGs for interactive prototypes

**5. AI Training Data:**
- Export component screenshots for computer vision
- Generate design pattern datasets
- Create thumbnail previews

### API Reference

**Official Documentation:**
- [exportAsync | Figma Plugin API](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/)
- [ExportSettings | Figma Plugin API](https://developers.figma.com/docs/plugins/api/ExportSettings/)

---
