// Light Box Generator v2.0 - Advanced 3D Printable Light Box System
// Generates OpenSCAD files for hollow box shells with customizable features

// Helper: OpenSCAD uses $fn for fragment count - we use __FN__ placeholder and replace at the end
const FN_PLACEHOLDER = '__FN__';
function escapeOpenSCAD(code: string): string {
  return code.replace(/__FN__/g, '$' + 'fn');
}

export interface LightBoxSettings {
  // Box Dimensions
  boxWidth: number;          // mm
  boxHeight: number;         // mm
  boxDepth: number;          // mm (how deep the box is)
  wallThickness: number;     // mm (shell thickness)
  
  // Box Shape
  boxShape: 'rectangle' | 'rounded' | 'oval' | 'hexagon' | 'custom';
  cornerRadius: number;      // mm (for rounded shape)
  
  // Diffuser System
  diffuserType: 'snap_fit' | 'overlay' | 'slide_groove' | 'friction_fit' | 'none';
  diffuserThickness: number; // mm
  diffuserInset: number;     // mm (how far inside the lip sits)
  grooveDepth: number;       // mm (for slide groove type)
  snapTolerance: number;     // mm (gap for snap fit)
  
  // Image/Design Layer
  imageMode: 'stencil' | 'solid' | 'transparent' | 'glow_dark' | 'tubular_el' | 'lithophane' | 'none';
  imagePlacement: 'above_diffuser' | 'below_diffuser' | 'integrated';
  imageThickness: number;    // mm
  designType: string;        // which built-in design to use
  
  // Tubular EL Wire channels (when imageMode is 'tubular_el')
  tubeChannelWidth: number;  // mm (channel width for EL wire)
  tubeChannelDepth: number;  // mm (channel depth)
  tubeWallThickness: number; // mm
  
  // Lithophane settings
  lithophaneMinThickness: number; // mm (thinnest part - brightest)
  lithophaneMaxThickness: number; // mm (thickest part - darkest)
  
  // User-placed holes
  holes: HolePlacement[];
  
  // Diffusion Pattern
  diffusionPattern: 'none' | 'honeycomb' | 'dots' | 'grid' | 'waves' | 'voronoi' | 'diamonds' | 'lines';
  diffusionDensity: number;  // 0-100 (how dense the pattern is)
  diffusionDepth: number;    // mm (how deep the pattern is etched)
  
  // Back Panel
  includeBackPanel: boolean;
  backPanelThickness: number;
  backPanelVentHoles: boolean;
  
  // LED Channel (perimeter)
  includeLedChannel: boolean;
  ledChannelWidth: number;
  ledChannelDepth: number;
  lightType: string;
  
  // Shape layers for multi-depth designs
  layers?: ShapeLayer[];
  selectedLayerId?: string | null;
  
  // Export options
  exportParts: ('box' | 'diffuser' | 'image_layer' | 'back_panel' | 'all')[];
}

export interface HolePlacement {
  id: string;
  x: number;           // mm from left edge
  y: number;           // mm from bottom edge
  diameter: number;    // mm
  type: 'led_3mm' | 'led_5mm' | 'led_10mm' | 'wire_small' | 'wire_medium' | 'wire_large' | 'mounting' | 'vent' | 'custom';
  side: 'back' | 'bottom' | 'left' | 'right' | 'top';
}

export interface ShapeLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  sourceType: 'stock' | 'trace' | 'draw' | 'upload';
  stockShape?: string;
  stockCategory?: string;
  paths: Array<{ points: Array<{x: number; y: number}>; closed?: boolean }>;
  uploadedImage?: string;
  thickness: number;
  offsetZ: number;
  mode: 'stencil' | 'solid' | 'channel' | 'lithophane';
  ledType: string;
  ledChannelWidth: number;
  ledChannelDepth: number;
  diffuserMode: string;
  color: string;
}

// Stock shape definitions with SVG paths
const STOCK_SHAPES: Record<string, { path: string; name: string }> = {
  // Wall Art
  'detailed_tree': { name: 'Tree of Life', path: 'M50,95 L50,70 M50,70 L35,55 M35,55 L25,40 M25,40 L15,25 M25,40 L30,25 M35,55 L40,40 L35,25 M50,70 L50,50 M50,50 L45,35 L40,20 M50,50 L55,35 L60,20 M50,70 L65,55 M65,55 L75,40 M75,40 L85,25 M75,40 L70,25 M65,55 L60,40 L65,25' },
  'branching_tree': { name: 'Branching Tree', path: 'M50,98 L50,75 M50,75 C40,65 30,55 20,45 M50,75 C60,65 70,55 80,45 M20,45 C15,38 10,30 5,20 M20,45 C25,38 28,30 30,20 M80,45 C85,38 90,30 95,20 M80,45 C75,38 72,30 70,20' },
  'solar_system': { name: 'Solar System', path: 'M50,50 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M5,50 L95,50 M50,5 L50,95 M50,50 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0' },
  'mountain_range': { name: 'Mountains', path: 'M0,90 L20,50 L30,65 L50,25 L65,55 L75,40 L90,70 L100,90 Z' },
  'wave_art': { name: 'Wave Art', path: 'M5,30 Q20,10 35,30 Q50,50 65,30 Q80,10 95,30 M5,50 Q20,30 35,50 Q50,70 65,50 Q80,30 95,50 M5,70 Q20,50 35,70 Q50,90 65,70 Q80,50 95,70' },
  // Classic Shapes
  'heart': { name: 'Heart', path: 'M50,88 C50,88 10,60 10,35 C10,15 25,8 50,25 C75,8 90,15 90,35 C90,60 50,88 50,88 Z' },
  'star': { name: 'Star', path: 'M50,5 L61,40 L98,40 L68,60 L79,95 L50,75 L21,95 L32,60 L2,40 L39,40 Z' },
  'moon': { name: 'Crescent Moon', path: 'M70,10 A40,40 0 1,1 70,90 A30,30 0 1,0 70,10' },
  'lightning': { name: 'Lightning', path: 'M55,5 L35,45 L50,45 L30,95 L70,40 L55,40 L75,5 Z' },
  'diamond': { name: 'Diamond', path: 'M50,5 L90,50 L50,95 L10,50 Z' },
  'alien_head': { name: 'Alien', path: 'M50,5 C25,5 15,25 12,45 C10,65 20,80 35,88 L42,95 L50,90 L58,95 L65,88 C80,80 90,65 88,45 C85,25 75,5 50,5 Z' },
};

