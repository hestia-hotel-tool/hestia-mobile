# Tag Staff Card Implementation Plan

## Overview
This document outlines the exact implementation requirements for the "Tag Staff" card component in the Room Details screen, Tickets tab, based on the Figma design.

## Figma Reference
- **Node ID**: 589-514
- **File**: HESTIA-APP-AND-DASHBOARD
- **URL**: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=589-514&m=dev

## Card Specifications

### Dimensions
- **Width**: `388px` (scaled with `scaleX`)
- **Height**: `183px` (scaled with `scaleX`)
- **Border Radius**: `8px` (scaled)

### Background & Styling
- **Background Color**: `#ffffff` (white) - Card is white, sits on light grey screen background
- **Border**: None (card uses white background and shadow for separation)
- **Shadow**: Subtle shadow for depth (creates visual separation from light grey background)
  - Shadow color: `#000000`
  - Shadow opacity: `0.1`
  - Shadow offset: `{ width: 0, height: 2 }`
  - Shadow radius: `4px`
  - Elevation: `3` (Android)
- **Padding**: 
  - Horizontal: `16px` (scaled)
  - Vertical: `16px` (scaled)

## Layout Structure

### 1. Section Container (`tagStaffSection`)
- **Position**: Below Description section
- **Margin Top**: `20px` (scaled)
- Contains: Label, Subtitle, and Card

### 2. Label ("Tag Staff")
- **Text**: "Tag Staff"
- **Font Family**: Helvetica
- **Font Weight**: Bold (700)
- **Font Size**: `17px` (scaled)
- **Color**: `#1e1e1e` (dark grey)
- **Margin Bottom**: `4px` (scaled)
- **Position**: Above subtitle, outside card

### 3. Subtitle ("Tag people to the ticket")
- **Text**: "Tag people to the ticket"
- **Font Family**: Inter
- **Font Weight**: Light (300)
- **Font Size**: `14px` (scaled)
- **Color**: `#666666` (lighter grey)
- **Margin Bottom**: `12px` (scaled)
- **Position**: Below label, outside card

### 4. Card Container (`tagStaffCard`)
- **Dimensions**: `388px × 183px` (scaled)
- **Background**: `#f5f5f5`
- **Border Radius**: `8px` (scaled)
- **Padding**: `16px` horizontal and vertical (scaled)
- **Content**: Divider + Staff members + Add button

### 5. Divider (`tagStaffDivider`)
- **Position**: Inside card, separating header area from content
- **Width**: Full width of card content area (spans edge to edge within padding)
- **Height**: `1px` (scaled)
- **Color**: `#e3e3e3` (light grey)
- **Margin Top**: `0px` (immediately after title/subtitle area if present)
- **Margin Bottom**: `16px` (scaled) - spacing before staff content
- **Margin Left/Right**: Negative values to offset padding (`-16px` scaled)
- **Note**: Creates visual separation between header text and staff member content

### 6. Content Container (`tagStaffContentContainer`)
- **Layout**: Horizontal row (`flexDirection: 'row'`)
- **Alignment**: 
  - Vertical: `center` (`alignItems: 'center'`)
  - Horizontal: `flex-start` (`justifyContent: 'flex-start'`)
- **Wrap**: `flexWrap: 'wrap'` (allows wrapping if needed)
- **Content**: Staff members + Add button arranged horizontally

## Staff Member Items

### Structure
Each staff member consists of:
1. Circular avatar image
2. Name text below avatar

### Avatar (`tagStaffAvatar`)
- **Dimensions**: `48px × 48px` (scaled)
- **Border Radius**: `24px` (circular)
- **Background**: `#ffffff` (white)
- **Margin Bottom**: `4px` (scaled) - spacing to name
- **Image Source**: `profile-avatar.png`

### Name (`tagStaffMemberName`)
- **Text**: Staff name (e.g., "Dimotia. M")
- **Font Family**: Inter
- **Font Weight**: Light (300)
- **Font Size**: `12px` (scaled)
- **Color**: `#000000` (black)
- **Text Align**: `center`
- **Max Width**: `80px` (scaled) - for text truncation
- **Number of Lines**: 1 (with `numberOfLines={1}`)

