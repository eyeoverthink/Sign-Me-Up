import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Hexagon, Atom, Sparkles, Triangle, Square, Zap, Waves, GitBranch, Dna, Pentagon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const LED_PROFILES = {
  ws2812b_strip: { name: "WS2812B LED Strip", channelWidth: 12, channelHeight: 6 },
  cob_strip: { name: "COB LED Strip", channelWidth: 10, channelHeight: 5 },
  el_wire: { name: "EL Wire", channelWidth: 4, channelHeight: 4 },
  neon_flex: { name: "LED Neon Flex", channelWidth: 10, channelHeight: 18 },
  filament_tube: { name: "Filament Tube", channelWidth: 8, channelHeight: 8 },
  single_led_5mm: { name: "5mm LED", channelWidth: 7, channelHeight: 7 },
  neopixel_smd: { name: "NeoPixel SMD", channelWidth: 8, channelHeight: 4 },
  custom: { name: "Custom", channelWidth: 12, channelHeight: 8 },
} as const;

const SHAPE_PATTERNS = {
  hexagon: { name: "Hexagonal Grid", icon: Hexagon },
  molecule: { name: "Molecular/Organic", icon: Atom },
  phi_spiral: { name: "Phi/Fibonacci Spiral", icon: Sparkles },
  triangle: { name: "Triangle Grid", icon: Triangle },
  square: { name: "Square Grid", icon: Square },
  pentagon: { name: "Pentagon Tiles", icon: Pentagon },
  atom: { name: "Atomic Orbital", icon: Atom },
  dna_helix: { name: "DNA Helix", icon: Dna },
  star: { name: "Star Burst", icon: Sparkles },
  wave: { name: "Wave Pattern", icon: Waves },
  lightning: { name: "Lightning Bolt", icon: Zap },
  tree_branch: { name: "Tree Branch", icon: GitBranch },
} as const;

type LEDProfileType = keyof typeof LED_PROFILES;
type ShapePatternType = keyof typeof SHAPE_PATTERNS;

interface LEDChannelSettings {
  ledType: LEDProfileType;
  shapePattern: ShapePatternType;
  channelLength: number;
  wallThickness: number;
  diffuserThickness: number;
  patternScale: number;
  patternDensity: number;
  includeDiffuser: boolean;
  includeEndCaps: boolean;
  includeMountingClips: boolean;
  wireChannels: boolean;
  customChannelWidth?: number;
  customChannelHeight?: number;
}

const defaultSettings: LEDChannelSettings = {
  ledType: 'ws2812b_strip',
  shapePattern: 'hexagon',
  channelLength: 100,
  wallThickness: 2,
  diffuserThickness: 1.5,
  patternScale: 50,
  patternDensity: 2,
  includeDiffuser: true,
  includeEndCaps: true,
  includeMountingClips: true,
  wireChannels: true,
};

function generateHexagonPath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const hexRadius = scale;
  
  for (let ring = 0; ring < density; ring++) {
    for (let side = 0; side < 6; side++) {
      const angle1 = (side * 60 - 30) * Math.PI / 180;
      const angle2 = ((side + 1) * 60 - 30) * Math.PI / 180;
      
      const x1 = Math.cos(angle1) * hexRadius * (ring + 1);
      const y1 = Math.sin(angle1) * hexRadius * (ring + 1);
      const x2 = Math.cos(angle2) * hexRadius * (ring + 1);
      const y2 = Math.sin(angle2) * hexRadius * (ring + 1);
      
      paths.push([[x1, y1], [x2, y2]]);
    }
  }
  
  return paths;
}

function generateMoleculePath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const bondLength = scale;
  
  const ringPositions: [number, number][] = [
    [0, 0],
    [bondLength * 1.5, bondLength * Math.sqrt(3) / 2],
    [bondLength * 1.5, -bondLength * Math.sqrt(3) / 2],
    [bondLength * 3, 0],
  ];
  
  for (let r = 0; r < Math.min(density, ringPositions.length); r++) {
    const [cx, cy] = ringPositions[r];
    
    for (let i = 0; i < 6; i++) {
      const angle1 = (i * 60) * Math.PI / 180;
      const angle2 = ((i + 1) * 60) * Math.PI / 180;
      const x1 = cx + Math.cos(angle1) * bondLength * 0.6;
      const y1 = cy + Math.sin(angle1) * bondLength * 0.6;
      const x2 = cx + Math.cos(angle2) * bondLength * 0.6;
      const y2 = cy + Math.sin(angle2) * bondLength * 0.6;
      paths.push([[x1, y1], [x2, y2]]);
    }
  }
  
  return paths;
}