export const defaultLightBoxSettings: LightBoxSettings = {
  boxWidth: 200,
  boxHeight: 150,
  boxDepth: 30,
  wallThickness: 2.5,
  
  boxShape: 'rectangle',
  cornerRadius: 5,
  
  diffuserType: 'snap_fit',
  diffuserThickness: 1.5,
  diffuserInset: 3,
  grooveDepth: 2,
  snapTolerance: 0.3,
  
  imageMode: 'stencil',
  imagePlacement: 'above_diffuser',
  imageThickness: 2,
  designType: 'tree',
  
  tubeChannelWidth: 4,
  tubeChannelDepth: 3,
  tubeWallThickness: 1.2,
  
  lithophaneMinThickness: 0.8,
  lithophaneMaxThickness: 3.2,
  
  holes: [],
  
  diffusionPattern: 'none',
  diffusionDensity: 50,
  diffusionDepth: 0.5,
  
  includeBackPanel: true,
  backPanelThickness: 2,
  backPanelVentHoles: true,
  
  includeLedChannel: true,
  ledChannelWidth: 12,
  ledChannelDepth: 4,
  lightType: 'ws2812b_10mm',
  
  exportParts: ['all'],
};

// Get hole diameter based on type
function getHoleDiameter(type: HolePlacement['type']): number {
  switch (type) {
    case 'led_3mm': return 3.2;
    case 'led_5mm': return 5.2;
    case 'led_10mm': return 10.2;
    case 'wire_small': return 3;
    case 'wire_medium': return 5;
    case 'wire_large': return 8;
    case 'mounting': return 4;
    case 'vent': return 6;
    default: return 5;
  }
}

// Parse simple SVG path to generate OpenSCAD polygon points
function svgPathToPoints(path: string): Array<{x: number; y: number}> {
  const points: Array<{x: number; y: number}> = [];
  // Simple parser for M, L, Z commands - handles basic paths
  const commands = path.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  let currentX = 0, currentY = 0;
  
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M':
      case 'L':
        for (let i = 0; i < nums.length; i += 2) {
          currentX = nums[i] || currentX;
          currentY = nums[i + 1] || currentY;
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'H':
        currentX = nums[0] || currentX;
        points.push({ x: currentX, y: currentY });
        break;
      case 'V':
        currentY = nums[0] || currentY;
        points.push({ x: currentX, y: currentY });
        break;
      case 'Z':
        // Close path - handled by polygon
        break;
      case 'C': // Cubic bezier - approximate with line to end point
        for (let i = 0; i < nums.length; i += 6) {
          currentX = nums[i + 4] || currentX;
          currentY = nums[i + 5] || currentY;
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'Q': // Quadratic bezier - approximate with line to end point
        for (let i = 0; i < nums.length; i += 4) {
          currentX = nums[i + 2] || currentX;
          currentY = nums[i + 3] || currentY;
          points.push({ x: currentX, y: currentY });
        }
        break;
    }
  }
  
  return points;
}

// Generate OpenSCAD code for shape layers
function getShapeLayersCode(settings: LightBoxSettings): string {
  if (!settings.layers || settings.layers.length === 0) {
    return '';
  }
  
  const { boxWidth, boxHeight } = settings;
  let code = `
// === SHAPE LAYERS ===
`;

  settings.layers.forEach((layer, index) => {
    if (!layer.visible) return;
    
    let shapePath = '';
    
    // Get the shape path from stock shapes or layer paths
    if (layer.sourceType === 'stock' && layer.stockShape && STOCK_SHAPES[layer.stockShape]) {
      shapePath = STOCK_SHAPES[layer.stockShape].path;
    }
    
    if (shapePath) {
      const points = svgPathToPoints(shapePath);
      
      if (points.length >= 3) {
        // Convert SVG coordinate system (100x100 viewbox, Y-down) to box dimensions (Y-up)
        const scaleX = boxWidth / 100;
        const scaleY = boxHeight / 100;
        
        const scaledPoints = points.map(p => ({
          x: p.x * scaleX,
          y: (100 - p.y) * scaleY // Flip Y axis
        }));
        
        const pointsStr = scaledPoints.map(p => `[${p.x.toFixed(2)}, ${p.y.toFixed(2)}]`).join(', ');
        
        code += `
// Layer ${index + 1}: ${layer.name}
Layer_${index}_Thickness = ${layer.thickness};
Layer_${index}_OffsetZ = ${layer.offsetZ};

module layer_${index}_shape() {
    polygon(points=[${pointsStr}]);
}

module layer_${index}() {
    translate([0, 0, Layer_${index}_OffsetZ])
        linear_extrude(Layer_${index}_Thickness)
        layer_${index}_shape();
}
`;
      }
    }
  });

  // Add combined layers module
  code += `
// All shape layers combined
module shape_layers() {
`;
  settings.layers.forEach((layer, index) => {
    if (layer.visible) {
      code += `    layer_${index}();\n`;
    }
  });
  code += `}
`;

  return code;
}

