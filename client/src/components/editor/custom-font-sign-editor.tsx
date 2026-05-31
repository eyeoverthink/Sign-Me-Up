import { useState, useRef, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text3D, Center } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FontSelector, type UploadedFont } from "@/components/shared/FontSelector";
import { Download, Type, Lightbulb, Ruler, Package } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";

type LightType = 
  | 'silicone_neon_6mm' 
  | 'silicone_neon_8mm' 
  | 'ws2812b_5mm' 
  | 'ws2812b_10mm' 
  | 'ws2812b_12mm'
  | 'cob_strip_8mm'
  | 'cob_strip_10mm';
type RenderMode = 'body' | 'lid' | 'both';

interface CustomFontSignSettings {
  letter: string;
  fontName: string;
  fontSize: number;
  lightType: LightType;
  signHeight: number;
  wallThickness: number;
  baseThickness: number;
  renderMode: RenderMode;
  includeHoles: boolean;
  holeSize: number;
  holeHeight: number;
  exportAlphabet: boolean;
}

const defaultSettings: CustomFontSignSettings = {
  letter: "A",
  fontName: "Arial",
  fontSize: 100,
  lightType: "silicone_neon_6mm",
  signHeight: 30,
  wallThickness: 2,
  baseThickness: 2,
  renderMode: "body",
  includeHoles: true,
  holeSize: 5,
  holeHeight: 5,
  exportAlphabet: false,
};

const lightTypeOptions = [
  { value: "silicone_neon_6mm", label: "Silicone Neon 6mm", description: "Standard silicone neon flex (6mm diameter)" },
  { value: "silicone_neon_8mm", label: "Silicone Neon 8mm", description: "Larger silicone neon flex (8mm diameter)" },
  { value: "ws2812b_5mm", label: "WS2812B 5mm PCB", description: "Narrow addressable LED strip (5mm PCB width)" },
  { value: "ws2812b_10mm", label: "WS2812B 10mm PCB", description: "Standard addressable LED strip (10mm PCB width)" },
  { value: "ws2812b_12mm", label: "WS2812B 12mm PCB", description: "Wide addressable LED strip (12mm PCB width)" },
  { value: "cob_strip_8mm", label: "COB Strip 8mm", description: "Continuous COB LED strip (8mm width)" },
  { value: "cob_strip_10mm", label: "COB Strip 10mm", description: "Wide COB LED strip (10mm width)" },
];

const renderModeOptions = [
  { value: "body", label: "Body Only", description: "Just the main sign body with light channel" },
  { value: "lid", label: "Lid Only", description: "Just the diffuser cap" },
  { value: "both", label: "Body + Lid", description: "Both pieces side by side" },
];

// Returns channel width in mm based on actual LED/strip dimensions
// Adds ~0.5mm tolerance for easy insertion
function getChannelWidth(lightType: string): number {
  switch (lightType) {
    case 'silicone_neon_6mm': return 6.5;   // 6mm tube + tolerance
    case 'silicone_neon_8mm': return 8.5;   // 8mm tube + tolerance
    case 'ws2812b_5mm': return 5.5;         // 5mm PCB + tolerance
    case 'ws2812b_10mm': return 10.5;       // 10mm PCB + tolerance
    case 'ws2812b_12mm': return 12.5;       // 12mm PCB + tolerance
    case 'cob_strip_8mm': return 8.5;       // 8mm COB strip + tolerance
    case 'cob_strip_10mm': return 10.5;     // 10mm COB strip + tolerance
    default: return 6.5;
  }
}

// Returns depth recommendation for different LED types
function getChannelDepth(lightType: string): number {
  switch (lightType) {
    case 'silicone_neon_6mm': return 6.0;   // Circular profile
    case 'silicone_neon_8mm': return 8.0;   // Circular profile
    case 'ws2812b_5mm': return 3.5;         // SMD 5050 height ~2.5mm + PCB ~1mm
    case 'ws2812b_10mm': return 3.5;        // Same LED height
    case 'ws2812b_12mm': return 3.5;        // Same LED height
    case 'cob_strip_8mm': return 2.5;       // COB is thinner
    case 'cob_strip_10mm': return 2.5;      // COB is thinner
    default: return 6.0;
  }
}

