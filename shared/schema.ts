import { z } from "zod";

export const fontOptions = [
  { id: "aerioz", name: "Aerioz", family: "Aerioz", category: "neon" },
  { id: "neoncity", name: "Neoncity Script", family: "Neoncity Script", category: "neon" },
  { id: "electronica", name: "Electronica", family: "Electronica", category: "neon" },
  { id: "airstream", name: "Airstream", family: "Airstream", category: "retro" },
  { id: "airstream-nf", name: "Airstream NF", family: "Airstream NF", category: "retro" },
  { id: "alliston", name: "Alliston Script", family: "Alliston", category: "script" },
  { id: "halimun", name: "Halimun Script", family: "Halimun", category: "script" },
  { id: "darlington", name: "Darlington", family: "Darlington", category: "display" },
  { id: "cookiemonster", name: "Cookie Monster", family: "Cookie Monster", category: "fun" },
  { id: "inter", name: "Inter", family: "Inter", category: "sans" },
  { id: "roboto", name: "Roboto", family: "Roboto", category: "sans" },
  { id: "poppins", name: "Poppins", family: "Poppins", category: "sans" },
  { id: "montserrat", name: "Montserrat", family: "Montserrat", category: "sans" },
  { id: "open-sans", name: "Open Sans", family: "Open Sans", category: "sans" },
  { id: "space-grotesk", name: "Space Grotesk", family: "Space Grotesk", category: "sans" },
  { id: "outfit", name: "Outfit", family: "Outfit", category: "sans" },
  { id: "playfair", name: "Playfair Display", family: "Playfair Display", category: "serif" },
  { id: "merriweather", name: "Merriweather", family: "Merriweather", category: "serif" },
  { id: "lora", name: "Lora", family: "Lora", category: "serif" },
  { id: "architects-daughter", name: "Architects Daughter", family: "Architects Daughter", category: "handwritten" },
  { id: "oxanium", name: "Oxanium", family: "Oxanium", category: "tech" },
] as const;

export type FontOption = typeof fontOptions[number];

export const wiringChannelTypes = ["none", "center", "back", "ws2812b", "filament", "custom"] as const;
export type WiringChannelType = typeof wiringChannelTypes[number];

export const mountingHolePatterns = ["none", "2-point", "4-corner", "6-point", "custom"] as const;
export type MountingHolePattern = typeof mountingHolePatterns[number];

export const baseTemplates = [
  { id: "none", name: "Custom Text Only", description: "Generate letters from your text" },
  { id: "hex-base", name: "Hex Light Base", description: "Hexagonal LED panel base" },
  { id: "triangle-base", name: "Triangle Base", description: "Triangular LED panel base" },
  { id: "wall-hanging", name: "Wall Hanging", description: "Wall-mountable sign with lid" },
  { id: "control-box", name: "Control Box", description: "Electronics housing for LED controller" },
] as const;

export type BaseTemplate = typeof baseTemplates[number];

export const exportFormats = ["stl", "obj", "3mf"] as const;
export type ExportFormat = typeof exportFormats[number];

export const geometryModes = ["raised", "stencil", "layered", "flat", "outline"] as const;
export type GeometryMode = typeof geometryModes[number];

export const materialTypes = ["opaque", "transparent", "diffuser"] as const;
export type MaterialType = typeof materialTypes[number];

export const geometrySettingsSchema = z.object({
  mode: z.enum(geometryModes),
  letterHeight: z.number().min(2).max(50),
  backingThickness: z.number().min(2).max(30),
  letterOffset: z.number().min(0).max(20),
  letterMaterial: z.enum(materialTypes),
  backingMaterial: z.enum(materialTypes),
  separateFiles: z.boolean(),
  enableBacking: z.boolean().optional(),
  mirrorX: z.boolean().optional(),  // Mirror on X axis
  generateDiffuserCap: z.boolean().optional(),  // Generate matching cap piece
  weldLetters: z.boolean().optional(),  // Connect all letters with bridges
  addFeedHoles: z.boolean().optional(),  // Add entry/exit holes for LED wiring
  feedHoleDiameter: z.number().min(3).max(12).optional(),  // Diameter of feed holes
});

export type GeometrySettings = z.infer<typeof geometrySettingsSchema>;

export const neonTubeSizes = ["8mm", "10mm", "12mm", "15mm", "custom"] as const;
export type NeonTubeSize = typeof neonTubeSizes[number];

export const lightTypes = ["led_strip", "filament"] as const;
export type LightType = typeof lightTypes[number];

export const tubeSettingsSchema = z.object({
  neonTubeSize: z.enum(neonTubeSizes).optional(),
  neonTubeDiameter: z.number().min(6).max(20),
  channelDepth: z.number().min(10).max(40),
  filamentDiameter: z.number().min(8).max(20),
  wallThickness: z.number().min(1).max(5),
  wallHeight: z.number().min(5).max(30),
  tubeWidth: z.number().min(15).max(50),
  enableOverlay: z.boolean(),
  overlayThickness: z.number().min(1).max(5),
  continuousPath: z.boolean(),
  channelType: z.enum(lightTypes).optional(),
});

export type TubeSettings = z.infer<typeof tubeSettingsSchema>;

export const sketchPathSchema = z.object({
  id: z.string(),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
  closed: z.boolean(),
});

export type SketchPath = z.infer<typeof sketchPathSchema>;

export const inputModes = ["text", "draw", "image", "pettag", "modular", "custom", "retro", "ledholder", "eggison", "ledgrid", "customfont", "lightbox", "filamentshape", "animation", "holographic", "lithophane", "phrase", "ledmagnetic", "hexpanel", "ledchannel", "symbolsign", "combosign", "imagesign", "myexports", "scottlab", "ledkeychain", "topography", "citylightbox", "geoboxlab", "artwall", "layeredbox", "universe", "oracle", "quantum"] as const;
export type InputMode = typeof inputModes[number];

// LED Holder settings for elevated lighting
export const ledHolderLedTypes = ["3mm", "5mm", "ws2812b", "ws2812b_strip", "10mm_uv"] as const;
export type LEDHolderLedType = typeof ledHolderLedTypes[number];

export const ledHolderStyles = ["clip", "socket", "cradle", "canvas_glow_clip"] as const;
export type LEDHolderStyle = typeof ledHolderStyles[number];

export const ledHolderMountTypes = ["magnetic", "screw", "adhesive", "clip_on"] as const;
export type LEDHolderMountType = typeof ledHolderMountTypes[number];

export const ledHolderSettingsSchema = z.object({
  ledType: z.enum(ledHolderLedTypes),
  holderStyle: z.enum(ledHolderStyles),
  mountType: z.enum(ledHolderMountTypes),
  wireChannelDiameter: z.number().min(1).max(10),
  magnetDiameter: z.number().min(3).max(15),
  magnetDepth: z.number().min(1).max(5),
  screwHoleDiameter: z.number().min(2).max(6),
  wallThickness: z.number().min(1).max(5),
  tiltAngle: z.number().min(0).max(90),
  quantity: z.number().min(1).max(20),
  adjustableHeight: z.boolean().optional(),
  minHeight: z.number().min(10).max(50).optional(),
  maxHeight: z.number().min(20).max(100).optional(),
  // Optical features for light control
  reflectorDepth: z.number().min(5).max(25).optional(),
  beamAngle: z.number().min(15).max(120).optional(),
  hasDiffuser: z.boolean().optional(),
  // Canvas Glow-Clip specific settings (duckbill wide diffuser)
  diffuserWidth: z.number().min(15).max(50).optional(),
  diffuserHeight: z.number().min(5).max(20).optional(),
  diffuserLength: z.number().min(10).max(30).optional(),
  lightingMode: z.enum(["spot", "wash"]).optional(),
});

export type LEDHolderSettings = z.infer<typeof ledHolderSettingsSchema>;

export const defaultLEDHolderSettings: LEDHolderSettings = {
  ledType: "5mm",
  holderStyle: "socket",
  mountType: "magnetic",
  wireChannelDiameter: 3,
  magnetDiameter: 6,
  magnetDepth: 2,
  screwHoleDiameter: 3,
  wallThickness: 2,
  tiltAngle: 30,
  quantity: 1,
  reflectorDepth: 12,
  beamAngle: 45,
  hasDiffuser: true,
};

// Eggison Bulbs - Egg-shaped Edison bulb shells with screw bases and accessories
export const eggisonBaseTypes = ["E26", "E27", "E14"] as const;
export type EggisonBaseType = typeof eggisonBaseTypes[number];

export const eggisonShellStyles = ["classic", "tall", "wide", "mini", "cracked", "split", "jar", "tube", "bulb", "teardrop", "globe"] as const;
export type EggisonShellStyle = typeof eggisonShellStyles[number];

export const eggisonLightTypes = ["filament", "ws2812b", "led_strip", "fairy_lights"] as const;
export type EggisonLightType = typeof eggisonLightTypes[number];

export const eggisonDiffusionPatterns = ["none", "checkered", "cubes", "modular_lines", "hexagons", "houndstooth", "diamonds", "waves"] as const;
export type EggisonDiffusionPattern = typeof eggisonDiffusionPatterns[number];

export const eggisonThreadTypes = ["iso", "lobular"] as const;
export type EggisonThreadType = typeof eggisonThreadTypes[number];

export const eggisonShellModes = ["solid", "vase"] as const;
export type EggisonShellMode = typeof eggisonShellModes[number];

