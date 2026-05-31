import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Box, Layers, Sun, Grid3X3, Circle, Image, Plus, Trash2, Move, Copy, Eye, EyeOff, ChevronUp, ChevronDown, Pencil, Upload, Wand2, Shapes, Gamepad2, Film, Atom, Binary, Zap, Ghost, Star, Heart, Square, Triangle, Hexagon, Moon, Music, Coffee, Sparkles, Cpu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SketchPath } from "@shared/schema";

interface HolePlacement {
  id: string;
  x: number;
  y: number;
  diameter?: number;
  type: 'led_3mm' | 'led_5mm' | 'led_10mm' | 'wire_small' | 'wire_medium' | 'wire_large' | 'mounting' | 'vent' | 'custom';
  side: 'back' | 'bottom' | 'left' | 'right' | 'top';
}

interface ShapeLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  sourceType: 'stock' | 'trace' | 'draw' | 'upload';
  stockShape?: string;
  stockCategory?: string;
  paths: SketchPath[];
  uploadedImage?: string;
  thickness: number;
  offsetZ: number;
  mode: 'stencil' | 'solid' | 'channel' | 'lithophane';
  ledType: 'none' | 'el_wire' | 'ws2812b' | 'neopixel' | 'rgb_strip' | 'cob_strip' | 'led_filament';
  ledChannelWidth: number;
  ledChannelDepth: number;
  diffuserMode: 'standard' | 'clam_shell' | 'contour';
  color: string;
}

interface LightBoxSettings {
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  wallThickness: number;
  
  boxShape: 'rectangle' | 'rounded' | 'oval' | 'hexagon' | 'custom';
  cornerRadius: number;
  
  panelConfig: 'single' | 'diptych' | 'triptych' | 'quad' | 'custom';
  panelGap: number;
  panelCount: number;
  
  ledPlacement: 'perimeter' | 'behind' | 'edge_lit' | 'diffused';
  ledColor: string;
  ledBrightness: number;
  glowIntensity: number;
  glowSpread: number;
  
  wallStandoff: number;
  mountingType: 'keyhole' | 'french_cleat' | 'standoff_posts' | 'adhesive';
  
  frameStyle: 'none' | 'simple' | 'beveled' | 'rounded' | 'decorative';
  frameWidth: number;
  frameColor: string;
  
  diffuserType: 'snap_fit' | 'overlay' | 'slide_groove' | 'friction_fit' | 'none';
  diffuserThickness: number;
  diffuserInset: number;
  grooveDepth: number;
  snapTolerance: number;
  
  imageMode: 'stencil' | 'solid' | 'transparent' | 'glow_dark' | 'tubular_el' | 'lithophane' | 'none';
  imagePlacement: 'above_diffuser' | 'below_diffuser' | 'integrated';
  imageThickness: number;
  designType: string;
  
  tubeChannelWidth: number;
  tubeChannelDepth: number;
  tubeWallThickness: number;
  
  lithophaneMinThickness: number;
  lithophaneMaxThickness: number;
  
  holes: HolePlacement[];
  
  layers: ShapeLayer[];
  selectedLayerId: string | null;
  
  diffusionPattern: 'none' | 'honeycomb' | 'dots' | 'grid' | 'waves' | 'voronoi' | 'diamonds' | 'lines';
  diffusionDensity: number;
  diffusionDepth: number;
  
  includeBackPanel: boolean;
  backPanelThickness: number;
  backPanelVentHoles: boolean;
  
  includeLedChannel: boolean;
  ledChannelWidth: number;
  ledChannelDepth: number;
  lightType: string;
  
  exportParts: ('box' | 'diffuser' | 'image_layer' | 'back_panel' | 'all' | 'layers')[];
}