// Generate the shape profile module based on box shape
function getShapeProfileModule(settings: LightBoxSettings): string {
  const { boxWidth, boxHeight, boxShape, cornerRadius } = settings;
  
  switch (boxShape) {
    case 'rounded':
      return `
module box_profile() {
    offset(r=${cornerRadius}) offset(r=-${cornerRadius})
        square([Box_Width, Box_Height]);
}`;
    case 'oval':
      return `
module box_profile() {
    scale([Box_Width/2, Box_Height/2])
        circle(r=1, __FN__=120);
}`;
    case 'hexagon':
      return `
module box_profile() {
    scale([Box_Width/2, Box_Height/2])
        circle(r=1, __FN__=6);
}`;
    default: // rectangle
      return `
module box_profile() {
    square([Box_Width, Box_Height]);
}`;
  }
}

// Generate diffuser mounting system code
function getDiffuserMountCode(settings: LightBoxSettings): string {
  const { diffuserType, diffuserInset, grooveDepth, snapTolerance, wallThickness } = settings;
  
  switch (diffuserType) {
    case 'snap_fit':
      return `
// Snap-fit lip - small ridge that clicks into place
Snap_Lip_Height = 1.5;
Snap_Lip_Width = 1.0;

module snap_fit_lip() {
    translate([0, 0, Box_Depth - Diffuser_Inset - Snap_Lip_Height])
        linear_extrude(Snap_Lip_Height) {
            difference() {
                offset(r=-Wall_Thickness + Snap_Lip_Width + Snap_Tolerance)
                    box_profile();
                offset(r=-Wall_Thickness + Snap_Tolerance)
                    box_profile();
            }
        }
}`;
    case 'slide_groove':
      return `
// Slide-in groove - channels on sides for diffuser to slide in
Groove_Width = Diffuser_Thickness + 0.4;

module slide_groove() {
    // Left and right grooves
    translate([Wall_Thickness - Groove_Depth, 0, Box_Depth - Diffuser_Inset - 10])
        cube([Groove_Depth, Box_Height, 10]);
    translate([Box_Width - Wall_Thickness, 0, Box_Depth - Diffuser_Inset - 10])
        cube([Groove_Depth, Box_Height, 10]);
}`;
    case 'friction_fit':
      return `
// Friction fit - tight tolerance lip
module friction_lip() {
    translate([0, 0, Box_Depth - Diffuser_Inset])
        linear_extrude(Diffuser_Inset) {
            difference() {
                offset(r=-Wall_Thickness + 0.3)
                    box_profile();
                offset(r=-Wall_Thickness - 0.1)
                    box_profile();
            }
        }
}`;
    default: // overlay or none - simple inset ledge
      return `
// Simple ledge for overlay diffuser
module diffuser_ledge() {
    // Created by the hollow shell naturally
}`;
  }
}

// Generate holes code for user-placed holes
function getHolesCode(settings: LightBoxSettings): string {
  if (settings.holes.length === 0) return '';
  
  let code = `
// User-placed holes for lighting and wire routing
module user_holes() {`;
  
  for (const hole of settings.holes) {
    const diameter = hole.diameter || getHoleDiameter(hole.type);
    
    switch (hole.side) {
      case 'back':
        code += `
    // ${hole.type} hole on back
    translate([${hole.x}, ${hole.y}, -1])
        cylinder(h=Wall_Thickness + 2, d=${diameter}, __FN__=32);`;
        break;
      case 'bottom':
        code += `
    // ${hole.type} hole on bottom
    translate([${hole.x}, -1, ${hole.y}])
        rotate([-90, 0, 0])
        cylinder(h=Wall_Thickness + 2, d=${diameter}, __FN__=32);`;
        break;
      case 'left':
        code += `
    // ${hole.type} hole on left side
    translate([-1, ${hole.x}, ${hole.y}])
        rotate([0, 90, 0])
        cylinder(h=Wall_Thickness + 2, d=${diameter}, __FN__=32);`;
        break;
      case 'right':
        code += `
    // ${hole.type} hole on right side
    translate([Box_Width - Wall_Thickness, ${hole.x}, ${hole.y}])
        rotate([0, 90, 0])
        cylinder(h=Wall_Thickness + 2, d=${diameter}, __FN__=32);`;
        break;
      case 'top':
        code += `
    // ${hole.type} hole on top
    translate([${hole.x}, Box_Height - Wall_Thickness, ${hole.y}])
        rotate([90, 0, 0])
        cylinder(h=Wall_Thickness + 2, d=${diameter}, __FN__=32);`;
        break;
    }
  }
  
  code += `
}`;
  return code;
}