export const eggisonSettingsSchema = z.object({
  shellHeight: z.number().min(40).max(150),
  shellWidth: z.number().min(30).max(120),
  wallThickness: z.number().min(1).max(4),
  shellStyle: z.enum(eggisonShellStyles),
  baseType: z.enum(eggisonBaseTypes),
  baseHeight: z.number().min(15).max(40),
  lightType: z.enum(eggisonLightTypes),
  filamentChannelDiameter: z.number().min(2).max(8),
  includeGlasses: z.boolean(),
  includeFeet: z.boolean(),
  includeBatteryHolder: z.boolean(),
  includeFilamentChannel: z.boolean(),
  // New twist-off battery cap options
  includeTwistOffCap: z.boolean().optional(),
  batteryType: z.enum(["AAA", "AA", "CR2032", "CR2025"]).optional(),
  // Diffusion pattern on shell surface
  diffusionPattern: z.enum(eggisonDiffusionPatterns).optional(),
  diffusionPatternScale: z.number().min(0.5).max(3).optional(),
  diffusionPatternDepth: z.number().min(0.1).max(0.8).optional(),
  // Lithophane mode for image-reveal bulbs (internal)
  lithophaneEnabled: z.boolean().optional(),
  lithophaneImageData: z.string().optional(),
  lithophaneMinThickness: z.number().min(0.4).max(1.5).optional(),
  lithophaneMaxThickness: z.number().min(2).max(4).optional(),
  // Vase/Spiral mode for continuous single-wall printing
  shellMode: z.enum(eggisonShellModes).optional(),
  threadType: z.enum(eggisonThreadTypes).optional(),
  spiralTwist: z.number().min(0).max(720).optional(),
  spiralRibCount: z.number().min(0).max(12).optional(),
  phiRibsEnabled: z.boolean().optional(),
});

export type EggisonSettings = z.infer<typeof eggisonSettingsSchema>;

export const defaultEggisonSettings: EggisonSettings = {
  shellHeight: 100,
  shellWidth: 70,
  wallThickness: 2,
  shellStyle: "classic",
  baseType: "E26",
  baseHeight: 25,
  lightType: "filament",
  filamentChannelDiameter: 4,
  includeGlasses: false,
  includeFeet: false,
  includeBatteryHolder: false,
  includeFilamentChannel: true,
  includeTwistOffCap: true,
  batteryType: "AAA",
  diffusionPattern: "none",
  diffusionPatternScale: 1,
  diffusionPatternDepth: 0.3,
  lithophaneEnabled: false,
  lithophaneMinThickness: 0.6,
  lithophaneMaxThickness: 3,
  shellMode: "solid",
  threadType: "iso",
  spiralTwist: 180,
  spiralRibCount: 6,
  phiRibsEnabled: false,
};

// Filament Shape Former - bends flexible LED filaments into custom shapes
export const filamentShapeTypes = [
  "heart", "star", "circle", "infinity", "moon", "wave", "spiral", 
  "lightning", "arrow", "right_arrow", "triangle", "square", "diamond",
  // Preset shapes inspired by desktop neon signs
  "pineapple", "cactus", "planet", "saturn", "soda_can",
  // Icon shapes from retro/pop culture
  "alien", "brain", "retro_phone", "clock", "leaf", "music_note", 
  "t_rex", "retro_computer",
  // Stick figure poses for animations
  "stick_figure", "stick_walking", "stick_jumping", "stick_waving", "stick_running",
  // Animation shapes
  "ball", "balloon", "cube_outline", "pacman", "pacman_open", "ant",
  // New bulb-compatible shapes (for Eggison)
  "wine_glass", "pac_man_ghost", "letter_A", "letter_B", "letter_C", 
  "letter_D", "letter_E", "letter_F", "letter_G", "letter_H",
  "flamingo", "palm_tree", "butterfly", "cat", "dog",
  "custom"
] as const;
export type FilamentShapeType = typeof filamentShapeTypes[number];

export const filamentClipStyles = ["u_channel", "pinch_clip", "wrap_around", "groove"] as const;
export type FilamentClipStyle = typeof filamentClipStyles[number];

// Screw thread types for filament bulb bases (matches Eggison shells)
export const screwThreadTypes = [
  "none",        // No screw threads (flat base)
  "E26",         // Standard US Edison screw (26mm major diameter)
  "E27",         // European Edison screw (27mm major diameter)  
  "E14",         // Small Edison screw (14mm)
  "E12",         // Candelabra (12mm)
] as const;
export type ScrewThreadType = typeof screwThreadTypes[number];

// Mason jar thread types for internal jar threads (jar screws INTO the base)
export const jarThreadTypes = [
  "none",           // No jar threads
  "regular",        // Regular mouth mason jar (70mm / 2.75")
  "wide",           // Wide mouth mason jar (86mm / 3.38")
  "small",          // Small jar (50mm)
  "custom",         // Custom diameter
] as const;
export type JarThreadType = typeof jarThreadTypes[number];

export const filamentShapeSettingsSchema = z.object({
  // Shape configuration
  shapeType: z.enum(filamentShapeTypes),
  shapeWidth: z.number().min(20).max(200),   // Width of the shape in mm
  shapeHeight: z.number().min(20).max(200),  // Height of the shape in mm
  filamentLength: z.number().min(50).max(300), // Length of filament to form (default 130mm)
  
  // Custom traced path data (for "custom" shape type)
  // Array of path segments, each segment is an array of normalized {x, y} points (0-1 range)
  customPathData: z.array(z.array(z.object({ x: z.number(), y: z.number() }))).optional(),
  
  // Filament specs
  filamentDiameter: z.number().min(1).max(4), // Diameter of flexible LED filament
  filamentVoltage: z.number().min(1.5).max(12), // Voltage (typically 3V)
  
  // Clip/holder configuration
  clipStyle: z.enum(filamentClipStyles),
  clipWidth: z.number().min(3).max(10),      // Width of each clip
  clipHeight: z.number().min(4).max(15),     // Height of clip
  clipSpacing: z.number().min(10).max(40),   // Spacing between clips along path
  wallThickness: z.number().min(1).max(3),   // Wall thickness of clips
  
  // Diffuser front panel (optional)
  includeDiffuser: z.boolean(),
  diffuserThickness: z.number().min(0.8).max(3),
  diffuserOffset: z.number().min(2).max(10), // Gap between filament and diffuser
  embossedShape: z.boolean(), // Emboss the shape outline on diffuser
  
  // Battery holder mount
  includeBatteryMount: z.boolean(),
  batteryType: z.enum(["cr2032", "cr2025", "cr2016", "aaa_single", "aaa_double"]),
  batterySwitchCutout: z.boolean(),
  
  // Base plate options
  includeBasePlate: z.boolean(),
  basePlateThickness: z.number().min(1).max(4),
  mountingHoles: z.boolean(),
  mountingHoleDiameter: z.number().min(2).max(5),
  
  // For Eggison integration
  forEggison: z.boolean(), // Size to fit inside Eggison shell
  eggisonShellWidth: z.number().min(30).max(120).optional(),
  eggisonShellHeight: z.number().min(40).max(150).optional(),
  
  // Screw-thread base options (for self-contained bulb design)
  includeScrewBase: z.boolean().optional(),
  screwThreadType: z.enum(screwThreadTypes).optional(),
  screwBaseHeight: z.number().min(15).max(50).optional(), // Height of threaded base
  screwBaseDiameter: z.number().min(20).max(80).optional(), // Outer diameter
  wireChannelDiameter: z.number().min(2).max(6).optional(), // Wire pass-through hole
  includeWireChannel: z.boolean().optional(),
  filamentPostHeight: z.number().min(10).max(60).optional(), // Height of mounting posts
  filamentPostCount: z.number().min(2).max(8).optional(), // Number of support posts
  
  // Mason jar base options (internal threads - jar screws INTO the base)
  includeJarBase: z.boolean().optional(),
  jarThreadType: z.enum(jarThreadTypes).optional(),
  jarDiameter: z.number().min(40).max(120).optional(), // Internal jar thread diameter
  jarBaseHeight: z.number().min(20).max(60).optional(), // Height of jar base section
  jarBaseWallThickness: z.number().min(3).max(8).optional(), // Wall thickness around jar threads
  
  // Removable bottom plug/cap
  includeBottomPlug: z.boolean().optional(),
  bottomPlugStyle: z.enum(["friction", "screw", "bayonet"]).optional(),
  bottomPlugThickness: z.number().min(3).max(10).optional(),
  
  // Dimmer housing options (for desktop neon signs)
  includeDimmerHousing: z.boolean().optional(),
  dimmerType: z.enum(["toggle_switch", "dial_potentiometer", "both"]).optional(),
  powerInput: z.enum(["usb", "barrel_jack", "battery"]).optional(),
});

export type FilamentShapeSettings = z.infer<typeof filamentShapeSettingsSchema>;

