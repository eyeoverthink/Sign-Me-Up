import { useEditorStore } from "@/lib/editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Type, Pencil, Image, Download, Loader2, Lightbulb, Layers, Zap, Link, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ledStripTypes, type CustomInputMode, type SketchPath, type LedStripType } from "@shared/schema";
import { FontSelector, type UploadedFont } from "@/components/shared/FontSelector";
import { DrawingCanvas } from "./drawing-canvas";
import { ImageTracer } from "./image-tracer";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Text3D, Center, Line } from "@react-three/drei";
import * as THREE from "three";

export function CustomShapesEditor() {
  const { customShapeSettings, setCustomShapeSettings, sketchPaths, tracedPaths } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [show3DPreview, setShow3DPreview] = useState(true);
  const [selectedFontFile, setSelectedFontFile] = useState(customShapeSettings.fontId || '');
  const [uploadedFont, setUploadedFont] = useState<UploadedFont | null>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    let pathsToExport: SketchPath[] = [];
    
    if (customShapeSettings.inputMode === "text") {
      if (!customShapeSettings.text.trim()) {
        toast({
          title: "Text required",
          description: "Please enter some text before exporting",
          variant: "destructive",
        });
        return;
      }
    } else if (customShapeSettings.inputMode === "draw") {
      if (sketchPaths.length === 0) {
        toast({
          title: "Drawing required",
          description: "Please draw something before exporting",
          variant: "destructive",
        });
        return;
      }
      pathsToExport = sketchPaths;
    } else if (customShapeSettings.inputMode === "trace") {
      if (tracedPaths.length === 0) {
        toast({
          title: "Traced paths required",
          description: "Please upload and trace an image before exporting",
          variant: "destructive",
        });
        return;
      }
      pathsToExport = tracedPaths;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/custom-shape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customShapeSettings,
          paths: pathsToExport,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `custom_shape_tube.zip`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const partCount = response.headers.get("X-Part-Count");
      toast({
        title: "Export complete",
        description: "Downloaded top + bottom halves. Insert LEDs and join halves together!",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to generate custom shape file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleInputModeChange = (mode: string) => {
    setCustomShapeSettings({ inputMode: mode as CustomInputMode });
  };

  return (
    <div className="w-full h-full flex">
      <div className="flex-1 relative bg-background">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            variant={show3DPreview ? "default" : "outline"}
            size="sm"
            onClick={() => setShow3DPreview(!show3DPreview)}
            className={`flex items-center gap-2 ${show3DPreview ? "bg-purple-600 hover:bg-purple-700" : ""}`}
            data-testid="button-toggle-3d-preview"
          >
            {show3DPreview ? <Eye className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            {show3DPreview ? "3D View Active" : "Show 3D Preview"}
          </Button>
          {!show3DPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShow3DPreview(true)}
              className="text-purple-400 hover:text-purple-300"
            >
              Rotate & Inspect
            </Button>
          )}
        </div>
        
        <div className="w-full h-full">
          {show3DPreview ? (
            <TubePreview3D />
          ) : (
            <>
              {customShapeSettings.inputMode === "text" && (
                <TextPreview />
              )}
              {customShapeSettings.inputMode === "draw" && (
                <DrawingCanvas />
              )}
              {customShapeSettings.inputMode === "trace" && (
                <ImageTracer />
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="w-80 border-l bg-sidebar p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5" />
              LED Channels
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Split-half design for easy LED insertion. Halves interlock with tongue-and-groove alignment.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleExport}
            disabled={isExporting}
            data-testid="button-export-custom"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "Generating..." : "Export Channel Parts"}
          </Button>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Input Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={customShapeSettings.inputMode} onValueChange={handleInputModeChange}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text" className="flex items-center gap-1" data-testid="tab-input-text">
                    <Type className="h-3 w-3" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="draw" className="flex items-center gap-1" data-testid="tab-input-draw">
                    <Pencil className="h-3 w-3" />
                    Draw
                  </TabsTrigger>
                  <TabsTrigger value="trace" className="flex items-center gap-1" data-testid="tab-input-trace">
                    <Image className="h-3 w-3" />
                    Trace
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {customShapeSettings.inputMode === "text" && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text Input
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      value={customShapeSettings.text}
                      onChange={(e) => setCustomShapeSettings({ text: e.target.value })}
                      placeholder="Enter text..."
                      className="text-lg font-bold"
                      data-testid="input-custom-text"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {customShapeSettings.text.length}/200 characters
                    </p>
                  </div>
                  
                  <FontSelector
                    selectedFont={selectedFontFile}
                    onFontSelect={(fontFile, familyName) => {
                      setSelectedFontFile(fontFile);
                      if (familyName) {
                        setCustomShapeSettings({ fontId: familyName });
                      }
                    }}
                    uploadedFont={uploadedFont}
                    onFontUpload={setUploadedFont}
                    showPreview={true}
                    previewCharacter={customShapeSettings.text?.slice(0, 2) || "Aa"}
                    compact={true}
                  />
                  
                  <div>
                    <Label className="text-xs flex justify-between">
                      <span>Font Size</span>
                      <span className="text-muted-foreground">{customShapeSettings.fontSize}px</span>
                    </Label>
                    <Slider
                      value={[customShapeSettings.fontSize]}
                      onValueChange={([value]) => setCustomShapeSettings({ fontSize: value })}
                      min={10}
                      max={200}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {customShapeSettings.inputMode === "trace" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Trace Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs flex justify-between">
                    <span>Threshold</span>
                    <span className="text-muted-foreground">{customShapeSettings.traceThreshold}</span>
                  </Label>
                  <Slider
                    value={[customShapeSettings.traceThreshold]}
                    onValueChange={([value]) => setCustomShapeSettings({ traceThreshold: value })}
                    min={0}
                    max={255}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-xs flex justify-between">
                    <span>Smoothing</span>
                    <span className="text-muted-foreground">{customShapeSettings.traceSmoothing}</span>
                  </Label>
                  <Slider
                    value={[customShapeSettings.traceSmoothing]}
                    onValueChange={([value]) => setCustomShapeSettings({ traceSmoothing: value })}
                    min={0}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Auto Trace</Label>
                  <Switch
                    checked={customShapeSettings.autoTrace}
                    onCheckedChange={(checked) => setCustomShapeSettings({ autoTrace: checked })}
                    data-testid="switch-auto-trace"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                LED Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={customShapeSettings.ledType}
                onValueChange={(value) => setCustomShapeSettings({ ledType: value as LedStripType })}
              >
                <SelectTrigger data-testid="select-led-type">
                  <SelectValue placeholder="Select LED type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple LED Strip</SelectItem>
                  <SelectItem value="ws2812">WS2812 Addressable</SelectItem>
                  <SelectItem value="cob">COB LED Strip</SelectItem>
                  <SelectItem value="filament">Filament/Neon</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {customShapeSettings.ledType === "ws2812" && "RGB addressable LEDs with data line"}
                {customShapeSettings.ledType === "simple" && "Basic single-color LED strips"}
                {customShapeSettings.ledType === "cob" && "Chip-on-board continuous glow strips"}
                {customShapeSettings.ledType === "filament" && "LED filament or neon flex"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Channel Size
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs flex justify-between">
                  <span>Channel Width</span>
                  <span className="text-muted-foreground">{customShapeSettings.channelWidth}mm</span>
                </Label>
                <Slider
                  value={[customShapeSettings.channelWidth]}
                  onValueChange={([value]) => setCustomShapeSettings({ channelWidth: value })}
                  min={8}
                  max={30}
                  step={1}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Inner width for LED strip (WS2812: 10-12mm)
                </p>
              </div>
              
              <div>
                <Label className="text-xs flex justify-between">
                  <span>Channel Depth</span>
                  <span className="text-muted-foreground">{customShapeSettings.channelDepth}mm</span>
                </Label>
                <Slider
                  value={[customShapeSettings.channelDepth]}
                  onValueChange={([value]) => setCustomShapeSettings({ channelDepth: value })}
                  min={4}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-xs flex justify-between">
                  <span>Wall Thickness</span>
                  <span className="text-muted-foreground">{customShapeSettings.wallThickness}mm</span>
                </Label>
                <Slider
                  value={[customShapeSettings.wallThickness]}
                  onValueChange={([value]) => setCustomShapeSettings({ wallThickness: value })}
                  min={1.2}
                  max={4}
                  step={0.2}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-xs flex justify-between">
                  <span>Scale</span>
                  <span className="text-muted-foreground">{customShapeSettings.scale.toFixed(1)}x</span>
                </Label>
                <Slider
                  value={[customShapeSettings.scale]}
                  onValueChange={([value]) => setCustomShapeSettings({ scale: value })}
                  min={0.5}
                  max={5}
                  step={0.1}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link className="h-4 w-4" />
                Assembly Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Modular Connectors</Label>
                <Switch
                  checked={customShapeSettings.modularConnectors}
                  onCheckedChange={(checked) => setCustomShapeSettings({ modularConnectors: checked })}
                  data-testid="switch-modular-connectors"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Male/female ends for chaining segments together
              </p>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs">Wire Channel</Label>
                <Switch
                  checked={customShapeSettings.wireChannel}
                  onCheckedChange={(checked) => setCustomShapeSettings({ wireChannel: checked })}
                  data-testid="switch-wire-channel"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Route data/power wires between connected segments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Assembly Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>1. Print both halves in translucent PETG/PLA</p>
              <p>2. Lay LED strip in the bottom half groove</p>
              <p>3. Align top and bottom halves - tongue fits in groove</p>
              <p>4. Secure with tape/glue or friction fit</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TextPreview() {
  const { customShapeSettings } = useEditorStore();
  const selectedFont = fontOptions.find((f) => f.id === customShapeSettings.fontId);
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 relative">
      <div className="relative">
        <div 
          className="text-6xl font-bold"
          style={{ 
            fontFamily: selectedFont?.family || "sans-serif",
            fontSize: `${Math.min(customShapeSettings.fontSize, 120)}px`,
            WebkitTextStroke: `${customShapeSettings.channelWidth / 4}px #a855f7`,
            color: "transparent",
            textShadow: "0 0 30px rgba(168, 85, 247, 0.5), 0 0 60px rgba(168, 85, 247, 0.3)",
            letterSpacing: "0.05em",
          }}
        >
          {customShapeSettings.text || "HELLO"}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl -z-10" />
        
        {customShapeSettings.modularConnectors && (
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" title="Female connector" />
            <span className="text-[8px] text-green-400">IN</span>
          </div>
        )}
        {customShapeSettings.modularConnectors && (
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" title="Male connector" />
            <span className="text-[8px] text-blue-400">OUT</span>
          </div>
        )}
      </div>
      
      {customShapeSettings.wireChannel && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="h-1 w-32 bg-yellow-500/60 rounded-full" />
          <span className="text-xs text-yellow-400">Wire Channel</span>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-black/60 rounded-lg p-3 text-xs space-y-1">
        <div className="text-zinc-300 font-medium mb-2">Preview Features:</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-zinc-400">Split-half tube outline</span>
        </div>
        {customShapeSettings.wireChannel && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-zinc-400">Wire channel enabled</span>
          </div>
        )}
        {customShapeSettings.modularConnectors && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-zinc-400">Modular connectors enabled</span>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-4 right-4 text-xs text-zinc-500 bg-black/50 px-3 py-2 rounded">
        Click "3D Preview" to rotate and inspect the model
      </div>
    </div>
  );
}

function TubeCrossSection() {
  const { customShapeSettings } = useEditorStore();
  const { channelWidth, channelDepth, wallThickness } = customShapeSettings;
  
  const scale = 0.02;
  const halfWidth = (channelWidth / 2) * scale;
  const depth = channelDepth * scale;
  const wall = wallThickness * scale;
  const tongueSize = 1.5 * scale;
  
  const bottomHalfShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth - wall, 0);
    shape.lineTo(halfWidth + wall, 0);
    shape.lineTo(halfWidth + wall, depth / 2);
    shape.lineTo(halfWidth + wall - tongueSize, depth / 2);
    shape.lineTo(halfWidth + wall - tongueSize, depth / 2 + tongueSize);
    shape.lineTo(-halfWidth - wall + tongueSize, depth / 2 + tongueSize);
    shape.lineTo(-halfWidth - wall + tongueSize, depth / 2);
    shape.lineTo(-halfWidth - wall, depth / 2);
    shape.closePath();
    
    const hole = new THREE.Path();
    hole.moveTo(-halfWidth, wall);
    hole.lineTo(halfWidth, wall);
    hole.lineTo(halfWidth, depth / 2);
    hole.lineTo(-halfWidth, depth / 2);
    hole.closePath();
    shape.holes.push(hole);
    
    return shape;
  }, [halfWidth, depth, wall, tongueSize]);
  
  const topHalfShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth - wall + tongueSize, depth / 2);
    shape.lineTo(halfWidth + wall - tongueSize, depth / 2);
    shape.lineTo(halfWidth + wall - tongueSize, depth / 2 - tongueSize);
    shape.lineTo(halfWidth + wall, depth / 2 - tongueSize);
    shape.lineTo(halfWidth + wall, depth);
    shape.lineTo(-halfWidth - wall, depth);
    shape.lineTo(-halfWidth - wall, depth / 2 - tongueSize);
    shape.lineTo(-halfWidth - wall + tongueSize, depth / 2 - tongueSize);
    shape.closePath();
    
    const hole = new THREE.Path();
    hole.moveTo(-halfWidth, depth / 2);
    hole.lineTo(halfWidth, depth / 2);
    hole.lineTo(halfWidth, depth - wall);
    hole.lineTo(-halfWidth, depth - wall);
    hole.closePath();
    shape.holes.push(hole);
    
    return shape;
  }, [halfWidth, depth, wall, tongueSize]);
  
  const extrudeSettings = { depth: 2, bevelEnabled: false };
  
  return (
    <group>
      <mesh position={[0, 0, -1]}>
        <extrudeGeometry args={[bottomHalfShape, extrudeSettings]} />
        <meshStandardMaterial color="#444" metalness={0.2} roughness={0.7} />
      </mesh>
      
      <mesh position={[0, 0.15, -1]}>
        <extrudeGeometry args={[topHalfShape, extrudeSettings]} />
        <meshStandardMaterial color="#555" metalness={0.2} roughness={0.7} transparent opacity={0.8} />
      </mesh>
      
      <mesh position={[0, depth * 0.25 + wall * 0.5, 0]}>
        <boxGeometry args={[channelWidth * scale * 0.8, 0.02, 1.8]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff3333" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

interface TextPathData {
  paths: { points: { x: number; y: number }[]; closed: boolean }[];
  bounds: { width: number; height: number };
}

function TextTubePreview() {
  const { customShapeSettings } = useEditorStore();
  const { text, fontId, fontSize, channelWidth, channelDepth, wireChannel, modularConnectors } = customShapeSettings;
  
  const [pathData, setPathData] = useState<TextPathData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const displayText = text || "TEXT";
  
  useEffect(() => {
    const fetchPaths = async () => {
      if (!displayText.trim()) return;
      
      setIsLoading(true);
      try {
        const response = await fetch("/api/preview/text-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: displayText, fontId, fontSize }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setPathData(data);
        }
      } catch (error) {
        console.error("Failed to fetch text paths:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchPaths, 200);
    return () => clearTimeout(debounce);
  }, [displayText, fontId, fontSize]);
  
  const scale = 0.012;
  const tubeRadius = (channelWidth / 2) * scale * 0.8;
  const tubeHeight = channelDepth * scale;
  
  const tubeGeometries = useMemo(() => {
    if (!pathData?.paths) return [];
    
    return pathData.paths.map((pathObj) => {
      try {
        const rawPoints = pathObj.points.map(p => new THREE.Vector3(p.x * scale, 0, p.y * scale));
        
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < rawPoints.length; i++) {
          const p = rawPoints[i];
          const last = points[points.length - 1];
          if (!last || p.distanceTo(last) > 0.001) {
            points.push(p);
          }
        }
        
        if (points.length < 3) return null;
        
        const curve = new THREE.CatmullRomCurve3(points, pathObj.closed);
        const tubeGeo = new THREE.TubeGeometry(curve, Math.min(points.length * 2, 200), tubeRadius, 8, pathObj.closed);
        
        return tubeGeo;
      } catch (e) {
        console.error("Failed to create tube geometry:", e);
        return null;
      }
    }).filter(Boolean);
  }, [pathData, scale, tubeRadius]);
  
  const ledGeometries = useMemo(() => {
    if (!pathData?.paths) return [];
    
    return pathData.paths.map((pathObj) => {
      try {
        const rawPoints = pathObj.points.map(p => new THREE.Vector3(p.x * scale, 0, p.y * scale));
        
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < rawPoints.length; i++) {
          const p = rawPoints[i];
          const last = points[points.length - 1];
          if (!last || p.distanceTo(last) > 0.001) {
            points.push(p);
          }
        }
        
        if (points.length < 3) return null;
        
        const curve = new THREE.CatmullRomCurve3(points, pathObj.closed);
        const ledGeo = new THREE.TubeGeometry(curve, Math.min(points.length * 2, 200), tubeRadius * 0.4, 6, pathObj.closed);
        
        return ledGeo;
      } catch (e) {
        console.error("Failed to create LED geometry:", e);
        return null;
      }
    }).filter(Boolean);
  }, [pathData, scale, tubeRadius]);
  
  const pathBounds = useMemo(() => {
    if (!pathData?.bounds) return { width: 1, height: 1 };
    return {
      width: pathData.bounds.width * scale,
      height: pathData.bounds.height * scale
    };
  }, [pathData, scale]);
  
  const linePoints = useMemo(() => {
    if (!pathData?.paths) return [];
    
    return pathData.paths.map((pathObj) => {
      const points: [number, number, number][] = [];
      
      for (let i = 0; i < pathObj.points.length; i++) {
        const p = pathObj.points[i];
        const last = points[points.length - 1];
        const newPt: [number, number, number] = [p.x * scale, 0, p.y * scale];
        
        if (!last || Math.abs(newPt[0] - last[0]) > 0.001 || Math.abs(newPt[2] - last[2]) > 0.001) {
          points.push(newPt);
        }
      }
      
      if (points.length < 2) return null;
      
      if (pathObj.closed && points.length > 0) {
        points.push([...points[0]]);
      }
      
      return points;
    }).filter(Boolean) as [number, number, number][][];
  }, [pathData, scale]);

  const hasTubes = tubeGeometries.length > 0;
  
  if (isLoading) {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }
  
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
      {hasTubes ? (
        <>
          {tubeGeometries.map((geo, i) => geo && (
            <mesh key={`tube-${i}`} geometry={geo}>
              <meshStandardMaterial 
                color="#4a4a4a" 
                metalness={0.3} 
                roughness={0.6}
                transparent
                opacity={0.85}
              />
            </mesh>
          ))}
          
          {ledGeometries.map((geo, i) => geo && (
            <mesh key={`led-${i}`} geometry={geo}>
              <meshStandardMaterial 
                color="#ff6b6b" 
                emissive="#ff3333"
                emissiveIntensity={0.8}
              />
            </mesh>
          ))}
        </>
      ) : (
        linePoints.map((pts, i) => pts && (
          <Line
            key={`line-${i}`}
            points={pts}
            color="#a855f7"
            lineWidth={2}
          />
        ))
      )}
    </group>
  );
}

function TubePreview3D() {
  const { customShapeSettings } = useEditorStore();
  const { text, channelWidth, channelDepth, wallThickness, modularConnectors, wireChannel, inputMode } = customShapeSettings;
  
  const scale = 0.015;
  const baseScale = 0.008;
  const charWidth = customShapeSettings.fontSize * baseScale * 0.6;
  const displayText = text || "TEXT";
  const tubeLength = displayText.length * charWidth;
  const halfWidth = (channelWidth / 2) * scale;
  const depth = channelDepth * scale;
  const wall = wallThickness * scale;
  
  const showTextPreview = inputMode === "text" && displayText.length > 0;
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden relative">
      <Canvas
        camera={{ position: [2, 1.5, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />
        <pointLight position={[0, 0, 2]} intensity={0.4} color="#a855f7" />
        
        <group rotation={[0, 0, 0]}>
          {showTextPreview ? (
            <TextTubePreview />
          ) : (
            <TubeCrossSection />
          )}
          
          {wireChannel && showTextPreview && (
            <mesh position={[0, -depth * 1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, tubeLength + 0.2, 12]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.4} />
            </mesh>
          )}
          
          {modularConnectors && showTextPreview && (
            <>
              <mesh position={[-tubeLength/2 - 0.08, 0, 0]}>
                <boxGeometry args={[0.1, depth * 0.6, halfWidth * 1.2]} />
                <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[tubeLength/2 + 0.06, 0, 0]}>
                <boxGeometry args={[0.08, depth * 0.5, halfWidth * 0.9]} />
                <meshStandardMaterial color="#3b82f6" emissive="#2563eb" emissiveIntensity={0.3} />
              </mesh>
            </>
          )}
          
          {wireChannel && !showTextPreview && (
            <mesh position={[0, -depth * 0.6, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 3, 12]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.3} />
            </mesh>
          )}
          
          {modularConnectors && !showTextPreview && (
            <>
              <mesh position={[0, depth * 0.3, -1.56]}>
                <boxGeometry args={[halfWidth * 1.5, depth * 0.4, 0.12]} />
                <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.2} />
              </mesh>
              <mesh position={[0, depth * 0.3, 1.54]}>
                <boxGeometry args={[halfWidth * 0.9, depth * 0.25, 0.08]} />
                <meshStandardMaterial color="#3b82f6" emissive="#2563eb" emissiveIntensity={0.2} />
              </mesh>
            </>
          )}
        </group>
        
        <Grid
          args={[10, 10]}
          position={[0, -0.3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          cellSize={0.1}
          cellColor="#334155"
          sectionSize={0.5}
          sectionColor="#475569"
        />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={10}
          autoRotate
          autoRotateSpeed={0.5}
        />
        
        <Environment preset="city" />
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-black/70 rounded-lg p-3 text-xs space-y-2">
        <div className="text-white font-medium">3D Tube Preview</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-400" />
          <span className="text-zinc-300">Bottom half (LED holder)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-500" />
          <span className="text-zinc-300">Top half (diffuser cap)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-zinc-300">LED strip position</span>
        </div>
        {wireChannel && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-zinc-300">Wire channel</span>
          </div>
        )}
        {modularConnectors && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-zinc-300">Female connector (input)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-zinc-300">Male connector (output)</span>
            </div>
          </>
        )}
      </div>
      
      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="bg-black/70 px-3 py-1.5 rounded text-xs text-zinc-300">
          Drag to rotate
        </div>
        <div className="bg-black/70 px-3 py-1.5 rounded text-xs text-zinc-300">
          Scroll to zoom
        </div>
        <div className="bg-black/70 px-3 py-1.5 rounded text-xs text-zinc-300">
          Auto-rotating
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-purple-600/80 px-3 py-2 rounded text-xs text-white font-medium">
        This is what your export will look like!
      </div>
    </div>
  );
}
