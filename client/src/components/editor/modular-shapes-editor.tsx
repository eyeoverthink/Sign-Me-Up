import { useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hexagon, Triangle, Square, Pentagon, Octagon, Download, Loader2, Link2, Lightbulb, ArrowRightFromLine, ArrowLeftToLine, Layers } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { modularShapeTypes, connectorTypes, type ModularShapeType, type ConnectorType } from "@shared/schema";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";

const shapeInfo: Record<ModularShapeType, { icon: typeof Hexagon; sides: number; label: string }> = {
  hexagon: { icon: Hexagon, sides: 6, label: "Hexagon" },
  triangle: { icon: Triangle, sides: 3, label: "Triangle" },
  square: { icon: Square, sides: 4, label: "Square" },
  pentagon: { icon: Pentagon, sides: 5, label: "Pentagon" },
  octagon: { icon: Octagon, sides: 8, label: "Octagon" },
};

function generatePolygonVertices(sides: number, edgeLength: number): { x: number; y: number }[] {
  const angle = (2 * Math.PI) / sides;
  const circumradius = edgeLength / (2 * Math.sin(Math.PI / sides));
  const vertices: { x: number; y: number }[] = [];
  
  for (let i = 0; i < sides; i++) {
    const a = angle * i - Math.PI / 2;
    vertices.push({
      x: circumradius * Math.cos(a),
      y: circumradius * Math.sin(a),
    });
  }
  return vertices;
}

const MIN_CHANNEL_WIDTH = 6;
const MIN_EDGE_LENGTH = 30;

function ModularShapePreview3D() {
  const { modularShapeSettings } = useEditorStore();
  const { shapeType, edgeLength, channelWidth, wallHeight, wallThickness, diffuserType, connectorEnabled, connectorType, connectorTabWidth, connectorTabDepth } = modularShapeSettings;
  
  const sides = shapeInfo[shapeType].sides;
  const scale = 0.01;
  
  const safeEdgeLength = Math.max(MIN_EDGE_LENGTH, edgeLength);
  const maxChannelWidth = Math.floor((safeEdgeLength - 10) / 2);
  const safeChannelWidth = Math.max(MIN_CHANNEL_WIDTH, Math.min(channelWidth, maxChannelWidth));
  const innerEdgeLength = safeEdgeLength - safeChannelWidth * 2;
  
  const geometry = useMemo(() => {
    const vertices = generatePolygonVertices(sides, safeEdgeLength);
    const shape = new THREE.Shape();
    
    shape.moveTo(vertices[0].x * scale, vertices[0].y * scale);
    for (let i = 1; i < vertices.length; i++) {
      shape.lineTo(vertices[i].x * scale, vertices[i].y * scale);
    }
    shape.closePath();
    
    if (innerEdgeLength > 0) {
      const innerVertices = generatePolygonVertices(sides, innerEdgeLength);
      
      const hole = new THREE.Path();
      hole.moveTo(innerVertices[0].x * scale, innerVertices[0].y * scale);
      for (let i = 1; i < innerVertices.length; i++) {
        hole.lineTo(innerVertices[i].x * scale, innerVertices[i].y * scale);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
    
    const extrudeSettings = {
      depth: wallHeight * scale,
      bevelEnabled: false,
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [sides, safeEdgeLength, innerEdgeLength, wallHeight, scale]);
  
  const connectorTabs = useMemo(() => {
    if (!connectorEnabled) return [];
    
    const tabs: { position: THREE.Vector3; rotation: number }[] = [];
    const vertices = generatePolygonVertices(sides, safeEdgeLength);
    
    for (let i = 0; i < sides; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % sides];
      const midX = ((v1.x + v2.x) / 2) * scale;
      const midY = ((v1.y + v2.y) / 2) * scale;
      const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
      
      // For male: push outward (add offset in normal direction)
      // For female: push inward (subtract offset - recessed into wall)
      const normalX = Math.cos(angle + Math.PI / 2);
      const normalY = Math.sin(angle + Math.PI / 2);
      const offset = (connectorTabDepth / 2) * scale;
      const direction = connectorType === "male" ? 1 : -1;
      
      tabs.push({
        position: new THREE.Vector3(
          midX + normalX * offset * direction,
          midY + normalY * offset * direction,
          (wallHeight / 2) * scale
        ),
        rotation: angle + Math.PI / 2,
      });
    }
    return tabs;
  }, [connectorEnabled, connectorType, sides, safeEdgeLength, wallHeight, connectorTabWidth, connectorTabDepth, scale]);
  
  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, 0]}>
        <meshStandardMaterial color="#333" metalness={0.1} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Male: solid protruding tabs, Female: darker recessed slots */}
      {connectorTabs.map((tab, i) => (
        <mesh
          key={i}
          position={tab.position}
          rotation={[0, 0, tab.rotation]}
        >
          <boxGeometry args={[connectorTabWidth * scale, connectorTabDepth * scale, wallHeight * 0.6 * scale]} />
          <meshStandardMaterial 
            color={connectorType === "male" ? "#666" : "#111"} 
            metalness={0.2} 
            roughness={0.6}
          />
        </mesh>
      ))}
      
      {/* Diffuser: Shell = solid fill, Outline = just edge ring */}
      {diffuserType === "shell" ? (
        <mesh position={[0, 0, (wallHeight + 0.1) * scale]}>
          <cylinderGeometry args={[safeEdgeLength * scale * 0.5, safeEdgeLength * scale * 0.5, 0.02, sides]} />
          <meshStandardMaterial color="#99ddff" transparent opacity={0.7} metalness={0.1} roughness={0.2} />
        </mesh>
      ) : (
        <mesh position={[0, 0, (wallHeight + 0.1) * scale]}>
          <cylinderGeometry args={[Math.max(0.01, innerEdgeLength * scale * 0.5), Math.max(0.01, innerEdgeLength * scale * 0.5), 0.02, sides]} />
          <meshStandardMaterial color="#99ddff" transparent opacity={0.6} metalness={0.1} roughness={0.2} />
        </mesh>
      )}
    </group>
  );
}

