import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, Grid3X3, Box, Layers, Cable, Cpu, Type, MousePointer2, AlertCircle, Sparkles, Palette, RotateCcw } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useCallback, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// Animation modes for Arduino code generation (10 FastLED modes)
const animationModes = [
  { value: "rainbow", label: "Rainbow", description: "Smooth rainbow cycle" },
  { value: "confetti", label: "Confetti", description: "Random colored speckles" },
  { value: "sinelon", label: "Sinelon", description: "Sweeping dot with trails" },
  { value: "juggle", label: "Juggle", description: "Weaving colored dots" },
  { value: "bpm", label: "BPM Pulse", description: "Pulsing stripes at 62 BPM" },
  { value: "chase", label: "Chase", description: "Chasing dots" },
  { value: "breathe", label: "Breathe", description: "Slow brightness fade" },
  { value: "sparkle", label: "Sparkle", description: "Random sparkle effect" },
  { value: "cylon", label: "Cylon", description: "Back-and-forth scanner" },
  { value: "random", label: "Random", description: "Random colors per LED" },
] as const;

const colorOptions = [
  "White", "Red", "Green", "Blue", "Yellow", "Cyan", "Magenta", 
  "Orange", "Purple", "Pink", "Lime", "Gold", "Aqua"
] as const;

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

function PreviewFallback({ settings }: { settings: LEDGridSettings }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
          <Grid3X3 className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold">LED Grid Preview</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Grid Size: <span className="font-medium text-foreground">{settings.gridWidth}x{settings.gridHeight}</span></p>
          <p>Total LEDs: <span className="font-medium text-foreground">{settings.gridWidth * settings.gridHeight}</span></p>
          <p>Wiring: <span className="font-medium text-foreground">{settings.wiringPattern}</span></p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span>3D preview requires WebGL</span>
        </div>
      </div>
    </div>
  );
}
import { 
  LEDGridSettings, 
  defaultLEDGridSettings, 
  ledGridPresetSizes, 
  ledGridWiringPatterns,
  ledGridDiffusionPatterns,
  ledGridHousingStyles,
  LED_FONT_5x7,
  type LEDGridPresetSize,
  type LEDGridWiringPattern,
  type LEDGridDiffusionPattern,
  type LEDGridHousingStyle
} from "@shared/schema";

const presetDimensions: Record<LEDGridPresetSize, { width: number; height: number }> = {
  "8x7": { width: 8, height: 7 },
  "16x8": { width: 16, height: 8 },
  "32x8": { width: 32, height: 8 },
  "16x16": { width: 16, height: 16 },
  "custom": { width: 8, height: 7 },
};

function textToPixels(text: string, gridWidth: number, gridHeight: number): boolean[][] {
  const grid: boolean[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false));
  
  let xOffset = 1;
  const upperText = text.toUpperCase();
  
  for (const char of upperText) {
    const charData = LED_FONT_5x7[char];
    if (!charData) continue;
    
    for (let col = 0; col < charData.length; col++) {
      const columnBits = charData[col];
      for (let bit = 0; bit < 7; bit++) {
        if ((columnBits >> bit) & 1) {
          const px = xOffset + col;
          const py = bit;
          if (px >= 0 && px < gridWidth && py >= 0 && py < gridHeight) {
            grid[py][px] = true;
          }
        }
      }
    }
    xOffset += charData.length + 1;
  }
  
  return grid;
}

function getLEDIndex(col: number, row: number, gridWidth: number, gridHeight: number, wiringPattern: string): number {
  if (wiringPattern === "serpentine") {
    if (row % 2 === 0) {
      return row * gridWidth + col;
    } else {
      return row * gridWidth + (gridWidth - 1 - col);
    }
  } else if (wiringPattern === "zigzag") {
    if (col % 2 === 0) {
      return col * gridHeight + row;
    } else {
      return col * gridHeight + (gridHeight - 1 - row);
    }
  } else {
    return row * gridWidth + col;
  }
}