// 3D Letter Sign component - renders hollow shell with cavity like the OpenSCAD output
function LetterSign3D({ settings }: { settings: CustomFontSignSettings }) {
  const groupRef = useRef<THREE.Group>(null);
  const channelWidth = getChannelWidth(settings.lightType);
  
  // Scale factor to fit in view (mm to scene units)
  const scale = 0.015;
  const height = settings.signHeight * scale;
  const wall = settings.wallThickness * scale;
  const base = settings.baseThickness * scale;
  const neonRadius = (channelWidth / 2) * scale;
  const lipWidth = 1.5 * scale; // Lip for lid to sit on
  const lidThickness = 2 * scale;
  
  // Slow rotation for visual appeal
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });
  
  // Calculate offsets based on OpenSCAD logic:
  // Outer shell: offset(r = Neon_Width/2 + Wall_Thickness)
  // Inner cavity: offset(r = Neon_Width/2)
  // The difference creates the wall thickness
  const outerScale = 1.0;
  const innerScale = 1.0 - (wall * 2); // Inner cavity is smaller by wall thickness on each side
  const lidScale = innerScale + (lipWidth * 2); // Lid sits in the lip area
  
  return (
    <group ref={groupRef}>
      <Center>
        <group>
          {/* OUTER SHELL - The walls of the sign body */}
          {/* This is semi-transparent to show it's hollow */}
          <Suspense fallback={null}>
            <Text3D
              font="/fonts/helvetiker_bold.typeface.json"
              size={outerScale}
              height={height}
              curveSegments={12}
              bevelEnabled={false}
            >
              {settings.letter || "A"}
              <meshStandardMaterial 
                color="#4a5568" 
                metalness={0.2} 
                roughness={0.6}
                transparent
                opacity={0.85}
                side={THREE.DoubleSide}
              />
            </Text3D>
          </Suspense>
          
          {/* BASE FLOOR - The bottom of the cavity where LEDs sit */}
          <group position={[wall * 0.5, wall * 0.5, base]}>
            <Suspense fallback={null}>
              <Text3D
                font="/fonts/helvetiker_bold.typeface.json"
                size={innerScale}
                height={0.005}
                curveSegments={12}
                bevelEnabled={false}
              >
                {settings.letter || "A"}
                <meshStandardMaterial 
                  color="#2d3748"
                  metalness={0.1}
                  roughness={0.9}
                />
              </Text3D>
            </Suspense>
          </group>
          
          {/* INNER CAVITY GLOW - Shows where LEDs go (the hollow inside) */}
          {/* This represents the light channel carved out of the body */}
          <group position={[wall * 0.5, wall * 0.5, base + 0.01]}>
            <Suspense fallback={null}>
              <Text3D
                font="/fonts/helvetiker_bold.typeface.json"
                size={innerScale}
                height={height - base - lidThickness}
                curveSegments={12}
                bevelEnabled={false}
              >
                {settings.letter || "A"}
                <meshStandardMaterial 
                  color="#fbbf24"
                  emissive="#fbbf24"
                  emissiveIntensity={0.5}
                  transparent
                  opacity={0.6}
                />
              </Text3D>
            </Suspense>
          </group>
          
          {/* LID - The diffuser/cover that sits in the lip */}
          {/* Shown floating above in assembly mode, or seated in lid mode */}
          {(settings.renderMode === "lid" || settings.renderMode === "both") && (
            <group position={[
              wall * 0.3, 
              wall * 0.3, 
              settings.renderMode === "both" ? height + 0.15 : height - lidThickness
            ]}>
              <Suspense fallback={null}>
                <Text3D
                  font="/fonts/helvetiker_bold.typeface.json"
                  size={lidScale}
                  height={lidThickness}
                  curveSegments={12}
                  bevelEnabled={false}
                >
                  {settings.letter || "A"}
                  <meshStandardMaterial 
                    color="#f5f5f4"
                    transparent
                    opacity={0.9}
                    metalness={0.0}
                    roughness={0.3}
                  />
                </Text3D>
              </Suspense>
            </group>
          )}
        </group>
      </Center>
    </group>
  );
}