export const defaultFilamentShapeSettings: FilamentShapeSettings = {
  shapeType: "heart",
  shapeWidth: 50,
  shapeHeight: 50,
  filamentLength: 130,
  filamentDiameter: 2,
  filamentVoltage: 3,
  clipStyle: "u_channel",
  clipWidth: 5,
  clipHeight: 6,
  clipSpacing: 15,
  wallThickness: 1.5,
  includeDiffuser: false,
  diffuserThickness: 1.5,
  diffuserOffset: 3,
  embossedShape: true,
  includeBatteryMount: true,
  batteryType: "cr2032",
  batterySwitchCutout: true,
  includeBasePlate: true,
  basePlateThickness: 2,
  mountingHoles: false,
  mountingHoleDiameter: 3,
  forEggison: false,
  includeScrewBase: false,
  screwThreadType: "E26",
  screwBaseHeight: 25,
  screwBaseDiameter: 40,
  wireChannelDiameter: 3,
  includeWireChannel: true,
  filamentPostHeight: 30,
  filamentPostCount: 3,
  // Mason jar base defaults
  includeJarBase: false,
  jarThreadType: "regular",
  jarDiameter: 70,         // Regular mouth mason jar
  jarBaseHeight: 35,
  jarBaseWallThickness: 5,
  // Bottom plug defaults
  includeBottomPlug: true,
  bottomPlugStyle: "friction",
  bottomPlugThickness: 5,
  // Dimmer housing
  includeDimmerHousing: false,
  dimmerType: "both",
  powerInput: "usb",
};

// Animation Sequence System - creates multi-frame animations with LED filaments
export const animationControllerTypes = [
  "555_timer",      // Simple 555 timer IC for basic on/off sequencing
  "arduino_uno",    // Arduino Uno/Nano with PWM control
  "arduino_nano",   // Arduino Nano (smaller form factor)
  "esp32",          // ESP32 with WiFi and more GPIO
  "pico",           // Raspberry Pi Pico
  "attiny85",       // ATtiny85 for minimal footprint
] as const;
export type AnimationControllerType = typeof animationControllerTypes[number];

export const ledControlTypes = [
  "common_anode",   // Common anode RGB (shared +)
  "common_cathode", // Common cathode RGB (shared -)
  "ws2812b",        // Addressable RGB LEDs
  "simple_led",     // Simple single-color LEDs
] as const;
export type LedControlType = typeof ledControlTypes[number];

// Animation frame - represents a single frame in the sequence
export const animationFrameSchema = z.object({
  frameIndex: z.number().min(0).max(7),
  shapeType: z.enum(filamentShapeTypes),
  customPathData: z.array(z.array(z.object({ x: z.number(), y: z.number() }))).optional(),
  ledColor: z.string().optional(), // Hex color for addressable LEDs
});
export type AnimationFrame = z.infer<typeof animationFrameSchema>;

export const animationSequenceSettingsSchema = z.object({
  // Sequence configuration
  sequenceName: z.string().min(1).max(50),
  frameCount: z.number().min(2).max(8), // 2-8 frames per sequence
  frames: z.array(animationFrameSchema),
  
  // Timing
  frameDelayMs: z.number().min(50).max(5000), // Delay between frames in milliseconds
  loopAnimation: z.boolean(), // Whether to loop the animation
  
  // Frame dimensions (shared across all frames)
  frameWidth: z.number().min(20).max(200),
  frameHeight: z.number().min(20).max(200),
  filamentDiameter: z.number().min(1).max(4),
  
  // Holder configuration
  clipStyle: z.enum(filamentClipStyles),
  clipSpacing: z.number().min(10).max(40),
  wallThickness: z.number().min(1).max(3),
  includeBasePlate: z.boolean(),
  basePlateThickness: z.number().min(1.5).max(5),
  
  // Controller configuration
  controllerType: z.enum(animationControllerTypes),
  ledType: z.enum(ledControlTypes),
  
  // LED colors for RGB modes
  useRgbColors: z.boolean(),
  frameColors: z.array(z.string()).optional(), // Array of hex colors for each frame
  
  // Housing options
  includeControllerHousing: z.boolean(),
  includeWireChannels: z.boolean(),
  
  // Export options
  exportSeparateFrames: z.boolean(), // Export each frame as separate STL
  includeCircuitDiagram: z.boolean(), // Include wiring diagram in export
});
export type AnimationSequenceSettings = z.infer<typeof animationSequenceSettingsSchema>;

export const defaultAnimationSequenceSettings: AnimationSequenceSettings = {
  sequenceName: "Walking Stick Figure",
  frameCount: 4,
  frames: [
    { frameIndex: 0, shapeType: "stick_figure" },
    { frameIndex: 1, shapeType: "stick_figure" },
    { frameIndex: 2, shapeType: "stick_figure" },
    { frameIndex: 3, shapeType: "stick_figure" },
  ],
  frameDelayMs: 500,
  loopAnimation: true,
  frameWidth: 60,
  frameHeight: 80,
  filamentDiameter: 2,
  clipStyle: "u_channel",
  clipSpacing: 15,
  wallThickness: 1.5,
  includeBasePlate: true,
  basePlateThickness: 2,
  controllerType: "arduino_nano",
  ledType: "simple_led",
  useRgbColors: false,
  frameColors: [],
  includeControllerHousing: true,
  includeWireChannels: true,
  exportSeparateFrames: true,
  includeCircuitDiagram: true,
};

// Multi-Layer Holographic Panel - creates depth illusion with stacked layers
export const holoPatternTypes = [
  "floral",       // Intricate floral/vine pattern
  "geometric",    // Geometric shapes (hexagons, triangles)
  "mandala",      // Circular mandala pattern
  "wave",         // Flowing wave lines
  "circuit",      // Circuit board / tech pattern
  "nature",       // Leaves and natural elements
  "abstract",     // Abstract flowing shapes
  "custom",       // Custom uploaded pattern
] as const;
export type HoloPatternType = typeof holoPatternTypes[number];

export const holoLayerSchema = z.object({
  layerIndex: z.number().min(0).max(5),
  patternType: z.enum(holoPatternTypes),
  patternDensity: z.number().min(10).max(100), // How dense/filled the pattern is (%)
  patternScale: z.number().min(0.5).max(3), // Scale of pattern elements
  rotation: z.number().min(0).max(360), // Rotation of this layer
  opacity: z.number().min(20).max(100).optional(), // Layer transparency (%)
  tintColor: z.string().optional(), // Optional color tint for layer
});
export type HoloLayer = z.infer<typeof holoLayerSchema>;

export const holographicPanelSettingsSchema = z.object({
  // Panel dimensions
  panelWidth: z.number().min(50).max(500),
  panelHeight: z.number().min(50).max(500),
  frameThickness: z.number().min(2).max(10),
  layerThickness: z.number().min(0.8).max(3),
  
  // Layer configuration
  layerCount: z.number().min(2).max(5),
  layers: z.array(holoLayerSchema),
  layerSpacing: z.number().min(3).max(20), // Gap between layers for depth
  
  // Frame options
  includeFrame: z.boolean(),
  frameStyle: z.enum(["simple", "beveled", "rounded"]),
  
  // LED backlight configuration
  includeLedChannel: z.boolean(),
  ledStripWidth: z.number().min(8).max(20),
  ledType: z.enum(["simple", "ws2812", "cob", "filament"]),
  ledColor: z.string().optional(), // Backlight color (hex)
  
  // Mounting
  includeMountingBrackets: z.boolean(),
  wallStandoff: z.number().min(5).max(30), // Distance from wall for glow effect
  
  // Export options
  exportLayersSeparate: z.boolean(),
  includeSpacerRings: z.boolean(), // Rings to maintain layer spacing
});
export type HolographicPanelSettings = z.infer<typeof holographicPanelSettingsSchema>;

export const defaultHolographicPanelSettings: HolographicPanelSettings = {
  panelWidth: 200,
  panelHeight: 300,
  frameThickness: 5,
  layerThickness: 1.5,
  layerCount: 3,
  layers: [
    { layerIndex: 0, patternType: "floral", patternDensity: 40, patternScale: 1, rotation: 0, opacity: 100, tintColor: "#ffffff" },
    { layerIndex: 1, patternType: "floral", patternDensity: 30, patternScale: 1.2, rotation: 15, opacity: 80, tintColor: "#ffffff" },
    { layerIndex: 2, patternType: "floral", patternDensity: 20, patternScale: 1.4, rotation: 30, opacity: 60, tintColor: "#ffffff" },
  ],
  layerSpacing: 8,
  includeFrame: true,
  frameStyle: "simple",
  includeLedChannel: true,
  ledStripWidth: 12,
  ledType: "ws2812",
  ledColor: "#4488ff",
  includeMountingBrackets: true,
  wallStandoff: 15,
  exportLayersSeparate: true,
  includeSpacerRings: true,
};

// Hexagonal/Molecular Modular LED Panel - interconnecting honeycomb patterns
export const hexPanelConnectionTypes = ["single", "chain", "branch", "corner"] as const;
export type HexPanelConnectionType = typeof hexPanelConnectionTypes[number];

export const hexPanelLedTypes = ["ws2812b", "cob", "filament", "neon_tube"] as const;
export type HexPanelLedType = typeof hexPanelLedTypes[number];

export const hexPanelSettingsSchema = z.object({
  // Core hex dimensions
  hexRadius: z.number().min(30).max(150), // Outer radius of each hex module
  hexThickness: z.number().min(8).max(25), // Depth of hex tube
  wallThickness: z.number().min(2).max(5),
  
  // Connector configuration
  connectionType: z.enum(hexPanelConnectionTypes),
  connectorLength: z.number().min(10).max(50), // Length of connector tubes
  connectorDiameter: z.number().min(8).max(20),
  
  // LED channel
  ledType: z.enum(hexPanelLedTypes),
  ledChannelDiameter: z.number().min(6).max(15),
  diffuserEnabled: z.boolean(),
  diffuserThickness: z.number().min(0.8).max(2),
  
  // Modular layout (which connection points are active)
  activeConnections: z.array(z.number().min(0).max(5)), // 0-5 for 6 hex edges
  
  // Mounting
  includeMountingClips: z.boolean(),
  includeWireChannels: z.boolean(),
  
  // Export options
  exportModuleSet: z.boolean(), // Export full set of straight + angle + corner
});
export type HexPanelSettings = z.infer<typeof hexPanelSettingsSchema>;

