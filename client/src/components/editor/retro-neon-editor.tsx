import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader2, Lightbulb, Sparkles, Box, Layers } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { 
  shellShapeTypes, classicBulbShapes, glassMaterialTypes, screwBaseTypes, standTypes, primitiveShapes,
  defaultRetroNeonSettings, type RetroNeonSettings, type PrimitiveShape
} from "@shared/schema";
import { PRIMITIVE_SHAPES, SHAPE_LABELS, SHAPE_CATEGORIES, normalizeSvgPath, commandsToPoints } from "@shared/svg-utils";
import * as THREE from "three";

// Classic bulb shape labels
const CLASSIC_BULB_LABELS: Record<string, string> = {
  tube: "Tube",
  globe: "Globe",
  flame: "Flame",
  vintage: "Vintage A19",
  pear: "Pear",
};

// Combined shell shape labels - classic bulbs + all primitives
const SHELL_SHAPE_LABELS: Record<string, string> = {
  ...CLASSIC_BULB_LABELS,
  ...SHAPE_LABELS,
  "flame-shape": "Flame Shape",
};

// Keep for backward compat
const GLASS_SHAPE_LABELS = SHELL_SHAPE_LABELS;

const MATERIAL_LABELS: Record<string, string> = {
  clear: "Clear",
  frosted: "Frosted",
  white_diffused: "White Diffused",
};

const BASE_LABELS: Record<string, string> = {
  e26: "E26 (US Standard)",
  e27: "E27 (European)",
  e14: "E14 (Candelabra)",
  none: "No Base",
};

function ShapeButton({ 
  shape, 
  selected, 
  onClick 
}: { 
  shape: PrimitiveShape; 
  selected: boolean; 
  onClick: () => void;
}) {
  const svgPath = PRIMITIVE_SHAPES[shape];
  
  return (
    <button
      data-testid={`button-shape-${shape}`}
      onClick={onClick}
      className={`w-16 h-16 rounded-md border-2 flex items-center justify-center transition-all ${
        selected 
          ? "border-primary bg-primary/10" 
          : "border-border hover-elevate"
      }`}
    >
      <svg viewBox="-60 -60 120 120" className="w-12 h-12">
        <path 
          d={svgPath} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3"
          className={selected ? "text-primary" : "text-muted-foreground"}
        />
      </svg>
    </button>
  );
}

// Classic bulb shapes use lathe geometry
const CLASSIC_BULB_SHAPES = ["tube", "globe", "flame", "vintage", "pear"];