function ModularPreviewCanvas() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, -2, 2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-3, -3, 3]} intensity={0.3} color="#6366f1" />
        
        <ModularShapePreview3D />
        
        <Grid
          args={[10, 10]}
          position={[0, 0, -0.01]}
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
          maxDistance={5}
        />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

export function ModularShapesEditor() {
  const { modularShapeSettings, setModularShapeSettings } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/modular-shape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modularShapeSettings),
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${modularShapeSettings.shapeType}_tile_${modularShapeSettings.edgeLength}mm.zip`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const partCount = response.headers.get("X-Part-Count") || "2";
      toast({
        title: "Export complete",
        description: `Downloaded ${partCount} parts: U-channel base + diffuser cap`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to generate modular shape file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currentShape = shapeInfo[modularShapeSettings.shapeType];
  const ShapeIcon = currentShape.icon;
  
  const safeEdgeLength = Math.max(MIN_EDGE_LENGTH, modularShapeSettings.edgeLength);
  const maxChannelWidth = Math.floor((safeEdgeLength - 10) / 2);
  const safeChannelWidth = Math.max(MIN_CHANNEL_WIDTH, Math.min(modularShapeSettings.channelWidth, maxChannelWidth));
  
  useEffect(() => {
    const updates: Partial<typeof modularShapeSettings> = {};
    
    if (modularShapeSettings.edgeLength < MIN_EDGE_LENGTH) {
      updates.edgeLength = MIN_EDGE_LENGTH;
    }
    
    if (modularShapeSettings.channelWidth > maxChannelWidth || modularShapeSettings.channelWidth < MIN_CHANNEL_WIDTH) {
      updates.channelWidth = safeChannelWidth;
    }
    
    if (Object.keys(updates).length > 0) {
      setModularShapeSettings(updates);
    }
  }, [modularShapeSettings.edgeLength, modularShapeSettings.channelWidth, maxChannelWidth, safeChannelWidth]);

  return (
    <div className="w-full h-full flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <ModularPreviewCanvas />
      </div>
      
      <div className="w-80 border-l bg-sidebar p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ShapeIcon className="h-5 w-5" />
              Modular Light Panels
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Snap-together geometric light panels. Similar to Nanoleaf, with edge connectors for modular assembly.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleExport}
            disabled={isExporting}
            data-testid="button-export-modular-shape"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isExporting ? "Generating..." : "Export Panel STL"}
          </Button>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShapeIcon className="h-4 w-4" />
                Shape Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {modularShapeTypes.map((type) => {
                  const info = shapeInfo[type];
                  const Icon = info.icon;
                  const isSelected = modularShapeSettings.shapeType === type;
                  return (
                    <Button
                      key={type}
                      variant={isSelected ? "default" : "outline"}
                      size="icon"
                      onClick={() => setModularShapeSettings({ shapeType: type })}
                      data-testid={`button-shape-${type}`}
                      title={info.label}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {currentShape.label} ({currentShape.sides} sides)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Panel Size</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Edge Length</Label>
                  <span className="text-xs text-muted-foreground">{modularShapeSettings.edgeLength}mm</span>
                </div>
                <Slider
                  value={[modularShapeSettings.edgeLength]}
                  onValueChange={([v]) => setModularShapeSettings({ edgeLength: Math.max(MIN_EDGE_LENGTH, v) })}
                  min={MIN_EDGE_LENGTH}
                  max={200}
                  step={5}
                  data-testid="slider-edge-length"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Min: {MIN_EDGE_LENGTH}mm for LED channel
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Wall Height</Label>
                  <span className="text-xs text-muted-foreground">{modularShapeSettings.wallHeight}mm</span>
                </div>
                <Slider
                  value={[modularShapeSettings.wallHeight]}
                  onValueChange={([v]) => setModularShapeSettings({ wallHeight: v })}
                  min={8}
                  max={30}
                  step={1}
                  data-testid="slider-wall-height"
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
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Channel Width</Label>
                  <span className="text-xs text-muted-foreground">{safeChannelWidth}mm</span>
                </div>
                <Slider
                  value={[safeChannelWidth]}
                  onValueChange={([v]) => setModularShapeSettings({ channelWidth: Math.max(MIN_CHANNEL_WIDTH, Math.min(v, maxChannelWidth)) })}
                  min={MIN_CHANNEL_WIDTH}
                  max={maxChannelWidth}
                  step={1}
                  data-testid="slider-channel-width"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Range: {MIN_CHANNEL_WIDTH}-{maxChannelWidth}mm
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-xs">Wall Thickness</Label>
                  <span className="text-xs text-muted-foreground">{modularShapeSettings.wallThickness}mm</span>
                </div>
                <Slider
                  value={[modularShapeSettings.wallThickness]}
                  onValueChange={([v]) => setModularShapeSettings({ wallThickness: v })}
                  min={1.5}
                  max={4}
                  step={0.5}
                  data-testid="slider-wall-thickness"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Diffuser Cover
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs mb-2 block">Diffuser Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={modularShapeSettings.diffuserType === "shell" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModularShapeSettings({ diffuserType: "shell" })}
                    className="flex items-center gap-2"
                    data-testid="button-diffuser-shell"
                  >
                    <Square className="h-4 w-4" />
                    Shell (Full)
                  </Button>
                  <Button
                    variant={modularShapeSettings.diffuserType === "outline" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModularShapeSettings({ diffuserType: "outline" })}
                    className="flex items-center gap-2"
                    data-testid="button-diffuser-outline"
                  >
                    <Hexagon className="h-4 w-4" />
                    Outline
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {modularShapeSettings.diffuserType === "shell" 
                    ? "Solid cover for smooth RGB light diffusion (Nanoleaf style)" 
                    : "Edge-only cover follows channel outline"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Edge Connectors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Enable Connectors</Label>
                <Switch
                  checked={modularShapeSettings.connectorEnabled}
                  onCheckedChange={(checked) => setModularShapeSettings({ connectorEnabled: checked })}
                  data-testid="switch-connectors"
                />
              </div>
              
              {modularShapeSettings.connectorEnabled && (
                <>
                  <div>
                    <Label className="text-xs mb-2 block">Connector Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={modularShapeSettings.connectorType === "male" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setModularShapeSettings({ connectorType: "male" })}
                        className="flex items-center gap-2"
                        data-testid="button-connector-male"
                      >
                        <ArrowRightFromLine className="h-4 w-4" />
                        Male (Tabs)
                      </Button>
                      <Button
                        variant={modularShapeSettings.connectorType === "female" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setModularShapeSettings({ connectorType: "female" })}
                        className="flex items-center gap-2"
                        data-testid="button-connector-female"
                      >
                        <ArrowLeftToLine className="h-4 w-4" />
                        Female (Slots)
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {modularShapeSettings.connectorType === "male" 
                        ? "Tabs protrude outward to insert into female slots" 
                        : "Slots receive male tabs for snap-fit assembly"}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">{modularShapeSettings.connectorType === "male" ? "Tab" : "Slot"} Width</Label>
                      <span className="text-xs text-muted-foreground">{modularShapeSettings.connectorTabWidth}mm</span>
                    </div>
                    <Slider
                      value={[modularShapeSettings.connectorTabWidth]}
                      onValueChange={([v]) => setModularShapeSettings({ connectorTabWidth: v })}
                      min={5}
                      max={20}
                      step={1}
                      data-testid="slider-tab-width"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">{modularShapeSettings.connectorType === "male" ? "Tab" : "Slot"} Depth</Label>
                      <span className="text-xs text-muted-foreground">{modularShapeSettings.connectorTabDepth}mm</span>
                    </div>
                    <Slider
                      value={[modularShapeSettings.connectorTabDepth]}
                      onValueChange={([v]) => setModularShapeSettings({ connectorTabDepth: v })}
                      min={2}
                      max={8}
                      step={0.5}
                      data-testid="slider-tab-depth"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label className="text-xs">Tolerance</Label>
                      <span className="text-xs text-muted-foreground">{modularShapeSettings.connectorTolerance}mm</span>
                    </div>
                    <Slider
                      value={[modularShapeSettings.connectorTolerance]}
                      onValueChange={([v]) => setModularShapeSettings({ connectorTolerance: v })}
                      min={0.1}
                      max={0.4}
                      step={0.05}
                      data-testid="slider-tolerance"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Gap between mating parts for snap fit
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Printing Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>Print base in opaque filament</li>
                <li>Print cap in translucent for diffusion</li>
                <li>Tiles snap together via edge tabs</li>
                <li>Use 5mm LED strips inside channels</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