const stockShapeLibrary = {
  retro_gaming: {
    label: "80s/90s Gaming",
    icon: Gamepad2,
    shapes: [
      { id: 'pacman', name: 'Pac-Man', path: 'M50,10 A40,40 0 1,1 50,90 L50,50 Z' },
      { id: 'ghost', name: 'Ghost', path: 'M20,90 L20,40 A30,30 0 0,1 80,40 L80,90 L70,80 L60,90 L50,80 L40,90 L30,80 Z' },
      { id: 'mario_mushroom', name: 'Mushroom', path: 'M30,60 L30,85 A5,5 0 0,0 35,90 L65,90 A5,5 0 0,0 70,85 L70,60 M50,10 A35,30 0 0,1 85,40 A35,20 0 0,1 50,60 A35,20 0 0,1 15,40 A35,30 0 0,1 50,10 Z' },
      { id: 'sonic_ring', name: 'Ring', path: 'M50,5 A45,45 0 1,1 50,95 A45,45 0 1,1 50,5 M50,25 A25,25 0 1,0 50,75 A25,25 0 1,0 50,25' },
      { id: 'gameboy', name: 'Game Boy', path: 'M20,5 L80,5 A5,5 0 0,1 85,10 L85,90 A5,5 0 0,1 80,95 L20,95 A5,5 0 0,1 15,90 L15,10 A5,5 0 0,1 20,5 M25,15 L75,15 L75,50 L25,50 Z M55,70 A8,8 0 1,1 55,70.01 M35,75 L45,75 L40,65 L40,85' },
      { id: 'rubiks', name: 'Rubik\'s Cube', path: 'M10,30 L50,10 L90,30 L90,70 L50,90 L10,70 Z M50,10 L50,50 M10,30 L50,50 M90,30 L50,50 M50,50 L50,90 M30,20 L30,60 M70,20 L70,60 M30,40 L70,40 M30,60 L70,60' },
      { id: 'space_invader', name: 'Space Invader', path: 'M30,20 L30,30 L20,30 L20,40 L10,40 L10,70 L20,70 L20,80 L30,80 L30,90 L40,90 L40,80 L60,80 L60,90 L70,90 L70,80 L80,80 L80,70 L90,70 L90,40 L80,40 L80,30 L70,30 L70,20 L60,20 L60,30 L40,30 L40,20 Z' },
      { id: 'tetris_l', name: 'Tetris L', path: 'M20,20 L50,20 L50,50 L80,50 L80,80 L20,80 Z' },
    ]
  },
  retro_tech: {
    label: "Retro Tech",
    icon: Cpu,
    shapes: [
      { id: 'retro_computer', name: '80s Computer', path: 'M15,25 L85,25 Q90,25 90,30 L90,65 Q90,70 85,70 L15,70 Q10,70 10,65 L10,30 Q10,25 15,25 M20,32 L80,32 L80,58 L20,58 Z M50,62 A3,3 0 1,1 50,62.01 M10,72 L90,72 L90,78 Q90,85 85,85 L15,85 Q10,85 10,78 Z M20,76 L25,76 L25,80 L20,80 Z M30,76 L35,76 L35,80 L30,80 Z M45,76 L55,76 L55,80 L45,80 Z M65,76 L75,76 L75,80 L65,80 Z' },
      { id: 'floppy_disk', name: 'Floppy Disk', path: 'M15,10 L75,10 L90,25 L90,90 L10,90 L10,15 Q10,10 15,10 M25,10 L25,30 L75,30 L75,10 M55,15 L70,15 L70,25 L55,25 Z M30,50 L70,50 L70,85 L30,85 Z M35,55 L65,55 M35,62 L65,62 M35,69 L65,69 M35,76 L55,76' },
      { id: 'brick_phone', name: 'Brick Phone', path: 'M30,10 L70,10 Q75,10 75,15 L75,90 Q75,95 70,95 L30,95 Q25,95 25,90 L25,15 Q25,10 30,10 M35,5 L35,10 L30,20 L28,15 Z M35,30 L65,30 L65,50 L35,50 Z M35,55 L42,55 L42,62 L35,62 Z M45,55 L52,55 L52,62 L45,62 Z M55,55 L62,55 L62,62 L55,62 Z M35,65 L42,65 L42,72 L35,72 Z M45,65 L52,65 L52,72 L45,72 Z M55,65 L62,65 L62,72 L55,72 Z M35,75 L42,75 L42,82 L35,82 Z M45,75 L52,75 L52,82 L45,82 Z M55,75 L62,75 L62,82 L55,82 Z' },
      { id: 'cassette', name: 'Cassette Tape', path: 'M10,25 L90,25 Q95,25 95,30 L95,70 Q95,75 90,75 L10,75 Q5,75 5,70 L5,30 Q5,25 10,25 M15,35 L40,35 L40,65 L15,65 Z M60,35 L85,35 L85,65 L60,65 Z M27,50 A8,8 0 1,1 27,50.01 M72,50 A8,8 0 1,1 72,50.01 M35,50 L65,50 M40,45 L60,45 M40,55 L60,55' },
      { id: 'vhs', name: 'VHS Tape', path: 'M5,20 L95,20 L95,80 L5,80 Z M15,30 L42,30 L42,70 L15,70 Z M58,30 L85,30 L85,70 L58,70 Z M28,50 A12,12 0 1,1 28,50.01 M72,50 A12,12 0 1,1 72,50.01 M40,50 L60,50' },
      { id: 'joystick', name: 'Arcade Joystick', path: 'M35,60 L65,60 L75,80 Q80,90 70,95 L30,95 Q20,90 25,80 Z M45,30 L55,30 L55,60 L45,60 Z M50,10 A15,15 0 1,1 50,40 A15,15 0 1,1 50,10' },
    ]
  },
  movies_tv: {
    label: "Movies & TV",
    icon: Film,
    shapes: [
      { id: 'pulp_silhouette', name: 'Man in Hat', path: 'M50,10 A20,20 0 0,1 70,25 L75,25 L75,20 L85,20 L85,35 L75,35 L75,30 L70,30 A15,15 0 0,1 55,45 L55,90 L45,90 L45,45 A15,15 0 0,1 30,30 L25,30 L25,35 L15,35 L15,20 L25,20 L25,25 L30,25 A20,20 0 0,1 50,10' },
      { id: 'simpsons_donut', name: 'Donut', path: 'M50,5 A45,45 0 1,1 50,95 A45,45 0 1,1 50,5 M50,30 A20,20 0 1,0 50,70 A20,20 0 1,0 50,30' },
      { id: 'starwars_symbol', name: 'Rebel Symbol', path: 'M50,5 L60,35 L95,35 L67,55 L78,90 L50,70 L22,90 L33,55 L5,35 L40,35 Z' },
      { id: 'batman', name: 'Bat Symbol', path: 'M50,20 C35,20 20,35 15,45 L5,45 C10,50 20,60 30,55 C35,65 45,75 50,80 C55,75 65,65 70,55 C80,60 90,50 95,45 L85,45 C80,35 65,20 50,20' },
      { id: 'lightsaber', name: 'Lightsaber', path: 'M45,10 L55,10 L55,60 L60,65 L60,90 L55,95 L45,95 L40,90 L40,65 L45,60 Z' },
      { id: 'deathstar', name: 'Death Star', path: 'M50,5 A45,45 0 1,1 50,95 A45,45 0 1,1 50,5 M50,30 L95,50 L50,30 M35,35 A15,15 0 1,1 35,35.01' },
      { id: 'glasses_round', name: 'Round Glasses', path: 'M15,50 A18,18 0 1,1 51,50 A18,18 0 1,1 15,50 M49,50 A18,18 0 1,1 85,50 A18,18 0 1,1 49,50 M5,48 L15,48 M85,48 L95,48 M51,48 L49,48' },
    ]
  },
  scientific: {
    label: "Science & Data",
    icon: Atom,
    shapes: [
      { id: 'dna', name: 'DNA Helix', path: 'M30,10 Q50,25 70,10 M30,30 Q50,15 70,30 M30,50 Q50,65 70,50 M30,70 Q50,55 70,70 M30,90 Q50,105 70,90 M35,20 L65,20 M35,40 L65,40 M35,60 L65,60 M35,80 L65,80' },
      { id: 'atom', name: 'Atom', path: 'M50,50 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M50,10 A40,15 0 1,1 50,90 A40,15 0 1,1 50,10 M50,10 A15,40 0 1,1 50,90 A15,40 0 1,1 50,10' },
      { id: 'molecule', name: 'Molecule', path: 'M30,30 A10,10 0 1,1 30,30.01 M70,30 A10,10 0 1,1 70,30.01 M50,70 A10,10 0 1,1 50,70.01 M35,35 L65,35 M32,38 L48,65 M68,38 L52,65' },
      { id: 'brain', name: 'Brain', path: 'M50,15 Q65,10 75,20 Q90,25 85,45 Q95,55 85,70 Q85,85 70,85 L65,90 L60,85 Q50,90 40,85 L35,90 L30,85 Q15,85 15,70 Q5,55 15,45 Q10,25 25,20 Q35,10 50,15 M40,30 Q50,25 60,30 M35,45 Q50,40 65,45 M35,60 Q50,55 65,60 M40,75 Q50,70 60,75' },
      { id: 'synapse', name: 'Neural Synapse', path: 'M10,50 L25,50 M25,40 L25,60 A15,10 0 0,0 40,50 M45,50 C50,50 55,45 60,50 C65,55 70,50 75,50 M75,50 A15,10 0 0,0 90,50 M75,40 L75,60' },
      { id: 'hexmolecule', name: 'Benzene Ring', path: 'M50,15 L80,32.5 L80,67.5 L50,85 L20,67.5 L20,32.5 Z M50,30 L70,40 L70,60 L50,70 L30,60 L30,40 Z' },
      { id: 'fractal_node', name: 'Fractal Node', path: 'M50,50 m-30,0 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0 M50,20 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M25,65 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 M75,65 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0' },
    ]
  },
  abstract: {
    label: "Abstract & Patterns",
    icon: Sparkles,
    shapes: [
      { id: 'crop_circle', name: 'Crop Circle', path: 'M50,5 A45,45 0 1,1 50,95 A45,45 0 1,1 50,5 M50,20 A30,30 0 1,1 50,80 A30,30 0 1,1 50,20 M50,35 A15,15 0 1,1 50,65 A15,15 0 1,1 50,35' },
      { id: 'infinity', name: 'Infinity', path: 'M50,50 C30,30 10,50 30,70 C50,90 50,10 30,30 C10,50 30,70 50,50 C70,30 90,50 70,70 C50,90 50,10 70,30 C90,50 70,70 50,50' },
      { id: 'spiral', name: 'Spiral', path: 'M50,50 Q55,45 60,50 Q65,55 60,60 Q50,70 40,60 Q30,50 40,40 Q55,25 70,40 Q85,55 70,70 Q50,90 30,70 Q10,50 30,30 Q55,5 80,30' },
      { id: 'mandala', name: 'Mandala', path: 'M50,10 L55,40 L85,25 L60,45 L90,50 L60,55 L85,75 L55,60 L50,90 L45,60 L15,75 L40,55 L10,50 L40,45 L15,25 L45,40 Z' },
      { id: 'wave_pattern', name: 'Sound Wave', path: 'M10,50 Q20,30 30,50 Q40,70 50,50 Q60,30 70,50 Q80,70 90,50' },
      { id: 'geometric_eye', name: 'Geometric Eye', path: 'M5,50 Q50,10 95,50 Q50,90 5,50 M50,35 A15,15 0 1,1 50,65 A15,15 0 1,1 50,35 M50,42 A8,8 0 1,1 50,58 A8,8 0 1,1 50,42' },
      { id: 'alien_head', name: 'Alien', path: 'M50,5 C25,5 15,25 12,45 C10,65 20,80 35,88 L42,95 L50,90 L58,95 L65,88 C80,80 90,65 88,45 C85,25 75,5 50,5 Z M30,40 C30,32 38,28 42,35 C46,42 42,52 35,52 C28,52 30,45 30,40 Z M58,35 C62,28 70,32 70,40 C70,45 72,52 65,52 C58,52 54,42 58,35 Z M35,40 A4,4 0 1,1 39,40 A4,4 0 1,1 35,40 M61,40 A4,4 0 1,1 65,40 A4,4 0 1,1 61,40 M45,65 L47,72 L50,70 L53,72 L55,65 Q50,68 45,65' },
      { id: 'eye_brain', name: 'Eye Overthink', path: 'M5,50 Q50,15 95,50 Q50,85 5,50 M50,30 A20,20 0 1,1 50,70 A20,20 0 1,1 50,30 M45,38 Q50,32 58,38 Q65,42 60,50 Q65,58 58,62 Q50,68 42,62 Q35,58 40,50 Q35,42 45,38 M50,45 A5,5 0 1,1 50,55 A5,5 0 1,1 50,45' },
    ]
  },
  tech_binary: {
    label: "Tech & Code",
    icon: Binary,
    shapes: [
      { id: 'binary_block', name: 'Binary Pattern', path: 'M10,10 L20,10 L20,25 L10,25 Z M25,10 L35,10 L35,25 L25,25 Z M40,10 L50,10 L50,25 L40,25 Z M55,10 L65,10 L65,25 L55,25 Z M10,30 L20,30 L20,45 L10,45 Z M25,30 L35,30 L35,45 L25,45 Z' },
      { id: 'circuit', name: 'Circuit Board', path: 'M10,50 L30,50 L30,30 L50,30 L50,50 L70,50 L70,70 L90,70 M30,50 L30,70 L50,70 M50,30 L50,10 M70,50 L70,30 L90,30' },
      { id: 'qr_corner', name: 'QR Corner', path: 'M10,10 L40,10 L40,40 L10,40 Z M15,15 L35,15 L35,35 L15,35 Z M20,20 L30,20 L30,30 L20,30 Z' },
      { id: 'wifi', name: 'WiFi Symbol', path: 'M50,80 A5,5 0 1,1 50,80.01 M35,65 A20,15 0 0,1 65,65 M20,50 A35,25 0 0,1 80,50 M5,35 A50,35 0 0,1 95,35' },
      { id: 'power', name: 'Power Button', path: 'M50,5 A45,45 0 1,1 50,95 A45,45 0 1,1 50,5 M50,15 L50,50 M50,25 A25,25 0 1,0 75,50' },
      { id: 'brackets', name: 'Code Brackets', path: 'M30,10 L20,10 L20,90 L30,90 M70,10 L80,10 L80,90 L70,90 M35,50 L45,40 L55,50 L45,60 Z' },
    ]
  },
  classic: {
    label: "Classic Shapes",
    icon: Shapes,
    shapes: [
      { id: 'heart', name: 'Heart', path: 'M50,88 C50,88 10,60 10,35 C10,15 25,8 50,25 C75,8 90,15 90,35 C90,60 50,88 50,88 Z' },
      { id: 'star', name: 'Star', path: 'M50,5 L61,40 L98,40 L68,60 L79,95 L50,75 L21,95 L32,60 L2,40 L39,40 Z' },
      { id: 'moon', name: 'Crescent Moon', path: 'M70,10 A40,40 0 1,1 70,90 A30,30 0 1,0 70,10' },
      { id: 'lightning', name: 'Lightning', path: 'M55,5 L35,45 L50,45 L30,95 L70,40 L55,40 L75,5 Z' },
      { id: 'diamond', name: 'Diamond', path: 'M50,5 L90,50 L50,95 L10,50 Z' },
      { id: 'clover', name: 'Four Leaf Clover', path: 'M50,40 A15,15 0 1,1 50,10 A15,15 0 1,1 50,40 M60,50 A15,15 0 1,1 90,50 A15,15 0 1,1 60,50 M50,60 A15,15 0 1,1 50,90 A15,15 0 1,1 50,60 M40,50 A15,15 0 1,1 10,50 A15,15 0 1,1 40,50 M48,88 L52,88 L52,95 L48,95 Z' },
      { id: 'music_note', name: 'Music Note', path: 'M35,75 A12,12 0 1,1 35,75.01 M47,75 L47,20 L75,10 L75,25 L47,35' },
      { id: 'coffee', name: 'Coffee Cup', path: 'M20,30 L80,30 L75,85 A10,10 0 0,1 65,95 L35,95 A10,10 0 0,1 25,85 Z M80,40 L90,40 A10,15 0 0,1 90,70 L80,70' },
      { id: 'lips', name: 'Lips', path: 'M10,50 Q25,35 50,35 Q75,35 90,50 Q75,70 50,65 Q25,70 10,50 M20,50 Q35,45 50,48 Q65,45 80,50 Q65,55 50,52 Q35,55 20,50' },
      { id: 'arrow_right', name: 'Arrow Right', path: 'M10,45 L60,45 L60,30 L90,50 L60,70 L60,55 L10,55 Z' },
      { id: 'pineapple', name: 'Pineapple', path: 'M50,5 L45,15 L40,5 L42,18 L35,12 L40,22 L30,20 L38,28 L50,25 L62,28 L70,20 L60,22 L65,12 L58,18 L60,5 L55,15 Z M30,35 Q25,50 30,70 Q35,90 50,95 Q65,90 70,70 Q75,50 70,35 Q60,30 50,32 Q40,30 30,35 M35,45 L42,50 M45,40 L50,48 M55,40 L58,48 M62,45 L68,52 M38,55 L45,60 M50,55 L55,62 M60,55 L65,62 M40,68 L48,73 M52,68 L58,75 M62,70 L68,75' },
      { id: 'leaf', name: 'Hemp Leaf', path: 'M50,95 L50,55 M50,55 L30,25 Q35,35 50,55 M50,55 L70,25 Q65,35 50,55 M50,55 L15,45 Q30,48 50,55 M50,55 L85,45 Q70,48 50,55 M50,55 L5,55 Q25,52 50,55 M50,55 L95,55 Q75,52 50,55 M50,55 L20,70 Q35,60 50,55 M50,55 L80,70 Q65,60 50,55' },
    ]
  },
  wall_art: {
    label: "Wall Art",
    icon: Sun,
    shapes: [
      { id: 'detailed_tree', name: 'Tree of Life', path: 'M50,95 L50,70 M50,70 L35,55 M35,55 L25,40 M25,40 L15,25 M25,40 L30,25 M35,55 L40,40 L35,25 M50,70 L50,50 M50,50 L45,35 L40,20 M50,50 L55,35 L60,20 M50,70 L65,55 M65,55 L75,40 M75,40 L85,25 M75,40 L70,25 M65,55 L60,40 L65,25 M35,55 L30,50 L20,45 M35,55 L32,48 L25,42 M65,55 L70,50 L80,45 M65,55 L68,48 L75,42 M25,40 L20,35 L12,28 M75,40 L80,35 L88,28 M40,40 L38,32 L32,22 M60,40 L62,32 L68,22 M50,50 L48,42 L44,30 M50,50 L52,42 L56,30 M15,25 L10,18 M85,25 L90,18 M30,25 L28,15 M70,25 L72,15 M40,20 L38,10 M60,20 L62,10 M35,25 L33,12 M65,25 L67,12' },
      { id: 'branching_tree', name: 'Branching Tree', path: 'M50,98 L50,75 M50,75 C40,65 30,55 20,45 M50,75 C60,65 70,55 80,45 M20,45 C15,38 10,30 5,20 M20,45 C25,38 28,30 30,20 M80,45 C85,38 90,30 95,20 M80,45 C75,38 72,30 70,20 M50,75 L50,55 M50,55 C45,45 40,35 35,25 M50,55 C55,45 60,35 65,25 M35,25 C32,18 28,10 25,2 M35,25 C38,18 42,10 45,2 M65,25 C68,18 72,10 75,2 M65,25 C62,18 58,10 55,2 M20,45 L15,35 L8,25 M80,45 L85,35 L92,25 M5,20 L2,10 M30,20 L32,8 M95,20 L98,10 M70,20 L68,8' },
      { id: 'solar_system', name: 'Solar System', path: 'M50,50 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M5,50 L95,50 M50,5 L50,95 M50,50 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 M50,50 m-22,0 a22,22 0 1,0 44,0 a22,22 0 1,0 -44,0 M50,50 m-32,0 a32,32 0 1,0 64,0 a32,32 0 1,0 -64,0 M50,50 m-42,0 a42,42 0 1,0 84,0 a42,42 0 1,0 -84,0 M62,50 A3,3 0 1,1 62,50.01 M72,50 A4,4 0 1,1 72,50.01 M82,50 A3,3 0 1,1 82,50.01 M92,50 A2,2 0 1,1 92,50.01' },
      { id: 'geometric_lines', name: 'Line Art', path: 'M10,50 L90,50 M50,10 L50,90 M20,20 L80,80 M80,20 L20,80 M50,10 L90,50 L50,90 L10,50 Z M30,30 L70,30 L70,70 L30,70 Z M50,20 A30,30 0 1,1 50,80 A30,30 0 1,1 50,20' },
      { id: 'planets_orbit', name: 'Planets & Orbits', path: 'M50,50 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M10,30 L10,70 M25,15 L25,85 M40,8 L40,92 M60,8 L60,92 M75,15 L75,85 M90,30 L90,70 M10,50 A5,5 0 1,1 10,50.01 M25,50 A6,6 0 1,1 25,50.01 M40,50 A4,4 0 1,1 40,50.01 M60,50 A7,7 0 1,1 60,50.01 M75,50 A5,5 0 1,1 75,50.01 M90,50 A3,3 0 1,1 90,50.01' },
      { id: 'mountain_range', name: 'Mountains', path: 'M0,90 L20,50 L30,65 L50,25 L65,55 L75,40 L90,70 L100,90 Z M50,25 L55,35 L60,30 L65,55 M20,50 L25,55 L30,65 M75,40 L80,50 L85,45' },
      { id: 'wave_art', name: 'Wave Art', path: 'M5,30 Q20,10 35,30 Q50,50 65,30 Q80,10 95,30 M5,50 Q20,30 35,50 Q50,70 65,50 Q80,30 95,50 M5,70 Q20,50 35,70 Q50,90 65,70 Q80,50 95,70' },
      { id: 'abstract_circles', name: 'Circle Art', path: 'M30,30 A15,15 0 1,1 30,30.01 M70,30 A12,12 0 1,1 70,30.01 M50,50 A20,20 0 1,1 50,50.01 M25,70 A10,10 0 1,1 25,70.01 M75,75 A8,8 0 1,1 75,75.01 M50,85 A5,5 0 1,1 50,85.01' },
    ]
  },
};

