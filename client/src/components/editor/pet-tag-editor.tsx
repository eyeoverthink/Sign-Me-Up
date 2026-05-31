import { useEditorStore } from "@/lib/editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dog, Lightbulb, Download, Loader2, Link2, Type, Move } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { hangPositions, type HangPosition } from "@shared/schema";
import { FontSelector, type UploadedFont } from "@/components/shared/FontSelector";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import * as THREE from "three";

const fontFileMap: Record<string, string> = {
  "aerioz": "Aerioz-Demo.otf",
  "airstream": "Airstream-1W0vL.ttf",
  "airstream-nf": "AirstreamNF-8XY2M.otf",
  "alliston": "AllistonDemo-2O4dO.ttf",
  "cookiemonster": "CookieMonster-K76dJ.ttf",
  "darlington": "Darlington-8M7Xg.ttf",
  "dirtyboy": "DirtyBoy-ywWd5.otf",
  "future-light": "Future-Light-y89EE.otf",
  "future-light-italic": "Future-Light-Italic-mGOL0.otf",
  "halimun": "Halimun-l3DDV.ttf",
  "inter": "Inter-p1Wxm.ttf",
  "roboto": "Roboto-3Jnl2.ttf",
  "poppins": "Poppins-QK1YR.ttf",
  "montserrat": "Montserrat-8OG0D.ttf",
  "open-sans": "OpenSans-K7GGJ.ttf",
  "playfair": "PlayfairDisplay-9Y7Pd.ttf",
  "merriweather": "Merriweather-WZ4oW.ttf",
  "lora": "Lora-3mGvl.ttf",
  "space-grotesk": "SpaceGrotesk-Zrjor.ttf",
  "outfit": "Outfit-8Oj6z.ttf",
  "architects-daughter": "ArchitectsDaughter-rW0Ax.ttf",
  "oxanium": "Oxanium-0Oo5x.ttf",
};

const hangPositionLabels: Record<HangPosition, string> = {
  "top": "Top Center",
  "top-left": "Top Left",
  "top-right": "Top Right",
  "left": "Left Side",
  "right": "Right Side",
};