function generatePhiSpiralPath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const phi = 1.618033988749895;
  const turns = density * 2;
  const pointsPerTurn = 20;
  
  for (let arm = 0; arm < 2; arm++) {
    const path: [number, number][] = [];
    const armOffset = arm * Math.PI;
    
    for (let i = 0; i <= turns * pointsPerTurn; i++) {
      const angle = (i / pointsPerTurn) * Math.PI * 2 + armOffset;
      const r = scale * 0.1 * Math.pow(phi, angle / (Math.PI * 2));
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      path.push([x, y]);
    }
    
    for (let i = 0; i < path.length - 1; i++) {
      paths.push([path[i], path[i + 1]]);
    }
  }
  
  return paths;
}

function generateAtomPath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const orbitals = Math.min(density, 4);
  
  const nucleusR = scale * 0.1;
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2;
    const a2 = ((i + 1) / 8) * Math.PI * 2;
    paths.push([
      [Math.cos(a1) * nucleusR, Math.sin(a1) * nucleusR],
      [Math.cos(a2) * nucleusR, Math.sin(a2) * nucleusR]
    ]);
  }
  
  for (let o = 0; o < orbitals; o++) {
    const tilt = (o / orbitals) * Math.PI;
    const r = scale * (0.4 + o * 0.2);
    const segments = 24;
    
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      
      const x1 = Math.cos(a1) * r;
      const y1 = Math.sin(a1) * r * 0.3 * Math.cos(tilt);
      const x2 = Math.cos(a2) * r;
      const y2 = Math.sin(a2) * r * 0.3 * Math.cos(tilt);
      
      const rx1 = x1 * Math.cos(tilt) - y1 * Math.sin(tilt);
      const ry1 = x1 * Math.sin(tilt) + y1 * Math.cos(tilt);
      const rx2 = x2 * Math.cos(tilt) - y2 * Math.sin(tilt);
      const ry2 = x2 * Math.sin(tilt) + y2 * Math.cos(tilt);
      
      paths.push([[rx1, ry1], [rx2, ry2]]);
    }
  }
  
  return paths;
}

function generateStarPath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const rays = Math.max(5, density + 4);
  
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2;
    const x = Math.cos(angle) * scale;
    const y = Math.sin(angle) * scale;
    paths.push([[0, 0], [x, y]]);
  }
  
  return paths;
}

function generateWavePath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const waves = density;
  const amplitude = scale * 0.3;
  const wavelength = scale * 2 / waves;
  
  for (let w = 0; w < waves; w++) {
    const path: [number, number][] = [];
    const yOffset = w * amplitude * 3;
    
    for (let x = -scale; x <= scale; x += wavelength / 10) {
      const y = yOffset + Math.sin((x / wavelength) * Math.PI * 2) * amplitude;
      path.push([x, y]);
    }
    
    for (let i = 0; i < path.length - 1; i++) {
      paths.push([path[i], path[i + 1]]);
    }
  }
  
  return paths;
}

function generateDNAPath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const turns = density;
  const points = turns * 20;
  const helixR = scale * 0.3;
  const length = scale * 2;
  
  for (let strand = 0; strand < 2; strand++) {
    const offset = strand * Math.PI;
    const path: [number, number][] = [];
    
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const angle = t * turns * Math.PI * 2 + offset;
      const x = Math.cos(angle) * helixR;
      const y = -length / 2 + t * length;
      path.push([x, y]);
    }
    
    for (let i = 0; i < path.length - 1; i++) {
      paths.push([path[i], path[i + 1]]);
    }
  }
  
  return paths;
}