export const defaultHexPanelSettings: HexPanelSettings = {
  hexRadius: 60,
  hexThickness: 15,
  wallThickness: 3,
  connectionType: "chain",
  connectorLength: 25,
  connectorDiameter: 12,
  ledType: "ws2812b",
  ledChannelDiameter: 10,
  diffuserEnabled: true,
  diffuserThickness: 1.2,
  activeConnections: [0, 3], // Opposite sides for chain
  includeMountingClips: true,
  includeWireChannels: true,
  exportModuleSet: true,
};

// LED strip types - defined early as used by multiple schemas
export const ledStripTypes = ["simple", "ws2812", "cob", "filament"] as const;
export type LedStripType = typeof ledStripTypes[number];

// Retro Neon Sign types - primitive shapes, Edison bulbs, stands
export const retroShapeTypes = [
  "heart", "star", "arrow", "moon", "crown", "pacman", "rocket", "lips",
  "rainbow", "leaf", "dinosaur", "peace", "lightning", "planet", "mushroom",
  "cactus", "flamingo", "pineapple", "cat", "skull", "music-note", "custom"
] as const;
export type RetroShapeType = typeof retroShapeTypes[number];

// Shell shapes for Edison bulbs - hollow outer shell
// Includes classic bulb shapes AND all primitive shapes
export const classicBulbShapes = ["tube", "globe", "flame", "vintage", "pear"] as const;
export type ClassicBulbShape = typeof classicBulbShapes[number];

// All available shell shapes - classic bulb shapes + primitives
export const shellShapeTypes = [
  // Classic bulb shapes (lathe-generated)
  "tube", "globe", "flame", "vintage", "pear",
  // Primitive shapes (extruded and hollowed)
  "heart", "star", "arrow", "moon", "crown", "lightning", "leaf", 
  "mushroom", "cactus", "cat", "diamond", "circle", "infinity", 
  "flame-shape", "music", "peace",
  // Retro Tech
  "glasses", "floppy", "cd", "computer", "brickphone", "sodacan",
  // Space & Planets
  "saturn", "jupiter", "orbit",
  // Nature & Food
  "spaghetti", "brain", "dinosaur",
  // Dice
  "dice1", "dice2", "dice3", "dice4", "dice5", "dice6",
  // Clocks
  "clock3", "clock6", "clock9", "clock12",
  // Stick Figures
  "stickStand", "stickWave", "stickJump", "stickDance", "stickSit", "stickRun",
  // Emoji Faces
  "emojiHappy", "emojiSad", "emojiWink", "emojiLove", "emojiCool", "emojiShock",
  // 8-bit Pixel Art
  "bit8Heart", "bit8Star", "bit8Person", "bit8Invader"
] as const;
export type ShellShapeType = typeof shellShapeTypes[number];

// Keep old name for backward compatibility
export const glassShellTypes = shellShapeTypes;
export type GlassShellType = ShellShapeType;

// Material types for glass printing
export const glassMaterialTypes = ["clear", "frosted", "white_diffused"] as const;
export type GlassMaterialType = typeof glassMaterialTypes[number];

// Screw base standards (E26 is US standard, E27 is European - nearly identical)
export const screwBaseTypes = ["e26", "e27", "e14", "none"] as const;
export type ScrewBaseType = typeof screwBaseTypes[number];

// Stand types for separate electronics housing
export const standTypes = ["round", "square", "hexagon"] as const;
export type StandType = typeof standTypes[number];

// Primitive shape types for filaments and neon signs
export const primitiveShapes = [
  // Classic
  "heart", "star", "arrow", "moon", "crown", "lightning", "leaf", 
  "mushroom", "cactus", "cat", "diamond", "circle", "infinity", 
  "flame", "music", "peace",
  // Retro Tech
  "glasses", "floppy", "cd", "computer", "brickphone", "sodacan",
  // Space & Planets
  "saturn", "jupiter", "orbit",
  // Nature & Food
  "spaghetti", "brain", "dinosaur",
  // Dice
  "dice1", "dice2", "dice3", "dice4", "dice5", "dice6",
  // Clocks
  "clock3", "clock6", "clock9", "clock12",
  // Stick Figures
  "stickStand", "stickWave", "stickJump", "stickDance", "stickSit", "stickRun",
  // Emoji Faces
  "emojiHappy", "emojiSad", "emojiWink", "emojiLove", "emojiCool", "emojiShock",
  // 8-bit Pixel Art
  "bit8Heart", "bit8Star", "bit8Person", "bit8Invader"
] as const;
export type PrimitiveShape = typeof primitiveShapes[number];

// Edison Bulb Settings - modular design
// User picks a shell shape (any primitive or classic bulb shape)
// Shell is hollow - user inserts their own LED filament
// Screw base attaches to the bottom
export const edisonBulbSettingsSchema = z.object({
  // Shell shape - can be ANY shape (classic bulb or primitive)
  shellShape: z.string(), // Using string to accept all shell shapes
  shellScale: z.number().min(0.5).max(3),       // Overall scale
  shellHeight: z.number().min(30).max(150),     // Height of shell
  shellWallThickness: z.number().min(1).max(4), // Wall thickness for hollow interior
  shellMaterial: z.enum(glassMaterialTypes),    // Material hint for printing
  
  // Opening at bottom for LED insertion
  openingDiameter: z.number().min(15).max(50),  // Diameter of bottom opening
  
  // Screw thread base (for standard light sockets)
  screwBase: z.enum(screwBaseTypes),
  baseHeight: z.number().min(10).max(35),       // Height of the threaded base
  
  // Wire passthrough for LED power
  wireCenterHole: z.boolean(),
  wireHoleDiameter: z.number().min(3).max(10),
  
  // Advanced thread and clip options (Luminary Engine V5)
  threadType: z.enum(["iso", "lobular"]).optional(),
  clipSystemEnabled: z.boolean().optional(),
  clipCount: z.number().min(0).max(8).optional(),
  clipDiameter: z.number().min(4).max(10).optional(),
  phiRibsEnabled: z.boolean().optional(),
  spiralTwist: z.number().min(0).max(360).optional(),
  
  // Legacy fields for backward compatibility
  glassShape: z.string().optional(),
  glassDiameter: z.number().optional(),
  glassHeight: z.number().optional(),
  glassWallThickness: z.number().optional(),
  glassMaterial: z.enum(glassMaterialTypes).optional(),
  filamentShape: z.string().optional(),
  filamentScale: z.number().optional(),
  filamentWireThickness: z.number().optional(),
  filamentSupports: z.boolean().optional(),
});

export type EdisonBulbSettings = z.infer<typeof edisonBulbSettingsSchema>;

// Neon Sign Settings - primitive shapes as hollow LED tubes
export const neonSignSettingsSchema = z.object({
  shape: z.enum(primitiveShapes),
  customSvgPath: z.string().optional(),
  scale: z.number().min(0.5).max(3),
  tubeWidth: z.number().min(8).max(25),    // Width of the tube channel
  tubeDepth: z.number().min(6).max(20),    // Depth of the tube
  wallThickness: z.number().min(1.2).max(3),
  hollow: z.boolean(),  // True = hollow for LED strip, False = solid diffuser
  splitHalf: z.boolean(), // Generate top/bottom halves
});

export type NeonSignSettings = z.infer<typeof neonSignSettingsSchema>;

// Stand/Electronics Housing - separate component
export const electronicsHousingSettingsSchema = z.object({
  enabled: z.boolean(),
  shape: z.enum(standTypes),
  diameter: z.number().min(50).max(150),
  height: z.number().min(20).max(60),
  wallThickness: z.number().min(2).max(4),
  // Cutouts for components
  usbPort: z.boolean(),
  powerSwitch: z.boolean(),
  potentiometer: z.boolean(),  // Brightness knob
  batteryCompartment: z.boolean(),
  wirePassthrough: z.boolean(),
  wireHoleDiameter: z.number().min(3).max(10),
});

export type ElectronicsHousingSettings = z.infer<typeof electronicsHousingSettingsSchema>;

// Complete Retro/Edison Settings - combines all modular components
export const retroNeonSettingsSchema = z.object({
  // Mode selection
  mode: z.enum(["neon_sign", "edison_bulb"]),
  
  // Edison bulb settings (when mode = edison_bulb)
  edison: edisonBulbSettingsSchema,
  
  // Neon sign settings (when mode = neon_sign)
  neonSign: neonSignSettingsSchema,
  
  // Electronics housing (optional, separate print)
  housing: electronicsHousingSettingsSchema,
  
  // Back plate (optional mounting plate)
  backPlateEnabled: z.boolean(),
  backPlateWidth: z.number().min(60).max(200),
  backPlateHeight: z.number().min(60).max(200),
  backPlateThickness: z.number().min(2).max(6),
  backPlateMountHoles: z.boolean(),
});

export type RetroNeonSettings = z.infer<typeof retroNeonSettingsSchema>;