function LEDGridPreview({ settings, pixelGrid }: { settings: LEDGridSettings; pixelGrid: boolean[][] }) {
  const scale = 0.01;
  const spacing = settings.ledSpacing * scale;
  const wall = settings.wallThickness * scale;
  const depth = settings.housingDepth * scale;
  
  const gridW = settings.gridWidth;
  const gridH = settings.gridHeight;
  
  const innerW = gridW * spacing;
  const innerH = gridH * spacing;
  const outerW = innerW + wall * 2;
  const outerH = innerH + wall * 2;

  const housingGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-outerW / 2, -outerH / 2);
    shape.lineTo(outerW / 2, -outerH / 2);
    shape.lineTo(outerW / 2, outerH / 2);
    shape.lineTo(-outerW / 2, outerH / 2);
    shape.closePath();
    
    const innerShape = new THREE.Path();
    innerShape.moveTo(-innerW / 2, -innerH / 2);
    innerShape.lineTo(innerW / 2, -innerH / 2);
    innerShape.lineTo(innerW / 2, innerH / 2);
    innerShape.lineTo(-innerW / 2, innerH / 2);
    innerShape.closePath();
    shape.holes.push(innerShape);
    
    return new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
  }, [outerW, outerH, innerW, innerH, depth]);

  const diffuserGeom = useMemo(() => {
    return new THREE.BoxGeometry(outerW, outerH, settings.diffuserThickness * scale);
  }, [outerW, outerH, settings.diffuserThickness, scale]);

  return (
    <group>
      <mesh geometry={housingGeom} position={[0, 0, -depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2d3748" roughness={0.7} metalness={0.2} />
      </mesh>
      
      {settings.includeDiffuser && (
        <mesh geometry={diffuserGeom} position={[0, 0, settings.diffuserOffset * scale]}>
          <meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={0.6} />
        </mesh>
      )}
      
      {Array.from({ length: gridH }).map((_, row) =>
        Array.from({ length: gridW }).map((_, col) => {
          const isLit = pixelGrid[row]?.[col] ?? false;
          const x = -innerW / 2 + (col + 0.5) * spacing;
          const y = innerH / 2 - (row + 0.5) * spacing;
          return (
            <mesh key={`${row}-${col}`} position={[x, y, 0]}>
              <boxGeometry args={[spacing * 0.8, spacing * 0.8, 0.02]} />
              <meshStandardMaterial 
                color={isLit ? "#22c55e" : "#1f2937"} 
                emissive={isLit ? "#22c55e" : "#000000"}
                emissiveIntensity={isLit ? 0.5 : 0}
              />
            </mesh>
          );
        })
      )}
    </group>
  );
}

export function LEDGridEditor() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<LEDGridSettings>(defaultLEDGridSettings);
  const [textInput, setTextInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showIndices, setShowIndices] = useState(false);
  const [customPixels, setCustomPixels] = useState<Set<string>>(new Set());
  
  // Animation settings
  const [animationMode, setAnimationMode] = useState<string>("rainbow");
  const [includeEncoder, setIncludeEncoder] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("White");
  const [secondaryColor, setSecondaryColor] = useState("Blue");

  const pixelGrid = useMemo(() => {
    if (textInput) {
      return textToPixels(textInput, settings.gridWidth, settings.gridHeight);
    }
    const grid: boolean[][] = Array(settings.gridHeight).fill(null).map(() => 
      Array(settings.gridWidth).fill(false)
    );
    customPixels.forEach(key => {
      const [col, row] = key.split(',').map(Number);
      if (row >= 0 && row < settings.gridHeight && col >= 0 && col < settings.gridWidth) {
        grid[row][col] = true;
      }
    });
    return grid;
  }, [textInput, settings.gridWidth, settings.gridHeight, customPixels]);

  const togglePixel = useCallback((col: number, row: number) => {
    const key = `${col},${row}`;
    setCustomPixels(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setTextInput("");
  }, []);

  const handlePresetChange = (preset: LEDGridPresetSize) => {
    const dims = presetDimensions[preset];
    setSettings(s => ({
      ...s,
      presetSize: preset,
      gridWidth: dims.width,
      gridHeight: dims.height,
    }));
    setCustomPixels(new Set());
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/led-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          textContent: textInput || undefined,
          animationMode,
          includeEncoder,
          primaryColor,
          secondaryColor,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `led_grid_${settings.gridWidth}x${settings.gridHeight}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const modeLabel = animationModes.find(m => m.value === animationMode)?.label || animationMode;
      toast({
        title: "Export Complete",
        description: `LED grid exported with ${modeLabel} animation code`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate LED grid files",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalLEDs = settings.gridWidth * settings.gridHeight;

  return (
    <div className="flex h-full">
      <div className="w-80 border-r bg-card overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">LED Grid Sign</h2>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Grid Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preset Size</Label>
                <Select value={settings.presetSize} onValueChange={(v) => handlePresetChange(v as LEDGridPresetSize)}>
                  <SelectTrigger data-testid="select-preset-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ledGridPresetSizes.map(size => (
                      <SelectItem key={size} value={size}>
                        {size === "custom" ? "Custom" : size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {settings.presetSize === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={settings.gridWidth}
                      onChange={e => setSettings(s => ({ ...s, gridWidth: parseInt(e.target.value) || 8 }))}
                      min={4}
                      max={64}
                      data-testid="input-grid-width"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={settings.gridHeight}
                      onChange={e => setSettings(s => ({ ...s, gridHeight: parseInt(e.target.value) || 7 }))}
                      min={4}
                      max={64}
                      data-testid="input-grid-height"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total LEDs</span>
                <Badge variant="secondary">{totalLEDs}</Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>LED Spacing: {settings.ledSpacing}mm</Label>
                <Slider
                  value={[settings.ledSpacing]}
                  onValueChange={([v]) => setSettings(s => ({ ...s, ledSpacing: v }))}
                  min={8}
                  max={20}
                  step={1}
                  data-testid="slider-led-spacing"
                />
              </div>

              <div className="space-y-2">
                <Label>Wiring Pattern</Label>
                <Select 
                  value={settings.wiringPattern} 
                  onValueChange={(v) => setSettings(s => ({ ...s, wiringPattern: v as LEDGridWiringPattern }))}
                >
                  <SelectTrigger data-testid="select-wiring-pattern">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ledGridWiringPatterns.map(pattern => (
                      <SelectItem key={pattern} value={pattern}>
                        {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box className="w-4 h-4" />
                Housing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Include Housing</Label>
                <Switch
                  checked={settings.includeHousing}
                  onCheckedChange={v => setSettings(s => ({ ...s, includeHousing: v }))}
                  data-testid="switch-include-housing"
                />
              </div>

              {settings.includeHousing && (
                <>
                  <div className="space-y-2">
                    <Label>Housing Style</Label>
                    <Select 
                      value={settings.housingStyle || "open_back"} 
                      onValueChange={(v) => setSettings(s => ({ ...s, housingStyle: v as LEDGridHousingStyle }))}
                    >
                      <SelectTrigger data-testid="select-housing-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ledGridHousingStyles.map(style => (
                          <SelectItem key={style} value={style}>
                            {style === "open_back" ? "Open Back" : 
                             style === "enclosed" ? "Fully Enclosed" :
                             style === "snap_lid" ? "Snap-On Lid" : "Screw-On Lid"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Wall Thickness: {settings.wallThickness}mm</Label>
                    <Slider
                      value={[settings.wallThickness]}
                      onValueChange={([v]) => setSettings(s => ({ ...s, wallThickness: v }))}
                      min={2}
                      max={5}
                      step={0.5}
                      data-testid="slider-wall-thickness"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Housing Depth: {settings.housingDepth}mm</Label>
                    <Slider
                      value={[settings.housingDepth]}
                      onValueChange={([v]) => setSettings(s => ({ ...s, housingDepth: v }))}
                      min={10}
                      max={30}
                      step={1}
                      data-testid="slider-housing-depth"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Mounting Holes</Label>
                    <Switch
                      checked={settings.includeMountingHoles}
                      onCheckedChange={v => setSettings(s => ({ ...s, includeMountingHoles: v }))}
                      data-testid="switch-mounting-holes"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cable className="w-4 h-4" />
                Wire Routing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Wire Channel</Label>
                <Switch
                  checked={settings.includeWireChannel ?? true}
                  onCheckedChange={v => setSettings(s => ({ ...s, includeWireChannel: v }))}
                  data-testid="switch-wire-channel"
                />
              </div>

              {(settings.includeWireChannel ?? true) && (
                <>
                  <div className="space-y-2">
                    <Label>Channel Width: {settings.wireChannelWidth || 5}mm</Label>
                    <Slider
                      value={[settings.wireChannelWidth || 5]}
                      onValueChange={([v]) => setSettings(s => ({ ...s, wireChannelWidth: v }))}
                      min={3}
                      max={10}
                      step={1}
                      data-testid="slider-wire-channel-width"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Wire Exit Side</Label>
                    <Select 
                      value={settings.wireExitSide || "bottom"} 
                      onValueChange={(v) => setSettings(s => ({ ...s, wireExitSide: v as "bottom" | "left" | "right" | "back" }))}
                    >
                      <SelectTrigger data-testid="select-wire-exit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="left">Left Side</SelectItem>
                        <SelectItem value="right">Right Side</SelectItem>
                        <SelectItem value="back">Back</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Diffuser
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Include Diffuser</Label>
                <Switch
                  checked={settings.includeDiffuser}
                  onCheckedChange={v => setSettings(s => ({ ...s, includeDiffuser: v }))}
                  data-testid="switch-include-diffuser"
                />
              </div>

              {settings.includeDiffuser && (
                <>
                  <div className="space-y-2">
                    <Label>Diffuser Thickness: {settings.diffuserThickness}mm</Label>
                    <Slider
                      value={[settings.diffuserThickness]}
                      onValueChange={([v]) => setSettings(s => ({ ...s, diffuserThickness: v }))}
                      min={1}
                      max={4}
                      step={0.5}
                      data-testid="slider-diffuser-thickness"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Offset from LEDs: {settings.diffuserOffset}mm</Label>
                    <Slider
                      value={[settings.diffuserOffset]}
                      onValueChange={([v]) => setSettings(s => ({ ...s, diffuserOffset: v }))}
                      min={3}
                      max={15}
                      step={1}
                      data-testid="slider-diffuser-offset"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Diffusion Pattern</Label>
                    <Select 
                      value={settings.diffusionPattern || "none"} 
                      onValueChange={(v) => setSettings(s => ({ ...s, diffusionPattern: v as LEDGridDiffusionPattern }))}
                    >
                      <SelectTrigger data-testid="select-diffusion-pattern">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ledGridDiffusionPatterns.map(pattern => (
                          <SelectItem key={pattern} value={pattern}>
                            {pattern === "none" ? "Smooth (no pattern)" :
                             pattern === "honeycomb" ? "Honeycomb" :
                             pattern === "dots" ? "Dot Matrix" :
                             pattern === "grid" ? "Grid Lines" :
                             pattern === "diamonds" ? "Diamonds" :
                             pattern === "lines" ? "Parallel Lines" : "Voronoi (Organic)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Patterns etched into diffuser for better light spread
                    </p>
                  </div>

                  {(settings.diffusionPattern && settings.diffusionPattern !== "none") && (
                    <div className="space-y-3 pl-3 border-l-2 border-primary/20">
                      <div className="space-y-2">
                        <Label>Pattern Density: {settings.diffusionDensity || 50}%</Label>
                        <Slider
                          value={[settings.diffusionDensity || 50]}
                          onValueChange={([v]) => setSettings(s => ({ ...s, diffusionDensity: v }))}
                          min={10}
                          max={90}
                          step={5}
                          data-testid="slider-diffusion-density"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Etch Depth: {settings.diffusionDepth || 0.5}mm</Label>
                        <Slider
                          value={[settings.diffusionDepth || 0.5]}
                          onValueChange={([v]) => setSettings(s => ({ ...s, diffusionDepth: v }))}
                          min={0.2}
                          max={1.5}
                          step={0.1}
                          data-testid="slider-diffusion-depth"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="w-4 h-4" />
                Text Display
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Text (5x7 font)</Label>
                <div className="flex gap-2">
                  <Input
                    value={textInput}
                    onChange={e => {
                      setTextInput(e.target.value);
                      setCustomPixels(new Set());
                    }}
                    placeholder="Type text..."
                    maxLength={Math.floor(settings.gridWidth / 6)}
                    data-testid="input-text-display"
                    className="flex-1"
                  />
                  <EmojiPicker onSelect={(emoji) => {
                    const maxLen = Math.floor(settings.gridWidth / 6);
                    setTextInput((textInput + emoji).slice(0, maxLen));
                    setCustomPixels(new Set());
                  }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Max {Math.floor(settings.gridWidth / 6)} characters for this grid size
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Animation Effects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Animation Mode</Label>
                <Select value={animationMode} onValueChange={setAnimationMode}>
                  <SelectTrigger data-testid="select-animation-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {animationModes.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex flex-col">
                          <span>{mode.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {animationModes.find(m => m.value === animationMode)?.description}
                </p>
              </div>

              {(animationMode === "chase" || animationMode === "breathe" || animationMode === "sparkle" || animationMode === "cylon") && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-3 h-3" />
                      Primary Color
                    </Label>
                    <Select value={primaryColor} onValueChange={setPrimaryColor}>
                      <SelectTrigger data-testid="select-primary-color">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map(color => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {animationMode === "chase" && (
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <Select value={secondaryColor} onValueChange={setSecondaryColor}>
                        <SelectTrigger data-testid="select-secondary-color">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map(color => (
                            <SelectItem key={color} value={color}>{color}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <RotateCcw className="w-3 h-3" />
                    Encoder Support
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add rotary encoder for brightness
                  </p>
                </div>
                <Switch
                  checked={includeEncoder}
                  onCheckedChange={setIncludeEncoder}
                  data-testid="switch-encoder"
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            onClick={handleExport} 
            disabled={isExporting}
            data-testid="button-export-led-grid"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Generating..." : "Export LED Grid"}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Export includes:</p>
            <ul className="list-disc list-inside">
              <li>Housing STL</li>
              <li>Diffuser panel STL</li>
              <li>Grid mount STL</li>
              <li>Wiring diagram</li>
              <li>Arduino code</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          {checkWebGLSupport() ? (
            <Suspense fallback={<PreviewFallback settings={settings} />}>
              <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <LEDGridPreview settings={settings} pixelGrid={pixelGrid} />
                <OrbitControls enablePan enableZoom enableRotate />
                <ContactShadows position={[0, -0.5, 0]} opacity={0.3} blur={2} />
                <Environment preset="studio" />
              </Canvas>
            </Suspense>
          ) : (
            <PreviewFallback settings={settings} />
          )}
        </div>

        <div className="h-64 border-t p-4 overflow-auto bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium flex items-center gap-2">
              <MousePointer2 className="w-4 h-4" />
              Pixel Grid Editor
            </h3>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Show Indices</Label>
              <Switch
                checked={showIndices}
                onCheckedChange={setShowIndices}
                data-testid="switch-show-indices"
              />
            </div>
          </div>
          
          <div 
            className="inline-grid gap-px bg-border p-1 rounded"
            style={{ 
              gridTemplateColumns: `repeat(${settings.gridWidth}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: settings.gridHeight }).map((_, row) =>
              Array.from({ length: settings.gridWidth }).map((_, col) => {
                const isLit = pixelGrid[row]?.[col] ?? false;
                const index = getLEDIndex(col, row, settings.gridWidth, settings.gridHeight, settings.wiringPattern);
                return (
                  <button
                    key={`${row}-${col}`}
                    onClick={() => togglePixel(col, row)}
                    className={`w-6 h-6 text-[8px] flex items-center justify-center transition-colors ${
                      isLit 
                        ? "bg-green-500 text-white" 
                        : "bg-card hover:bg-accent"
                    }`}
                    data-testid={`pixel-${col}-${row}`}
                  >
                    {showIndices ? index : ""}
                  </button>
                );
              })
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Click pixels to toggle. {settings.wiringPattern} wiring pattern.
          </p>
        </div>
      </div>
    </div>
  );
}