function generateTrianglePath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  for (let ring = 0; ring < density; ring++) {
    const r = scale * (ring + 1) * 0.4;
    for (let i = 0; i < 3; i++) {
      const a1 = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / 3) * Math.PI * 2 - Math.PI / 2;
      paths.push([
        [Math.cos(a1) * r, Math.sin(a1) * r],
        [Math.cos(a2) * r, Math.sin(a2) * r]
      ]);
    }
  }
  return paths;
}

function generateSquarePath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  for (let ring = 0; ring < density; ring++) {
    const s = scale * (ring + 1) * 0.35;
    paths.push([[-s, -s], [s, -s]]);
    paths.push([[s, -s], [s, s]]);
    paths.push([[s, s], [-s, s]]);
    paths.push([[-s, s], [-s, -s]]);
  }
  return paths;
}

function generatePentagonPath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  for (let ring = 0; ring < density; ring++) {
    const r = scale * (ring + 1) * 0.4;
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / 5) * Math.PI * 2 - Math.PI / 2;
      paths.push([
        [Math.cos(a1) * r, Math.sin(a1) * r],
        [Math.cos(a2) * r, Math.sin(a2) * r]
      ]);
    }
  }
  return paths;
}

function generateLightningPath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  for (let b = 0; b < density; b++) {
    const xOff = (b - density / 2) * scale * 0.5;
    const pts: [number, number][] = [
      [xOff, -scale],
      [xOff + scale * 0.2, -scale * 0.3],
      [xOff - scale * 0.1, -scale * 0.2],
      [xOff + scale * 0.3, scale * 0.5],
      [xOff, scale * 0.3],
      [xOff + scale * 0.15, scale]
    ];
    for (let i = 0; i < pts.length - 1; i++) {
      paths.push([pts[i], pts[i + 1]]);
    }
  }
  return paths;
}

function generateTreePath(scale: number, density: number): [number, number][][] {
  const paths: [number, number][][] = [];
  const trunk: [number, number][] = [[0, -scale], [0, scale * 0.2]];
  paths.push(trunk);
  for (let level = 0; level < density; level++) {
    const y = -scale * 0.5 + level * scale * 0.4;
    const spread = scale * 0.4 * (density - level) / density;
    paths.push([[0, y], [-spread, y - scale * 0.2]]);
    paths.push([[0, y], [spread, y - scale * 0.2]]);
  }
  return paths;
}

function getShapePaths(pattern: ShapePatternType, scale: number, density: number): [number, number][][] {
  switch (pattern) {
    case 'hexagon': return generateHexagonPath(scale, density);
    case 'molecule': return generateMoleculePath(scale, density);
    case 'phi_spiral': return generatePhiSpiralPath(scale, density);
    case 'triangle': return generateTrianglePath(scale, density);
    case 'square': return generateSquarePath(scale, density);
    case 'pentagon': return generatePentagonPath(scale, density);
    case 'atom': return generateAtomPath(scale, density);
    case 'dna_helix': return generateDNAPath(scale, density);
    case 'star': return generateStarPath(scale, density);
    case 'wave': return generateWavePath(scale, density);
    case 'lightning': return generateLightningPath(scale, density);
    case 'tree_branch': return generateTreePath(scale, density);
    default: return generateHexagonPath(scale, density);
  }
}

