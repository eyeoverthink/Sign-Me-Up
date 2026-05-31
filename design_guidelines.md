# Design Guidelines: 3D Signage Letter Generator

## Design Approach
**System Selected:** Hybrid approach drawing from Figma's editor interface + Tinkercad's 3D manipulation controls + Linear's clean utility aesthetics

**Core Principles:**
- Editor-first interface: maximize canvas space for 3D preview
- Tool accessibility: all controls within 1-2 clicks
- Non-destructive workflow: easy experimentation and iteration
- Professional utility over flashy visuals

## Layout System

**Primary Layout Structure:**
- Full viewport application (100vh) with fixed header and split-panel layout
- Left Sidebar (320px): Toolbox and controls, collapsible to 48px icon-only mode
- Center Canvas (flexible): 3D preview area with dark workspace background
- Right Properties Panel (280px): Context-sensitive settings, collapsible
- Top Toolbar (56px): Primary actions (Export, Save, New Project) and view controls

**Spacing System:**
Consistent use of Tailwind units: 1, 2, 3, 4, 6, 8, 12 for tight editor UI
- Toolbar padding: p-3
- Panel sections: p-4, gap-4 between section groups
- Button spacing: gap-2 for button groups
- Section dividers: my-6

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts) - UI text, labels, controls
- Monospace: JetBrains Mono - measurements, coordinates, file names

**Type Scale:**
- Tool Labels: text-xs font-medium uppercase tracking-wide
- Input Labels: text-sm font-medium
- Section Headers: text-base font-semibold
- Primary Actions: text-sm font-medium
- Measurements/Values: text-sm font-mono
- Panel Titles: text-lg font-semibold

## Component Library

**Navigation & Controls:**
- Top Toolbar: Fixed header with logo, project name input, primary action buttons (Export STL/OBJ, Save, Share)
- View Controls: Zoom slider, rotation reset, grid toggle, measurement units toggle
- Left Sidebar Tabs: Text Input, Font Selection, Features (wiring/mounting), Transform (scale/rotate), Export

**Input Components:**
- Text Input Panel: Large textarea for letter/word input with character limit indicator
- Font Selector: Scrollable grid of font previews (3 columns) with search filter
- Slider Controls: Scale (0.1x - 10x), Depth (5mm - 100mm), Wire Channel Diameter (3mm - 20mm)
- Number Inputs: Precise value entry for dimensions, mounting hole positions
- Toggle Switches: Grid visibility, wireframe mode, measurement display

**3D Canvas Features:**
- Interactive 3D viewport with orbit controls (click-drag to rotate)
- Overlay UI: Corner widgets for view angles (Front/Top/Side/Perspective)
- On-canvas measurements: Dimension annotations in workspace
- Transform gizmos: Visual handles for scale/rotate when object selected

**Property Panels:**
- Wiring Options: Channel type dropdown (center/back/custom), diameter slider, path preview
- Mounting Holes: Hole count selector (0-8), position grid (visual placement), diameter/depth inputs
- Material Settings: Layer height suggestion, support recommendation, print time estimate
- Export Options: File format selector (STL/OBJ/3MF), unit system, resolution quality

**Feedback Elements:**
- Status Bar (bottom, 32px): Current dimensions, file size estimate, last saved timestamp
- Toast Notifications: Save confirmations, export progress, error messages (top-right, 4s duration)
- Loading States: Skeleton placeholders during font loading, progress bars for export generation

**Data Display:**
- Preview Grid: Small thumbnails of recent projects (sidebar bottom section)
- Measurement Table: Detailed dimensions readout in properties panel
- Print Stats Card: Material estimate, time estimate, difficulty rating

## Interaction Patterns

**Primary Workflows:**
1. Text Entry → Font Selection → Depth/Scale Adjustment → Feature Addition → Export
2. Quick Edit: Load recent project → Modify text → Re-export
3. Template Mode: Choose preset (neon/LED/wall art) → Customize → Export

**Keyboard Shortcuts:** Display shortcut hints on hover (tooltips), common actions: Ctrl+E (Export), Ctrl+S (Save), Space (Rotate), G (Toggle Grid)

**Responsive Behavior:**
- Desktop (1440px+): Full three-panel layout
- Laptop (1024px-1439px): Collapsible sidebars, expand on hover
- Tablet/Mobile: Not primary target - show mobile-friendly message directing to desktop

## Images

**No Hero Images:** This is a utility application launching directly into editor interface

**Icon Usage:**
- Heroicons for all UI controls (outline style for inactive, solid for active states)
- 3D manipulation icons: custom SVG for rotate/scale/move gizmos in canvas
- Font previews: Dynamically rendered letter "A" samples, not static images

**Visual Aids:**
- Wiring diagram illustrations: Simple line diagrams showing wire channel placement options
- Mounting hole patterns: Grid overlays showing standard configurations (4-corner, 6-point, custom)
- Print orientation guide: Isometric view showing recommended printer bed placement

This design creates a professional, efficient 3D signage editor that prioritizes workflow speed and precision while maintaining approachable usability for makers and small businesses.