// Generate diffusion pattern code
function getDiffusionPatternCode(settings: LightBoxSettings): string {
  const { diffusionPattern, diffusionDensity, diffusionDepth } = settings;
  
  if (diffusionPattern === 'none') return '';
  
  const spacing = Math.max(3, 15 - (diffusionDensity / 10));
  
  switch (diffusionPattern) {
    case 'honeycomb':
      return `
// Honeycomb diffusion pattern
Hex_Size = ${spacing * 0.8};
Hex_Spacing = ${spacing};

module honeycomb_pattern() {
    for (row = [0 : Hex_Spacing * 1.5 : Box_Height]) {
        for (col = [0 : Hex_Spacing * 1.732 : Box_Width]) {
            offset_y = (floor(col / (Hex_Spacing * 1.732)) % 2) * Hex_Spacing * 0.75;
            translate([col, row + offset_y, 0])
                circle(r=Hex_Size/2, __FN__=6);
        }
    }
}

module diffusion_pattern() {
    linear_extrude(${diffusionDepth})
        intersection() {
            offset(r=-Wall_Thickness - 2) box_profile();
            honeycomb_pattern();
        }
}`;
    case 'dots':
      return `
// Dot diffusion pattern
Dot_Radius = ${spacing * 0.3};
Dot_Spacing = ${spacing};

module dot_pattern() {
    for (y = [Dot_Spacing : Dot_Spacing : Box_Height - Dot_Spacing]) {
        for (x = [Dot_Spacing : Dot_Spacing : Box_Width - Dot_Spacing]) {
            translate([x, y, 0])
                circle(r=Dot_Radius, __FN__=24);
        }
    }
}

module diffusion_pattern() {
    linear_extrude(${diffusionDepth})
        intersection() {
            offset(r=-Wall_Thickness - 2) box_profile();
            dot_pattern();
        }
}`;
    case 'grid':
      return `
// Grid diffusion pattern
Grid_Spacing = ${spacing};
Grid_Line_Width = 0.8;

module grid_pattern() {
    for (x = [Grid_Spacing : Grid_Spacing : Box_Width - Grid_Spacing]) {
        translate([x - Grid_Line_Width/2, 0, 0])
            square([Grid_Line_Width, Box_Height]);
    }
    for (y = [Grid_Spacing : Grid_Spacing : Box_Height - Grid_Spacing]) {
        translate([0, y - Grid_Line_Width/2, 0])
            square([Box_Width, Grid_Line_Width]);
    }
}

module diffusion_pattern() {
    linear_extrude(${diffusionDepth})
        intersection() {
            offset(r=-Wall_Thickness - 2) box_profile();
            grid_pattern();
        }
}`;
    case 'waves':
      return `
// Wave diffusion pattern
Wave_Amplitude = ${spacing * 0.4};
Wave_Period = ${spacing * 2};

module wave_pattern() {
    for (y = [${spacing} : ${spacing} : Box_Height - ${spacing}]) {
        translate([0, y, 0])
            for (x = [0 : 2 : Box_Width]) {
                translate([x, Wave_Amplitude * sin(x * 360 / Wave_Period), 0])
                    circle(r=0.6, __FN__=12);
            }
    }
}

module diffusion_pattern() {
    linear_extrude(${diffusionDepth})
        intersection() {
            offset(r=-Wall_Thickness - 2) box_profile();
            wave_pattern();
        }
}`;
    case 'diamonds':
      return `
// Diamond diffusion pattern
Diamond_Size = ${spacing * 0.7};
Diamond_Spacing = ${spacing};

module diamond_pattern() {
    for (row = [0 : Diamond_Spacing : Box_Height]) {
        for (col = [0 : Diamond_Spacing : Box_Width]) {
            offset_x = (floor(row / Diamond_Spacing) % 2) * Diamond_Spacing * 0.5;
            translate([col + offset_x, row, 0])
                rotate([0, 0, 45])
                square([Diamond_Size * 0.7, Diamond_Size * 0.7], center=true);
        }
    }
}

module diffusion_pattern() {
    linear_extrude(${diffusionDepth})
        intersection() {
            offset(r=-Wall_Thickness - 2) box_profile();
            diamond_pattern();
        }
}`;
    case 'lines':
      return `
// Parallel lines diffusion pattern
Line_Spacing = ${spacing};
Line_Width = 1.0;

module lines_pattern() {
    for (y = [Line_Spacing : Line_Spacing : Box_Height - Line_Spacing]) {
        translate([0, y - Line_Width/2, 0])
            square([Box_Width, Line_Width]);
    }
}

module diffusion_pattern() {
    linear_extrude(${diffusionDepth})
        intersection() {
            offset(r=-Wall_Thickness - 2) box_profile();
            lines_pattern();
        }
}`;
    case 'voronoi':
      return `
// Voronoi-style organic pattern (approximated)
Cell_Size = ${spacing * 1.2};

module voronoi_pattern() {
    // Approximated voronoi using offset circles
    for (y = [Cell_Size : Cell_Size * 0.866 : Box_Height]) {
        offset_x = (floor(y / (Cell_Size * 0.866)) % 2) * Cell_Size * 0.5;
        for (x = [Cell_Size + offset_x : Cell_Size : Box_Width]) {
            translate([x + sin(x*y) * 2, y + cos(x*y) * 2, 0])
                difference() {
                    circle(r=Cell_Size * 0.45, __FN__=6);
                    circle(r=Cell_Size * 0.35, __FN__=6);
                }
        }
    }
}

module diffusion_pattern() {
    linear_extrude(${diffusionDepth})
        intersection() {
            offset(r=-Wall_Thickness - 2) box_profile();
            voronoi_pattern();
        }
}`;
    default:
      return '';
  }
}

