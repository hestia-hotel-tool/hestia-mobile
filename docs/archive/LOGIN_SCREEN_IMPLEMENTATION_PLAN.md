# Login Screen Implementation Plan

## Analysis of Figma Design vs Current Implementation

### Design Specifications (iPhone 16 Pro Max - 440x956px)

#### 1. **Background**
- Color: `#eef0f6` (colors.background.secondary) ✓
- Full screen

#### 2. **Header Section (Group 208)**
- **Logo (Group 207)**: 
  - Position: x=35, y=85
  - Size: 34.673px × 32.711px
  - ❌ Currently: Placeholder view, needs actual logo.png
  
- **"Hestia" Text**:
  - Position: x=80.18, y=96.79
  - Size: 69.816px × 18.812px
  - Font: Helvetica Regular, ~19px
  - ❌ Currently: Wrong positioning and size
  
- **Language Selector**:
  - Position: x=259, y=97
  - Text: "Language EN" (EN in pink #ff46a3)
  - Font: 17px, Light for "Language", Bold for "EN"
  - Dropdown arrow: x=380, y=104, 17×8px
  - ❌ Currently: Missing dropdown arrow icon

#### 3. **Divider Line (Vector 41)**
- Position: x=-1, y=144
- Width: 440px, Height: 0px
- ❌ Currently: Missing

#### 4. **"Log in" Title**
- Position: x=35, y=189
- Size: 109×39px
- Font: 34px, Bold, color #5a759d
- ❌ Currently: Wrong positioning (using padding instead of absolute)

#### 5. **Company Email Section**
- **Label**: 
  - Position: x=35, y=308
  - Text: "Company email"
  - Font: 17px, Regular
  
- **Input Field (Rectangle 113)**:
  - Position: x=35, y=338
  - Size: 370×70px
  - Background: white
  - Border: none
  
- **Email Value**:
  - Position: x=47, y=362
  - Text: "Stellakitou@mandarinorientalsavoy.ch"
  - Font: 17px, Light
  - ❌ Currently: Using Input component, needs absolute positioning

#### 6. **Password Section**
- **Label**:
  - Position: x=35, y=426
  - Text: "Password"
  - Font: 17px, Regular
  
- **Input Field (Rectangle 114)**:
  - Position: x=36, y=456
  - Size: 370×70px
  - Background: white
  - Border: none
  
- **Password Value**:
  - Position: x=45, y=484
  - Text: "**********************"
  - Font: 17px, Light
  - ❌ Currently: Using Input component, needs absolute positioning

#### 7. **Sign In Button (Rectangle 115)**
- Position: x=35, y=568
- Size: 370×70px
- Background: #5a759d
- Border radius: 0
- Text: "Sign In" at x=188, y=592
- Font: 18px, Regular, white
- ❌ Currently: Using Button component, needs exact positioning

#### 8. **Recover Password Section (Group 209)**
- **Background (Rectangle 116)**:
  - Position: x=36, y=665
  - Size: 370×70px
  - Background: #eef0f6
  - Border: 1px solid #dbdbdb
  - ❌ Currently: Missing background rectangle
  
- **Text**:
  - Position: x=137, y=690
  - Text: "Recover Password"
  - Font: 18px, Regular, color #5a759d
  
- **Arrow Icon**:
  - Position: x=305.5, y=709
  - Size: 8×17px
  - ❌ Currently: Missing arrow icon

#### 9. **Customer Service Section (Group 210)**
- **Background (Rectangle 117)**:
  - Position: x=62, y=839
  - Size: 317×71px
  - Background: rgba(217,217,217,0.3)
  - Border radius: 81px
  - ❌ Currently: Missing rounded background
  
- **Logo Icon (Group 207)**:
  - Position: x=95, y=852
  - Size: 42.07×39.689px
  - ❌ Currently: Placeholder view
  
- **Phone Icon (Vector)**:
  - Position: x=109.07, y=864.99
  - Size: 20×20px
  - ❌ Currently: Missing
  
- **"Customer Service" Text**:
  - Position: x=154, y=855
  - Size: 128×17px
  - Font: 15px, Bold, color #5a759d
  
- **"Having issues with the app?" Text**:
  - Position: x=154, y=875
  - Size: 216×22px
  - Font: 15px, Light, color #1e1e1e
  - ❌ Currently: Wrong positioning

## Implementation Strategy

### Approach
1. **Remove ScrollView** - Use absolute positioning like SplashScreen
2. **Remove Input/Button components** - Use native TextInput and TouchableOpacity with absolute positioning
3. **Add responsive scaling** - Scale based on 440px design width
4. **Download missing icons** - Language dropdown arrow, Recover Password arrow, Customer Service phone icon
5. **Use logo.png** - Replace placeholder with actual logo image

### Key Changes Required

1. **Structure**: Change from ScrollView with padding to absolute positioning
2. **Header**: Fix logo and text positioning, add dropdown arrow
3. **Form Fields**: Replace Input components with absolute positioned TextInputs
4. **Buttons**: Replace Button component with TouchableOpacity, add Recover Password background
5. **Customer Service**: Add rounded background, fix icon and text positioning
6. **Icons**: Download and add missing vector icons

### Files to Modify
- `src/screens/LoginScreen.tsx` - Complete rewrite with absolute positioning
- `assets/` - Add missing icon files (or use SVG components)

### Responsive Scaling
- Use same scaling approach as SplashScreen: `scaleX = SCREEN_WIDTH / 440`
- All positions and sizes multiplied by `scaleX`

