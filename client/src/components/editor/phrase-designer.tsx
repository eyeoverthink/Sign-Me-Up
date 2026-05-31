import { useState, useMemo, useEffect, Suspense, Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FontSelector, type UploadedFont } from "@/components/shared/FontSelector";
import { 
  type PhraseSignSettings,
  type PhraseWeldingMode,
  type PhraseBorderStyle,
  type PhraseLedType,
  type PhraseShellMode,
  phraseWeldingModes,
  phraseBorderStyles,
  defaultPhraseSignSettings,
} from "@shared/schema";
import { Download, Type, Blend, Frame, Cable, Layers, AlertTriangle, Loader2, Sandwich, Info } from "lucide-react";
import { Link } from "wouter";

import { EmojiPicker } from "@/components/ui/emoji-picker";

// Helper to detect if text contains emojis
function containsEmoji(text: string): boolean {
  // Check for common emoji code points
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    // Emoji ranges: emoticons, symbols, dingbats, misc symbols, etc.
    if (
      (code >= 0x1F300 && code <= 0x1F9FF) || // Misc Symbols and Pictographs, Emoticons, etc.
      (code >= 0x2600 && code <= 0x26FF) ||   // Misc Symbols
      (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
      (code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
      (code >= 0x1F680 && code <= 0x1F6FF) || // Transport/Map Symbols
      (code >= 0x1F1E0 && code <= 0x1F1FF) || // Flags
      (code >= 0x2300 && code <= 0x23FF) ||   // Misc Technical
      code === 0x2B50 ||                       // Star
      (code >= 0xFE00 && code <= 0xFE0F) ||   // Variation Selectors
      (code >= 0x1F900 && code <= 0x1F9FF) || // Supplemental Symbols
      (code >= 0x1FA00 && code <= 0x1FA6F) || // Chess, Extended-A
      (code >= 0x1FA70 && code <= 0x1FAFF)    // Symbols Extended-A
    ) {
      return true;
    }
  }
  return false;
}

interface LetterPathData {
  char: string;
  outline: Array<{ x: number; y: number }>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

interface PreviewData {
  letterPaths: LetterPathData[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  svgPaths: string[];
}

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function PhrasePreview({ settings, previewData }: { settings: PhraseSignSettings; previewData: PreviewData | null }) {
  const { borderStyle, borderWidth, borderPadding, signHeight, wallThickness } = settings;
  const scale = 0.01;
  
  // Create extruded letter geometries from actual font paths
  const letterMeshes = useMemo(() => {
    if (!previewData || previewData.letterPaths.length === 0) {
      return null;
    }
    
    return previewData.letterPaths.map((letterPath, idx) => {
      if (letterPath.outline.length < 3) return null;
      
      // Create a THREE.Shape from the outline points
      const shape = new THREE.Shape();
      shape.moveTo(letterPath.outline[0].x * scale, letterPath.outline[0].y * scale);
      
      for (let i = 1; i < letterPath.outline.length; i++) {
        shape.lineTo(letterPath.outline[i].x * scale, letterPath.outline[i].y * scale);
      }
      shape.closePath();
      
      // Create extrusion settings
      const extrudeSettings = {
        steps: 1,
        depth: signHeight * scale,
        bevelEnabled: true,
        bevelThickness: 0.5 * scale,
        bevelSize: 0.3 * scale,
        bevelSegments: 2,
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      return { geometry, key: `letter-${idx}` };
    }).filter(Boolean);
  }, [previewData, scale, signHeight]);
  
  // Calculate bounds for base plate
  const totalWidth = previewData 
    ? (previewData.bounds.maxX - previewData.bounds.minX) * scale + (borderStyle !== "none" ? (borderPadding * 2 + borderWidth * 2) * scale : 0.1)
    : 1;
  const totalHeight = previewData
    ? (previewData.bounds.maxY - previewData.bounds.minY) * scale + (borderStyle !== "none" ? (borderPadding * 2 + borderWidth * 2) * scale : 0.1)
    : 0.5;
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, -3, 3]} intensity={0.5} color="#ff69b4" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <Environment preset="studio" />
      
      <Center>
        <group>
          {letterMeshes && letterMeshes.map((item) => item && (
            <mesh key={item.key} geometry={item.geometry} castShadow>
              <meshStandardMaterial 
                color="#ff69b4"
                emissive="#ff1493"
                emissiveIntensity={0.3}
                roughness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          
          {/* Fallback if no preview data yet */}
          {!letterMeshes && (
            <mesh castShadow>
              <boxGeometry args={[totalWidth, totalHeight, signHeight * scale]} />
              <meshStandardMaterial color="#ff69b4" opacity={0.5} transparent />
            </mesh>
          )}
          
          {borderStyle !== "none" && (
            <lineSegments>
              <edgesGeometry args={[
                borderStyle === "circle" || borderStyle === "oval"
                  ? new THREE.CircleGeometry(Math.max(totalWidth, totalHeight) / 2, 64)
                  : new THREE.BoxGeometry(totalWidth + borderWidth * 2 * scale, totalHeight + borderWidth * 2 * scale, signHeight * 0.5 * scale)
              ]} />
              <lineBasicMaterial color="#888888" />
            </lineSegments>
          )}
          
          {/* Base plate */}
          <mesh position={[0, 0, -signHeight * scale / 2 - wallThickness * scale / 2]} receiveShadow>
            <boxGeometry args={[totalWidth + 0.05, totalHeight + 0.05, wallThickness * scale]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
          </mesh>
        </group>
      </Center>
    </>
  );
}

function Preview2DFallback({ settings }: { settings: PhraseSignSettings }) {
  const { text, fontSize, weldingMode, borderStyle, borderWidth, borderPadding } = settings;
  const charWidth = Math.min(fontSize * 0.6, 60);
  const charHeight = Math.min(fontSize, 100);
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 p-8">
      <div className="flex items-center gap-2 text-amber-500 mb-4">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm">2D Preview Mode</span>
      </div>
      
      <div 
        className="relative flex items-center justify-center"
        style={{
          padding: borderStyle !== "none" ? `${borderPadding * 0.3}px` : 0,
          border: borderStyle !== "none" ? `${borderWidth * 0.3}px solid #666` : "none",
          borderRadius: borderStyle === "rounded" ? "12px" : borderStyle === "circle" || borderStyle === "oval" ? "50%" : 0,
        }}
      >
        <div className="flex gap-1">
          {text.split("").map((char, i) => (
            <div 
              key={i}
              className="flex items-center justify-center font-bold"
              style={{
                width: charWidth,
                height: charHeight,
                fontSize: charHeight * 0.7,
                background: "linear-gradient(135deg, #ff69b4, #ff1493)",
                borderRadius: 4,
                color: "white",
                textShadow: "0 0 10px rgba(255, 105, 180, 0.8)",
                marginLeft: weldingMode !== "none" && i > 0 ? -charWidth * 0.1 : 0,
              }}
            >
              {char}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 text-sm text-zinc-400 flex items-center gap-6">
        <span>W: <span className="text-pink-400">{Math.round(text.length * fontSize * 0.6)}mm</span></span>
        <span>H: <span className="text-pink-400">{fontSize}mm</span></span>
        <span>D: <span className="text-pink-400">{settings.signHeight}mm</span></span>
      </div>
      
      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500" />
          <span className="text-zinc-400">Letter body</span>
        </div>
        {weldingMode !== "none" && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-zinc-400">Weld points</span>
          </div>
        )}
        {borderStyle !== "none" && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-500" />
            <span className="text-zinc-400">Border frame</span>
          </div>
        )}
      </div>
      
      <p className="mt-6 text-xs text-zinc-500 max-w-sm text-center">
        Full 3D preview requires WebGL support. Export functionality works normally.
      </p>
    </div>
  );
}

export default function PhraseDesigner() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PhraseSignSettings>({
    ...defaultPhraseSignSettings,
    fontId: "airstream",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [selectedFontFile, setSelectedFontFile] = useState(settings.fontId || '');
  const [uploadedFont, setUploadedFont] = useState<UploadedFont | null>(null);
  
  // Fetch preview paths when settings change
  useEffect(() => {
    const fetchPreview = async () => {
      if (!settings.text.trim()) {
        setPreviewData(null);
        return;
      }
      
      setIsLoadingPreview(true);
      try {
        const response = await apiRequest("POST", "/api/preview/phrase-sign", settings);
        const data = await response.json();
        if (data.success) {
          setPreviewData({
            letterPaths: data.letterPaths,
            bounds: data.bounds,
            svgPaths: data.svgPaths,
          });
        }
      } catch (error) {
        console.error("Failed to fetch preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    };
    
    // Debounce the preview fetch
    const timeout = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timeout);
  }, [settings.text, settings.fontId, settings.fontSize, settings.shellMode, settings.ledType, settings.ledChannelWidth, settings.enableLedChannels, settings.ledChannelDepth, settings.wallThickness, settings.baseThickness, settings.signHeight]);
  
  const updateSetting = <K extends keyof PhraseSignSettings>(key: K, value: PhraseSignSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiRequest("POST", "/api/export/phrase-sign", settings);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Phrase_Sign_${settings.text.replace(/\s+/g, "_")}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "Your phrase sign has been downloaded." });
    } catch (error) {
      toast({ title: "Export failed", description: String(error), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        <WebGLErrorBoundary fallback={<Preview2DFallback settings={settings} />}>
          <Suspense fallback={<Preview2DFallback settings={settings} />}>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <PhrasePreview settings={settings} previewData={previewData} />
            </Canvas>
          </Suspense>
        </WebGLErrorBoundary>
        
        {isLoadingPreview && (
          <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
            <span className="text-xs text-muted-foreground">Loading font...</span>
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border shadow-lg">
          <p className="text-sm font-medium">Preview: "{settings.text}"</p>
          <p className="text-xs text-muted-foreground">
            Welding: {settings.weldingMode} | Border: {settings.borderStyle}
          </p>
        </div>
      </div>
      
      <div className="w-96 border-l bg-sidebar flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Type className="w-5 h-5" />
            Phrase Sign Designer
          </h2>
          <p className="text-sm text-muted-foreground">Create welded text signs with borders</p>
        </div>
        
        <Tabs defaultValue="text" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5 p-1 m-2 shrink-0">
            <TabsTrigger value="text" className="flex flex-col items-center gap-0.5 py-1">
              <Type className="h-3.5 w-3.5" />
              <span className="text-[9px]">Text</span>
            </TabsTrigger>
            <TabsTrigger value="welding" className="flex flex-col items-center gap-0.5 py-1">
              <Blend className="h-3.5 w-3.5" />
              <span className="text-[9px]">Weld</span>
            </TabsTrigger>
            <TabsTrigger value="border" className="flex flex-col items-center gap-0.5 py-1">
              <Frame className="h-3.5 w-3.5" />
              <span className="text-[9px]">Border</span>
            </TabsTrigger>
            <TabsTrigger value="shell" className="flex flex-col items-center gap-0.5 py-1">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-[9px]">Shell</span>
            </TabsTrigger>
            <TabsTrigger value="wiring" className="flex flex-col items-center gap-0.5 py-1">
              <Cable className="h-3.5 w-3.5" />
              <span className="text-[9px]">Wire</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="text" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Text Input</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Phrase Text</Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings.text}
                        onChange={(e) => updateSetting("text", e.target.value)}
                        placeholder="Enter your phrase..."
                        data-testid="input-phrase-text"
                        className="flex-1"
                      />
                      <EmojiPicker onSelect={(emoji) => updateSetting("text", settings.text + emoji)} />
                    </div>
                    
                    {/* Emoji Warning */}
                    {containsEmoji(settings.text) && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                        <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs space-y-1">
                          <p className="font-medium text-amber-600 dark:text-amber-400">Emojis detected in your text</p>
                          <p className="text-muted-foreground">
                            Most fonts don't support emoji characters. For emoji-only signs, use the{" "}
                            <Link href="/" className="text-primary underline font-medium">
                              Symbol Sign Editor
                            </Link>
                            {" "}instead (click the emoji icon in the sidebar).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Clear button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => updateSetting("text", "")}
                    data-testid="button-clear-phrase"
                  >
                    Clear Text
                  </Button>
                  
                  <FontSelector
                    selectedFont={selectedFontFile}
                    onFontSelect={(fontFile, familyName) => {
                      setSelectedFontFile(fontFile);
                      if (familyName) {
                        updateSetting("fontId", familyName);
                      }
                    }}
                    uploadedFont={uploadedFont}
                    onFontUpload={setUploadedFont}
                    showPreview={true}
                    previewCharacter={settings.text?.slice(0, 2) || "Aa"}
                    compact={true}
                  />
                  
                  <div className="space-y-2">
                    <Label>Font Size: {settings.fontSize}mm</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([v]) => updateSetting("fontSize", v)}
                      min={20}
                      max={200}
                      step={5}
                      data-testid="slider-font-size"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="welding" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Letter Welding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Welding Mode</Label>
                    <Select 
                      value={settings.weldingMode} 
                      onValueChange={(v) => updateSetting("weldingMode", v as PhraseWeldingMode)}
                    >
                      <SelectTrigger data-testid="select-welding-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Individual Letters)</SelectItem>
                        <SelectItem value="cursive">Cursive Flow</SelectItem>
                        <SelectItem value="continuous">Continuous Weld</SelectItem>
                        <SelectItem value="auto">Auto-Detect</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {settings.weldingMode === "none" && "Letters are exported individually"}
                      {settings.weldingMode === "cursive" && "Uses centerline extraction for smooth connections"}
                      {settings.weldingMode === "continuous" && "Welds letters at closest connection points"}
                      {settings.weldingMode === "auto" && "Automatically chooses best welding method"}
                    </p>
                  </div>
                  
                  {settings.weldingMode !== "none" && (
                    <>
                      <div className="space-y-2">
                        <Label>Welding Gap: {settings.weldingGap}mm</Label>
                        <Slider
                          value={[settings.weldingGap]}
                          onValueChange={([v]) => updateSetting("weldingGap", v)}
                          min={0}
                          max={10}
                          step={0.5}
                          data-testid="slider-welding-gap"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Smoothing Level: {settings.smoothingLevel}</Label>
                        <Slider
                          value={[settings.smoothingLevel]}
                          onValueChange={([v]) => updateSetting("smoothingLevel", v)}
                          min={1}
                          max={10}
                          step={1}
                          data-testid="slider-smoothing"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="border" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Border / Frame</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Border Style</Label>
                    <Select 
                      value={settings.borderStyle} 
                      onValueChange={(v) => updateSetting("borderStyle", v as PhraseBorderStyle)}
                    >
                      <SelectTrigger data-testid="select-border-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Border</SelectItem>
                        <SelectItem value="rectangle">Rectangle</SelectItem>
                        <SelectItem value="rounded">Rounded Rectangle</SelectItem>
                        <SelectItem value="circle">Circle</SelectItem>
                        <SelectItem value="oval">Oval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {settings.borderStyle !== "none" && (
                    <>
                      <div className="space-y-2">
                        <Label>Border Width: {settings.borderWidth}mm</Label>
                        <Slider
                          value={[settings.borderWidth]}
                          onValueChange={([v]) => updateSetting("borderWidth", v)}
                          min={5}
                          max={30}
                          step={1}
                          data-testid="slider-border-width"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Padding: {settings.borderPadding}mm</Label>
                        <Slider
                          value={[settings.borderPadding]}
                          onValueChange={([v]) => updateSetting("borderPadding", v)}
                          min={5}
                          max={50}
                          step={5}
                          data-testid="slider-border-padding"
                        />
                      </div>
                      
                      {settings.borderStyle === "rounded" && (
                        <div className="space-y-2">
                          <Label>Corner Radius: {settings.borderRadius}mm</Label>
                          <Slider
                            value={[settings.borderRadius]}
                            onValueChange={([v]) => updateSetting("borderRadius", v)}
                            min={0}
                            max={50}
                            step={5}
                            data-testid="slider-border-radius"
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="shell" className="mt-0 space-y-4">
              <Card className="border-primary/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sandwich className="h-4 w-4 text-primary" />
                    Shell Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Construction Type</Label>
                    <Select 
                      value={settings.shellMode} 
                      onValueChange={(v) => updateSetting("shellMode", v as PhraseShellMode)}
                    >
                      <SelectTrigger data-testid="select-shell-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_enclosure">Full Enclosure (Clamshell)</SelectItem>
                        <SelectItem value="half_shell">Half Shell (Flat Surface Mount)</SelectItem>
                        <SelectItem value="mounting_plate">Mounting Plate (LED Channels Only)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {settings.shellMode === "full_enclosure" && "Complete enclosed sign with top and bottom halves"}
                      {settings.shellMode === "half_shell" && "Bottom half only - perfect for mounting on walls/flat surfaces"}
                      {settings.shellMode === "mounting_plate" && "Flat plate with LED channels following text contours"}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">LED Type & Channel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>LED Type</Label>
                    <Select 
                      value={settings.ledType} 
                      onValueChange={(v) => {
                        updateSetting("ledType", v as PhraseLedType);
                        const widthMap: Record<string, number> = {
                          silicone_neon_6mm: 6, silicone_neon_8mm: 8,
                          led_strip_10mm: 10, individual_pixels_14mm: 14,
                          cob_strip_8mm: 8, cob_strip_10mm: 10,
                          neon_tube_6mm: 6, neon_tube_12mm: 12,
                          wide_tubing_15mm: 15, wide_tubing_20mm: 20,
                          custom: settings.customLedWidth || 10
                        };
                        const newWidth = widthMap[v] || 10;
                        updateSetting("ledChannelWidth", newWidth + 2);
                      }}
                    >
                      <SelectTrigger data-testid="select-led-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cob_strip_8mm">8mm COB Strip</SelectItem>
                        <SelectItem value="cob_strip_10mm">10mm COB Strip</SelectItem>
                        <SelectItem value="silicone_neon_6mm">6mm Silicone Neon</SelectItem>
                        <SelectItem value="silicone_neon_8mm">8mm Silicone Neon</SelectItem>
                        <SelectItem value="neon_tube_6mm">6mm Neon Tube</SelectItem>
                        <SelectItem value="neon_tube_12mm">12mm Neon Tube</SelectItem>
                        <SelectItem value="led_strip_10mm">10mm LED Strip</SelectItem>
                        <SelectItem value="individual_pixels_14mm">14mm Individual Pixels</SelectItem>
                        <SelectItem value="wide_tubing_15mm">15mm Wide Tubing</SelectItem>
                        <SelectItem value="wide_tubing_20mm">20mm Wide Tubing</SelectItem>
                        <SelectItem value="custom">Custom Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {settings.ledType === "custom" && (
                    <div className="space-y-2 p-2 bg-primary/10 rounded">
                      <Label>Custom LED Width: {settings.customLedWidth || 10}mm</Label>
                      <Slider
                        value={[settings.customLedWidth || 10]}
                        onValueChange={([v]) => {
                          updateSetting("customLedWidth", v);
                          updateSetting("ledChannelWidth", v + 2);
                        }}
                        min={2}
                        max={25}
                        step={1}
                        data-testid="slider-custom-led-width"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Channel Width: {settings.ledChannelWidth}mm</Label>
                    <Slider
                      value={[settings.ledChannelWidth]}
                      onValueChange={([v]) => updateSetting("ledChannelWidth", v)}
                      min={2}
                      max={25}
                      step={1}
                      data-testid="slider-led-channel-width"
                    />
                    <p className="text-xs text-muted-foreground">
                      Should be 2-4mm wider than your LED for easy insertion
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>LED Channels (Routing)</Label>
                    <Switch
                      checked={settings.enableLedChannels}
                      onCheckedChange={(v) => updateSetting("enableLedChannels", v)}
                      data-testid="switch-led-channels"
                    />
                  </div>
                  
                  {settings.enableLedChannels && (
                    <div className="space-y-2">
                      <Label>Channel Depth: {settings.ledChannelDepth}mm</Label>
                      <Slider
                        value={[settings.ledChannelDepth]}
                        onValueChange={([v]) => updateSetting("ledChannelDepth", v)}
                        min={2}
                        max={15}
                        step={1}
                        data-testid="slider-led-channel-depth"
                      />
                      <p className="text-xs text-muted-foreground">
                        Channels follow text contours for LED routing
                      </p>
                    </div>
                  )}
                  
                  {settings.ledType.startsWith("silicone_neon") && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Friction Lip (No-Glue Fit)</Label>
                        <Switch
                          checked={settings.enableFrictionLip}
                          onCheckedChange={(v) => updateSetting("enableFrictionLip", v)}
                          data-testid="switch-friction-lip"
                        />
                      </div>
                      
                      {settings.enableFrictionLip && (
                        <div className="space-y-2">
                          <Label>Lip Overhang: {settings.frictionLipOverhang}mm</Label>
                          <Slider
                            value={[settings.frictionLipOverhang]}
                            onValueChange={([v]) => updateSetting("frictionLipOverhang", v)}
                            min={0.2}
                            max={1.0}
                            step={0.1}
                            data-testid="slider-lip-overhang"
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Dimensions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sign Height: {settings.signHeight}mm</Label>
                    <Slider
                      value={[settings.signHeight]}
                      onValueChange={([v]) => updateSetting("signHeight", v)}
                      min={10}
                      max={100}
                      step={5}
                      data-testid="slider-sign-height"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Wall Thickness: {settings.wallThickness}mm</Label>
                    <Slider
                      value={[settings.wallThickness]}
                      onValueChange={([v]) => updateSetting("wallThickness", v)}
                      min={1}
                      max={5}
                      step={0.5}
                      data-testid="slider-wall-thickness"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Base Thickness: {settings.baseThickness}mm</Label>
                    <Slider
                      value={[settings.baseThickness]}
                      onValueChange={([v]) => updateSetting("baseThickness", v)}
                      min={1}
                      max={5}
                      step={0.5}
                      data-testid="slider-base-thickness"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Diffuser Lid</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Lid</Label>
                    <Switch
                      checked={settings.enableDiffuserLid}
                      onCheckedChange={(v) => updateSetting("enableDiffuserLid", v)}
                      data-testid="switch-diffuser-lid"
                    />
                  </div>
                  
                  {settings.enableDiffuserLid && (
                    <>
                      <div className="space-y-2">
                        <Label>Lid Style</Label>
                        <Select 
                          value={settings.lidStyle} 
                          onValueChange={(v) => updateSetting("lidStyle", v as "flat" | "domed")}
                        >
                          <SelectTrigger data-testid="select-lid-style">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flat">Flat (Snap-Fit)</SelectItem>
                            <SelectItem value="domed">Domed (Better Diffusion)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Lid Tolerance: {settings.lidTolerance}mm</Label>
                        <Slider
                          value={[settings.lidTolerance]}
                          onValueChange={([v]) => updateSetting("lidTolerance", v)}
                          min={0.1}
                          max={0.5}
                          step={0.05}
                          data-testid="slider-lid-tolerance"
                        />
                        <p className="text-xs text-muted-foreground">
                          0.15mm for tight fit, 0.25mm for easy removal
                        </p>
                      </div>
                      
                      {settings.lidStyle === "domed" && (
                        <div className="space-y-2">
                          <Label>Dome Height: {settings.domeHeight}mm</Label>
                          <Slider
                            value={[settings.domeHeight]}
                            onValueChange={([v]) => updateSetting("domeHeight", v)}
                            min={3}
                            max={20}
                            step={1}
                            data-testid="slider-dome-height"
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="wiring" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Wire Routing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Wire Holes</Label>
                    <Switch
                      checked={settings.enableWireHoles}
                      onCheckedChange={(v) => updateSetting("enableWireHoles", v)}
                      data-testid="switch-wire-holes"
                    />
                  </div>
                  
                  {settings.enableWireHoles && (
                    <>
                      <div className="space-y-2">
                        <Label>Hole Height: {settings.wireHoleHeight}mm from base</Label>
                        <Slider
                          value={[settings.wireHoleHeight]}
                          onValueChange={([v]) => updateSetting("wireHoleHeight", v)}
                          min={3}
                          max={20}
                          step={1}
                          data-testid="slider-hole-height"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Hole Diameter: {settings.wireHoleDiameter}mm</Label>
                        <Slider
                          value={[settings.wireHoleDiameter]}
                          onValueChange={([v]) => updateSetting("wireHoleDiameter", v)}
                          min={2}
                          max={6}
                          step={0.5}
                          data-testid="slider-hole-diameter"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Label>Wire Escape Slots</Label>
                    <Switch
                      checked={settings.enableWireEscapes}
                      onCheckedChange={(v) => updateSetting("enableWireEscapes", v)}
                      data-testid="switch-wire-escapes"
                    />
                  </div>
                  
                  {settings.enableWireEscapes && (
                    <div className="space-y-2">
                      <Label>Escape Size: {settings.wireEscapeSize}mm</Label>
                      <Slider
                        value={[settings.wireEscapeSize]}
                        onValueChange={([v]) => updateSetting("wireEscapeSize", v)}
                        min={3}
                        max={15}
                        step={1}
                        data-testid="slider-wire-escape"
                      />
                      <p className="text-xs text-muted-foreground">
                        Slots on base edges for power wire routing to controller
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-muted/50 rounded-md">
                    <p className="text-xs text-muted-foreground">
                      <strong>Modular Wiring:</strong> Wire holes connect letters in series (H→E→L→L→O). 
                      Wire escapes route power to controller.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="p-4 border-t shrink-0">
          <Button 
            className="w-full" 
            onClick={handleExport} 
            disabled={isExporting || !settings.text.trim()}
            data-testid="button-export-phrase"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Generating..." : "Export Phrase Sign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