// Generate design module based on type
function getDesignModule(designType: string, settings: LightBoxSettings): string {
  const { boxWidth, boxHeight, imageMode, tubeChannelWidth, tubeChannelDepth, tubeWallThickness } = settings;
  
  // For tubular EL wire mode, we create hollow channels
  const isTubular = imageMode === 'tubular_el';
  
  const designs: Record<string, string> = {
    tree: `
// Detailed tree silhouette
module tree_shape() {
    // Trunk with texture
    translate([Box_Width/2 - 6, 15, 0]) {
        square([12, 70]);
        translate([-2, 20, 0]) square([2, 40]);
        translate([12, 25, 0]) square([2, 35]);
    }
    
    // Root flare
    translate([Box_Width/2, 15, 0])
        polygon([[-18, 0], [18, 0], [8, 15], [-8, 15]]);
    
    // Crown with many overlapping circles
    translate([Box_Width/2, 85, 0]) {
        circle(r=45, __FN__=80);
        translate([-35, 10, 0]) circle(r=30, __FN__=60);
        translate([35, 10, 0]) circle(r=30, __FN__=60);
        translate([-55, -5, 0]) circle(r=22, __FN__=60);
        translate([55, -5, 0]) circle(r=22, __FN__=60);
        translate([-45, 35, 0]) circle(r=25, __FN__=60);
        translate([45, 35, 0]) circle(r=25, __FN__=60);
        translate([0, 55, 0]) circle(r=35, __FN__=60);
        translate([-20, 70, 0]) circle(r=22, __FN__=60);
        translate([20, 70, 0]) circle(r=22, __FN__=60);
        translate([0, 80, 0]) circle(r=18, __FN__=60);
        translate([-70, 5, 0]) circle(r=12, __FN__=40);
        translate([70, 5, 0]) circle(r=12, __FN__=40);
    }
}

${isTubular ? `
// Tubular version - hollow channels for EL wire
module design_shape() {
    difference() {
        offset(r=${tubeChannelWidth/2 + tubeWallThickness}) tree_shape();
        offset(r=${tubeChannelWidth/2}) tree_shape();
    }
}

module design_channel() {
    offset(r=${tubeChannelWidth/2}) tree_shape();
}
` : `
module design_shape() {
    tree_shape();
}
`}`,
    geometric: `
// Geometric lines and planets
module geometric_shape() {
    line_thickness = 4;
    
    // Vertical lines
    for (i = [0:4]) {
        translate([Box_Width * (i+1)/6 - line_thickness/2, Box_Height * 0.12, 0])
            square([line_thickness, Box_Height * 0.76]);
    }
    
    // Horizontal connectors
    translate([Box_Width/6, Box_Height * 0.5 - line_thickness/2, 0])
        square([Box_Width * 4/6, line_thickness]);
    translate([Box_Width * 2/6, Box_Height * 0.35 - line_thickness/2, 0])
        square([Box_Width * 2/6, line_thickness]);
    
    // Planets
    translate([Box_Width/2, Box_Height * 0.25, 0]) circle(r=22, __FN__=60);
    translate([Box_Width/2, Box_Height * 0.45, 0]) circle(r=16, __FN__=60);
    translate([Box_Width/2, Box_Height * 0.60, 0]) circle(r=12, __FN__=60);
    translate([Box_Width/2, Box_Height * 0.72, 0]) circle(r=8, __FN__=60);
}

${isTubular ? `
module design_shape() {
    difference() {
        offset(r=${tubeChannelWidth/2 + tubeWallThickness}) geometric_shape();
        offset(r=${tubeChannelWidth/2}) geometric_shape();
    }
}

module design_channel() {
    offset(r=${tubeChannelWidth/2}) geometric_shape();
}
` : `
module design_shape() {
    geometric_shape();
}
`}`,
    circles: `
// Abstract overlapping circles
module circles_shape() {
    translate([Box_Width * 0.25, Box_Height * 0.30, 0]) circle(r=40, __FN__=80);
    translate([Box_Width * 0.70, Box_Height * 0.35, 0]) circle(r=35, __FN__=80);
    translate([Box_Width * 0.45, Box_Height * 0.55, 0]) circle(r=45, __FN__=80);
    translate([Box_Width * 0.75, Box_Height * 0.65, 0]) circle(r=30, __FN__=60);
    translate([Box_Width * 0.20, Box_Height * 0.70, 0]) circle(r=28, __FN__=60);
    translate([Box_Width * 0.55, Box_Height * 0.25, 0]) circle(r=18, __FN__=60);
    translate([Box_Width * 0.30, Box_Height * 0.50, 0]) circle(r=20, __FN__=60);
}

${isTubular ? `
module design_shape() {
    difference() {
        offset(r=${tubeChannelWidth/2 + tubeWallThickness}) circles_shape();
        offset(r=${tubeChannelWidth/2}) circles_shape();
    }
}

module design_channel() {
    offset(r=${tubeChannelWidth/2}) circles_shape();
}
` : `
module design_shape() {
    circles_shape();
}
`}`,
    heart: `
// Heart shape
module heart_shape() {
    translate([Box_Width/2, Box_Height * 0.4, 0])
        scale([Box_Width * 0.006, Box_Height * 0.005])
        union() {
            translate([-25, 0, 0]) circle(r=30, __FN__=60);
            translate([25, 0, 0]) circle(r=30, __FN__=60);
            rotate([0, 0, 45])
                translate([0, -21, 0])
                square([42, 42]);
        }
}

${isTubular ? `
module design_shape() {
    difference() {
        offset(r=${tubeChannelWidth/2 + tubeWallThickness}) heart_shape();
        offset(r=${tubeChannelWidth/2}) heart_shape();
    }
}

module design_channel() {
    offset(r=${tubeChannelWidth/2}) heart_shape();
}
` : `
module design_shape() {
    heart_shape();
}
`}`,
    star: `
// 5-pointed star
module star_shape() {
    translate([Box_Width/2, Box_Height * 0.5, 0])
        scale([Box_Width * 0.004, Box_Height * 0.004]) {
            polygon([
                for (i = [0:4]) each [
                    [cos(90 + i*72) * 50, sin(90 + i*72) * 50],
                    [cos(90 + i*72 + 36) * 20, sin(90 + i*72 + 36) * 20]
                ]
            ]);
        }
}

${isTubular ? `
module design_shape() {
    difference() {
        offset(r=${tubeChannelWidth/2 + tubeWallThickness}) star_shape();
        offset(r=${tubeChannelWidth/2}) star_shape();
    }
}

module design_channel() {
    offset(r=${tubeChannelWidth/2}) star_shape();
}
` : `
module design_shape() {
    star_shape();
}
`}`,
    moon: `
// Crescent moon
module moon_shape() {
    translate([Box_Width/2, Box_Height * 0.5, 0])
        difference() {
            circle(r=min(Box_Width, Box_Height) * 0.35, __FN__=80);
            translate([min(Box_Width, Box_Height) * 0.15, min(Box_Width, Box_Height) * 0.1, 0])
                circle(r=min(Box_Width, Box_Height) * 0.28, __FN__=80);
        }
}

${isTubular ? `
module design_shape() {
    difference() {
        offset(r=${tubeChannelWidth/2 + tubeWallThickness}) moon_shape();
        offset(r=${tubeChannelWidth/2}) moon_shape();
    }
}

module design_channel() {
    offset(r=${tubeChannelWidth/2}) moon_shape();
}
` : `
module design_shape() {
    moon_shape();
}
`}`,
    custom: `
// Custom house and tree scene
module custom_shape() {
    // House body
    translate([Box_Width * 0.25, Box_Height * 0.15, 0])
        square([Box_Width * 0.35, Box_Height * 0.30]);
    
    // Roof
    translate([Box_Width * 0.425, Box_Height * 0.45, 0])
        polygon([
            [-Box_Width * 0.22, 0],
            [Box_Width * 0.22, 0],
            [0, Box_Height * 0.20]
        ]);
    
    // Chimney
    translate([Box_Width * 0.50, Box_Height * 0.55, 0])
        square([Box_Width * 0.06, Box_Height * 0.12]);
    
    // Tree trunk
    translate([Box_Width * 0.72, Box_Height * 0.15, 0])
        square([8, 40]);
    
    // Tree crown
    translate([Box_Width * 0.74, Box_Height * 0.50, 0]) {
        circle(r=25, __FN__=60);
        translate([-15, 18, 0]) circle(r=18, __FN__=40);
        translate([15, 18, 0]) circle(r=18, __FN__=40);
        translate([0, 30, 0]) circle(r=15, __FN__=40);
    }
    
    // Ground
    translate([Box_Width * 0.05, Box_Height * 0.12, 0])
        square([Box_Width * 0.90, 5]);
}

${isTubular ? `
module design_shape() {
    difference() {
        offset(r=${tubeChannelWidth/2 + tubeWallThickness}) custom_shape();
        offset(r=${tubeChannelWidth/2}) custom_shape();
    }
}

module design_channel() {
    offset(r=${tubeChannelWidth/2}) custom_shape();
}
` : `
module design_shape() {
    custom_shape();
}
`}`,
  };
  
  return designs[designType] || designs.tree;
}