function ShellMesh({ shape, scale, height }: { shape: string; scale: number; height: number }) {
  const isClassicBulb = CLASSIC_BULB_SHAPES.includes(shape);
  
  const geometry = useMemo(() => {
    if (isClassicBulb) {
      // Generate lathe geometry for classic bulb shapes
      const segments = 32;
      const rings = 24;
      const diameter = 50 * scale;
      const points: THREE.Vector2[] = [];
      
      for (let i = 0; i <= rings; i++) {
        const t = i / rings;
        let radius: number;
        
        switch (shape) {
          case "tube":
            radius = t > 0.9 ? (diameter / 2) * Math.cos((t - 0.9) / 0.1 * Math.PI / 2) : diameter / 2;
            break;
          case "globe":
            radius = (diameter / 2) * Math.sin(t * Math.PI);
            break;
          case "flame":
            if (t < 0.3) radius = (diameter / 2) * (t / 0.3) * 0.8;
            else if (t > 0.7) radius = (diameter / 2) * 0.8 * (1 - (t - 0.7) / 0.3) * 0.6;
            else radius = (diameter / 2) * 0.8;
            break;
          case "vintage":
            radius = (diameter / 2) * (0.6 + 0.4 * Math.sin(t * Math.PI));
            break;
          case "pear":
            if (t < 0.6) radius = (diameter / 2) * (0.7 + 0.3 * (t / 0.6));
            else radius = (diameter / 2) * Math.cos((t - 0.6) / 0.4 * Math.PI / 2);
            break;
          default:
            radius = diameter / 2;
        }
        
        points.push(new THREE.Vector2(Math.max(0.1, radius), t * height));
      }
      
      return new THREE.LatheGeometry(points, segments);
    } else {
      // Generate extruded shape for primitive shapes
      const svgPath = PRIMITIVE_SHAPES[shape as keyof typeof PRIMITIVE_SHAPES];
      if (!svgPath) return null;

      const threeShape = new THREE.Shape();
      const commands = normalizeSvgPath(svgPath, scale);
      let currentX = 0, currentY = 0;
      let firstX = 0, firstY = 0;
      let started = false;

      for (const cmd of commands) {
        switch (cmd.type) {
          case 'M':
            currentX = cmd.points[0].x;
            currentY = -cmd.points[0].y;
            if (!started) {
              firstX = currentX;
              firstY = currentY;
              threeShape.moveTo(currentX, currentY);
              started = true;
            } else {
              threeShape.moveTo(currentX, currentY);
            }
            break;
          case 'L':
            currentX = cmd.points[0].x;
            currentY = -cmd.points[0].y;
            threeShape.lineTo(currentX, currentY);
            break;
          case 'C':
            threeShape.bezierCurveTo(
              cmd.points[0].x, -cmd.points[0].y,
              cmd.points[1].x, -cmd.points[1].y,
              cmd.points[2].x, -cmd.points[2].y
            );
            currentX = cmd.points[2].x;
            currentY = -cmd.points[2].y;
            break;
          case 'Z':
            threeShape.lineTo(firstX, firstY);
            break;
        }
      }

      const extrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: true,
        bevelThickness: 2,
        bevelSize: 1.5,
        bevelSegments: 3,
      };

      return new THREE.ExtrudeGeometry(threeShape, extrudeSettings);
    }
  }, [shape, scale, height, isClassicBulb]);

  if (!geometry) return null;

  return (
    <mesh 
      geometry={geometry} 
      position={isClassicBulb ? [0, 0, 0] : [0, height / 2, 0]}
      rotation={isClassicBulb ? [0, 0, 0] : [Math.PI / 2, 0, 0]}
    >
      <meshPhysicalMaterial 
        color="#ffffff"
        transmission={0.9}
        roughness={0.1}
        thickness={2}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

// Legacy component kept for backward compatibility
function GlassShellMesh({ shape, diameter, height }: { shape: string; diameter: number; height: number }) {
  return <ShellMesh shape={shape} scale={diameter / 50} height={height} />;
}

function FilamentMesh({ shape, scale, height }: { shape: PrimitiveShape; scale: number; height: number }) {
  const geometry = useMemo(() => {
    const svgPath = PRIMITIVE_SHAPES[shape];
    if (!svgPath) return null;

    const threeShape = new THREE.Shape();
    const commands = normalizeSvgPath(svgPath, scale);
    let currentX = 0, currentY = 0;
    let firstX = 0, firstY = 0;
    let started = false;

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'M':
          currentX = cmd.points[0].x;
          currentY = -cmd.points[0].y;
          if (!started) {
            firstX = currentX;
            firstY = currentY;
            threeShape.moveTo(currentX, currentY);
            started = true;
          } else {
            threeShape.moveTo(currentX, currentY);
          }
          break;
        case 'L':
          currentX = cmd.points[0].x;
          currentY = -cmd.points[0].y;
          threeShape.lineTo(currentX, currentY);
          break;
        case 'C':
          threeShape.bezierCurveTo(
            cmd.points[0].x, -cmd.points[0].y,
            cmd.points[1].x, -cmd.points[1].y,
            cmd.points[2].x, -cmd.points[2].y
          );
          currentX = cmd.points[2].x;
          currentY = -cmd.points[2].y;
          break;
        case 'Z':
          threeShape.lineTo(firstX, firstY);
          break;
      }
    }

    const extrudeSettings = {
      steps: 1,
      depth: 3,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 0.8,
      bevelSegments: 2,
    };

    return new THREE.ExtrudeGeometry(threeShape, extrudeSettings);
  }, [shape, scale]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, height / 2, 0]}>
      <meshStandardMaterial color="#ffcc00" emissive="#ff9900" emissiveIntensity={0.5} />
    </mesh>
  );
}