export const defaultEdisonBulbSettings: EdisonBulbSettings = {
  // New shell-based design
  shellShape: "globe",
  shellScale: 1.0,
  shellHeight: 80,
  shellWallThickness: 2,
  shellMaterial: "clear",
  openingDiameter: 25,
  screwBase: "e26",
  baseHeight: 20,
  wireCenterHole: true,
  wireHoleDiameter: 5,
  // Legacy fields for backward compatibility
  glassShape: "globe",
  glassDiameter: 60,
  glassHeight: 80,
  glassWallThickness: 2,
  glassMaterial: "clear",
  filamentShape: "heart",
  filamentScale: 0.6,
  filamentWireThickness: 1.2,
  filamentSupports: true,
  // Luminary Engine V5 options
  threadType: "iso",
  clipSystemEnabled: false,
  clipCount: 5,
  clipDiameter: 6.2,
  phiRibsEnabled: false,
  spiralTwist: 180,
};

export const defaultNeonSignSettings: NeonSignSettings = {
  shape: "heart",
  customSvgPath: "",
  scale: 1.0,
  tubeWidth: 12,
  tubeDepth: 10,
  wallThickness: 2,
  hollow: true,
  splitHalf: true,
};

export const defaultElectronicsHousingSettings: ElectronicsHousingSettings = {
  enabled: false,
  shape: "round",
  diameter: 80,
  height: 35,
  wallThickness: 3,
  usbPort: true,
  powerSwitch: true,
  potentiometer: false,
  batteryCompartment: false,
  wirePassthrough: true,
  wireHoleDiameter: 6,
};

export const defaultRetroNeonSettings: RetroNeonSettings = {
  mode: "edison_bulb",
  edison: defaultEdisonBulbSettings,
  neonSign: defaultNeonSignSettings,
  housing: defaultElectronicsHousingSettings,
  backPlateEnabled: false,
  backPlateWidth: 100,
  backPlateHeight: 100,
  backPlateThickness: 3,
  backPlateMountHoles: true,
};

// Custom Shape input modes (for the custom shapes editor)
export const customInputModes = ["text", "draw", "trace"] as const;
export type CustomInputMode = typeof customInputModes[number];

// Custom Shape Settings - for creating split-half channels for LED insertion
export const customShapeSettingsSchema = z.object({
  inputMode: z.enum(customInputModes),
  text: z.string().min(0).max(200),
  fontId: z.string(),
  fontSize: z.number().min(10).max(200),
  paths: z.array(sketchPathSchema),
  traceThreshold: z.number().min(0).max(255),
  traceSmoothing: z.number().min(0).max(10),
  autoTrace: z.boolean(),
  // Channel dimensions
  channelWidth: z.number().min(8).max(30),  // Inner channel width for LED strip
  channelDepth: z.number().min(4).max(20),  // Depth of channel (half per side)
  wallThickness: z.number().min(1.2).max(4), // Wall thickness around channel
  // LED type selection
  ledType: z.enum(ledStripTypes),
  // Split-half design (clamshell)
  splitHalf: z.boolean(),  // Generate top/bottom halves
  snapFitTolerance: z.number().min(0.1).max(0.5),  // Snap-fit tolerance
  // Modular connectors
  modularConnectors: z.boolean(),  // Enable end connectors
  connectorLength: z.number().min(3).max(10),  // Length of male/female connector
  // Wire routing for addressable LEDs
  wireChannel: z.boolean(),  // Add wire routing channel
  wireChannelDiameter: z.number().min(2).max(6),  // Diameter for data/power wires
  // Output settings
  scale: z.number().min(0.5).max(5),
});

export type CustomShapeSettings = z.infer<typeof customShapeSettingsSchema>;

export const defaultCustomShapeSettings: CustomShapeSettings = {
  inputMode: "text",
  text: "HELLO",
  fontId: "aerioz",
  fontSize: 50,
  paths: [],
  traceThreshold: 128,
  traceSmoothing: 2,
  autoTrace: true,
  channelWidth: 12,  // 12mm fits most LED strips
  channelDepth: 8,   // Total depth when halves combined
  wallThickness: 2,
  ledType: "ws2812",  // Default to addressable
  splitHalf: true,    // Enable split-half by default
  snapFitTolerance: 0.2,
  modularConnectors: true,  // Enable connectors by default
  connectorLength: 5,
  wireChannel: true,  // Enable wire routing
  wireChannelDiameter: 3,  // 3mm for data wires
  scale: 1.0,
};

// Pet Tag specific types
export const petTagShapes = ["bone", "round", "heart", "rectangle", "military", "paw"] as const;
export type PetTagShape = typeof petTagShapes[number];

// Hang positions for the attachment loop
export const hangPositions = ["top", "top-left", "top-right", "left", "right"] as const;
export type HangPosition = typeof hangPositions[number];

export const petTagSettingsSchema = z.object({
  petName: z.string().min(0).max(20),
  tagShape: z.enum(petTagShapes),
  tagWidth: z.number().min(20).max(100),
  tagHeight: z.number().min(15).max(80),
  tagThickness: z.number().min(2).max(10),
  ledChannelEnabled: z.boolean(),
  ledChannelWidth: z.number().min(4).max(12),  // Same range as main neon signs
  ledChannelDepth: z.number().min(4).max(15),  // Wall height for U-channel
  glowInDark: z.boolean(),
  holeEnabled: z.boolean(),
  holeDiameter: z.number().min(3).max(10),
  fontScale: z.number().min(0.5).max(2.0),
  fontId: z.string(),  // Font selection for pet tag text
  hangPosition: z.enum(hangPositions).optional(),  // Where the loop attaches (default: top)
});

export type PetTagSettings = z.infer<typeof petTagSettingsSchema>;

// Modular Shapes (geometric light panels like Nanoleaf)
export const modularShapeTypes = ["hexagon", "triangle", "square", "pentagon", "octagon"] as const;
export type ModularShapeType = typeof modularShapeTypes[number];

// Connector types for modular panels - male tabs protrude, female slots receive
export const connectorTypes = ["male", "female"] as const;
export type ConnectorType = typeof connectorTypes[number];

export const diffuserTypes = ["outline", "shell"] as const;
export type DiffuserType = typeof diffuserTypes[number];

export const modularShapeSettingsSchema = z.object({
  shapeType: z.enum(modularShapeTypes),
  edgeLength: z.number().min(30).max(200),  // Length of each edge in mm
  channelWidth: z.number().min(6).max(20),  // Width of the LED channel
  wallHeight: z.number().min(8).max(30),    // Height of channel walls
  wallThickness: z.number().min(1.5).max(4), // Wall thickness
  baseThickness: z.number().min(2).max(6),   // Base plate thickness
  capThickness: z.number().min(1.5).max(4),  // Diffuser cap thickness
  diffuserType: z.enum(diffuserTypes),       // Outline (edge only) or Shell (full cover)
  connectorEnabled: z.boolean(),             // Enable edge connectors
  connectorType: z.enum(connectorTypes),     // Male (tabs) or Female (slots)
  connectorTabWidth: z.number().min(5).max(20), // Width of connector tabs/slots
  connectorTabDepth: z.number().min(2).max(8),  // Depth of connector tabs/slots
  connectorTolerance: z.number().min(0.1).max(0.4), // Fit tolerance for snap fit
  tileCount: z.number().min(1).max(20),      // Number of tiles to generate
});

export type ModularShapeSettings = z.infer<typeof modularShapeSettingsSchema>;

export const defaultModularShapeSettings: ModularShapeSettings = {
  shapeType: "hexagon",
  edgeLength: 80,
  channelWidth: 12,
  wallHeight: 15,
  wallThickness: 2,
  baseThickness: 3,
  capThickness: 2,
  diffuserType: "shell",
  connectorEnabled: true,
  connectorType: "male",
  connectorTabWidth: 10,
  connectorTabDepth: 4,
  connectorTolerance: 0.2,
  tileCount: 1,
};

// ========================================
// MODULAR TUBE VOCABULARY (LEGO-like system)
// ========================================
// Modular tube components that can be assembled to create any shape
// Users feed tubing through independently - no pre-connected tubes needed

export const tubeComponentTypes = ["straight", "angle", "curve", "ysplit", "endcap"] as const;
export type TubeComponentType = typeof tubeComponentTypes[number];

// Standard angle options for connectors
export const angleOptions = [30, 45, 60, 90, 120, 135, 150, 180] as const;
export type AngleOption = typeof angleOptions[number];

// Curve radius sizes
export const curveRadiusSizes = ["small", "medium", "large", "xlarge"] as const;
export type CurveRadiusSize = typeof curveRadiusSizes[number];

// Output mode for tube components
export const tubeOutputModes = ["full", "half_only", "backplate_channel"] as const;
export type TubeOutputMode = typeof tubeOutputModes[number];