// Generate the image layer code based on image mode
function getImageLayerCode(settings: LightBoxSettings): string {
  const { imageMode, imageThickness, tubeChannelDepth, lithophaneMinThickness, lithophaneMaxThickness } = settings;
  
  switch (imageMode) {
    case 'stencil':
      return `
// Stencil mode - design is cut through, background is solid
module image_layer() {
    difference() {
        // Full panel
        linear_extrude(Image_Thickness)
            offset(r=-Wall_Thickness - 1)
            box_profile();
        
        // Cut out the design shape
        translate([0, 0, -1])
            linear_extrude(Image_Thickness + 2)
            design_shape();
    }
}`;
    case 'solid':
      return `
// Solid mode - design blocks light, background is cut out
module image_layer() {
    linear_extrude(Image_Thickness)
        intersection() {
            offset(r=-Wall_Thickness - 1) box_profile();
            design_shape();
        }
}`;
    case 'transparent':
      return `
// Transparent mode - thin panel with design embossed
// Print in clear/translucent filament
module image_layer() {
    union() {
        // Base thin panel
        linear_extrude(Image_Thickness * 0.4)
            offset(r=-Wall_Thickness - 1)
            box_profile();
        
        // Raised design
        linear_extrude(Image_Thickness)
            intersection() {
                offset(r=-Wall_Thickness - 1) box_profile();
                design_shape();
            }
    }
}`;
    case 'glow_dark':
      return `
// Glow-in-dark mode - print design in glow filament
// Separate the design for multi-material printing
module image_layer() {
    // Background panel (regular filament)
    difference() {
        linear_extrude(Image_Thickness * 0.6)
            offset(r=-Wall_Thickness - 1)
            box_profile();
        
        linear_extrude(Image_Thickness + 2)
            design_shape();
    }
}

module glow_inlay() {
    // This part prints in glow-in-dark filament
    linear_extrude(Image_Thickness)
        intersection() {
            offset(r=-Wall_Thickness - 1) box_profile();
            design_shape();
        }
}`;
    case 'tubular_el':
      return `
// Tubular EL wire mode - hollow channels for inserting EL wire
// Creates ambient glow effect
module image_layer() {
    difference() {
        // Outer shell of channels
        linear_extrude(${tubeChannelDepth + 1})
            design_shape();
        
        // Hollow out the channels for EL wire
        translate([0, 0, 1])
            linear_extrude(${tubeChannelDepth + 2})
            design_channel();
    }
}

module el_wire_cover() {
    // Optional cover to snap over the channels
    linear_extrude(1)
        design_shape();
}`;
    case 'lithophane':
      return `
// Lithophane mode - variable thickness creates image when backlit
// NOTE: Replace the height_map() function with your actual image data
// Use a tool like "Lithophane Maker" to convert images to OpenSCAD
Litho_Min = ${lithophaneMinThickness};
Litho_Max = ${lithophaneMaxThickness};

module height_map() {
    // Placeholder gradient - replace with actual image heightmap
    for (y = [0 : 2 : Box_Height]) {
        for (x = [0 : 2 : Box_Width]) {
            // Example: radial gradient from center
            dist = sqrt(pow(x - Box_Width/2, 2) + pow(y - Box_Height/2, 2));
            max_dist = sqrt(pow(Box_Width/2, 2) + pow(Box_Height/2, 2));
            height = Litho_Min + (Litho_Max - Litho_Min) * (dist / max_dist);
            
            translate([x, y, 0])
                cube([2.5, 2.5, height]);
        }
    }
}

module image_layer() {
    intersection() {
        linear_extrude(Litho_Max + 1)
            offset(r=-Wall_Thickness - 1)
            box_profile();
        
        height_map();
    }
}`;
    default:
      return `
// No image layer
module image_layer() {}`;
  }
}