const ledTypeOptions = [
  { value: 'none', label: 'No LED', description: 'Solid shape only' },
  { value: 'el_wire', label: 'EL Wire', description: '2-3mm glow wire' },
  { value: 'ws2812b', label: 'WS2812B', description: 'Addressable RGB LEDs' },
  { value: 'neopixel', label: 'NeoPixel', description: 'Individual addressable' },
  { value: 'rgb_strip', label: 'RGB Strip', description: 'Standard LED strip' },
  { value: 'cob_strip', label: 'COB Strip', description: 'Continuous LED light' },
  { value: 'led_filament', label: 'LED Filament', description: 'Flexible filament' },
];

const diffuserModeOptions = [
  { value: 'standard', label: 'Standard', description: 'Flat rectangular diffuser' },
  { value: 'clam_shell', label: 'Clam Shell', description: 'Raised shape-following diffuser' },
  { value: 'contour', label: 'Contour', description: 'Matches exact shape outline' },
];

const createDefaultLayer = (index: number, customId?: string): ShapeLayer => ({
  id: customId || `layer_${Date.now()}_${index}`,
  name: `Layer ${index + 1}`,
  visible: true,
  locked: false,
  sourceType: 'stock',
  stockShape: 'detailed_tree',
  stockCategory: 'wall_art',
  paths: [],
  thickness: 2,
  offsetZ: index * 3,
  mode: 'solid',
  ledType: 'none',
  ledChannelWidth: 4,
  ledChannelDepth: 3,
  diffuserMode: 'standard',
  color: index === 0 ? '#1a1a2e' : index === 1 ? '#16213e' : '#0f3460',
});