// Modular tube component settings
export const modularTubeSettingsSchema = z.object({
  // Component type selection
  componentType: z.enum(tubeComponentTypes),
  
  // Tube dimensions (applies to all components)
  tubeDiameter: z.number().min(6).max(25),      // Outer tube diameter in mm
  wallThickness: z.number().min(1.2).max(3),    // Wall thickness
  
  // Straight segment settings
  straightLength: z.number().min(10).max(200),  // Length of straight segment
  
  // Angle connector settings  
  angleDegrees: z.number().min(15).max(180),    // Angle in degrees
  angleArmLength: z.number().min(8).max(30),    // Length of each arm from center
  
  // Curve segment settings
  curveAngle: z.number().min(15).max(180),      // Arc angle (90 = quarter circle)
  curveRadius: z.number().min(15).max(100),     // Radius of curve center
  
  // Y-splitter settings
  splitAngle: z.number().min(30).max(120),      // Angle between split arms
  splitArmLength: z.number().min(10).max(40),   // Length of each arm
  
  // Output mode
  outputMode: z.enum(tubeOutputModes),          // full, half_only, or backplate_channel
  
  // Clamshell split-half design
  splitHalf: z.boolean(),                       // Generate top/bottom halves
  tongueGroove: z.boolean(),                    // Add tongue-and-groove for alignment
  tongueDepth: z.number().min(0.5).max(2),      // Depth of tongue/groove
  
  // Snap-fit connection between halves
  snapFit: z.boolean(),                         // Enable snap-fit clips
  snapTolerance: z.number().min(0.1).max(0.4),  // Fit tolerance
  
  // End connectors for chaining segments
  endConnectors: z.boolean(),                   // Add male/female end connectors
  connectorLength: z.number().min(3).max(10),   // Length of connector section
  connectorTolerance: z.number().min(0.1).max(0.4),
  
  // Quantity to generate
  quantity: z.number().min(1).max(50),          // Number of this component to export
});

export type ModularTubeSettings = z.infer<typeof modularTubeSettingsSchema>;

// Backplate settings for modular tube mounting
export const modularBackplateSettingsSchema = z.object({
  enabled: z.boolean(),
  width: z.number().min(50).max(400),           // Backplate width in mm
  height: z.number().min(50).max(400),          // Backplate height in mm
  thickness: z.number().min(2).max(6),          // Backplate thickness
  
  // Channel groove for half-tubes (tubing feeds from behind)
  channelGrooveEnabled: z.boolean(),
  channelWidth: z.number().min(6).max(25),      // Width of channel groove
  channelDepth: z.number().min(2).max(10),      // Depth of groove
  
  // Material hint
  glowInDark: z.boolean(),                      // Glow-in-dark backplate
  
  // UV LED mounting holes (5mm LEDs)
  uvLedHoles: z.boolean(),                      // Enable UV LED mounting holes
  ledHoleDiameter: z.number().min(3).max(8),    // Usually 5mm for standard LEDs
  ledHoleSpacing: z.number().min(10).max(50),   // Spacing between LED holes
  ledHolePattern: z.enum(["grid", "perimeter", "custom"]),
  
  // Mounting holes for wall hanging
  mountHoles: z.boolean(),
  mountHoleDiameter: z.number().min(3).max(8),
});

export type ModularBackplateSettings = z.infer<typeof modularBackplateSettingsSchema>;

// Complete modular tube vocabulary export settings
export const tubeVocabularySettingsSchema = z.object({
  // Tube component settings
  tube: modularTubeSettingsSchema,
  
  // Backplate settings
  backplate: modularBackplateSettingsSchema,
  
  // Export multiple component types at once
  exportStraights: z.boolean(),
  straightLengths: z.array(z.number()),         // e.g., [10, 25, 50, 100]
  
  exportAngles: z.boolean(),
  anglesList: z.array(z.number()),              // e.g., [45, 90, 135]
  
  exportCurves: z.boolean(),
  curveRadii: z.array(z.number()),              // e.g., [15, 30, 50]
  
  exportSplitters: z.boolean(),
  exportEndCaps: z.boolean(),
});

export type TubeVocabularySettings = z.infer<typeof tubeVocabularySettingsSchema>;

export const defaultModularTubeSettings: ModularTubeSettings = {
  componentType: "straight",
  tubeDiameter: 12,
  wallThickness: 2,
  straightLength: 50,
  angleDegrees: 90,
  angleArmLength: 15,
  curveAngle: 90,
  curveRadius: 30,
  splitAngle: 60,
  splitArmLength: 20,
  outputMode: "full",
  splitHalf: true,
  tongueGroove: true,
  tongueDepth: 1,
  snapFit: true,
  snapTolerance: 0.2,
  endConnectors: true,
  connectorLength: 5,
  connectorTolerance: 0.2,
  quantity: 1,
};

export const defaultModularBackplateSettings: ModularBackplateSettings = {
  enabled: false,
  width: 150,
  height: 150,
  thickness: 3,
  channelGrooveEnabled: true,
  channelWidth: 12,
  channelDepth: 4,
  glowInDark: true,
  uvLedHoles: true,
  ledHoleDiameter: 5,
  ledHoleSpacing: 25,
  ledHolePattern: "perimeter",
  mountHoles: true,
  mountHoleDiameter: 4,
};

export const defaultTubeVocabularySettings: TubeVocabularySettings = {
  tube: defaultModularTubeSettings,
  backplate: defaultModularBackplateSettings,
  exportStraights: true,
  straightLengths: [25, 50, 100],
  exportAngles: true,
  anglesList: [45, 90, 135],
  exportCurves: true,
  curveRadii: [20, 40],
  exportSplitters: true,
  exportEndCaps: true,
};

export const defaultPetTagSettings: PetTagSettings = {
  petName: "Max",
  tagShape: "bone",
  tagWidth: 45,
  tagHeight: 25,
  tagThickness: 4,
  ledChannelEnabled: true,
  ledChannelWidth: 6,
  ledChannelDepth: 8,
  glowInDark: false,
  holeEnabled: true,
  holeDiameter: 5,
  fontScale: 1.0,
  fontId: "aerioz",  // Default to neon script font
  hangPosition: "top",  // Top center for proper front-facing hang
};

export const letterSettingsSchema = z.object({
  text: z.string().min(0).max(200),
  fontId: z.string(),
  depth: z.number().min(5).max(100),
  scale: z.number().min(0.1).max(10),
  bevelEnabled: z.boolean(),
  bevelThickness: z.number().min(0).max(10),
  bevelSize: z.number().min(0).max(5),
  templateId: z.string().optional(),
  lightDiffuserBevel: z.boolean().optional(),
  diffuserBevelAngle: z.number().min(15).max(60).optional(),
});

export type LetterSettings = z.infer<typeof letterSettingsSchema>;

export const twoPartSystemSchema = z.object({
  enabled: z.boolean(),
  baseWallHeight: z.number().min(5).max(40),
  baseWallThickness: z.number().min(1).max(5),
  capOverhang: z.number().min(0.5).max(3),
  capThickness: z.number().min(1).max(5),
  snapTolerance: z.number().min(0.1).max(0.5),
  snapTabsEnabled: z.boolean(),
  snapTabHeight: z.number().min(1).max(4),
  snapTabWidth: z.number().min(2).max(8),
  snapTabSpacing: z.number().min(10).max(50),
  chamferAngle: z.number().min(30).max(60),
  registrationPinsEnabled: z.boolean(),
  pinDiameter: z.number().min(1.5).max(4),
  pinHeight: z.number().min(2).max(6),
  pinSpacing: z.number().min(15).max(60),
  diffusionRibsEnabled: z.boolean(),
  ribHeight: z.number().min(0.5).max(2),
  ribSpacing: z.number().min(3).max(10),
  cableChannelEnabled: z.boolean(),
  cableChannelWidth: z.number().min(3).max(8),
  cableChannelDepth: z.number().min(2).max(5),
});

export type TwoPartSystem = z.infer<typeof twoPartSystemSchema>;

export const defaultTwoPartSystem: TwoPartSystem = {
  enabled: true,
  baseWallHeight: 15,
  baseWallThickness: 2,
  capOverhang: 1,
  capThickness: 2,
  snapTolerance: 0.2,
  snapTabsEnabled: true,
  snapTabHeight: 2,
  snapTabWidth: 4,
  snapTabSpacing: 25,
  chamferAngle: 45,
  registrationPinsEnabled: true,
  pinDiameter: 2.5,
  pinHeight: 3,
  pinSpacing: 30,
  diffusionRibsEnabled: true,
  ribHeight: 1,
  ribSpacing: 5,
  cableChannelEnabled: true,
  cableChannelWidth: 5,
  cableChannelDepth: 3,
};

export const wiringSettingsSchema = z.object({
  channelType: z.enum(wiringChannelTypes),
  channelDiameter: z.number().min(3).max(20),
  channelDepth: z.number().min(0).max(100),
  channelWidth: z.number().min(5).max(30).optional(),
  ledCount: z.number().min(1).max(100).optional(),
});

export type WiringSettings = z.infer<typeof wiringSettingsSchema>;

export const mountingSettingsSchema = z.object({
  pattern: z.enum(mountingHolePatterns),
  holeDiameter: z.number().min(2).max(10),
  holeDepth: z.number().min(5).max(50),
  holeCount: z.number().min(0).max(8),
  insetFromEdge: z.number().min(2).max(20),
});

export type MountingSettings = z.infer<typeof mountingSettingsSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  letterSettings: letterSettingsSchema,
  geometrySettings: geometrySettingsSchema,
  wiringSettings: wiringSettingsSchema,
  mountingSettings: mountingSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const insertProjectSchema = projectSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;

export const defaultLetterSettings: LetterSettings = {
  text: "A",
  fontId: "inter",
  depth: 20,
  scale: 1,
  bevelEnabled: true,
  bevelThickness: 2,
  bevelSize: 1,
  templateId: "none",
  lightDiffuserBevel: false,
  diffuserBevelAngle: 45,
};