function ScrewBaseMesh({ type, diameter }: { type: string; diameter: number }) {
  if (type === "none") return null;

  const majorDiameter = type === "e14" ? 14 : type === "e26" ? 26 : 27;
  
  return (
    <group position={[0, -10, 0]}>
      <mesh>
        <cylinderGeometry args={[majorDiameter / 2, majorDiameter / 2, 20, 32]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 12, 0]}>
        <cylinderGeometry args={[diameter / 2 * 0.95, majorDiameter / 2, 4, 32]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function NeonTubeMesh({ shape, scale, tubeWidth, tubeDepth }: { shape: PrimitiveShape; scale: number; tubeWidth: number; tubeDepth: number }) {
  const geometry = useMemo(() => {
    const svgPath = PRIMITIVE_SHAPES[shape];
    if (!svgPath) return null;

    const commands = normalizeSvgPath(svgPath, scale);
    const points = commandsToPoints(commands, 12);
    if (points.length < 2) return null;

    // Convert 2D path points to 3D curve for TubeGeometry
    const curvePoints: THREE.Vector3[] = points.map(p => 
      new THREE.Vector3(p.x, -p.y, 0)
    );
    
    // Create a CatmullRomCurve3 from the path points for smooth tubes
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);
    
    // Use TubeGeometry for proper round tube cross-section
    const tubeRadius = tubeWidth / 2;
    const tubularSegments = Math.max(64, points.length * 4);
    const radialSegments = 12;
    
    return new THREE.TubeGeometry(curve, tubularSegments, tubeRadius, radialSegments, false);
  }, [shape, scale, tubeWidth, tubeDepth]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#ff6b9d" emissive="#ff6b9d" emissiveIntensity={0.4} transparent opacity={0.85} />
    </mesh>
  );
}

function HousingMesh({ diameter, height, shape }: { diameter: number; height: number; shape: string }) {
  const segments = shape === "hexagon" ? 6 : shape === "square" ? 4 : 32;
  
  return (
    <group position={[0, -height / 2 - 15, 0]}>
      <mesh>
        <cylinderGeometry args={[diameter / 2, diameter / 2, height, segments]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function RetroNeonEditor() {
  const [settings, setSettings] = useState<RetroNeonSettings>(defaultRetroNeonSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("shape");

  const updateSettings = useCallback((updates: Partial<RetroNeonSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateEdison = useCallback((updates: Partial<typeof settings.edison>) => {
    setSettings(prev => ({ 
      ...prev, 
      edison: { ...prev.edison, ...updates } 
    }));
  }, []);

  const updateNeonSign = useCallback((updates: Partial<typeof settings.neonSign>) => {
    setSettings(prev => ({ 
      ...prev, 
      neonSign: { ...prev.neonSign, ...updates } 
    }));
  }, []);

  const updateHousing = useCallback((updates: Partial<typeof settings.housing>) => {
    setSettings(prev => ({ 
      ...prev, 
      housing: { ...prev.housing, ...updates } 
    }));
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/retro-neon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = settings.mode === "edison_bulb" 
        ? `edison_${settings.edison.filamentShape}_bulb.zip`
        : `neon_${settings.neonSign.shape}_sign.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full" data-testid="retro-neon-editor">
      {/* Left Panel - Controls */}
      <div className="w-80 border-r bg-background overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            {settings.mode === "edison_bulb" ? "Edison Bulb" : "Neon Sign"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom LED lights with shape filaments
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <Button
              variant={settings.mode === "edison_bulb" ? "default" : "outline"}
              size="sm"
              onClick={() => updateSettings({ mode: "edison_bulb" })}
              data-testid="button-mode-edison"
              className="flex-1"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              Edison Bulb
            </Button>
            <Button
              variant={settings.mode === "neon_sign" ? "default" : "outline"}
              size="sm"
              onClick={() => updateSettings({ mode: "neon_sign" })}
              data-testid="button-mode-neon"
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Neon Sign
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {settings.mode === "edison_bulb" ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="shape" data-testid="tab-shell" className="flex-1">Shell</TabsTrigger>
                  <TabsTrigger value="base" data-testid="tab-base" className="flex-1">Screw Base</TabsTrigger>
                </TabsList>

                <TabsContent value="shape" className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Shell Shape</Label>
                    <p className="text-xs text-muted-foreground mb-3">Choose the hollow shell shape - you'll insert your own LED inside</p>
                    
                    <ScrollArea className="h-56 mb-4">
                      <div className="space-y-3 pr-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 font-medium">Classic Bulb Shapes</p>
                          <div className="grid grid-cols-5 gap-1">
                            {classicBulbShapes.map((shape) => (
                              <button
                                key={shape}
                                data-testid={`button-shell-${shape}`}
                                onClick={() => updateEdison({ shellShape: shape })}
                                className={`h-10 rounded-md border-2 flex items-center justify-center text-xs transition-all ${
                                  settings.edison.shellShape === shape 
                                    ? "border-primary bg-primary/10" 
                                    : "border-border hover-elevate"
                                }`}
                              >
                                {CLASSIC_BULB_LABELS[shape] || shape}
                              </button>
                            ))}
                          </div>
                        </div>
                        {Object.entries(SHAPE_CATEGORIES).map(([category, shapes]) => (
                          <div key={category}>
                            <p className="text-xs text-muted-foreground mb-1 font-medium">{category}</p>
                            <div className="grid grid-cols-4 gap-1">
                              {shapes.map((shape) => (
                                <ShapeButton
                                  key={shape}
                                  shape={shape as PrimitiveShape}
                                  selected={settings.edison.shellShape === shape}
                                  onClick={() => updateEdison({ shellShape: shape })}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-sm">Shell Scale: {settings.edison.shellScale.toFixed(1)}x</Label>
                    <Slider
                      data-testid="slider-shell-scale"
                      value={[settings.edison.shellScale]}
                      min={0.5}
                      max={3}
                      step={0.1}
                      onValueChange={([v]) => updateEdison({ shellScale: v })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Shell Height: {settings.edison.shellHeight}mm</Label>
                    <Slider
                      data-testid="slider-shell-height"
                      value={[settings.edison.shellHeight]}
                      min={30}
                      max={150}
                      step={5}
                      onValueChange={([v]) => updateEdison({ shellHeight: v })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Wall Thickness: {settings.edison.shellWallThickness}mm</Label>
                    <Slider
                      data-testid="slider-shell-wall"
                      value={[settings.edison.shellWallThickness]}
                      min={1}
                      max={4}
                      step={0.5}
                      onValueChange={([v]) => updateEdison({ shellWallThickness: v })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Shell Material</Label>
                    <Select
                      value={settings.edison.shellMaterial}
                      onValueChange={(v) => updateEdison({ shellMaterial: v as typeof settings.edison.shellMaterial })}
                    >
                      <SelectTrigger data-testid="select-shell-material" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {glassMaterialTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {MATERIAL_LABELS[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Print in clear or translucent filament for best effect
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm">Bottom Opening: {settings.edison.openingDiameter}mm</Label>
                    <Slider
                      data-testid="slider-opening"
                      value={[settings.edison.openingDiameter]}
                      min={15}
                      max={50}
                      step={1}
                      onValueChange={([v]) => updateEdison({ openingDiameter: v })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Opening diameter where screw base attaches
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="base" className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm">Screw Base Type</Label>
                    <Select
                      value={settings.edison.screwBase}
                      onValueChange={(v) => updateEdison({ screwBase: v as typeof settings.edison.screwBase })}
                    >
                      <SelectTrigger data-testid="select-screw-base" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {screwBaseTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {BASE_LABELS[type] || type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {settings.edison.screwBase === "e26" && "Standard US light bulb socket"}
                      {settings.edison.screwBase === "e27" && "European standard socket"}
                      {settings.edison.screwBase === "e14" && "Small candelabra base"}
                      {settings.edison.screwBase === "none" && "No threaded base"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm">Base Height: {settings.edison.baseHeight}mm</Label>
                    <Slider
                      data-testid="slider-base-height"
                      value={[settings.edison.baseHeight]}
                      min={15}
                      max={30}
                      step={1}
                      onValueChange={([v]) => updateEdison({ baseHeight: v })}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Center Wire Hole</Label>
                    <Switch
                      data-testid="switch-wire-hole"
                      checked={settings.edison.wireCenterHole}
                      onCheckedChange={(v) => updateEdison({ wireCenterHole: v })}
                    />
                  </div>

                  {settings.edison.wireCenterHole && (
                    <div>
                      <Label className="text-sm">Wire Hole Diameter: {settings.edison.wireHoleDiameter}mm</Label>
                      <Slider
                        data-testid="slider-wire-hole-diameter"
                        value={[settings.edison.wireHoleDiameter]}
                        min={3}
                        max={8}
                        step={0.5}
                        onValueChange={([v]) => updateEdison({ wireHoleDiameter: v })}
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium">Luminary Engine V5</Label>
                    <p className="text-xs text-muted-foreground mb-3">Advanced thread and clip options</p>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">Thread Type</Label>
                        <Select
                          value={settings.edison.threadType || "iso"}
                          onValueChange={(v) => updateEdison({ threadType: v as "iso" | "lobular" })}
                        >
                          <SelectTrigger data-testid="select-thread-type" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="iso">ISO Standard</SelectItem>
                            <SelectItem value="lobular">Lobular (Hex-twist)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lobular threads are stronger and print without retractions
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Clip System</Label>
                          <p className="text-xs text-muted-foreground">C-clamp LED holders on chassis</p>
                        </div>
                        <Switch
                          data-testid="switch-clip-system"
                          checked={settings.edison.clipSystemEnabled || false}
                          onCheckedChange={(v) => updateEdison({ clipSystemEnabled: v })}
                        />
                      </div>

                      {settings.edison.clipSystemEnabled && (
                        <>
                          <div>
                            <Label className="text-sm">Clip Count: {settings.edison.clipCount || 5}</Label>
                            <Slider
                              data-testid="slider-clip-count"
                              value={[settings.edison.clipCount || 5]}
                              min={2}
                              max={8}
                              step={1}
                              onValueChange={([v]) => updateEdison({ clipCount: v })}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label className="text-sm">Clip Diameter: {settings.edison.clipDiameter || 6.2}mm</Label>
                            <Slider
                              data-testid="slider-clip-diameter"
                              value={[settings.edison.clipDiameter || 6.2]}
                              min={4}
                              max={10}
                              step={0.2}
                              onValueChange={([v]) => updateEdison({ clipDiameter: v })}
                              className="mt-2"
                            />
                          </div>
                        </>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Phi Ribs</Label>
                          <p className="text-xs text-muted-foreground">Golden angle (137.5°) decorative ribs</p>
                        </div>
                        <Switch
                          data-testid="switch-phi-ribs"
                          checked={settings.edison.phiRibsEnabled || false}
                          onCheckedChange={(v) => updateEdison({ phiRibsEnabled: v })}
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Spiral Twist: {settings.edison.spiralTwist || 180}°</Label>
                        <Slider
                          data-testid="slider-spiral-twist"
                          value={[settings.edison.spiralTwist || 180]}
                          min={0}
                          max={360}
                          step={15}
                          onValueChange={([v]) => updateEdison({ spiralTwist: v })}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              /* Neon Sign Mode */
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Neon Shape</Label>
                  <ScrollArea className="h-64">
                    <div className="space-y-3 pr-3">
                      {Object.entries(SHAPE_CATEGORIES).map(([category, shapes]) => (
                        <div key={category}>
                          <p className="text-xs text-muted-foreground mb-1 font-medium">{category}</p>
                          <div className="grid grid-cols-4 gap-1">
                            {shapes.map((shape) => (
                              <ShapeButton
                                key={shape}
                                shape={shape as PrimitiveShape}
                                selected={settings.neonSign.shape === shape}
                                onClick={() => updateNeonSign({ shape: shape as PrimitiveShape })}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div>
                  <Label className="text-sm">Scale: {settings.neonSign.scale.toFixed(1)}</Label>
                  <Slider
                    data-testid="slider-neon-scale"
                    value={[settings.neonSign.scale]}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onValueChange={([v]) => updateNeonSign({ scale: v })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-sm">Tube Width: {settings.neonSign.tubeWidth}mm</Label>
                  <Slider
                    data-testid="slider-tube-width"
                    value={[settings.neonSign.tubeWidth]}
                    min={8}
                    max={25}
                    step={1}
                    onValueChange={([v]) => updateNeonSign({ tubeWidth: v })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-sm">Tube Depth: {settings.neonSign.tubeDepth}mm</Label>
                  <Slider
                    data-testid="slider-tube-depth"
                    value={[settings.neonSign.tubeDepth]}
                    min={6}
                    max={20}
                    step={1}
                    onValueChange={([v]) => updateNeonSign({ tubeDepth: v })}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Hollow (for LED strip)</Label>
                  <Switch
                    data-testid="switch-hollow"
                    checked={settings.neonSign.hollow}
                    onCheckedChange={(v) => updateNeonSign({ hollow: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Split Half (clamshell)</Label>
                  <Switch
                    data-testid="switch-split-half"
                    checked={settings.neonSign.splitHalf}
                    onCheckedChange={(v) => updateNeonSign({ splitHalf: v })}
                  />
                </div>
              </div>
            )}

            {/* Electronics Housing Section */}
            <Card className="mt-4">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Electronics Housing
                  </CardTitle>
                  <Switch
                    data-testid="switch-housing-enabled"
                    checked={settings.housing.enabled}
                    onCheckedChange={(v) => updateHousing({ enabled: v })}
                  />
                </div>
              </CardHeader>
              {settings.housing.enabled && (
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <Label className="text-sm">Shape</Label>
                    <Select
                      value={settings.housing.shape}
                      onValueChange={(v) => updateHousing({ shape: v as typeof settings.housing.shape })}
                    >
                      <SelectTrigger data-testid="select-housing-shape" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {standTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Diameter: {settings.housing.diameter}mm</Label>
                    <Slider
                      data-testid="slider-housing-diameter"
                      value={[settings.housing.diameter]}
                      min={50}
                      max={150}
                      step={5}
                      onValueChange={([v]) => updateHousing({ diameter: v })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Height: {settings.housing.height}mm</Label>
                    <Slider
                      data-testid="slider-housing-height"
                      value={[settings.housing.height]}
                      min={20}
                      max={60}
                      step={5}
                      onValueChange={([v]) => updateHousing({ height: v })}
                      className="mt-2"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">USB Port Cutout</Label>
                      <Switch
                        data-testid="switch-usb-port"
                        checked={settings.housing.usbPort}
                        onCheckedChange={(v) => updateHousing({ usbPort: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Power Switch</Label>
                      <Switch
                        data-testid="switch-power-switch"
                        checked={settings.housing.powerSwitch}
                        onCheckedChange={(v) => updateHousing({ powerSwitch: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Potentiometer (dimmer)</Label>
                      <Switch
                        data-testid="switch-potentiometer"
                        checked={settings.housing.potentiometer}
                        onCheckedChange={(v) => updateHousing({ potentiometer: v })}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Back Plate Section */}
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Back Plate
                  </CardTitle>
                  <Switch
                    data-testid="switch-backplate-enabled"
                    checked={settings.backPlateEnabled}
                    onCheckedChange={(v) => updateSettings({ backPlateEnabled: v })}
                  />
                </div>
              </CardHeader>
              {settings.backPlateEnabled && (
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <Label className="text-sm">Width: {settings.backPlateWidth}mm</Label>
                    <Slider
                      data-testid="slider-backplate-width"
                      value={[settings.backPlateWidth]}
                      min={60}
                      max={200}
                      step={10}
                      onValueChange={([v]) => updateSettings({ backPlateWidth: v })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Height: {settings.backPlateHeight}mm</Label>
                    <Slider
                      data-testid="slider-backplate-height"
                      value={[settings.backPlateHeight]}
                      min={60}
                      max={200}
                      step={10}
                      onValueChange={([v]) => updateSettings({ backPlateHeight: v })}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </ScrollArea>

        {/* Export Button */}
        <div className="p-4 border-t">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
            data-testid="button-export-retro"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export ZIP (STL Files)
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Exports separate STL files for each component
          </p>
        </div>
      </div>

      {/* Right Panel - 3D Preview */}
      <div className="flex-1 bg-muted/30">
        <Canvas camera={{ position: [100, 80, 100], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[50, 100, 50]} intensity={1} />
          <pointLight position={[-50, 50, -50]} intensity={0.5} />

          {settings.mode === "edison_bulb" ? (
            <group>
              <ShellMesh 
                shape={settings.edison.shellShape}
                scale={settings.edison.shellScale}
                height={settings.edison.shellHeight}
              />
              <ScrewBaseMesh
                type={settings.edison.screwBase}
                diameter={settings.edison.openingDiameter}
              />
            </group>
          ) : (
            <NeonTubeMesh
              shape={settings.neonSign.shape}
              scale={settings.neonSign.scale}
              tubeWidth={settings.neonSign.tubeWidth}
              tubeDepth={settings.neonSign.tubeDepth}
            />
          )}

          {settings.housing.enabled && (
            <HousingMesh
              diameter={settings.housing.diameter}
              height={settings.housing.height}
              shape={settings.housing.shape}
            />
          )}

          <OrbitControls makeDefault />
          <Grid 
            args={[200, 200]} 
            cellSize={10}
            cellThickness={0.5}
            cellColor="#6b7280"
            sectionSize={50}
            sectionThickness={1}
            sectionColor="#9ca3af"
            fadeDistance={300}
            position={[0, -50, 0]}
          />
          <Environment preset="studio" />
        </Canvas>
      </div>
    </div>
  );
}