### Staff Member Container (`tagStaffMember`)
- **Layout**: Vertical (`alignItems: 'center'`)
- **Margin Right**: `20px` (scaled) - spacing between staff members
- **Margin Bottom**: `0px`
- **Min Width**: `60px` (scaled)

## Add Button

### Button Container (`tagStaffAddButton`)
- **Dimensions**: `48px × 48px` (scaled) - matches avatar size
- **Border Radius**: `24px` (circular)
- **Background**: `#5a759d` (blue)
- **Layout**: Centered content (`justifyContent: 'center'`, `alignItems: 'center'`)
- **Position**: To the right of staff members

### Plus Icon (`tagStaffAddIcon`)
- **Source**: `plus.png`
- **Dimensions**: `24px × 24px` (scaled)
- **Tint Color**: `#ffffff` (white)
- **Resize Mode**: `contain`

## Spacing & Layout Details

### Vertical Spacing (Top to Bottom)
1. Section margin top: `20px`
2. Label: `17px` font
3. Label to subtitle gap: `4px`
4. Subtitle: `14px` font
5. Subtitle to card gap: `12px`
6. Card top padding: `16px`
7. Divider: `1px` height
8. Divider to content gap: `16px`
9. Content area (avatars + names): Variable height
10. Card bottom padding: `16px`

### Horizontal Spacing
- Card padding: `16px` left and right
- Between staff members: `20px`
- Staff member to add button: `20px` (if applicable)

## Implementation Checklist

- [x] Card dimensions: `388px × 183px`
- [ ] Background color: `#ffffff` (white) - **NEEDS UPDATE** (currently `#f5f5f5`)
- [x] Border radius: `8px`
- [x] Shadow: Subtle shadow for depth - **NEEDS VERIFICATION**
- [x] Padding: `16px` horizontal and vertical
- [x] Label styling: Helvetica Bold, 17px, `#1e1e1e`
- [x] Subtitle styling: Inter Light, 14px, `#666666`
- [x] Divider: `1px` height, `#e3e3e3`, full width
- [x] Staff avatar: `48px × 48px`, circular, white background
- [x] Staff name: Inter Light, 12px, centered below avatar
- [x] Staff member spacing: `20px` between items
- [x] Add button: `48px × 48px`, blue (`#5a759d`), white plus icon (`24px × 24px`)
- [x] Content layout: Horizontal row, centered vertically
- [x] All dimensions scaled with `scaleX`

## Key Corrections Needed

1. **Card Background**: Change from `#f5f5f5` (light gray) to `#ffffff` (white) to match Figma
2. **Shadow**: Add subtle shadow properties for visual depth
3. **Divider Position**: Verify divider placement matches Figma exactly

## Current Implementation Status

### ✅ Completed
- Card dimensions and background
- Label and subtitle styling
- Divider implementation
- Staff member layout with avatars and names
- Add button with blue background and white plus icon
- Proper spacing and alignment

### 🔄 Needs Review/Verification
- Exact spacing values from Figma
- Divider position and styling
- Avatar image sizing and display
- Text truncation behavior
- Overall card height distribution

## Notes
- The card uses a **white background** (`#ffffff`) with subtle shadow to visually separate it from the light grey screen background
- Staff members are displayed horizontally with names centered below avatars
- The add button matches the avatar size (`48px × 48px`) for visual consistency
- All measurements should be scaled using the `scaleX` constant for responsive design
- The divider creates visual separation between the header area (title/subtitle) and the staff content area
- Content is arranged horizontally with proper spacing between staff members and the add button

## Layout Flow (Top to Bottom)
1. **Section Container** (`tagStaffSection`)
   - Margin top: `20px`
2. **Label** ("Tag Staff")
   - Font: Helvetica Bold, 17px
   - Color: `#1e1e1e`
   - Margin bottom: `4px`
3. **Subtitle** ("Tag people to the ticket")
   - Font: Inter Light, 14px
   - Color: `#666666`
   - Margin bottom: `12px`
4. **Card Container** (`tagStaffCard`)
   - Dimensions: `388px × 183px`
   - Background: `#ffffff` (white)
   - Padding: `16px` all sides
   - Shadow: Subtle shadow for depth
5. **Divider** (inside card)
   - Height: `1px`
   - Color: `#e3e3e3`
   - Margin bottom: `16px`
6. **Content Container** (staff members + add button)
   - Horizontal layout
   - Centered vertically