export const defaultWiringSettings: WiringSettings = {
  channelType: "none",
  channelDiameter: 6,
  channelDepth: 4,
  channelWidth: 12,
  ledCount: 10,
};

export const defaultMountingSettings: MountingSettings = {
  pattern: "none",
  holeDiameter: 4,
  holeDepth: 15,
  holeCount: 4,
  insetFromEdge: 8,
};

export const defaultGeometrySettings: GeometrySettings = {
  mode: "raised",
  letterHeight: 15,
  backingThickness: 5,
  letterOffset: 0,
  letterMaterial: "transparent",
  backingMaterial: "opaque",
  separateFiles: true,
  enableBacking: true,
};

export const defaultTubeSettings: TubeSettings = {
  neonTubeSize: "12mm",
  neonTubeDiameter: 12,
  channelDepth: 20,
  filamentDiameter: 12,
  wallThickness: 2,
  wallHeight: 15,
  tubeWidth: 25,
  enableOverlay: true,
  overlayThickness: 2,
  continuousPath: true,
  channelType: "filament",
};

// LED Grid Sign System schema
export const ledGridWiringPatterns = ["serpentine", "parallel", "zigzag"] as const;
export type LEDGridWiringPattern = typeof ledGridWiringPatterns[number];

export const ledGridPresetSizes = ["8x7", "16x8", "32x8", "16x16", "custom"] as const;
export type LEDGridPresetSize = typeof ledGridPresetSizes[number];

export const ledGridDiffusionPatterns = ["none", "honeycomb", "dots", "grid", "diamonds", "lines", "voronoi"] as const;
export type LEDGridDiffusionPattern = typeof ledGridDiffusionPatterns[number];

export const ledGridHousingStyles = ["open_back", "enclosed", "snap_lid", "screw_lid"] as const;
export type LEDGridHousingStyle = typeof ledGridHousingStyles[number];

export const ledGridSettingsSchema = z.object({
  gridWidth: z.number().min(4).max(64).default(8),
  gridHeight: z.number().min(4).max(64).default(7),
  ledSpacing: z.number().min(8).max(20).default(10),
  wiringPattern: z.enum(ledGridWiringPatterns).default("serpentine"),
  presetSize: z.enum(ledGridPresetSizes).default("8x7"),
  wallThickness: z.number().min(2).max(5).default(3),
  housingDepth: z.number().min(10).max(30).default(15),
  housingStyle: z.enum(ledGridHousingStyles).default("open_back"),
  
  // Diffuser settings
  diffuserOffset: z.number().min(3).max(15).default(5),
  diffuserThickness: z.number().min(1).max(4).default(2),
  includeDiffuser: z.boolean().default(true),
  
  // Diffusion pattern (etched into diffuser)
  diffusionPattern: z.enum(ledGridDiffusionPatterns).default("none"),
  diffusionDensity: z.number().min(10).max(90).default(50),
  diffusionDepth: z.number().min(0.2).max(1.5).default(0.5),
  
  // Mounting
  includeHousing: z.boolean().default(true),
  includeMountingHoles: z.boolean().default(true),
  mountingHoleDiameter: z.number().min(2).max(6).default(3),
  
  // Wire routing
  includeWireChannel: z.boolean().default(true),
  wireChannelWidth: z.number().min(3).max(10).default(5),
  wireChannelHeight: z.number().min(2).max(8).default(3),
  wireExitSide: z.enum(["bottom", "left", "right", "back"]).default("bottom"),
  
  // LED clip settings
  ledDiameter: z.number().min(3).max(10).default(5),
  clipHeight: z.number().min(4).max(12).default(6),
  clipWallThickness: z.number().min(0.8).max(2).default(1.2),
  
  // Display content
  textContent: z.string().optional(),
  customPixels: z.array(z.object({
    x: z.number(),
    y: z.number(),
    color: z.string().optional(),
  })).optional(),
  
  // Export options
  exportParts: z.array(z.enum(["housing", "diffuser", "lid", "all"])).default(["all"]),
});

export type LEDGridSettings = z.infer<typeof ledGridSettingsSchema>;

export const defaultLEDGridSettings: LEDGridSettings = {
  gridWidth: 8,
  gridHeight: 7,
  ledSpacing: 10,
  wiringPattern: "serpentine",
  presetSize: "8x7",
  wallThickness: 3,
  housingDepth: 15,
  housingStyle: "open_back",
  diffuserOffset: 5,
  diffuserThickness: 2,
  includeDiffuser: true,
  diffusionPattern: "none",
  diffusionDensity: 50,
  diffusionDepth: 0.5,
  includeHousing: true,
  includeMountingHoles: true,
  mountingHoleDiameter: 3,
  includeWireChannel: true,
  wireChannelWidth: 5,
  wireChannelHeight: 3,
  wireExitSide: "bottom",
  ledDiameter: 5,
  clipHeight: 6,
  clipWallThickness: 1.2,
  exportParts: ["all"],
};

// 5x7 Bitmap Font for LED grids (standard ASCII characters)
export const LED_FONT_5x7: Record<string, number[]> = {
  'A': [0x1E, 0x05, 0x05, 0x1E, 0x00],
  'B': [0x1F, 0x15, 0x15, 0x0A, 0x00],
  'C': [0x0E, 0x11, 0x11, 0x11, 0x00],
  'D': [0x1F, 0x11, 0x11, 0x0E, 0x00],
  'E': [0x1F, 0x15, 0x15, 0x11, 0x00],
  'F': [0x1F, 0x05, 0x05, 0x01, 0x00],
  'G': [0x0E, 0x11, 0x15, 0x1D, 0x00],
  'H': [0x1F, 0x04, 0x04, 0x1F, 0x00],
  'I': [0x11, 0x1F, 0x11, 0x00, 0x00],
  'J': [0x08, 0x10, 0x10, 0x0F, 0x00],
  'K': [0x1F, 0x04, 0x0A, 0x11, 0x00],
  'L': [0x1F, 0x10, 0x10, 0x10, 0x00],
  'M': [0x1F, 0x02, 0x04, 0x02, 0x1F],
  'N': [0x1F, 0x02, 0x04, 0x08, 0x1F],
  'O': [0x0E, 0x11, 0x11, 0x0E, 0x00],
  'P': [0x1F, 0x05, 0x05, 0x02, 0x00],
  'Q': [0x0E, 0x11, 0x19, 0x0E, 0x08],
  'R': [0x1F, 0x05, 0x0D, 0x12, 0x00],
  'S': [0x12, 0x15, 0x15, 0x09, 0x00],
  'T': [0x01, 0x01, 0x1F, 0x01, 0x01],
  'U': [0x0F, 0x10, 0x10, 0x0F, 0x00],
  'V': [0x07, 0x08, 0x10, 0x08, 0x07],
  'W': [0x1F, 0x08, 0x04, 0x08, 0x1F],
  'X': [0x11, 0x0A, 0x04, 0x0A, 0x11],
  'Y': [0x01, 0x02, 0x1C, 0x02, 0x01],
  'Z': [0x19, 0x15, 0x15, 0x13, 0x00],
  '0': [0x0E, 0x19, 0x15, 0x13, 0x0E],
  '1': [0x00, 0x12, 0x1F, 0x10, 0x00],
  '2': [0x12, 0x19, 0x15, 0x12, 0x00],
  '3': [0x11, 0x15, 0x15, 0x0A, 0x00],
  '4': [0x07, 0x04, 0x04, 0x1F, 0x00],
  '5': [0x17, 0x15, 0x15, 0x09, 0x00],
  '6': [0x0E, 0x15, 0x15, 0x08, 0x00],
  '7': [0x01, 0x19, 0x05, 0x03, 0x00],
  '8': [0x0A, 0x15, 0x15, 0x0A, 0x00],
  '9': [0x02, 0x15, 0x15, 0x0E, 0x00],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x17, 0x00, 0x00, 0x00],
  '.': [0x00, 0x10, 0x00, 0x00, 0x00],
  ',': [0x00, 0x20, 0x10, 0x00, 0x00],
  '-': [0x04, 0x04, 0x04, 0x00, 0x00],
  '+': [0x04, 0x0E, 0x04, 0x00, 0x00],
  ':': [0x00, 0x0A, 0x00, 0x00, 0x00],
  '?': [0x02, 0x01, 0x15, 0x02, 0x00],
};

// ======== PHRASE SIGN SETTINGS ========
export const phraseWeldingModes = ["none", "cursive", "continuous", "auto"] as const;
export type PhraseWeldingMode = typeof phraseWeldingModes[number];

export const phraseBorderStyles = ["none", "rectangle", "rounded", "circle", "oval"] as const;
export type PhraseBorderStyle = typeof phraseBorderStyles[number];

export const phraseLedTypes = [
  "silicone_neon_6mm",
  "silicone_neon_8mm", 
  "led_strip_10mm",
  "individual_pixels_14mm",
  "cob_strip_8mm",
  "cob_strip_10mm",
  "neon_tube_6mm",
  "neon_tube_12mm",
  "wide_tubing_15mm",
  "wide_tubing_20mm",
  "custom"
] as const;
export type PhraseLedType = typeof phraseLedTypes[number];

export const phraseShellModes = ["full_enclosure", "half_shell", "mounting_plate"] as const;
export type PhraseShellMode = typeof phraseShellModes[number];