// Main generator function
export function generateLightBoxOpenSCAD(settings: LightBoxSettings): string {
  const shapeProfile = getShapeProfileModule(settings);
  const diffuserMount = getDiffuserMountCode(settings);
  const holesCode = getHolesCode(settings);
  const diffusionPattern = getDiffusionPatternCode(settings);
  const designModule = getDesignModule(settings.designType, settings);
  const imageLayerCode = getImageLayerCode(settings);
  const shapeLayersCode = getShapeLayersCode(settings);
  const hasLayers = settings.layers && settings.layers.length > 0;
  
  return escapeOpenSCAD(`// ============================================
// SignCraft 3D - Advanced Light Box Generator v2.0
// ============================================
// Box: ${settings.boxWidth}x${settings.boxHeight}x${settings.boxDepth}mm
// Shape: ${settings.boxShape}
// Diffuser: ${settings.diffuserType}
// Image Mode: ${settings.imageMode}
// Design: ${settings.designType}
// Diffusion: ${settings.diffusionPattern}
// Generated: ${new Date().toISOString()}
// ============================================

__FN__ = 60;

// === PARAMETERS ===
Box_Width = ${settings.boxWidth};
Box_Height = ${settings.boxHeight};
Box_Depth = ${settings.boxDepth};
Wall_Thickness = ${settings.wallThickness};
Corner_Radius = ${settings.cornerRadius};

Diffuser_Thickness = ${settings.diffuserThickness};
Diffuser_Inset = ${settings.diffuserInset};
Groove_Depth = ${settings.grooveDepth};
Snap_Tolerance = ${settings.snapTolerance};

Image_Thickness = ${settings.imageThickness};

Back_Panel_Thickness = ${settings.backPanelThickness};

LED_Channel_Width = ${settings.ledChannelWidth};
LED_Channel_Depth = ${settings.ledChannelDepth};

// === BOX SHAPE PROFILE ===
${shapeProfile}

// === DESIGN SHAPE ===
${designModule}

// === DIFFUSER MOUNTING SYSTEM ===
${diffuserMount}

// === USER-PLACED HOLES ===
${holesCode}

// === DIFFUSION PATTERN ===
${diffusionPattern}

// === IMAGE LAYER ===
${imageLayerCode}

${shapeLayersCode}

// === MAIN BOX SHELL ===
// Single hollow print - the main enclosure
module box_shell() {
    difference() {
        // Outer shell
        linear_extrude(Box_Depth)
            box_profile();
        
        // Hollow interior
        translate([0, 0, Wall_Thickness])
            linear_extrude(Box_Depth)
            offset(r=-Wall_Thickness)
            box_profile();
        
        // Diffuser opening at top
        translate([0, 0, Box_Depth - Diffuser_Inset])
            linear_extrude(Diffuser_Inset + 1)
            offset(r=-Wall_Thickness + 0.5)
            box_profile();
        
        ${settings.includeLedChannel ? `
        // LED channel around perimeter (inside bottom)
        translate([0, 0, Wall_Thickness - 0.1])
            linear_extrude(LED_Channel_Depth + 0.1)
            difference() {
                offset(r=-Wall_Thickness - 0.5) box_profile();
                offset(r=-Wall_Thickness - 0.5 - LED_Channel_Width) box_profile();
            }
        ` : ''}
        
        ${settings.holes.length > 0 ? '// Apply user-placed holes\nuser_holes();' : ''}
    }
    
    ${settings.diffuserType === 'snap_fit' ? 'snap_fit_lip();' : ''}
    ${settings.diffuserType === 'friction_fit' ? 'friction_lip();' : ''}
}

// === DIFFUSER PANEL ===
module diffuser_panel() {
    panel_size_offset = ${settings.diffuserType === 'snap_fit' ? '-Wall_Thickness + Snap_Tolerance - 0.2' : 
                         settings.diffuserType === 'friction_fit' ? '-Wall_Thickness - 0.15' :
                         settings.diffuserType === 'slide_groove' ? '-Wall_Thickness + Groove_Depth - 0.3' :
                         '-Wall_Thickness + 0.3'};
    
    ${settings.diffusionPattern !== 'none' ? `
    difference() {
        linear_extrude(Diffuser_Thickness)
            offset(r=panel_size_offset)
            box_profile();
        
        // Apply diffusion pattern (etched into bottom)
        translate([0, 0, -0.1])
            diffusion_pattern();
    }
    ` : `
    linear_extrude(Diffuser_Thickness)
        offset(r=panel_size_offset)
        box_profile();
    `}
}

// === BACK PANEL ===
module back_panel() {
    difference() {
        linear_extrude(Back_Panel_Thickness)
            offset(r=-0.3)
            box_profile();
        
        ${settings.backPanelVentHoles ? `
        // Ventilation holes
        vent_spacing = 15;
        vent_diameter = 5;
        for (y = [vent_spacing : vent_spacing : Box_Height - vent_spacing]) {
            for (x = [vent_spacing : vent_spacing : Box_Width - vent_spacing]) {
                translate([x, y, -1])
                    cylinder(h=Back_Panel_Thickness + 2, d=vent_diameter, __FN__=24);
            }
        }
        ` : ''}
    }
}

// === ASSEMBLY PREVIEW ===
module assembly() {
    // Box shell
    color("DimGray") box_shell();
    
    ${settings.includeBackPanel ? `
    // Back panel
    translate([0, 0, -Back_Panel_Thickness - 0.5])
        color("Gray") back_panel();
    ` : ''}
    
    ${settings.diffuserType !== 'none' ? `
    // Diffuser
    translate([0, 0, Box_Depth - Diffuser_Inset + 0.5])
        color("White", 0.7) diffuser_panel();
    ` : ''}
    
    ${settings.imageMode !== 'none' ? `
    // Image layer
    translate([0, 0, Box_Depth + ${settings.imagePlacement === 'above_diffuser' ? 'Diffuser_Thickness + 1' : '-Diffuser_Inset - Image_Thickness'}])
        color("Black") image_layer();
    ` : ''}
    
    ${hasLayers ? `
    // Shape layers (silhouettes) - each layer at its own offsetZ
    shape_layers();
    ` : ''}
}

// === RENDER ===
// Uncomment the part you want to export:

// Full assembly preview
assembly();

// Individual parts for export:
// box_shell();
// diffuser_panel();
// back_panel();
// image_layer();
${settings.imageMode === 'glow_dark' ? '// glow_inlay();  // Print in glow-in-dark filament' : ''}
${settings.imageMode === 'tubular_el' ? '// el_wire_cover();  // Optional cover for EL wire channels' : ''}
`);
}