export function PetTagEditor() {
  const { petTagSettings, setPetTagSettings } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFontFile, setSelectedFontFile] = useState(petTagSettings.fontId || '');
  const [uploadedFont, setUploadedFont] = useState<UploadedFont | null>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!petTagSettings.petName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a pet name before exporting",
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/pet-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(petTagSettings),
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const isMultiPart = response.headers.get("X-Multi-Part-Export") === "true";
      const extension = isMultiPart ? "zip" : "stl";
      a.download = `${petTagSettings.petName}_neon_tag.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const partCount = response.headers.get("X-Part-Count");
      toast({
        title: "Export complete",
        description: isMultiPart 
          ? `Downloaded ${partCount} parts: raised 3D tag + diffuser cap`
          : "Your neon pet tag STL has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to generate pet tag file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-full flex">
      <div className="flex-1 relative bg-background">
        <PetTag3DPreview />
      </div>
      
      <div className="w-80 border-l bg-sidebar p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Dog className="h-5 w-5" />
              3D Neon Pet Tags
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Raised 3D letters with LED channels - mini neon signs for your pet's collar!
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleExport}
            disabled={isExporting}
            data-testid="button-export-pet-tag"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "Generating..." : "Export 3D Tag"}
          </Button>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pet Name</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={petTagSettings.petName}
                  onChange={(e) => setPetTagSettings({ petName: e.target.value.toUpperCase() })}
                  placeholder="Enter pet name"
                  maxLength={10}
                  className="text-lg font-bold uppercase flex-1"
                  data-testid="input-pet-name"
                />
                <EmojiPicker onSelect={(emoji) => setPetTagSettings({ petName: (petTagSettings.petName + emoji).slice(0, 10).toUpperCase() })} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {petTagSettings.petName.length}/10 characters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="h-4 w-4" />
                Font Style
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FontSelector
                selectedFont={selectedFontFile}
                onFontSelect={(fontFile, familyName) => {
                  setSelectedFontFile(fontFile);
                  if (familyName) {
                    setPetTagSettings({ fontId: familyName });
                  }
                }}
                uploadedFont={uploadedFont}
                onFontUpload={setUploadedFont}
                showPreview={true}
                previewCharacter={petTagSettings.petName?.slice(0, 2) || "Aa"}
                compact={true}
              />
              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <Label className="text-xs">Text Scale</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(petTagSettings.fontScale * 100)}%</span>
                </div>
                <Slider
                  value={[petTagSettings.fontScale]}
                  onValueChange={([v]) => setPetTagSettings({ fontScale: v })}
                  min={0.6}
                  max={1.5}
                  step={0.1}
                  data-testid="slider-font-scale"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                LED Channel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Channel Width</Label>
                  <span className="text-xs text-muted-foreground">{petTagSettings.ledChannelWidth}mm</span>
                </div>
                <Slider
                  value={[petTagSettings.ledChannelWidth]}
                  onValueChange={([v]) => setPetTagSettings({ ledChannelWidth: v })}
                  min={4}
                  max={10}
                  step={1}
                  data-testid="slider-led-width"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Channel Depth</Label>
                  <span className="text-xs text-muted-foreground">{petTagSettings.ledChannelDepth}mm</span>
                </div>
                <Slider
                  value={[petTagSettings.ledChannelDepth]}
                  onValueChange={([v]) => setPetTagSettings({ ledChannelDepth: v })}
                  min={5}
                  max={12}
                  step={1}
                  data-testid="slider-led-depth"
                />
                <p className="text-xs text-muted-foreground">
                  Depth for LED strip or EL wire
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Attachment Loop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Add Chain Loop</Label>
                <Switch
                  checked={petTagSettings.holeEnabled}
                  onCheckedChange={(v) => setPetTagSettings({ holeEnabled: v })}
                  data-testid="switch-hole"
                />
              </div>
              
              {petTagSettings.holeEnabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Move className="h-3 w-3" />
                      Hang Position
                    </Label>
                    <Select
                      value={petTagSettings.hangPosition || "top"}
                      onValueChange={(value) => setPetTagSettings({ hangPosition: value as HangPosition })}
                    >
                      <SelectTrigger data-testid="select-hang-position">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hangPositions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {hangPositionLabels[pos]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      "Top Center" = tag faces forward like Mr. T's chains
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Loop Inner Diameter</Label>
                      <span className="text-xs text-muted-foreground">{petTagSettings.holeDiameter}mm</span>
                    </div>
                    <Slider
                      value={[petTagSettings.holeDiameter]}
                      onValueChange={([v]) => setPetTagSettings({ holeDiameter: v })}
                      min={3}
                      max={8}
                      step={0.5}
                      data-testid="slider-hole-diameter"
                    />
                    <p className="text-xs text-muted-foreground">
                      Size for chain/jump ring
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">3D Printed Neon Tags:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Raised 3D letters with U-channel grooves</li>
              <li>Insert LED strip or EL wire into channels</li>
              <li>Snap-fit diffuser cap for even glow</li>
              <li>Loop at top = tag hangs facing forward</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function PetTag3DPreview() {
  const { petTagSettings } = useEditorStore();
  
  const text = petTagSettings.petName || "MAX";
  const scale = petTagSettings.fontScale || 1;
  const channelDepth = petTagSettings.ledChannelDepth || 8;
  const channelWidth = petTagSettings.ledChannelWidth || 6;
  const hangPosition = petTagSettings.hangPosition || "top";
  const holeEnabled = petTagSettings.holeEnabled;
  const holeDiameter = petTagSettings.holeDiameter || 5;
  
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-3, 3, -3]} intensity={0.3} />
          <pointLight position={[0, 0, 5]} intensity={0.5} color="#60a5fa" />
          
          <Center>
            <group rotation={[0, 0, 0]}>
              <RaisedTextPreview
                text={text}
                scale={scale}
                channelDepth={channelDepth}
                channelWidth={channelWidth}
                hangPosition={hangPosition}
                holeEnabled={holeEnabled}
                holeDiameter={holeDiameter}
              />
            </group>
          </Center>
          
          <Environment preset="city" />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.05}
            minDistance={4}
            maxDistance={25}
          />
        </Suspense>
      </Canvas>
      
      <div className="absolute bottom-4 left-4 text-xs text-white/60 bg-black/40 px-3 py-2 rounded-lg">
        Drag to rotate, scroll to zoom
      </div>
      
      <div className="absolute top-4 left-4 text-xs text-white/80 bg-black/40 px-3 py-2 rounded-lg">
        <div className="font-medium">{text || "PET NAME"}</div>
        <div className="text-white/60 mt-1">
          Channel: {channelWidth}mm × {channelDepth}mm
        </div>
      </div>
    </div>
  );
}

interface RaisedTextPreviewProps {
  text: string;
  scale: number;
  channelDepth: number;
  channelWidth: number;
  hangPosition: HangPosition;
  holeEnabled: boolean;
  holeDiameter: number;
}

interface TextPath {
  points: { x: number; y: number }[];
  closed: boolean;
}

interface TextPathResponse {
  paths: TextPath[];
  bounds: { width: number; height: number; centerX: number; centerY: number };
}

function RaisedTextPreview({
  text,
  scale,
  channelDepth,
  channelWidth,
  hangPosition,
  holeEnabled,
  holeDiameter,
}: RaisedTextPreviewProps) {
  const { petTagSettings } = useEditorStore();
  const groupRef = useRef<THREE.Group>(null);
  const [textPaths, setTextPaths] = useState<TextPath[]>([]);
  const [pathBounds, setPathBounds] = useState<{ width: number; height: number } | null>(null);
  
  const fontSize = 0.8 * scale;
  const baseDepth = 0.15;
  const totalDepth = baseDepth + channelDepth * 0.05;
  const channelScale = channelWidth * 0.02;
  
  // Fetch text paths from server using the selected font
  useEffect(() => {
    if (!text.trim()) {
      setTextPaths([]);
      setPathBounds(null);
      return;
    }
    
    const fetchPaths = async () => {
      try {
        console.log("Fetching text paths for:", text, "font:", petTagSettings.fontId);
        const response = await fetch("/api/preview/text-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text, 
            fontId: petTagSettings.fontId || "aerioz",
            fontSize: 50 
          }),
        });
        
        if (response.ok) {
          const data: TextPathResponse = await response.json();
          console.log("Got text paths:", data.paths.length, "paths, bounds:", data.bounds);
          setTextPaths(data.paths);
          setPathBounds({ width: data.bounds.width, height: data.bounds.height });
        } else {
          console.error("Failed to fetch paths, status:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch text paths:", error);
      }
    };
    
    fetchPaths();
  }, [text, petTagSettings.fontId]);
  
  // Generate 3D geometry from text paths
  const textGeometry = useMemo(() => {
    if (textPaths.length === 0 || !pathBounds) return null;
    
    // Scale factor to fit nicely in the scene
    const targetWidth = 3 * scale;
    const scaleFactor = targetWidth / Math.max(pathBounds.width, 1);
    
    const shapes: THREE.Shape[] = [];
    
    for (const path of textPaths) {
      if (path.points.length < 3) continue;
      
      const shape = new THREE.Shape();
      const firstPt = path.points[0];
      shape.moveTo(firstPt.x * scaleFactor, -firstPt.y * scaleFactor);
      
      for (let i = 1; i < path.points.length; i++) {
        const pt = path.points[i];
        shape.lineTo(pt.x * scaleFactor, -pt.y * scaleFactor);
      }
      
      if (path.closed) {
        shape.closePath();
      }
      
      shapes.push(shape);
    }
    
    if (shapes.length === 0) return null;
    
    // Identify holes and assign them to outer shapes
    const outerShapes: THREE.Shape[] = [];
    const holeShapes: THREE.Shape[] = [];
    
    for (const shape of shapes) {
      const pts = shape.getPoints();
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y;
        area -= pts[j].x * pts[i].y;
      }
      area /= 2;
      
      // Since we flip Y coordinate, winding is reversed
      // Negative area = outer shape, positive area = hole
      if (area < 0) {
        outerShapes.push(shape);
      } else {
        holeShapes.push(shape);
      }
    }
    
    // Assign holes to outer shapes
    for (const hole of holeShapes) {
      const holePts = hole.getPoints();
      if (holePts.length === 0) continue;
      const testPt = holePts[0];
      
      for (const outer of outerShapes) {
        const outerPts = outer.getPoints();
        let inside = false;
        for (let i = 0, j = outerPts.length - 1; i < outerPts.length; j = i++) {
          const xi = outerPts[i].x, yi = outerPts[i].y;
          const xj = outerPts[j].x, yj = outerPts[j].y;
          if (((yi > testPt.y) !== (yj > testPt.y)) && 
              (testPt.x < (xj - xi) * (testPt.y - yi) / (yj - yi) + xi)) {
            inside = !inside;
          }
        }
        if (inside) {
          const holePath = new THREE.Path(holePts);
          outer.holes.push(holePath);
          break;
        }
      }
    }
    
    console.log("Creating text geometry:", outerShapes.length, "outer shapes,", holeShapes.length, "holes");
    
    if (outerShapes.length === 0) {
      console.log("No outer shapes found, returning null");
      return null;
    }
    
    const geometry = new THREE.ExtrudeGeometry(outerShapes, {
      depth: totalDepth * 0.8,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    
    // Center the geometry so text appears in the middle of the tag
    geometry.center();
    
    console.log("Text geometry created with", geometry.attributes.position?.count, "vertices");
    
    return geometry;
  }, [textPaths, pathBounds, scale, totalDepth]);
  
  const textBounds = useMemo(() => {
    if (pathBounds) {
      const targetWidth = 3 * scale;
      const scaleFactor = targetWidth / Math.max(pathBounds.width, 1);
      return { 
        width: pathBounds.width * scaleFactor, 
        height: pathBounds.height * scaleFactor 
      };
    }
    const charWidth = fontSize * 0.6;
    const width = Math.max(1, text.length) * charWidth;
    const height = fontSize * 1.2;
    return { width, height };
  }, [text, fontSize, pathBounds, scale]);
  
  const letterMaterial = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: "#3b82f6",
      metalness: 0.3,
      roughness: 0.4,
    })
  ), []);
  
  const channelMaterial = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: "#1e3a5f",
      metalness: 0.1,
      roughness: 0.8,
    })
  ), []);
  
  const glowMaterial = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: "#60a5fa",
      emissive: "#3b82f6",
      emissiveIntensity: 0.5,
      metalness: 0,
      roughness: 0.9,
      transparent: true,
      opacity: 0.9,
    })
  ), []);
  
  const loopMaterial = useMemo(() => (
    new THREE.MeshStandardMaterial({
      color: "#94a3b8",
      metalness: 0.6,
      roughness: 0.3,
    })
  ), []);
  
  const loopGeometry = useMemo(() => {
    if (!holeEnabled) return null;
    
    const innerR = (holeDiameter / 2) * 0.1;
    const outerR = innerR + channelScale * 0.8;
    const thickness = totalDepth;
    
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    
    return new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
    });
  }, [holeEnabled, holeDiameter, channelScale, totalDepth]);
  
  const loopPosition = useMemo(() => {
    if (!holeEnabled) return [0, 0, 0];
    
    const innerR = (holeDiameter / 2) * 0.1;
    const outerR = innerR + channelScale * 0.8;
    const gap = 0.15;
    
    const hw = textBounds.width / 2 + channelScale;
    const hh = textBounds.height / 2 + channelScale;
    
    switch (hangPosition) {
      case "top":
        return [0, hh + outerR + gap, 0];
      case "top-left":
        return [-hw - outerR / 2, hh + outerR / 2 + gap / 2, 0];
      case "top-right":
        return [hw + outerR / 2, hh + outerR / 2 + gap / 2, 0];
      case "left":
        return [-hw - outerR - gap, 0, 0];
      case "right":
        return [hw + outerR + gap, 0, 0];
      default:
        return [0, hh + outerR + gap, 0];
    }
  }, [holeEnabled, hangPosition, textBounds, holeDiameter, channelScale]);
  
  const strutGeometry = useMemo(() => {
    if (!holeEnabled) return null;
    
    const innerR = (holeDiameter / 2) * 0.1;
    const outerR = innerR + channelScale * 0.8;
    const strutWidth = channelScale * 0.8;
    
    const hw = textBounds.width / 2 + channelScale;
    const hh = textBounds.height / 2 + channelScale;
    
    let startX = 0, startY = 0, endX = 0, endY = 0;
    
    switch (hangPosition) {
      case "top":
        startX = 0; startY = hh;
        endX = loopPosition[0] as number; endY = (loopPosition[1] as number) - outerR;
        break;
      case "top-left":
        startX = -hw; startY = hh;
        endX = loopPosition[0] as number; endY = (loopPosition[1] as number) - outerR;
        break;
      case "top-right":
        startX = hw; startY = hh;
        endX = loopPosition[0] as number; endY = (loopPosition[1] as number) - outerR;
        break;
      case "left":
        startX = -hw; startY = 0;
        endX = (loopPosition[0] as number) + outerR; endY = 0;
        break;
      case "right":
        startX = hw; startY = 0;
        endX = (loopPosition[0] as number) - outerR; endY = 0;
        break;
    }
    
    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return null;
    
    const shape = new THREE.Shape();
    shape.moveTo(-strutWidth / 2, 0);
    shape.lineTo(strutWidth / 2, 0);
    shape.lineTo(strutWidth / 2, len);
    shape.lineTo(-strutWidth / 2, len);
    shape.closePath();
    
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: totalDepth,
      bevelEnabled: false,
    });
    
    const angle = Math.atan2(dy, dx) - Math.PI / 2;
    geom.rotateZ(angle);
    geom.translate(startX, startY, 0);
    
    return geom;
  }, [holeEnabled, hangPosition, textBounds, channelScale, holeDiameter, loopPosition, totalDepth]);
  
  return (
    <group ref={groupRef}>
      {/* Base/channel background */}
      <mesh position={[0, 0, totalDepth / 2]} material={channelMaterial}>
        <boxGeometry args={[textBounds.width + channelScale * 2, textBounds.height + channelScale * 2, totalDepth]} />
      </mesh>
      
      {/* Actual 3D text letters */}
      {textGeometry ? (
        <mesh geometry={textGeometry} material={letterMaterial} position={[0, 0, totalDepth + 0.02]} rotation={[Math.PI, 0, 0]} />
      ) : (
        <mesh position={[0, 0, totalDepth + 0.02]} material={letterMaterial}>
          <boxGeometry args={[textBounds.width, textBounds.height, 0.04]} />
        </mesh>
      )}
      
      {/* Glow effect under letters */}
      <mesh position={[0, 0, totalDepth - 0.01]} material={glowMaterial}>
        <boxGeometry args={[textBounds.width - channelScale * 0.5, textBounds.height - channelScale * 0.5, baseDepth]} />
      </mesh>
      
      {holeEnabled && loopGeometry && (
        <mesh 
          geometry={loopGeometry} 
          material={loopMaterial}
          position={[loopPosition[0] as number, loopPosition[1] as number, 0]}
        />
      )}
      
      {holeEnabled && strutGeometry && (
        <mesh geometry={strutGeometry} material={loopMaterial} />
      )}
      
    </group>
  );
}
