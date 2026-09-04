> **SUPERSEDED — see [`AGENT.md`](../../AGENT.md).**
> This document describes the old `design-system.json` token system, where
> sizes were px-strings needing `parseInt()`, and a Tailwind/NativeWind
> styling layer that has been removed. Tokens are now typed TypeScript in
> `src/theme/`, and styling is `StyleSheet`. Kept for reference only.

# Hestia Design System Rules

This document provides comprehensive rules for integrating Figma designs into the Hestia React Native application using the Model Context Protocol (MCP).

## Table of Contents

1. [Design System Structure](#design-system-structure)
2. [Token Definitions](#token-definitions)
3. [Component Library](#component-library)
4. [Frameworks & Libraries](#frameworks--libraries)
5. [Asset Management](#asset-management)
6. [Icon System](#icon-system)
7. [Styling Approach](#styling-approach)
8. [Project Structure](#project-structure)
9. [Figma Integration Guidelines](#figma-integration-guidelines)

---

## Design System Structure

### Core Design System File

**Location:** `design-system.json` (root directory)

This is the single source of truth for all design tokens. The file contains:

- Colors (primary, status, background, text, border, badge, shadow)
- Typography (font families, weights, sizes, line heights)
- Spacing scale
- Border radius scale
- Component-specific tokens
- Room status configurations
- Icon sizes
- Animation durations and easing

**Usage Pattern:**

```typescript
```typescript
// src/theme/index.ts
import designSystem from '../../design-system.json';

export const theme = designSystem;
export const colors = theme.colors;
export const typography = theme.typography;
export const spacing = theme.spacing;
```


**Key Principle:** Always reference tokens from `design-system.json` via the theme module. Never hardcode design values.

---

## Token Definitions

### 1. Color Tokens

**Location:** `design-system.json` → `colors`

**Structure:**

```json
```json
{
  "primary": { "main", "light", "dark" },
  "status": { "dirty", "inProgress", "cleaned", "inspected", "priority", "priorityText" },
  "background": { "primary", "secondary", "tertiary", "card", "header", "overlay" },
  "text": { "primary", "secondary", "tertiary", "light", "white", "accent", "pink" },
  "border": { "light", "medium", "dark" },
  "badge": { "eta", "etd", "group", "priority" },
  "shadow": { "nav" }
}
```

**Usage:**

```typescript
```typescript
import { colors } from '../theme';

// ✅ Correct
backgroundColor: colors.primary.main
color: colors.text.primary

// ❌ Wrong
backgroundColor: '#5a759d'
color: '#1e1e1e'
```


**Room Status Colors:**

```typescript
```typescript
import { getStatusColor, getStatusBackgroundColor } from '../theme';

// Get color for a status
const statusColor = getStatusColor('dirty'); // Returns '#f92424'
const bgColor = getStatusBackgroundColor('priority'); // Returns '#ffebeb'
```


### 2. Typography Tokens

**Location:** `design-system.json` → `typography`

**Font Families:**

- Primary: `Helvetica` (default)
- Secondary: `Inter` (when specified)

**Font Weights:**

- `light`: 300
- `regular`: 400
- `semibold`: 600
- `bold`: 700

**Font Sizes:**

Range from `xs` (11px) to `9xl` (39px). See `design-system.json` for complete scale.

**Usage:**

```typescript
```typescript
import { typography } from '../theme';

const textStyle = {
  fontFamily: typography.fontFamily.primary,
  fontSize: parseInt(typography.fontSizes['3xl']), // 18px
  fontWeight: typography.fontWeights.bold,
  lineHeight: typography.lineHeights.tight,
};
```


**Important:** Font sizes in `design-system.json` are strings (e.g., "18px"). Use `parseInt()` when applying to numeric properties.

### 3. Spacing Tokens

**Location:** `design-system.json` → `spacing`

**Scale:** `xs` (4px) → `6xl` (64px)

**Usage:**

```typescript
```typescript
import { spacing } from '../theme';

padding: spacing.lg, // 16px
marginVertical: spacing.md, // 12px
```


**Note:** For responsive scaling, use the scaling utilities (see [Styling Approach](#styling-approach)).

### 4. Border Radius Tokens

**Location:** `design-system.json` → `borderRadius`

**Scale:** `none` (0) → `full` (9999px)

**Usage:**

```typescript
```typescript
import { borderRadius } from '../theme';

borderRadius: parseInt(borderRadius.md), // 9px
borderRadius: parseInt(borderRadius['7xl']), // 45px
```


### 5. Component Tokens

**Location:** `design-system.json` → `components`

Pre-defined tokens for common components:

- `button`: primary, secondary, status variants
- `input`: height, colors, border, padding
- `card`: background, border, padding, shadow
- `statusBadge`: size, borderRadius, typography
- `navigation`: height, colors, shadow
- `header`: height, background
- `searchBar`: height, background, borderRadius, padding

**Usage:**

```typescript
```typescript
import { components } from '../theme';

const buttonHeight = parseInt(components.button.primary.height); // 70px
const cardPadding = parseInt(components.card.padding); // 20px
```


---

## Component Library

### Component Architecture

**Location:** `src/components/`

**Structure:**

```
```
src/components/
├── [feature]/          # Feature-specific components (e.g., home/, allRooms/, tickets/)
│   ├── ComponentName.tsx
│   └── ...
├── Button.tsx          # Shared components
├── Card.tsx
├── Input.tsx
├── StatusBadge.tsx
└── ...
```


### Component Patterns

#### 1. Base Components (Shared)

**Location:** `src/components/`

**Examples:**

- `Button.tsx` - Reusable button with variants (primary, secondary, status)
- `Card.tsx` - Card container with variants (default, status)
- `Input.tsx` - Form input component
- `StatusBadge.tsx` - Status indicator badge

**Pattern:**

```typescript
```typescript
// src/components/Button.tsx
import { colors, typography, borderRadius } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'status';
  // ...
}

export default function Button({ variant = 'primary', ...props }: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary.main,
          height: 70,
        };
      // ...
    }
  };
  // ...
}
```


#### 2. Feature Components

**Location:** `src/components/[feature]/`

**Examples:**

- `src/components/home/` - Home screen components
- `src/components/allRooms/` - All Rooms screen components
- `src/components/tickets/` - Tickets screen components

**Pattern:**

```typescript
```typescript
// Feature-specific component
import { colors, typography } from '../../theme';
import { useScale } from '../../hooks/useScale';

export default function FeatureComponent() {
  const { scaleX, scaleY } = useScale();
  
  return (
    <View style={[styles.container, { padding: scaleX(20) }]}>
      {/* Component content */}
    </View>
  );
}
```

### Component Documentation

**Current Status:** No Storybook or component documentation system in place.

**Recommendation:** When creating new components:

1. Add JSDoc comments for props
2. Include usage examples in component file
3. Reference Figma design URL in component comments

---

## Frameworks & Libraries

### UI Framework

**Framework:** React Native (v0.81.5) with Expo (v54.0.30)

**Navigation:**

- `@react-navigation/native` (v6.1.9)
- `@react-navigation/native-stack` (v6.9.17)
- `@react-navigation/bottom-tabs` (v6.5.11)

**Key Libraries:**

- `react-native-gesture-handler` - Gesture handling
- `react-native-safe-area-context` - Safe area handling
- `react-native-screens` - Native screen optimization
- `expo-image` - Optimized image component
- `expo-linear-gradient` - Gradient support
- `expo-blur` - Blur effects
- `react-native-svg` - SVG support

### Styling Libraries

**Approach:** React Native StyleSheet (no CSS-in-JS libraries)

**No external styling libraries used.** All styling is done via:
- React Native `StyleSheet.create()`
- Inline styles (for dynamic values)
- Theme tokens from `design-system.json`

### Build System

**Bundler:** Expo (Metro bundler)

**Configuration:**
- `babel.config.js` - Babel configuration with module resolver
- `app.json` - Expo configuration
- `tsconfig.json` - TypeScript configuration

**Module Resolution:**

Babel plugin `babel-plugin-module-resolver` configured with aliases:

```javascript
```javascript
{
  '@': './src',
  '@components': './src/components',
  '@screens': './src/screens',
  '@theme': './src/theme',
  '@utils': './src/utils',
  // ... more aliases
}
```

**Usage:**
```typescript
// ✅ Preferred
import Button from '@components/Button';
import { colors } from '@theme';

// ✅ Also valid
import Button from '../components/Button';
```


---

## Asset Management

### Asset Structure

**Location:** `assets/`

```text
assets/
├── app/                    # App configuration assets
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash.png
│   └── favicon.png
├── icons/                  # UI icons (PNG format)
│   ├── home-icon.png
│   ├── chat-icon.png
│   └── ...
├── images/                 # Images
│   └── ellipse-image.png
└── logos/                  # Brand logos
    ├── logo.png
    ├── header-logo.png
    └── customer-service-logo.png
```


### Asset Import Pattern

**Icons:**

```typescript
```typescript
// ✅ Correct - Direct require
<Image source={require('../../assets/icons/home-icon.png')} />

// ✅ Also valid - In constants/objects
const STATUS_CONFIG = {
  dirty: {
    icon: require('../../../assets/icons/dirty-icon.png'),
  },
};
```

**Logos:**

```typescript
```typescript
<Image 
  source={require('../../assets/logos/logo.png')} 
  resizeMode="contain"
/>
```

### Asset Optimization

**Current Approach:**
- Assets stored as PNG files
- No automatic optimization pipeline
- Manual compression recommended

**Best Practices:**

1. Use PNG for icons (transparency support)
2. Use JPG for photos (smaller file size)
3. Keep assets optimized (compressed) before committing
4. Document special requirements in `assets/README.md`

### CDN Configuration

**Current Status:** No CDN configured. All assets are bundled with the app.

**For Expo:** Assets are bundled via Metro bundler. No additional CDN setup required.

---

## Icon System

### Icon Storage

**Location:** `assets/icons/`

### Icon Naming Convention

**Pattern:** `[purpose]-icon.png` (kebab-case)

**Examples:**

- `home-icon.png`
- `chat-icon.png`
- `dirty-status-icon.png`
- `arrival-departure-icon.png`

**Naming Guidelines:**

1. Use kebab-case
2. Be descriptive (purpose-based, not appearance-based)
3. Include `-icon` suffix for clarity
4. For status-specific icons: `[status]-status-icon.png`

### Icon Usage Patterns

#### Pattern 1: Direct Require in Component

```typescript
```typescript
<Image 
  source={require('../../../assets/icons/home-icon.png')}
  style={styles.icon}
  resizeMode="contain"
/>
```

#### Pattern 2: Icon Constants/Object

```typescript
```typescript
// In type definitions or constants
const STATUS_ICONS = {
  dirty: require('../../assets/icons/dirty-status-icon.png'),
  inProgress: require('../../assets/icons/inprogress-status-icon.png'),
  cleaned: require('../../assets/icons/cleaned-status-icon.png'),
  inspected: require('../../assets/icons/inspected-status-icon.png'),
};
```

#### Pattern 3: Icon in Type Definitions

```typescript
```typescript
// src/types/allRooms.types.ts
export const ROOM_TYPE_ICONS = {
  'Arrival': require('../../assets/icons/arrival-icon.png'),
  'Departure': require('../../assets/icons/departure-icon.png'),
  // ...
};
```

### Icon Sizes

**Token Location:** `design-system.json` → `icons.sizes`

**Available Sizes:**

- `xs`: 8px
- `sm`: 14px
- `md`: 20px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 44px

**Usage:**

```typescript
```typescript
import { theme } from '../theme';

const iconSize = parseInt(theme.icons.sizes.md); // 20px
```


**Note:** Icon sizes from Figma should match these tokens. If a custom size is needed, document it in the component.

### Icon Styling

**Common Patterns:**

```typescript
```typescript
// Fixed size
<Image 
  source={require('...')}
  style={{ width: 24, height: 24 }}
/>

// Scaled size
const { scaleX } = useScale();
<Image 
  source={require('...')}
  style={{ width: scaleX(24), height: scaleX(24) }}
/>

// Tinted icon (when needed)
<Image 
  source={require('...')}
  style={{ width: 24, height: 24, tintColor: colors.primary.main }}
/>
```

---

## Styling Approach

### CSS Methodology

**Approach:** React Native StyleSheet (no CSS modules, no styled-components)

**Pattern:**
```typescript
import { StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  text: {
    fontFamily: typography.fontFamily.primary,
    fontSize: parseInt(typography.fontSizes.md),
    color: colors.text.primary,
  },
});
```

### Global Styles

**Current Status:** No global styles file.

**Theme Access:** All components import from `src/theme/index.ts`:
```typescript
import { colors, typography, spacing, borderRadius } from '../theme';
```

### Responsive Design

**Design Width:** 440px (iPhone 16 Pro Max width)

**Scaling System:**

**Location:** `src/utils/scaling.ts` and `src/hooks/useScale.ts`

**Functions:**
- `scaleX(size)` - Scale based on screen width
- `scaleY(size)` - Scale based on screen height
- `scaleFont(size)` - Scale font sizes (uses scaleX)

**Usage:**
```typescript
import { useScale } from '../hooks/useScale';

export default function Component() {
  const { scaleX, scaleY, scaleFont } = useScale();
  
  return (
    <View style={{
      width: scaleX(426),      // Scales width
      height: scaleY(177),      // Scales height
      padding: scaleX(20),     // Scales padding
    }}>
      <Text style={{
        fontSize: scaleFont(18), // Scales font
      }}>
        Text
      </Text>
    </View>
  );
}
```

**Alternative (Direct Import):**
```typescript
import { scaleX, scaleY } from '../utils/scaling';

const styles = StyleSheet.create({
  container: {
    width: scaleX(426),
    height: scaleY(177),
  },
});
```

**Important:** Always use scaling utilities for dimensions that come from Figma. This ensures proper scaling across different screen sizes.

### Screen-Specific Style Files

**Location:** `src/constants/[screen]Styles.ts`

**Examples:**
- `src/constants/allRoomsStyles.ts`
- `src/constants/chatStyles.ts`
- `src/constants/ticketsStyles.ts`

**Pattern:**
```typescript
// src/constants/allRoomsStyles.ts
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export const CARD_DIMENSIONS = {
  width: 426,
  heights: {
    standard: 177,
    withGuestInfo: 185,
  },
  // ...
} as const;
```

**Usage:**
```typescript
import { CARD_DIMENSIONS, ROOM_HEADER } from '../constants/allRoomsStyles';

const styles = StyleSheet.create({
  card: {
    width: CARD_DIMENSIONS.width * scaleX,
    height: CARD_DIMENSIONS.heights.standard * scaleX,
  },
});
```

---

## Project Structure

### Overall Organization

```
hestia/
├── assets/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── [feature]/     # Feature-specific components
│   │   └── [Component].tsx # Shared components
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation configuration
│   ├── theme/             # Theme and design tokens
│   ├── utils/             # Utility functions
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and data services
│   ├── types/             # TypeScript type definitions
│   ├── constants/        # Screen-specific constants/styles
│   ├── config/            # App configuration
│   └── data/              # Mock data
├── design-system.json     # Design tokens (single source of truth)
├── App.tsx                # Root component
└── package.json
```

### Feature Organization Pattern

**Pattern:** Feature-based organization within `src/components/`

**Example - Home Feature:**
```
src/components/home/
├── HomeHeader.tsx
├── CategoryCard.tsx
├── StatusIndicator.tsx
├── PriorityBadge.tsx
└── AMPMToggle.tsx
```

**Example - All Rooms Feature:**
```
src/components/allRooms/
├── AllRoomsHeader.tsx
├── RoomCard.tsx
├── GuestInfoSection.tsx
├── StaffSection.tsx
├── NotesSection.tsx
└── StatusButton.tsx
```

### Type Definitions

**Location:** `src/types/`

**Structure:**
- `index.ts` - Re-exports all types
- `[feature].types.ts` - Feature-specific types

**Examples:**
- `home.types.ts` - Home screen types
- `allRooms.types.ts` - All Rooms screen types
- `tickets.types.ts` - Tickets screen types
- `navigation.types.ts` - Navigation types

**Pattern:**
```typescript
// src/types/home.types.ts
export interface CategorySection {
  name: string;
  total: number;
  priority?: number;
  borderColor: string;
  status: {
    dirty: number;
    inProgress: number;
    cleaned: number;
    inspected: number;
  };
}
```

### Mock Data

**Location:** `src/data/`

**Examples:**
- `mockHomeData.ts`
- `mockAllRoomsData.ts`
- `mockTicketsData.ts`
- `mockChatData.ts`

**Pattern:**
```typescript
// src/data/mockHomeData.ts
import type { CategorySection } from '../types/home.types';

export const mockHomeData: CategorySection[] = [
  // ...
];
```

---

## Figma Integration Guidelines

### Using Figma MCP Tools

When integrating Figma designs, follow these steps:

#### 1. Extract Design Context

**Tool:** `mcp_Figma_get_design_context`

**Usage:**
```typescript
// Extract design context for a specific node
const designContext = await mcp_Figma_get_design_context({
  nodeId: "1-1172",  // Extract from Figma URL
  fileKey: "q59hfVJCVzzUixq1HFRGEh",  // Extract from Figma URL
  clientLanguages: "typescript",
  clientFrameworks: "react-native,expo"
});
```

**Figma URL Format:**
```
https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1-1172
```
- `fileKey`: `q59hfVJCVzzUixq1HFRGEh`
- `nodeId`: `1-1172` (convert `-` to `:` if needed: `1:1172`)

#### 2. Extract Design Tokens

**Process:**
1. Use `get_design_context` to get design specifications
2. Extract colors, typography, spacing, dimensions
3. Update `design-system.json` if new tokens are needed
4. Reference tokens in component implementation

#### 3. Component Implementation Workflow

**Step-by-Step:**

1. **Analyze Figma Design**
   - Extract node ID from Figma URL
   - Get design context using MCP tool
   - Identify component structure and variants

2. **Check Existing Components**
   - Search codebase for similar components
   - Reuse existing components when possible
   - Extend components rather than duplicating

3. **Extract Design Tokens**
   - Colors → Add to `design-system.json` if new
   - Typography → Use existing font sizes/weights
   - Spacing → Use spacing scale
   - Dimensions → Use scaling utilities

4. **Create/Update Component**
   - Create component file in appropriate location
   - Import theme tokens
   - Use scaling utilities for dimensions
   - Follow existing component patterns

5. **Add Types**
   - Create/update types in `src/types/`
   - Export from `src/types/index.ts`

6. **Style Implementation**
   - Use StyleSheet.create() for static styles
   - Use inline styles for dynamic values
   - Apply scaling to all Figma dimensions
   - Reference theme tokens for colors/typography

7. **Asset Integration**
   - Download icons/images from Figma
   - Place in appropriate `assets/` directory
   - Use require() for asset imports
   - Follow icon naming conventions

#### 4. Design Token Extraction Rules

**Colors:**
- Extract hex values from Figma
- Check if color exists in `design-system.json`
- If new, add to appropriate color category
- Use semantic names (e.g., `primary.main`, not `blue500`)

**Typography:**
- Extract font family, size, weight, line height
- Map to existing tokens in `design-system.json`
- If new size needed, add to `fontSizes` scale
- Always use `parseInt()` when applying font sizes

**Spacing:**
- Extract padding, margins, gaps
- Map to spacing scale (xs → 6xl)
- If value doesn't match scale, use closest or add new token

**Dimensions:**
- Extract width, height, border radius
- Apply scaling: `scaleX(width)`, `scaleY(height)`
- For border radius, use `parseInt(borderRadius.[size])`

#### 5. Component Variants

**Pattern:**
```typescript
interface ComponentProps {
  variant?: 'default' | 'primary' | 'secondary';
  // ...
}

const getVariantStyle = (variant: string): ViewStyle => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.primary.main,
        // ...
      };
    // ...
  }
};
```

#### 6. Responsive Scaling Checklist

When implementing a Figma design:

- [ ] All width values use `scaleX()`
- [ ] All height values use `scaleY()` or `scaleX()` (for square elements)
- [ ] Font sizes use `scaleFont()` or existing typography tokens
- [ ] Padding/margins use spacing tokens or scaled values
- [ ] Border radius uses borderRadius tokens
- [ ] Colors reference theme tokens
- [ ] Icons use appropriate sizes from icon tokens

#### 7. Asset Download and Integration

**From Figma:**
1. Use `get_design_context` to identify assets
2. Download assets (icons, images) from Figma
3. Save to appropriate `assets/` directory
4. Follow naming conventions
5. Update component to use asset

**Asset Import Pattern:**
```typescript
// Icons
<Image source={require('../../assets/icons/[name]-icon.png')} />

// Logos
<Image source={require('../../assets/logos/[name].png')} />

// Images
<Image source={require('../../assets/images/[name].png')} />
```

#### 8. Testing Checklist

After implementing a Figma design:

- [ ] Component matches Figma design visually
- [ ] All dimensions scale correctly on different screen sizes
- [ ] Colors match design system tokens
- [ ] Typography uses theme tokens
- [ ] Icons/images load correctly
- [ ] Component is responsive
- [ ] No hardcoded design values
- [ ] Types are properly defined
- [ ] Component follows existing patterns

---

## Best Practices Summary

### ✅ DO

1. **Always use theme tokens** from `design-system.json`
2. **Use scaling utilities** for all dimensions from Figma
3. **Follow naming conventions** for files, components, and assets
4. **Reuse existing components** when possible
5. **Extract design tokens** before implementing components
6. **Use TypeScript** for all components and types
7. **Follow feature-based organization** for components
8. **Document Figma URLs** in component comments
9. **Use require()** for asset imports
10. **Apply responsive scaling** to all Figma dimensions

### ❌ DON'T

1. **Don't hardcode colors** - use theme tokens
2. **Don't hardcode dimensions** - use scaling utilities
3. **Don't duplicate components** - extend existing ones
4. **Don't skip type definitions** - always define types
5. **Don't ignore design tokens** - check `design-system.json` first
6. **Don't use inline styles** for static values - use StyleSheet
7. **Don't create new tokens** without updating `design-system.json`
8. **Don't mix scaling approaches** - be consistent
9. **Don't forget to scale** - all Figma dimensions need scaling
10. **Don't skip asset optimization** - compress before committing

---

## Quick Reference

### Import Patterns

```typescript
// Theme
import { colors, typography, spacing, borderRadius } from '../theme';

// Scaling
import { useScale } from '../hooks/useScale';
// or
import { scaleX, scaleY, scaleFont } from '../utils/scaling';

// Components
import Button from '@components/Button';
// or
import Button from '../components/Button';

// Types
import type { CategorySection } from '../types/home.types';

// Assets
<Image source={require('../../assets/icons/home-icon.png')} />
```

### Common Patterns

```typescript
// Component with scaling
const { scaleX, scaleY } = useScale();
const styles = StyleSheet.create({
  container: {
    width: scaleX(426),
    height: scaleY(177),
    padding: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: parseInt(borderRadius.md),
  },
  text: {
    fontFamily: typography.fontFamily.primary,
    fontSize: parseInt(typography.fontSizes.md),
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
});
```

---

## Design System File Reference

**Primary File:** `design-system.json`

**Theme Module:** `src/theme/index.ts`

**Key Exports:**
- `theme` - Complete design system
- `colors` - Color tokens
- `typography` - Typography tokens
- `spacing` - Spacing scale
- `borderRadius` - Border radius scale
- `components` - Component tokens
- `getStatusColor()` - Status color helper
- `getStatusBackgroundColor()` - Status background helper

---

## Additional Resources

- **Figma File:** https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD
- **Design System JSON:** `design-system.json`
- **Theme Module:** `src/theme/index.ts`
- **Scaling Utils:** `src/utils/scaling.ts`
- **Scaling Hook:** `src/hooks/useScale.ts`
- **Asset README:** `assets/README.md`

---

*Last Updated: Based on codebase analysis and Figma design integration requirements*