// Export individual parts or all as ZIP
export function generateLightBoxParts(settings: LightBoxSettings): Map<string, string> {
  const parts = new Map<string, string>();
  const baseName = `lightbox_${settings.boxWidth}x${settings.boxHeight}`;
  
  // Generate full file for reference
  const fullFile = generateLightBoxOpenSCAD(settings);
  parts.set(`${baseName}_full.scad`, fullFile);
  
  // For individual part exports, we'd generate separate files
  // that only render that specific part
  if (settings.exportParts.includes('box') || settings.exportParts.includes('all')) {
    const boxFile = fullFile.replace('assembly();', 'box_shell();');
    parts.set(`${baseName}_box.scad`, boxFile);
  }
  
  if ((settings.exportParts.includes('diffuser') || settings.exportParts.includes('all')) && 
      settings.diffuserType !== 'none') {
    const diffuserFile = fullFile.replace('assembly();', 'diffuser_panel();');
    parts.set(`${baseName}_diffuser.scad`, diffuserFile);
  }
  
  if ((settings.exportParts.includes('back_panel') || settings.exportParts.includes('all')) && 
      settings.includeBackPanel) {
    const backFile = fullFile.replace('assembly();', 'back_panel();');
    parts.set(`${baseName}_back.scad`, backFile);
  }
  
  if ((settings.exportParts.includes('image_layer') || settings.exportParts.includes('all')) && 
      settings.imageMode !== 'none') {
    const imageFile = fullFile.replace('assembly();', 'image_layer();');
    parts.set(`${baseName}_image.scad`, imageFile);
  }
  
  // Export shape layers if present
  if (settings.exportParts.includes('all') && settings.layers && settings.layers.length > 0) {
    const shapesFile = fullFile.replace('assembly();', 'shape_layers();');
    parts.set(`${baseName}_shapes.scad`, shapesFile);
    
    // Also export each layer individually
    settings.layers.forEach((layer, idx) => {
      if (layer.visible) {
        const layerFile = fullFile.replace('assembly();', `layer_${idx}();`);
        parts.set(`${baseName}_layer_${idx + 1}.scad`, layerFile);
      }
    });
  }
  
  return parts;
}