function LEDChannelPreview({ settings }: { settings: LEDChannelSettings }) {
  const groupRef = useRef<THREE.Group | null>(null);
  
  const geometry = useMemo(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
    
    const group = new THREE.Group();
    groupRef.current = group;
    
    const profile = LED_PROFILES[settings.ledType];
    const channelWidth = settings.customChannelWidth || profile.channelWidth;
    const channelHeight = settings.customChannelHeight || profile.channelHeight;
    const wall = settings.wallThickness;
    
    const paths = getShapePaths(settings.shapePattern, settings.patternScale, settings.patternDensity);
    
    const channelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a90d9, 
      metalness: 0.2, 
      roughness: 0.8 
    });
    
    const diffuserMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.9,
    });
    
    for (const path of paths) {
      if (path.length < 2) continue;
      
      const [x1, y1] = path[0];
      const [x2, y2] = path[1];
      
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length < 0.1) continue;
      
      const outerW = channelWidth + wall * 2;
      const outerH = channelHeight + wall * 2;
      
      const shape = new THREE.Shape();
      shape.moveTo(-outerW/2, 0);
      shape.lineTo(outerW/2, 0);
      shape.lineTo(outerW/2, outerH);
      shape.lineTo(-outerW/2, outerH);
      shape.closePath();
      
      const hole = new THREE.Path();
      hole.moveTo(-channelWidth/2, wall);
      hole.lineTo(channelWidth/2, wall);
      hole.lineTo(channelWidth/2, wall + channelHeight);
      hole.lineTo(-channelWidth/2, wall + channelHeight);
      hole.closePath();
      shape.holes.push(hole);
      
      const extrudeSettings = { 
        steps: 1,
        depth: length,
        bevelEnabled: false,
      };
      
      const tubeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      tubeGeo.translate(0, 0, -length / 2);
      
      const tubeMesh = new THREE.Mesh(tubeGeo, channelMaterial);
      
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const angle = Math.atan2(dy, dx);
      
      tubeMesh.position.set(midX, outerH / 2, midY);
      tubeMesh.rotation.x = Math.PI / 2;
      tubeMesh.rotation.z = angle;
      
      group.add(tubeMesh);
      
      if (settings.includeDiffuser) {
        const diffuserShape = new THREE.Shape();
        const dw = channelWidth + 0.4;
        diffuserShape.moveTo(-dw/2, 0);
        diffuserShape.lineTo(dw/2, 0);
        diffuserShape.lineTo(dw/2, settings.diffuserThickness);
        diffuserShape.lineTo(-dw/2, settings.diffuserThickness);
        diffuserShape.closePath();
        
        const diffuserGeo = new THREE.ExtrudeGeometry(diffuserShape, { 
          depth: length, 
          bevelEnabled: false 
        });
        diffuserGeo.translate(0, 0, -length / 2);
        
        const diffuserMesh = new THREE.Mesh(diffuserGeo, diffuserMaterial);
        diffuserMesh.position.set(midX, outerH + settings.diffuserThickness / 2 + 1, midY);
        diffuserMesh.rotation.x = Math.PI / 2;
        diffuserMesh.rotation.z = angle;
        group.add(diffuserMesh);
      }
    }
    
    return group;
  }, [settings]);
  
  return <primitive object={geometry} />;
}