// 3D Preview Scene
function SignPreview3D({ settings }: { settings: CustomFontSignSettings }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#fbbf24" />
      
      <LetterSign3D settings={settings} />
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        minDistance={1}
        maxDistance={10}
      />
      
      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.3} />
      </mesh>
    </>
  );
}

// Fallback 2D Preview (shown while 3D loads or if WebGL fails)
function SignPreview2D({ settings }: { settings: CustomFontSignSettings }) {
  const channelWidth = getChannelWidth(settings.lightType);
  
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="relative">
        <div 
          className="bg-gray-600 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-lg"
          style={{ padding: `${settings.wallThickness * 3}px`, minWidth: '200px', minHeight: '200px' }}
        >
          <div 
            className="bg-gradient-to-br from-amber-400 to-amber-500 rounded flex items-center justify-center"
            style={{ padding: `${channelWidth}px`, boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}
          >
            <span 
              className="text-white font-bold drop-shadow-lg"
              style={{ fontSize: `${Math.min(settings.fontSize, 120)}px`, fontFamily: settings.fontName }}
              data-testid="preview-letter"
            >
              {settings.letter || "A"}
            </span>
          </div>
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          Height: {settings.signHeight}mm
        </div>
      </div>
      <div className="text-center space-y-1 mt-4">
        <div className="text-sm font-medium">
          {settings.lightType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </div>
        <div className="text-xs text-muted-foreground">Channel: {channelWidth}mm | Wall: {settings.wallThickness}mm</div>
      </div>
    </div>
  );
}

// Check if WebGL is available
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

export function CustomFontSignEditor() {
  const [settings, setSettings] = useState<CustomFontSignSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [use3D, setUse3D] = useState(false);
  const [selectedFontFile, setSelectedFontFile] = useState(defaultSettings.fontName || '');
  const [uploadedFont, setUploadedFont] = useState<UploadedFont | null>(null);
  const { toast } = useToast();
  
  // Check WebGL on mount
  useEffect(() => {
    setUse3D(isWebGLAvailable());
  }, []);

  const updateSettings = (updates: Partial<CustomFontSignSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/custom-font-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const filename = settings.exportAlphabet 
        ? `custom_font_alphabet_${settings.fontName}.zip`
        : `sign_letter_${settings.letter}.scad`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: settings.exportAlphabet 
          ? `Full alphabet downloaded as ${filename}`
          : `OpenSCAD file downloaded as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate the sign file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left panel - Settings */}
      <div className="w-80 p-4 space-y-4 overflow-y-auto border-r bg-background">
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Type className="w-5 h-5" />
            Custom Font Sign Generator
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate OpenSCAD files for letter-shaped signs
          </p>
        </div>

        <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="w-4 h-4" />
            Text & Font
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Letter/Text</Label>
            <div className="flex gap-2">
              <Input
                data-testid="input-letter"
                value={settings.letter}
                onChange={(e) => updateSettings({ letter: e.target.value.toUpperCase() })}
                placeholder="A"
                maxLength={10}
                className="flex-1"
              />
              <EmojiPicker onSelect={(emoji) => updateSettings({ letter: (settings.letter + emoji).slice(0, 10) })} />
            </div>
          </div>

          <FontSelector
            selectedFont={selectedFontFile}
            onFontSelect={(fontFile, familyName) => {
              setSelectedFontFile(fontFile);
              if (familyName) {
                updateSettings({ fontName: familyName });
              }
            }}
            uploadedFont={uploadedFont}
            onFontUpload={setUploadedFont}
            showPreview={true}
            previewCharacter={settings.letter || "A"}
            compact={true}
          />

          <div className="space-y-2">
            <Label>Font Size: {settings.fontSize}mm</Label>
            <Slider
              data-testid="slider-font-size"
              value={[settings.fontSize]}
              onValueChange={([v]) => updateSettings({ fontSize: v })}
              min={20}
              max={500}
              step={10}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Light Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.lightType}
            onValueChange={(v: LightType) => updateSettings({ lightType: v })}
          >
            <SelectTrigger data-testid="select-light-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lightTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`option-light-${opt.value}`}>
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sign Height: {settings.signHeight}mm</Label>
            <Slider
              data-testid="slider-sign-height"
              value={[settings.signHeight]}
              onValueChange={([v]) => updateSettings({ signHeight: v })}
              min={10}
              max={100}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Wall Thickness: {settings.wallThickness}mm</Label>
            <Slider
              data-testid="slider-wall-thickness"
              value={[settings.wallThickness]}
              onValueChange={([v]) => updateSettings({ wallThickness: v })}
              min={1}
              max={10}
              step={0.5}
            />
          </div>

          <div className="space-y-2">
            <Label>Base Thickness: {settings.baseThickness}mm</Label>
            <Slider
              data-testid="slider-base-thickness"
              value={[settings.baseThickness]}
              onValueChange={([v]) => updateSettings({ baseThickness: v })}
              min={1}
              max={10}
              step={0.5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Export Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={settings.renderMode}
            onValueChange={(v: RenderMode) => updateSettings({ renderMode: v })}
          >
            <SelectTrigger data-testid="select-render-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {renderModeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`option-render-${opt.value}`}>
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center justify-between">
            <div>
              <Label>Include Wire Holes</Label>
              <p className="text-xs text-muted-foreground">Side holes for wire entry/exit</p>
            </div>
            <Switch
              data-testid="switch-include-holes"
              checked={settings.includeHoles}
              onCheckedChange={(v) => updateSettings({ includeHoles: v })}
            />
          </div>

          {settings.includeHoles && (
            <div className="space-y-2">
              <Label>Hole Size: {settings.holeSize}mm</Label>
              <Slider
                data-testid="slider-hole-size"
                value={[settings.holeSize]}
                onValueChange={([v]) => updateSettings({ holeSize: v })}
                min={2}
                max={15}
                step={0.5}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Export Full Alphabet</Label>
              <p className="text-xs text-muted-foreground">Generate A-Z and 0-9 as ZIP</p>
            </div>
            <Switch
              data-testid="switch-export-alphabet"
              checked={settings.exportAlphabet}
              onCheckedChange={(v) => updateSettings({ exportAlphabet: v })}
            />
          </div>
        </CardContent>
      </Card>

        <Button
          data-testid="button-export-custom-font-sign"
          className="w-full"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting 
            ? "Generating..." 
            : settings.exportAlphabet 
              ? "Export Full Alphabet (ZIP)"
              : `Export Letter "${settings.letter}" (.scad)`
          }
        </Button>

        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
          <p className="font-medium mb-1">How to use:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Download the .scad file</li>
            <li>Open in OpenSCAD (free: openscad.org)</li>
            <li>Press F6 to render</li>
            <li>Export as STL for 3D printing</li>
          </ol>
        </div>
      </div>
      
      {/* Right panel - Preview (3D if WebGL available, otherwise 2D) */}
      <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 relative" data-testid="preview-canvas">
        {use3D ? (
          <Canvas 
            camera={{ position: [0, 0, 4], fov: 50 }}
            gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
            onCreated={({ gl }) => {
              gl.setClearColor('#1a1a2e', 1);
            }}
          >
            <Suspense fallback={null}>
              <SignPreview3D settings={settings} />
            </Suspense>
          </Canvas>
        ) : (
          <SignPreview2D settings={settings} />
        )}
        
        {/* Info overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium" data-testid="preview-letter">{settings.letter || "A"}</span>
            <span className="text-xs text-gray-300">
              {settings.lightType.replace(/_/g, ' ')} | {settings.signHeight}mm height
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {use3D ? "Drag to rotate | Scroll to zoom" : "2D Preview"}
          </div>
        </div>
      </div>
    </div>
  );
}