const INITIAL_LAYER_ID = 'initial_layer_0';

const defaultSettings: LightBoxSettings = {
  boxWidth: 300,
  boxHeight: 400,
  boxDepth: 25,
  wallThickness: 3,
  
  boxShape: 'rectangle',
  cornerRadius: 0,
  
  panelConfig: 'single',
  panelGap: 15,
  panelCount: 1,
  
  ledPlacement: 'perimeter',
  ledColor: '#fbbf24',
  ledBrightness: 100,
  glowIntensity: 80,
  glowSpread: 25,
  
  wallStandoff: 20,
  mountingType: 'standoff_posts',
  
  frameStyle: 'simple',
  frameWidth: 8,
  frameColor: '#1a1a1a',
  
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
  
  layers: [createDefaultLayer(0, INITIAL_LAYER_ID)],
  selectedLayerId: INITIAL_LAYER_ID,
  
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

const boxShapeOptions = [
  { value: 'rectangle', label: 'Rectangle', icon: '▬' },
  { value: 'rounded', label: 'Rounded Rectangle', icon: '▢' },
  { value: 'oval', label: 'Oval/Ellipse', icon: '⬭' },
  { value: 'hexagon', label: 'Hexagon', icon: '⬡' },
];

const diffuserTypeOptions = [
  { value: 'snap_fit', label: 'Snap Fit', description: 'Clicks into place' },
  { value: 'overlay', label: 'Overlay', description: 'Sits on top' },
  { value: 'slide_groove', label: 'Slide Groove', description: 'Slides in from side' },
  { value: 'friction_fit', label: 'Friction Fit', description: 'Press fit' },
  { value: 'none', label: 'No Diffuser', description: 'Skip diffuser' },
];

const imageModeOptions = [
  { value: 'stencil', label: 'Stencil', description: 'Design cut through - light shines through background' },
  { value: 'solid', label: 'Solid Silhouette', description: 'Design blocks light - classic backlit effect' },
  { value: 'transparent', label: 'Transparent', description: 'Print in clear filament - embossed design' },
  { value: 'glow_dark', label: 'Glow in Dark', description: 'Design in glow filament - glows after lights off' },
  { value: 'tubular_el', label: 'Tubular (EL Wire)', description: 'Hollow channels - insert EL wire for outline glow' },
  { value: 'lithophane', label: 'Lithophane', description: 'Photo-to-3D - reveals image when backlit' },
  { value: 'none', label: 'No Image', description: 'Blank panel - perimeter glow only' },
];

const designTypeOptions = [
  { value: 'tree', label: 'Tree' },
  { value: 'geometric', label: 'Geometric Lines' },
  { value: 'circles', label: 'Abstract Circles' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
  { value: 'moon', label: 'Crescent Moon' },
  { value: 'custom', label: 'House & Tree Scene' },
];

const diffusionPatternOptions = [
  { value: 'none', label: 'Smooth', description: 'No pattern' },
  { value: 'honeycomb', label: 'Honeycomb', description: 'Hexagonal cells' },
  { value: 'dots', label: 'Dot Matrix', description: 'Regular dots' },
  { value: 'grid', label: 'Grid', description: 'Square grid lines' },
  { value: 'waves', label: 'Waves', description: 'Wavy lines' },
  { value: 'diamonds', label: 'Diamonds', description: 'Diamond pattern' },
  { value: 'lines', label: 'Lines', description: 'Parallel lines' },
  { value: 'voronoi', label: 'Voronoi', description: 'Organic cells' },
];

const holeTypeOptions = [
  { value: 'led_3mm', label: '3mm LED', diameter: 3.2 },
  { value: 'led_5mm', label: '5mm LED', diameter: 5.2 },
  { value: 'led_10mm', label: '10mm LED/UV', diameter: 10.2 },
  { value: 'wire_small', label: 'Wire (small)', diameter: 3 },
  { value: 'wire_medium', label: 'Wire (medium)', diameter: 5 },
  { value: 'wire_large', label: 'Wire (large)', diameter: 8 },
  { value: 'mounting', label: 'Mounting', diameter: 4 },
  { value: 'vent', label: 'Ventilation', diameter: 6 },
];

export function LightBoxEditor() {
  const [settings, setSettings] = useState<LightBoxSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('layers');
  const [shapeCategory, setShapeCategory] = useState<string>('classic');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState<{x: number; y: number}[]>([]);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const traceCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const updateSetting = useCallback(<K extends keyof LightBoxSettings>(key: K, value: LightBoxSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const selectedLayer = settings.layers.find(l => l.id === settings.selectedLayerId);

  const addLayer = useCallback(() => {
    const newLayer = createDefaultLayer(settings.layers.length);
    setSettings(prev => ({ 
      ...prev, 
      layers: [...prev.layers, newLayer],
      selectedLayerId: newLayer.id
    }));
  }, [settings.layers.length]);

  const removeLayer = useCallback((id: string) => {
    setSettings(prev => {
      const newLayers = prev.layers.filter(l => l.id !== id);
      return {
        ...prev,
        layers: newLayers,
        selectedLayerId: newLayers.length > 0 ? newLayers[0].id : null
      };
    });
  }, []);

  const duplicateLayer = useCallback((id: string) => {
    const layer = settings.layers.find(l => l.id === id);
    if (!layer) return;
    const newLayer: ShapeLayer = {
      ...layer,
      id: `layer_${Date.now()}`,
      name: `${layer.name} Copy`,
      offsetZ: layer.offsetZ + 3,
    };
    setSettings(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      selectedLayerId: newLayer.id
    }));
  }, [settings.layers]);

  const updateLayer = useCallback((id: string, updates: Partial<ShapeLayer>) => {
    setSettings(prev => ({
      ...prev,
      layers: prev.layers.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  }, []);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setSettings(prev => {
      const idx = prev.layers.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.layers.length) return prev;
      const newLayers = [...prev.layers];
      [newLayers[idx], newLayers[newIdx]] = [newLayers[newIdx], newLayers[idx]];
      return { ...prev, layers: newLayers };
    });
  }, []);

  const selectStockShape = useCallback((category: string, shapeId: string) => {
    if (!settings.selectedLayerId) return;
    updateLayer(settings.selectedLayerId, {
      sourceType: 'stock',
      stockCategory: category,
      stockShape: shapeId,
    });
  }, [settings.selectedLayerId, updateLayer]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings.selectedLayerId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateLayer(settings.selectedLayerId!, {
        sourceType: 'upload',
        uploadedImage: event.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  }, [settings.selectedLayerId, updateLayer]);

  const addHole = useCallback((side: HolePlacement['side']) => {
    const newHole: HolePlacement = {
      id: `hole_${Date.now()}`,
      x: settings.boxWidth / 2,
      y: settings.boxDepth / 2,
      type: 'wire_medium',
      side,
    };
    setSettings(prev => ({ ...prev, holes: [...prev.holes, newHole] }));
  }, [settings.boxWidth, settings.boxDepth]);

  const removeHole = useCallback((id: string) => {
    setSettings(prev => ({ ...prev, holes: prev.holes.filter(h => h.id !== id) }));
  }, []);

  const updateHole = useCallback((id: string, updates: Partial<HolePlacement>) => {
    setSettings(prev => ({
      ...prev,
      holes: prev.holes.map(h => h.id === id ? { ...h, ...updates } : h)
    }));
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/light-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Export failed');

      const contentType = response.headers.get('Content-Type');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = contentType?.includes('zip') 
        ? `lightbox_${settings.boxWidth}x${settings.boxHeight}.zip`
        : `lightbox_${settings.boxWidth}x${settings.boxHeight}.scad`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: settings.exportParts.includes('all') 
          ? "Downloaded ZIP with all parts"
          : "Downloaded OpenSCAD file",
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Could not generate light box",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full gap-4" data-testid="lightbox-editor">
      <div className="w-[420px] flex flex-col gap-3 overflow-y-auto p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Box className="w-5 h-5" />
              Advanced Light Box
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="layers" data-testid="tab-layers" className="text-xs">
                  <Layers className="w-3 h-3 mr-1" />
                  Layers
                </TabsTrigger>
                <TabsTrigger value="box" data-testid="tab-box" className="text-xs">Box</TabsTrigger>
                <TabsTrigger value="diffuser" data-testid="tab-diffuser" className="text-xs">Diffuser</TabsTrigger>
                <TabsTrigger value="image" data-testid="tab-image" className="text-xs">Legacy</TabsTrigger>
                <TabsTrigger value="holes" data-testid="tab-holes" className="text-xs">Holes</TabsTrigger>
              </TabsList>

              <TabsContent value="layers" className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Shape Layers</Label>
                  <Button size="sm" variant="outline" onClick={addLayer} data-testid="button-add-layer">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Layer
                  </Button>
                </div>

                <ScrollArea className="h-[180px] border rounded-lg p-2">
                  {settings.layers.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No layers yet</p>
                      <p className="text-xs">Add layers to create multi-depth silhouettes</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {settings.layers.map((layer, idx) => (
                        <div
                          key={layer.id}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                            settings.selectedLayerId === layer.id
                              ? 'border-primary bg-primary/10'
                              : 'border-transparent bg-muted/50 hover-elevate'
                          }`}
                          onClick={() => updateSetting('selectedLayerId', layer.id)}
                          data-testid={`layer-item-${idx}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                              >
                                {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-50" />}
                              </Button>
                              <Input
                                value={layer.name}
                                onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 text-xs flex-1 min-w-0"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }}
                                disabled={idx === 0}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }}
                                disabled={idx === settings.layers.length - 1}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 text-destructive"
                                onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {layer.sourceType}
                            </Badge>
                            {layer.ledType !== 'none' && (
                              <Badge variant="outline" className="text-[10px]">
                                <Zap className="w-2 h-2 mr-1" />
                                {layer.ledType.replace('_', ' ')}
                              </Badge>
                            )}
                            {layer.diffuserMode !== 'standard' && (
                              <Badge variant="outline" className="text-[10px]">
                                {layer.diffuserMode}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {selectedLayer && (
                  <>
                    <Card className="border-primary/30">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-xs flex items-center gap-2">
                          <Shapes className="w-4 h-4" />
                          Shape Source: {selectedLayer.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-3">
                        <div className="grid grid-cols-4 gap-1">
                          {(['stock', 'draw', 'trace', 'upload'] as const).map(sourceType => (
                            <Button
                              key={sourceType}
                              size="sm"
                              variant={selectedLayer.sourceType === sourceType ? 'default' : 'outline'}
                              onClick={() => updateLayer(selectedLayer.id, { sourceType })}
                              className="text-xs h-7"
                            >
                              {sourceType === 'stock' && <Shapes className="w-3 h-3 mr-1" />}
                              {sourceType === 'draw' && <Pencil className="w-3 h-3 mr-1" />}
                              {sourceType === 'trace' && <Wand2 className="w-3 h-3 mr-1" />}
                              {sourceType === 'upload' && <Upload className="w-3 h-3 mr-1" />}
                              {sourceType.charAt(0).toUpperCase() + sourceType.slice(1)}
                            </Button>
                          ))}
                        </div>

                        {selectedLayer.sourceType === 'stock' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-[10px] mb-1 block">Shape Categories:</Label>
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(stockShapeLibrary).map(([key, category]) => {
                                  const IconComponent = category.icon;
                                  return (
                                    <Button
                                      key={key}
                                      size="sm"
                                      variant={shapeCategory === key ? 'default' : 'outline'}
                                      onClick={() => setShapeCategory(key)}
                                      className="text-[10px] h-6 px-2"
                                      data-testid={`category-${key}`}
                                    >
                                      <IconComponent className="w-3 h-3 mr-1" />
                                      {category.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px] mb-1 block">Pick a Shape:</Label>
                              <ScrollArea className="h-[200px] border rounded-md p-2">
                                <div className="grid grid-cols-3 gap-2">
                                  {stockShapeLibrary[shapeCategory as keyof typeof stockShapeLibrary]?.shapes.map(shape => (
                                    <Button
                                      key={shape.id}
                                      size="sm"
                                      variant={selectedLayer.stockShape === shape.id ? 'default' : 'outline'}
                                      onClick={() => selectStockShape(shapeCategory, shape.id)}
                                      className={`text-[10px] h-auto py-2 flex-col ${selectedLayer.stockShape === shape.id ? 'ring-2 ring-primary' : ''}`}
                                      data-testid={`shape-${shape.id}`}
                                    >
                                      <svg viewBox="0 0 100 100" className="w-10 h-10 mb-1">
                                        <path d={shape.path} fill="currentColor" opacity={0.9} />
                                      </svg>
                                      <span className="truncate w-full text-[9px]">{shape.name}</span>
                                    </Button>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}

                        {selectedLayer.sourceType === 'draw' && (
                          <div className="p-2 bg-muted/50 rounded-lg text-center">
                            <Pencil className="w-6 h-6 mx-auto mb-1 opacity-50" />
                            <p className="text-xs text-muted-foreground">Freehand drawing canvas</p>
                            <p className="text-[10px] text-muted-foreground">Draw your custom shape in the preview area</p>
                          </div>
                        )}

                        {selectedLayer.sourceType === 'trace' && (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              Upload an image to auto-trace its outline
                            </p>
                          </div>
                        )}

                        {selectedLayer.sourceType === 'upload' && (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="text-xs"
                            />
                            {selectedLayer.uploadedImage && (
                              <div className="relative aspect-video bg-muted rounded overflow-hidden">
                                <img
                                  src={selectedLayer.uploadedImage}
                                  alt="Uploaded"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-xs flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Layer Options
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Thickness: {selectedLayer.thickness}mm</Label>
                            <Slider
                              value={[selectedLayer.thickness]}
                              onValueChange={([v]) => updateLayer(selectedLayer.id, { thickness: v })}
                              min={0.5}
                              max={6}
                              step={0.5}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Z Offset: {selectedLayer.offsetZ}mm</Label>
                            <Slider
                              value={[selectedLayer.offsetZ]}
                              onValueChange={([v]) => updateLayer(selectedLayer.id, { offsetZ: v })}
                              min={0}
                              max={30}
                              step={1}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-[10px] mb-1 block">Render Mode</Label>
                          <div className="grid grid-cols-4 gap-1">
                            {(['stencil', 'solid', 'channel', 'lithophane'] as const).map(mode => (
                              <Button
                                key={mode}
                                size="sm"
                                variant={selectedLayer.mode === mode ? 'default' : 'outline'}
                                onClick={() => updateLayer(selectedLayer.id, { mode })}
                                className="text-[10px] h-6"
                              >
                                {mode}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-[10px] mb-1 block">LED Type</Label>
                          <Select
                            value={selectedLayer.ledType}
                            onValueChange={(v) => updateLayer(selectedLayer.id, { ledType: v as ShapeLayer['ledType'] })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ledTypeOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span>{opt.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedLayer.ledType !== 'none' && (
                          <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-primary/20">
                            <div>
                              <Label className="text-[10px]">Channel Width: {selectedLayer.ledChannelWidth}mm</Label>
                              <Slider
                                value={[selectedLayer.ledChannelWidth]}
                                onValueChange={([v]) => updateLayer(selectedLayer.id, { ledChannelWidth: v })}
                                min={2}
                                max={12}
                                step={0.5}
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Channel Depth: {selectedLayer.ledChannelDepth}mm</Label>
                              <Slider
                                value={[selectedLayer.ledChannelDepth]}
                                onValueChange={([v]) => updateLayer(selectedLayer.id, { ledChannelDepth: v })}
                                min={2}
                                max={8}
                                step={0.5}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label className="text-[10px] mb-1 block">Diffuser Mode</Label>
                          <div className="grid grid-cols-3 gap-1">
                            {diffuserModeOptions.map(opt => (
                              <Button
                                key={opt.value}
                                size="sm"
                                variant={selectedLayer.diffuserMode === opt.value ? 'default' : 'outline'}
                                onClick={() => updateLayer(selectedLayer.id, { diffuserMode: opt.value as ShapeLayer['diffuserMode'] })}
                                className="text-[10px] h-6"
                                title={opt.description}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                          {selectedLayer.diffuserMode === 'clam_shell' && (
                            <p className="text-[10px] text-muted-foreground mt-1 bg-primary/5 p-1 rounded">
                              Clam shell creates a raised diffuser that follows the shape contour, like CNC routing
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              <TabsContent value="box" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Width (mm)</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[settings.boxWidth]}
                        onValueChange={([v]) => updateSetting('boxWidth', v)}
                        min={50}
                        max={400}
                        step={5}
                        data-testid="slider-box-width"
                      />
                      <span className="text-xs w-10 text-right">{settings.boxWidth}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Height (mm)</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[settings.boxHeight]}
                        onValueChange={([v]) => updateSetting('boxHeight', v)}
                        min={50}
                        max={400}
                        step={5}
                        data-testid="slider-box-height"
                      />
                      <span className="text-xs w-10 text-right">{settings.boxHeight}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Depth (mm)</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[settings.boxDepth]}
                        onValueChange={([v]) => updateSetting('boxDepth', v)}
                        min={15}
                        max={80}
                        step={1}
                        data-testid="slider-box-depth"
                      />
                      <span className="text-xs w-10 text-right">{settings.boxDepth}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-2 block">Box Shape</Label>
                  <div className="flex gap-2">
                    {boxShapeOptions.map(shape => (
                      <Button
                        key={shape.value}
                        size="sm"
                        variant={settings.boxShape === shape.value ? 'default' : 'outline'}
                        onClick={() => updateSetting('boxShape', shape.value as LightBoxSettings['boxShape'])}
                        className="flex-1"
                        data-testid={`button-shape-${shape.value}`}
                      >
                        <span className="mr-1">{shape.icon}</span>
                        <span className="text-xs">{shape.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {settings.boxShape === 'rounded' && (
                  <div>
                    <Label className="text-xs">Corner Radius: {settings.cornerRadius}mm</Label>
                    <Slider
                      value={[settings.cornerRadius]}
                      onValueChange={([v]) => updateSetting('cornerRadius', v)}
                      min={2}
                      max={30}
                      step={1}
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">Wall Thickness: {settings.wallThickness}mm</Label>
                  <Slider
                    value={[settings.wallThickness]}
                    onValueChange={([v]) => updateSetting('wallThickness', v)}
                    min={1.5}
                    max={5}
                    step={0.5}
                    data-testid="slider-wall-thickness"
                  />
                </div>

                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      LED Backlighting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    <div>
                      <Label className="text-[10px] mb-1 block">LED Placement</Label>
                      <div className="grid grid-cols-2 gap-1">
                        {(['perimeter', 'behind', 'edge_lit', 'diffused'] as const).map(placement => (
                          <Button
                            key={placement}
                            size="sm"
                            variant={settings.ledPlacement === placement ? 'default' : 'outline'}
                            onClick={() => updateSetting('ledPlacement', placement)}
                            className="text-[10px] h-6"
                          >
                            {placement.replace('_', ' ')}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">LED Color</Label>
                        <Input
                          type="color"
                          value={settings.ledColor}
                          onChange={(e) => updateSetting('ledColor', e.target.value)}
                          className="h-7 p-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Glow Intensity: {settings.glowIntensity}%</Label>
                        <Slider
                          value={[settings.glowIntensity]}
                          onValueChange={([v]) => updateSetting('glowIntensity', v)}
                          min={20}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px]">Glow Spread: {settings.glowSpread}mm</Label>
                      <Slider
                        value={[settings.glowSpread]}
                        onValueChange={([v]) => updateSetting('glowSpread', v)}
                        min={5}
                        max={50}
                        step={5}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Frame & Mounting
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Frame Width: {settings.frameWidth}mm</Label>
                        <Slider
                          value={[settings.frameWidth]}
                          onValueChange={([v]) => updateSetting('frameWidth', v)}
                          min={0}
                          max={20}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Frame Color</Label>
                        <Input
                          type="color"
                          value={settings.frameColor}
                          onChange={(e) => updateSetting('frameColor', e.target.value)}
                          className="h-7 p-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px]">Wall Standoff: {settings.wallStandoff}mm</Label>
                      <Slider
                        value={[settings.wallStandoff]}
                        onValueChange={([v]) => updateSetting('wallStandoff', v)}
                        min={5}
                        max={40}
                        step={5}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Distance from wall creates LED halo glow effect
                      </p>
                    </div>
                    <div>
                      <Label className="text-[10px] mb-1 block">Mounting Type</Label>
                      <Select
                        value={settings.mountingType}
                        onValueChange={(v) => updateSetting('mountingType', v as LightBoxSettings['mountingType'])}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standoff_posts">Standoff Posts</SelectItem>
                          <SelectItem value="french_cleat">French Cleat</SelectItem>
                          <SelectItem value="keyhole">Keyhole Slots</SelectItem>
                          <SelectItem value="adhesive">Adhesive Strips</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">LED Channel (internal)</Label>
                  <Switch
                    checked={settings.includeLedChannel}
                    onCheckedChange={v => updateSetting('includeLedChannel', v)}
                    data-testid="switch-led-channel"
                  />
                </div>

                {settings.includeLedChannel && (
                  <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-primary/20">
                    <div>
                      <Label className="text-xs">Channel Width: {settings.ledChannelWidth}mm</Label>
                      <Slider
                        value={[settings.ledChannelWidth]}
                        onValueChange={([v]) => updateSetting('ledChannelWidth', v)}
                        min={5}
                        max={20}
                        step={1}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Channel Depth: {settings.ledChannelDepth}mm</Label>
                      <Slider
                        value={[settings.ledChannelDepth]}
                        onValueChange={([v]) => updateSetting('ledChannelDepth', v)}
                        min={2}
                        max={10}
                        step={0.5}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Back Panel</Label>
                  <Switch
                    checked={settings.includeBackPanel}
                    onCheckedChange={v => updateSetting('includeBackPanel', v)}
                    data-testid="switch-back-panel"
                  />
                </div>

                {settings.includeBackPanel && (
                  <div className="flex items-center justify-between pl-4 border-l-2 border-primary/20">
                    <Label className="text-xs">Ventilation Holes</Label>
                    <Switch
                      checked={settings.backPanelVentHoles}
                      onCheckedChange={v => updateSetting('backPanelVentHoles', v)}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="diffuser" className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs mb-2 block">Diffuser Mount Type</Label>
                  <Select
                    value={settings.diffuserType}
                    onValueChange={v => updateSetting('diffuserType', v as LightBoxSettings['diffuserType'])}
                  >
                    <SelectTrigger data-testid="select-diffuser-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {diffuserTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {settings.diffuserType !== 'none' && (
                  <>
                    <div>
                      <Label className="text-xs">Diffuser Thickness: {settings.diffuserThickness}mm</Label>
                      <Slider
                        value={[settings.diffuserThickness]}
                        onValueChange={([v]) => updateSetting('diffuserThickness', v)}
                        min={0.5}
                        max={4}
                        step={0.5}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Inset Depth: {settings.diffuserInset}mm</Label>
                      <Slider
                        value={[settings.diffuserInset]}
                        onValueChange={([v]) => updateSetting('diffuserInset', v)}
                        min={1}
                        max={10}
                        step={0.5}
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">Diffusion Pattern</Label>
                      <Select
                        value={settings.diffusionPattern}
                        onValueChange={v => updateSetting('diffusionPattern', v as LightBoxSettings['diffusionPattern'])}
                      >
                        <SelectTrigger data-testid="select-diffusion-pattern">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {diffusionPatternOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span>{opt.label}</span>
                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {settings.diffusionPattern !== 'none' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Density: {settings.diffusionDensity}%</Label>
                          <Slider
                            value={[settings.diffusionDensity]}
                            onValueChange={([v]) => updateSetting('diffusionDensity', v)}
                            min={10}
                            max={90}
                            step={5}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Depth: {settings.diffusionDepth}mm</Label>
                          <Slider
                            value={[settings.diffusionDepth]}
                            onValueChange={([v]) => updateSetting('diffusionDepth', v)}
                            min={0.2}
                            max={1.5}
                            step={0.1}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="image" className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs mb-2 block">Image Mode</Label>
                  <Select
                    value={settings.imageMode}
                    onValueChange={v => updateSetting('imageMode', v as LightBoxSettings['imageMode'])}
                  >
                    <SelectTrigger data-testid="select-image-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {imageModeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {settings.imageMode !== 'none' && (
                  <>
                    <div>
                      <Label className="text-xs mb-2 block">Design</Label>
                      <Select
                        value={settings.designType}
                        onValueChange={v => updateSetting('designType', v)}
                      >
                        <SelectTrigger data-testid="select-design-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {designTypeOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block">Placement</Label>
                      <div className="flex gap-2">
                        {(['above_diffuser', 'below_diffuser', 'integrated'] as const).map(placement => (
                          <Button
                            key={placement}
                            size="sm"
                            variant={settings.imagePlacement === placement ? 'default' : 'outline'}
                            onClick={() => updateSetting('imagePlacement', placement)}
                            className="flex-1 text-xs"
                          >
                            {placement === 'above_diffuser' ? 'On Top' : placement === 'below_diffuser' ? 'Below' : 'Integrated'}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Image Thickness: {settings.imageThickness}mm</Label>
                      <Slider
                        value={[settings.imageThickness]}
                        onValueChange={([v]) => updateSetting('imageThickness', v)}
                        min={0.5}
                        max={5}
                        step={0.5}
                      />
                    </div>

                    {settings.imageMode === 'tubular_el' && (
                      <div className="p-3 bg-primary/5 rounded-lg space-y-3">
                        <Label className="text-xs font-medium flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          EL Wire Channel Settings
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Channel Width: {settings.tubeChannelWidth}mm</Label>
                            <Slider
                              value={[settings.tubeChannelWidth]}
                              onValueChange={([v]) => updateSetting('tubeChannelWidth', v)}
                              min={2}
                              max={8}
                              step={0.5}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Channel Depth: {settings.tubeChannelDepth}mm</Label>
                            <Slider
                              value={[settings.tubeChannelDepth]}
                              onValueChange={([v]) => updateSetting('tubeChannelDepth', v)}
                              min={2}
                              max={6}
                              step={0.5}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {settings.imageMode === 'lithophane' && (
                      <div className="p-3 bg-primary/5 rounded-lg space-y-3">
                        <Label className="text-xs font-medium flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Lithophane Settings
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Adjust thickness range for your image. Thinner = brighter areas.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Min (bright): {settings.lithophaneMinThickness}mm</Label>
                            <Slider
                              value={[settings.lithophaneMinThickness]}
                              onValueChange={([v]) => updateSetting('lithophaneMinThickness', v)}
                              min={0.4}
                              max={1.5}
                              step={0.1}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Max (dark): {settings.lithophaneMaxThickness}mm</Label>
                            <Slider
                              value={[settings.lithophaneMaxThickness]}
                              onValueChange={([v]) => updateSetting('lithophaneMaxThickness', v)}
                              min={2}
                              max={5}
                              step={0.2}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {settings.imageMode === 'glow_dark' && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Two-part print: Design area prints in glow-in-dark filament, background in regular filament.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="holes" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Custom Holes</Label>
                  <Select onValueChange={v => addHole(v as HolePlacement['side'])}>
                    <SelectTrigger className="w-[140px]" data-testid="select-add-hole">
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="text-xs">Add Hole</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="back">Back Panel</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left Side</SelectItem>
                      <SelectItem value="right">Right Side</SelectItem>
                      <SelectItem value="top">Top Edge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.holes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Move className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No custom holes added yet</p>
                    <p className="text-xs">Add holes for LEDs, wires, or ventilation</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {settings.holes.map(hole => (
                      <div key={hole.id} className="p-2 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {hole.side.toUpperCase()}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => removeHole(hole.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={hole.type}
                            onValueChange={v => updateHole(hole.id, { type: v as HolePlacement['type'] })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {holeTypeOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label} ({opt.diameter}mm)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={hole.x}
                              onChange={e => updateHole(hole.id, { x: Number(e.target.value) })}
                              className="w-16 h-8 px-2 text-xs rounded border"
                              placeholder="X"
                            />
                            <input
                              type="number"
                              value={hole.y}
                              onChange={e => updateHole(hole.id, { y: Number(e.target.value) })}
                              className="w-16 h-8 px-2 text-xs rounded border"
                              placeholder="Y"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs mb-2 block">Export Parts</Label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'box', 'diffuser', 'image_layer', 'back_panel'] as const).map(part => (
                  <Badge
                    key={part}
                    variant={settings.exportParts.includes(part) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      if (part === 'all') {
                        updateSetting('exportParts', ['all']);
                      } else {
                        const newParts = settings.exportParts.filter(p => p !== 'all');
                        if (newParts.includes(part)) {
                          updateSetting('exportParts', newParts.filter(p => p !== part));
                        } else {
                          updateSetting('exportParts', [...newParts, part]);
                        }
                      }
                    }}
                  >
                    {part === 'all' ? 'All Parts (ZIP)' : part.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
              data-testid="button-export-lightbox"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Generating...' : 'Export Light Box'}
            </Button>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
          <strong>Print Tips:</strong>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Box shell: Black PLA/PETG, 0.2mm layers</li>
            <li>Diffuser: White PETG or frosted acrylic</li>
            {settings.imageMode === 'transparent' && <li>Image layer: Clear PETG, thin walls</li>}
            {settings.imageMode === 'lithophane' && <li>Lithophane: White PLA, 0.1mm layers</li>}
            {settings.imageMode === 'glow_dark' && <li>Use glow filament for design areas</li>}
          </ul>
        </div>
      </div>

      <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 relative p-8 flex items-center justify-center" data-testid="lightbox-preview">
        <LightBoxPreview2D settings={settings} />
        
        <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium" data-testid="preview-dimensions">
              {settings.boxWidth} x {settings.boxHeight} x {settings.boxDepth}mm
            </span>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{settings.boxShape}</Badge>
              <Badge variant="secondary" className="text-xs">{settings.layers.length} layers</Badge>
              <Badge variant="secondary" className="text-xs">{settings.diffuserType}</Badge>
            </div>
          </div>
          {settings.layers.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {settings.layers.filter(l => l.visible).map(layer => (
                <Badge key={layer.id} variant="outline" className="text-[10px]">
                  {layer.name}
                  {layer.ledType !== 'none' && <Zap className="w-2 h-2 ml-1 inline" />}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LightBoxPreview2D({ settings }: { settings: LightBoxSettings }) {
  const scale = Math.min(400 / settings.boxWidth, 350 / settings.boxHeight);
  const w = settings.boxWidth * scale;
  const h = settings.boxHeight * scale;
  const wallPx = settings.wallThickness * scale;
  
  const getBoxPath = () => {
    switch (settings.boxShape) {
      case 'rounded':
        const r = Math.min(settings.cornerRadius * scale, w/4, h/4);
        return `M ${r},0 H ${w-r} Q ${w},0 ${w},${r} V ${h-r} Q ${w},${h} ${w-r},${h} H ${r} Q 0,${h} 0,${h-r} V ${r} Q 0,0 ${r},0`;
      case 'oval':
        return `M ${w/2},0 C ${w},0 ${w},${h} ${w/2},${h} C 0,${h} 0,0 ${w/2},0`;
      case 'hexagon':
        const s = Math.min(w, h) / 2;
        const cx = w / 2, cy = h / 2;
        return Array.from({length: 6}, (_, i) => {
          const angle = (i * 60 - 30) * Math.PI / 180;
          const x = cx + s * Math.cos(angle);
          const y = cy + s * Math.sin(angle);
          return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ') + ' Z';
      default:
        return `M 0,0 H ${w} V ${h} H 0 Z`;
    }
  };

  const getShapePath = (shapeId: string): string | null => {
    for (const category of Object.values(stockShapeLibrary)) {
      const shape = category.shapes.find(s => s.id === shapeId);
      if (shape) return shape.path;
    }
    return null;
  };

  const renderBacklitLayers = () => {
    const frameW = settings.frameWidth * scale;
    const inset = frameW + 4;
    const dw = w - inset * 2;
    const dh = h - inset * 2;
    const glowSpread = settings.glowSpread * scale * 0.5;
    
    return settings.layers
      .filter(layer => layer.visible && layer.sourceType === 'stock' && layer.stockShape)
      .map((layer, idx) => {
        const shapePath = getShapePath(layer.stockShape!);
        if (!shapePath) return null;
        
        const uniqueId = `layer-${layer.id}-${idx}`;
        
        return (
          <g key={layer.id}>
            <defs>
              <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={glowSpread} result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <mask id={`silhouette-mask-${uniqueId}`}>
                <rect x={inset} y={inset} width={dw} height={dh} fill="white" />
                <svg x={inset + dw * 0.05} y={inset + dh * 0.05} viewBox="0 0 100 100" width={dw * 0.9} height={dh * 0.9}>
                  <path d={shapePath} fill="black" stroke="black" strokeWidth="2" />
                </svg>
              </mask>
            </defs>
            
            <rect 
              x={inset} 
              y={inset} 
              width={dw} 
              height={dh} 
              fill={settings.ledColor}
              mask={`url(#silhouette-mask-${uniqueId})`}
              filter={`url(#glow-${uniqueId})`}
              opacity={settings.glowIntensity / 100}
            />
            
            <svg x={inset + dw * 0.05} y={inset + dh * 0.05} viewBox="0 0 100 100" width={dw * 0.9} height={dh * 0.9} style={{ overflow: 'visible' }}>
              <path
                d={shapePath}
                fill="#0a0a0a"
                stroke="#1a1a1a"
                strokeWidth="1"
              />
            </svg>
          </g>
        );
      });
  };

  const renderDesign = () => {
    const inset = wallPx + 5;
    const dw = w - inset * 2;
    const dh = h - inset * 2;
    
    if (settings.imageMode === 'none') return null;
    
    const designColor = settings.imageMode === 'glow_dark' ? '#22c55e' : '#0a0a0a';
    
    switch (settings.designType) {
      case 'tree':
        return (
          <g transform={`translate(${inset}, ${inset})`}>
            <rect x={dw*0.46} y={dh*0.65} width={dw*0.08} height={dh*0.30} fill={designColor} />
            <circle cx={dw*0.5} cy={dh*0.40} r={dh*0.22} fill={designColor} />
            <circle cx={dw*0.30} cy={dh*0.35} r={dh*0.15} fill={designColor} />
            <circle cx={dw*0.70} cy={dh*0.35} r={dh*0.15} fill={designColor} />
            <circle cx={dw*0.40} cy={dh*0.25} r={dh*0.12} fill={designColor} />
            <circle cx={dw*0.60} cy={dh*0.25} r={dh*0.12} fill={designColor} />
            <circle cx={dw*0.50} cy={dh*0.18} r={dh*0.10} fill={designColor} />
          </g>
        );
      case 'geometric':
        return (
          <g transform={`translate(${inset}, ${inset})`}>
            {[0.17, 0.33, 0.50, 0.67, 0.83].map((x, i) => (
              <rect key={i} x={dw*x - 2} y={dh*0.1} width={4} height={dh*0.8} fill={designColor} />
            ))}
            <rect x={dw*0.17} y={dh*0.48} width={dw*0.66} height={4} fill={designColor} />
            <circle cx={dw*0.5} cy={dh*0.25} r={dh*0.10} fill={designColor} />
            <circle cx={dw*0.5} cy={dh*0.42} r={dh*0.07} fill={designColor} />
            <circle cx={dw*0.5} cy={dh*0.60} r={dh*0.05} fill={designColor} />
            <circle cx={dw*0.5} cy={dh*0.75} r={dh*0.03} fill={designColor} />
          </g>
        );
      case 'heart':
        return (
          <g transform={`translate(${w/2}, ${h*0.45})`}>
            <path 
              d={`M 0,${h*0.15} C -${w*0.25},-${h*0.15} -${w*0.25},${h*0.05} 0,${h*0.25} C ${w*0.25},${h*0.05} ${w*0.25},-${h*0.15} 0,${h*0.15} Z`}
              fill={designColor}
            />
          </g>
        );
      case 'star':
        return (
          <g transform={`translate(${w/2}, ${h/2})`}>
            <polygon 
              points={Array.from({length: 10}, (_, i) => {
                const r = i % 2 === 0 ? h*0.35 : h*0.15;
                const angle = (i * 36 - 90) * Math.PI / 180;
                return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
              }).join(' ')}
              fill={designColor}
            />
          </g>
        );
      case 'moon':
        return (
          <g transform={`translate(${w/2}, ${h/2})`}>
            <clipPath id="moonClip">
              <circle r={h*0.30} />
            </clipPath>
            <circle r={h*0.30} fill={designColor} />
            <circle cx={h*0.12} cy={-h*0.08} r={h*0.24} fill="#fbbf24" clipPath="url(#moonClip)" />
          </g>
        );
      default:
        return (
          <g transform={`translate(${inset}, ${inset})`}>
            <circle cx={dw*0.3} cy={dh*0.35} r={dh*0.18} fill={designColor} />
            <circle cx={dw*0.7} cy={dh*0.45} r={dh*0.15} fill={designColor} />
            <circle cx={dw*0.45} cy={dh*0.60} r={dh*0.20} fill={designColor} />
          </g>
        );
    }
  };

  const renderDiffusionPattern = () => {
    if (settings.diffusionPattern === 'none' || settings.diffuserType === 'none') return null;
    
    const patternId = `pattern-${settings.diffusionPattern}`;
    const spacing = Math.max(8, 25 - settings.diffusionDensity / 5);
    
    return (
      <>
        <defs>
          {settings.diffusionPattern === 'honeycomb' && (
            <pattern id={patternId} width={spacing * 1.5} height={spacing * 1.732} patternUnits="userSpaceOnUse">
              <polygon points={`${spacing*0.75},0 ${spacing*1.5},${spacing*0.433} ${spacing*1.5},${spacing*1.299} ${spacing*0.75},${spacing*1.732} 0,${spacing*1.299} 0,${spacing*0.433}`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
            </pattern>
          )}
          {settings.diffusionPattern === 'dots' && (
            <pattern id={patternId} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
              <circle cx={spacing/2} cy={spacing/2} r={spacing/6} fill="rgba(255,255,255,0.1)" />
            </pattern>
          )}
          {settings.diffusionPattern === 'grid' && (
            <pattern id={patternId} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
              <line x1="0" y1={spacing/2} x2={spacing} y2={spacing/2} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              <line x1={spacing/2} y1="0" x2={spacing/2} y2={spacing} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            </pattern>
          )}
        </defs>
        <rect x={wallPx} y={wallPx} width={w - wallPx*2} height={h - wallPx*2} fill={`url(#${patternId})`} />
      </>
    );
  };

  const frameW = settings.frameWidth * scale;
  const standoffPx = settings.wallStandoff * scale * 0.3;
  
  return (
    <div className="relative">
      <svg
        width={w + 60}
        height={h + 60}
        viewBox={`-30 -30 ${w + 60} ${h + 60}`}
        className="drop-shadow-2xl"
      >
        <defs>
          <radialGradient id="ledGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={settings.ledColor} stopOpacity="1" />
            <stop offset="50%" stopColor={settings.ledColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={settings.ledColor} stopOpacity="0.2" />
          </radialGradient>
          <filter id="wallGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={standoffPx} result="glow"/>
            <feColorMatrix in="glow" type="matrix" values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${settings.glowIntensity/100} 0`} />
          </filter>
          <filter id="frameShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.5" />
          </filter>
          <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        
        <rect 
          x={-standoffPx} 
          y={-standoffPx} 
          width={w + standoffPx * 2} 
          height={h + standoffPx * 2} 
          fill={settings.ledColor}
          opacity={0.4}
          filter="url(#wallGlow)"
          rx={4}
        />
        
        <g filter="url(#frameShadow)">
          <rect 
            x="0" 
            y="0" 
            width={w} 
            height={h} 
            fill={settings.frameColor}
            rx={settings.boxShape === 'rounded' ? settings.cornerRadius * scale : 0}
          />
        </g>
        
        <rect 
          x={frameW} 
          y={frameW} 
          width={w - frameW * 2} 
          height={h - frameW * 2} 
          fill="url(#ledGlow)"
          rx={settings.boxShape === 'rounded' ? Math.max(0, settings.cornerRadius * scale - frameW) : 0}
        />
        
        {settings.layers.length > 0 ? renderBacklitLayers() : (
          <>
            {renderDiffusionPattern()}
            {renderDesign()}
          </>
        )}
        
        {settings.holes.filter(h => h.side === 'back').map(hole => {
          const hx = hole.x * scale;
          const hy = (settings.boxHeight - hole.y) * scale;
          const hr = ((hole.diameter || 5) / 2) * scale;
          return (
            <circle key={hole.id} cx={hx} cy={hy} r={hr} fill="#000" stroke="#333" strokeWidth="1" />
          );
        })}
        
        <rect 
          x="0" 
          y="0" 
          width={w} 
          height={h} 
          fill="none"
          stroke={settings.frameColor}
          strokeWidth={frameW}
          rx={settings.boxShape === 'rounded' ? settings.cornerRadius * scale : 0}
        />
        
        {settings.ledPlacement === 'perimeter' && (
          <rect 
            x={frameW + 2} 
            y={frameW + 2} 
            width={w - frameW * 2 - 4} 
            height={h - frameW * 2 - 4} 
            fill="none"
            stroke={settings.ledColor}
            strokeWidth="2"
            strokeDasharray="6 3"
            opacity={0.6}
            rx={settings.boxShape === 'rounded' ? Math.max(0, settings.cornerRadius * scale - frameW - 2) : 0}
          />
        )}
      </svg>
    </div>
  );
}