function ShapePreview2D({ pattern, scale, density }: { pattern: ShapePatternType; scale: number; density: number }) {
  const paths = useMemo(() => {
    return getShapePaths(pattern, scale * 0.8, density);
  }, [pattern, scale, density]);
  
  const viewBox = useMemo(() => {
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    paths.forEach((seg: [number, number][]) => {
      seg.forEach(([x, y]: [number, number]) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    });
    const pad = 10;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    return `${minX - pad} ${minY - pad} ${w} ${h}`;
  }, [paths]);
  
  return (
    <div className="bg-background/80 rounded-lg p-3 border" data-testid="shape-preview-2d">
      <div className="text-xs text-muted-foreground mb-2 text-center font-medium">
        Shape Outline Preview
      </div>
      <svg viewBox={viewBox} className="w-full h-32">
        {paths.map((seg: [number, number][], i: number) => (
          <line
            key={i}
            x1={seg[0][0]}
            y1={seg[0][1]}
            x2={seg[1][0]}
            y2={seg[1][1]}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-primary"
          />
        ))}
      </svg>
      <div className="text-xs text-center text-muted-foreground mt-1">
        {SHAPE_PATTERNS[pattern].name}
      </div>
    </div>
  );
}

export function LEDChannelEditor() {
  const [settings, setSettings] = useState<LEDChannelSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const updateSetting = <K extends keyof LEDChannelSettings>(key: K, value: LEDChannelSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const profile = LED_PROFILES[settings.ledType];
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/led-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `led_channel_${settings.shapePattern}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "LED channel files downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate LED channel files",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="flex h-full" data-testid="led-channel-editor">
      <div className="flex-1 bg-muted/30 relative">
        <Canvas camera={{ position: [100, 80, 100], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <LEDChannelPreview settings={settings} />
          <OrbitControls enableDamping dampingFactor={0.05} />
          <Environment preset="studio" />
          <ContactShadows position={[0, -5, 0]} opacity={0.3} scale={200} blur={2} />
        </Canvas>
        <div className="absolute top-4 left-4 w-48">
          <ShapePreview2D 
            pattern={settings.shapePattern} 
            scale={settings.patternScale} 
            density={settings.patternDensity} 
          />
        </div>
      </div>
      
      <div className="w-80 border-l bg-background p-4 overflow-y-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hexagon className="h-4 w-4" />
              Shape Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(SHAPE_PATTERNS) as [ShapePatternType, typeof SHAPE_PATTERNS[ShapePatternType]][]).map(([key, { name, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={settings.shapePattern === key ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col h-16 p-1"
                  onClick={() => updateSetting('shapePattern', key)}
                  data-testid={`pattern-${key}`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs leading-tight text-center">{name.split('/')[0]}</span>
                </Button>
              ))}
            </div>
            
            <div>
              <Label className="text-xs">Pattern Scale: {settings.patternScale}mm</Label>
              <Slider
                value={[settings.patternScale]}
                onValueChange={([v]) => updateSetting('patternScale', v)}
                min={20}
                max={150}
                step={5}
                data-testid="slider-scale"
              />
            </div>
            
            <div>
              <Label className="text-xs">Pattern Density: {settings.patternDensity}</Label>
              <Slider
                value={[settings.patternDensity]}
                onValueChange={([v]) => updateSetting('patternDensity', v)}
                min={1}
                max={5}
                step={1}
                data-testid="slider-density"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              LED Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={settings.ledType}
              onValueChange={(v) => updateSetting('ledType', v as LEDProfileType)}
            >
              <SelectTrigger data-testid="select-led-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LED_PROFILES).map(([key, { name }]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {profile.channelWidth}mm wide
              </Badge>
              <Badge variant="outline" className="text-xs">
                {profile.channelHeight}mm tall
              </Badge>
            </div>
            
            {settings.ledType === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Width: {settings.customChannelWidth || 12}mm</Label>
                  <Slider
                    value={[settings.customChannelWidth || 12]}
                    onValueChange={([v]) => updateSetting('customChannelWidth', v)}
                    min={4}
                    max={25}
                    step={1}
                    data-testid="slider-custom-width"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height: {settings.customChannelHeight || 8}mm</Label>
                  <Slider
                    value={[settings.customChannelHeight || 8]}
                    onValueChange={([v]) => updateSetting('customChannelHeight', v)}
                    min={4}
                    max={25}
                    step={1}
                    data-testid="slider-custom-height"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Channel Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Wall Thickness: {settings.wallThickness}mm</Label>
              <Slider
                value={[settings.wallThickness]}
                onValueChange={([v]) => updateSetting('wallThickness', v)}
                min={1}
                max={5}
                step={0.5}
                data-testid="slider-wall"
              />
            </div>
            
            <div>
              <Label className="text-xs">Diffuser Thickness: {settings.diffuserThickness}mm</Label>
              <Slider
                value={[settings.diffuserThickness]}
                onValueChange={([v]) => updateSetting('diffuserThickness', v)}
                min={0.8}
                max={3}
                step={0.2}
                data-testid="slider-diffuser"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Include Diffuser Cover</Label>
              <Switch
                checked={settings.includeDiffuser}
                onCheckedChange={(v) => updateSetting('includeDiffuser', v)}
                data-testid="switch-diffuser"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs">Include End Caps</Label>
              <Switch
                checked={settings.includeEndCaps}
                onCheckedChange={(v) => updateSetting('includeEndCaps', v)}
                data-testid="switch-endcaps"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs">Wire Channels</Label>
              <Switch
                checked={settings.wireChannels}
                onCheckedChange={(v) => updateSetting('wireChannels', v)}
                data-testid="switch-wire"
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleExport}
              disabled={isExporting}
              data-testid="button-export"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export LED Channel
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