export const phraseSignSettingsSchema = z.object({
  text: z.string().min(1).max(200),
  fontId: z.string(),
  fontSize: z.number().min(20).max(200),
  weldingMode: z.enum(phraseWeldingModes),
  weldingGap: z.number().min(0).max(10),
  smoothingLevel: z.number().min(1).max(10),
  borderStyle: z.enum(phraseBorderStyles),
  borderWidth: z.number().min(0).max(30),
  borderPadding: z.number().min(5).max(50),
  borderRadius: z.number().min(0).max(50),
  ledType: z.enum(phraseLedTypes),
  ledChannelWidth: z.number().min(2).max(25),
  customLedWidth: z.number().min(2).max(25).optional(),
  signHeight: z.number().min(10).max(100),
  wallThickness: z.number().min(1).max(5),
  baseThickness: z.number().min(1).max(5),
  shellMode: z.enum(phraseShellModes),
  enableLedChannels: z.boolean(),
  ledChannelDepth: z.number().min(2).max(15),
  enableFrictionLip: z.boolean(),
  frictionLipOverhang: z.number().min(0.2).max(1.0),
  enableWireHoles: z.boolean(),
  wireHoleHeight: z.number().min(3).max(20),
  wireHoleSpacing: z.number().min(20).max(100),
  wireHoleDiameter: z.number().min(2).max(6),
  enableWireEscapes: z.boolean(),
  wireEscapeSize: z.number().min(3).max(15),
  enableDiffuserLid: z.boolean(),
  lidStyle: z.enum(["flat", "domed"]),
  lidTolerance: z.number().min(0.1).max(0.5),
  domeHeight: z.number().min(3).max(20),
});

export type PhraseSignSettings = z.infer<typeof phraseSignSettingsSchema>;

export const defaultPhraseSignSettings: PhraseSignSettings = {
  text: "HELLO",
  fontId: "arial",
  fontSize: 70,
  weldingMode: "none",
  weldingGap: 2,
  smoothingLevel: 5,
  borderStyle: "none",
  borderWidth: 10,
  borderPadding: 20,
  borderRadius: 15,
  ledType: "cob_strip_10mm",
  ledChannelWidth: 12,
  customLedWidth: 10,
  signHeight: 30,
  wallThickness: 2,
  baseThickness: 2,
  shellMode: "half_shell",
  enableLedChannels: true,
  ledChannelDepth: 5,
  enableFrictionLip: true,
  frictionLipOverhang: 0.4,
  enableWireHoles: true,
  wireHoleHeight: 5,
  wireHoleSpacing: 50,
  wireHoleDiameter: 5,
  enableWireEscapes: true,
  wireEscapeSize: 6,
  enableDiffuserLid: true,
  lidStyle: "flat",
  lidTolerance: 0.15,
  domeHeight: 10,
};

// Battery Holder Settings
export const batteryTypes = ["CR2032", "CR2025", "CR2016", "AAA", "AA", "18650"] as const;
export const fitTypes = ["tight", "normal", "loose", "press", "snap"] as const;
export const baseStyles = ["flat", "rounded", "angled"] as const;

export const batteryHolderSettingsSchema = z.object({
  batteryType: z.enum(batteryTypes),
  fitType: z.enum(fitTypes),
  wallThickness: z.number().min(1).max(5),
  includeSnapLid: z.boolean(),
  includeSwitchMount: z.boolean(),
  includeWireChannels: z.boolean(),
  wireChannelDiameter: z.number().min(1).max(10),
  baseStyle: z.enum(baseStyles),
  coinSlotForRemoval: z.boolean(),
});

export type BatteryHolderSettings = z.infer<typeof batteryHolderSettingsSchema>;

// Neon Stand Settings
export const neonBaseStyles = ["rectangular", "oval", "weighted", "minimal", "angled"] as const;
export const tubeStyles = ["split_half", "full_round", "channel"] as const;
export const mountTypes = ["friction", "screw", "magnetic", "adhesive"] as const;
export const neonLightTypes = ["silicone_neon_6mm", "silicone_neon_8mm", "led_strip_10mm", "ws2812b_pixels", "cob_strip", "el_wire", "led_filament", "fairy_lights"] as const;
export const neonBatteryTypes = ["AAA", "AA", "18650", "USB"] as const;

export const neonStandSettingsSchema = z.object({
  text: z.string().min(1).max(20),
  fontSize: z.number().min(20).max(150),
  fontFamily: z.string(),
  lightType: z.enum(neonLightTypes),
  tubeStyle: z.enum(tubeStyles),
  baseStyle: z.enum(neonBaseStyles),
  baseWidth: z.number().min(50).max(300),
  baseDepth: z.number().min(20).max(100),
  baseHeight: z.number().min(5).max(50),
  signHeight: z.number().min(20).max(200),
  wallThickness: z.number().min(1).max(5),
  mountType: z.enum(mountTypes),
  includeBatteryCompartment: z.boolean(),
  batteryType: z.enum(neonBatteryTypes),
  includeSwitch: z.boolean(),
  includeStandoffs: z.boolean(),
  standoffHeight: z.number().min(5).max(50),
});

export type NeonStandSettings = z.infer<typeof neonStandSettingsSchema>;

// 555 Timer Housing Settings
export const pcbSizes = ["small", "medium", "large", "custom"] as const;
export const ventStyles = ["none", "slots", "grid", "honeycomb"] as const;
export const housingMountStyles = ["standoffs", "clips", "rails", "adhesive"] as const;

export const timerHousingSettingsSchema = z.object({
  pcbSize: z.enum(pcbSizes),
  customWidth: z.number().min(10).max(200).optional(),
  customLength: z.number().min(10).max(200).optional(),
  pcbThickness: z.number().min(0.8).max(3),
  wallThickness: z.number().min(1).max(5),
  bottomThickness: z.number().min(1).max(5),
  clearanceAbovePCB: z.number().min(5).max(50),
  clearanceBelowPCB: z.number().min(1).max(20),
  ventStyle: z.enum(ventStyles),
  mountStyle: z.enum(housingMountStyles),
  standoffHeight: z.number().min(2).max(15),
  standoffDiameter: z.number().min(3).max(10),
  screwHoleDiameter: z.number().min(1.5).max(5),
  includeWireChannels: z.boolean(),
  wireChannelCount: z.number().min(1).max(6),
  wireChannelDiameter: z.number().min(2).max(10),
  includeLidSnaps: z.boolean(),
  includePotentiometerHole: z.boolean(),
  potentiometerDiameter: z.number().min(5).max(15),
  includeLEDHole: z.boolean(),
  ledDiameter: z.number().min(3).max(10),
  includePowerJack: z.boolean(),
  powerJackDiameter: z.number().min(4).max(12),
});

export type TimerHousingSettings = z.infer<typeof timerHousingSettingsSchema>;

// LED Keychain Designer Settings
export const keychainShapes = ["rectangle", "oval", "dogtag", "heart", "rounded_rect", "bone"] as const;
export type KeychainShape = typeof keychainShapes[number];

export const keychainLedTypes = ["el_wire", "led_strip_3mm", "neon_tube_4mm", "neon_tube_6mm", "cob_strip_8mm", "cob_strip_10mm"] as const;
export type KeychainLedType = typeof keychainLedTypes[number];

export const keychainBatteryTypes = ["cr2032", "cr2025", "cr2016", "2xAAA", "lipo_small"] as const;
export type KeychainBatteryType = typeof keychainBatteryTypes[number];

export const keychainSwitchPositions = ["side_right", "side_left", "top", "back", "integrated"] as const;
export type KeychainSwitchPosition = typeof keychainSwitchPositions[number];

export const keychainTextStyles = ["embossed", "engraved", "hollow", "recessed", "outline"] as const;
export type KeychainTextStyle = typeof keychainTextStyles[number];

export const keychainSettingsSchema = z.object({
  text: z.string().min(1).max(12),
  shape: z.enum(keychainShapes),
  width: z.number().min(30).max(120),
  height: z.number().min(20).max(80),
  depth: z.number().min(8).max(25),
  textStyle: z.enum(keychainTextStyles),
  textDepth: z.number().min(0.5).max(5),
  fontId: z.string().optional(),
  ledType: z.enum(keychainLedTypes),
  ledChannelEnabled: z.boolean(),
  ledChannelWidth: z.number().min(2).max(12),
  ledChannelDepth: z.number().min(2).max(8),
  batteryType: z.enum(keychainBatteryTypes),
  batterySlideIn: z.boolean(),
  switchPosition: z.enum(keychainSwitchPositions),
  switchCutoutWidth: z.number().min(4).max(12),
  switchCutoutHeight: z.number().min(2).max(8),
  wiringChannelEnabled: z.boolean(),
  wiringChannelDiameter: z.number().min(1.5).max(4),
  keychainHole: z.boolean(),
  keychainHoleDiameter: z.number().min(3).max(8),
  keychainHolePosition: z.enum(["top", "top_left", "top_right"]),
  wallThickness: z.number().min(1).max(4),
  diffuserEnabled: z.boolean(),
  diffuserThickness: z.number().min(0.5).max(2),
  splitHalves: z.boolean(),
});

export type KeychainSettings = z.infer<typeof keychainSettingsSchema>;

export { users, insertUserSchema } from "./users";
export type { InsertUser, User } from "./users";

// Chat models for Oracle AI
export { conversations, messages, insertConversationSchema, insertMessageSchema, oracleKnowledge, insertOracleKnowledgeSchema } from "./models/chat";
export type { Conversation, InsertConversation, Message, InsertMessage, OracleKnowledge, InsertOracleKnowledge } from "./models/chat";
