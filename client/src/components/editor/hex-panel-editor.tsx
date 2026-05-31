import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Hexagon, Download, Loader2, Link2, Unlink, Package, Lightbulb, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { HexPanelSettings, HexPanelConnectionType, HexPanelLedType } from "@shared/schema";
import { hexPanelConnectionTypes, hexPanelLedTypes, defaultHexPanelSettings } from "@shared/schema";

function HexPanelPreview({ settings }: { settings: HexPanelSettings }) {
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
    
    const { hexRadius, hexThickness, wallThickness, activeConnections, connectorLength, connectorDiameter } = settings;
    const group = new THREE.Group();
    groupRef.current = group;

    const hexShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = hexRadius * Math.cos(angle);
      const y = hexRadius * Math.sin(angle);
      if (i === 0) hexShape.moveTo(x, y);
      else hexShape.lineTo(x, y);
    }
    hexShape.closePath();

    const innerRadius = hexRadius - wallThickness;
    const hole = new THREE.Path();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = innerRadius * Math.cos(angle);
      const y = innerRadius * Math.sin(angle);
      if (i === 0) hole.moveTo(x, y);
      else hole.lineTo(x, y);
    }
    hole.closePath();
    hexShape.holes.push(hole);

    const extrudeSettings = { depth: hexThickness, bevelEnabled: false };
    const hexGeo = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    const hexMesh = new THREE.Mesh(
      hexGeo,
      new THREE.MeshStandardMaterial({ color: 0x4a90d9, metalness: 0.3, roughness: 0.7 })
    );
    group.add(hexMesh);

    for (const edge of activeConnections) {
      const angle = (edge * Math.PI) / 3;
      const edgeMidX = hexRadius * Math.cos(angle);
      const edgeMidY = hexRadius * Math.sin(angle);

      const connectorGeo = new THREE.CylinderGeometry(
        connectorDiameter / 2,
        connectorDiameter / 2,
        connectorLength,
        16
      );
      const connectorMesh = new THREE.Mesh(
        connectorGeo,
        new THREE.MeshStandardMaterial({ color: 0x3a7bc8, metalness: 0.4, roughness: 0.6 })
      );
      connectorMesh.rotation.z = -Math.PI / 2;
      connectorMesh.rotation.y = angle;
      connectorMesh.position.set(
        edgeMidX + (connectorLength / 2) * Math.cos(angle),
        edgeMidY + (connectorLength / 2) * Math.sin(angle),
        hexThickness / 2
      );
      group.add(connectorMesh);
    }

    if (settings.diffuserEnabled) {
      const diffuserRadius = hexRadius * 0.85;
      const diffuserShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const x = diffuserRadius * Math.cos(angle);
        const y = diffuserRadius * Math.sin(angle);
        if (i === 0) diffuserShape.moveTo(x, y);
        else diffuserShape.lineTo(x, y);
      }
      diffuserShape.closePath();

      const diffuserGeo = new THREE.ExtrudeGeometry(diffuserShape, {
        depth: settings.diffuserThickness,
        bevelEnabled: false,
      });
      const diffuserMesh = new THREE.Mesh(
        diffuserGeo,
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.7,
          roughness: 0.9,
        })
      );
      diffuserMesh.position.z = hexThickness + 0.5;
      group.add(diffuserMesh);
    }

    const ledChannelGeo = new THREE.CylinderGeometry(
      settings.ledChannelDiameter / 2,
      settings.ledChannelDiameter / 2,
      hexThickness * 1.2,
      16
    );
    const ledChannelMesh = new THREE.Mesh(
      ledChannelGeo,
      new THREE.MeshStandardMaterial({ color: 0xff6b35, emissive: 0xff6b35, emissiveIntensity: 0.5 })
    );
    ledChannelMesh.rotation.x = Math.PI / 2;
    ledChannelMesh.position.z = hexThickness / 2;
    group.add(ledChannelMesh);

    return group;
  }, [settings]);

  return (
    <primitive object={geometry} rotation={[Math.PI / 2, 0, 0]} />
  );
}

export function HexPanelEditor() {
  const [settings, setSettings] = useState<HexPanelSettings>(defaultHexPanelSettings);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const updateSetting = <K extends keyof HexPanelSettings>(key: K, value: HexPanelSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleConnection = (edge: number) => {
    const current = settings.activeConnections;
    if (current.includes(edge)) {
      updateSetting("activeConnections", current.filter(e => e !== edge));
    } else {
      updateSetting("activeConnections", [...current, edge].sort());
    }
  };

  const setPresetLayout = (preset: string) => {
    switch (preset) {
      case "chain":
        updateSetting("activeConnections", [0, 3]);
        break;
      case "corner60":
        updateSetting("activeConnections", [0, 1]);
        break;
      case "corner120":
        updateSetting("activeConnections", [0, 2]);
        break;
      case "tsplit":
        updateSetting("activeConnections", [0, 2, 4]);
        break;
      case "ysplit":
        updateSetting("activeConnections", [0, 2, 3]);
        break;
      case "hexhub":
        updateSetting("activeConnections", [0, 1, 2, 3, 4, 5]);
        break;
      case "endcap":
        updateSetting("activeConnections", [0]);
        break;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/hex-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = settings.exportModuleSet ? "hex_panel_set.zip" : "hex_panel.zip";
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: settings.exportModuleSet
          ? "Downloaded complete hex module set (straight, corners, t-split, end cap)"
          : "Downloaded custom hex module configuration",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate hex panel files",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const connectionLabels = ["Right", "Top-Right", "Top-Left", "Left", "Bottom-Left", "Bottom-Right"];

  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, -200, 150], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[50, 50, 100]} intensity={0.8} />
          <HexPanelPreview settings={settings} />
          <ContactShadows position={[0, 0, -5]} opacity={0.4} blur={2} />
          <OrbitControls makeDefault />
          <Environment preset="studio" />
        </Canvas>

        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-background/80 backdrop-blur" data-testid="badge-hex-width">
            <Hexagon className="h-3 w-3 mr-1" />
            {settings.hexRadius * 2}mm wide
          </Badge>
          <Badge variant="outline" className="bg-background/80 backdrop-blur" data-testid="badge-hex-thickness">
            <Layers className="h-3 w-3 mr-1" />
            {settings.hexThickness}mm thick
          </Badge>
          <Badge variant="outline" className="bg-background/80 backdrop-blur" data-testid="badge-connections">
            <Link2 className="h-3 w-3 mr-1" />
            {settings.activeConnections.length} connections
          </Badge>
        </div>
      </div>

      <div className="w-80 border-l bg-sidebar overflow-y-auto p-4 space-y-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hexagon className="h-4 w-4" />
              Hex Module Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Hex Radius: {settings.hexRadius}mm</Label>
              <Slider
                value={[settings.hexRadius]}
                onValueChange={([v]) => updateSetting("hexRadius", v)}
                min={30}
                max={150}
                step={5}
                data-testid="slider-hex-radius"
              />
            </div>
            <div>
              <Label>Module Thickness: {settings.hexThickness}mm</Label>
              <Slider
                value={[settings.hexThickness]}
                onValueChange={([v]) => updateSetting("hexThickness", v)}
                min={8}
                max={25}
                step={1}
                data-testid="slider-hex-thickness"
              />
            </div>
            <div>
              <Label>Wall Thickness: {settings.wallThickness}mm</Label>
              <Slider
                value={[settings.wallThickness]}
                onValueChange={([v]) => updateSetting("wallThickness", v)}
                min={2}
                max={5}
                step={0.5}
                data-testid="slider-wall-thickness"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Connection Layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Preset Layouts</Label>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[
                  { id: "chain", label: "→←" },
                  { id: "corner60", label: "60°" },
                  { id: "corner120", label: "120°" },
                  { id: "tsplit", label: "T" },
                  { id: "ysplit", label: "Y" },
                  { id: "hexhub", label: "Hub" },
                  { id: "endcap", label: "End" },
                ].map(preset => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setPresetLayout(preset.id)}
                    data-testid={`button-preset-${preset.id}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Active Edges (click to toggle)</Label>
              <div className="grid grid-cols-3 gap-1 mt-2">
                {connectionLabels.map((label, i) => (
                  <Button
                    key={i}
                    variant={settings.activeConnections.includes(i) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleConnection(i)}
                    data-testid={`button-edge-${i}`}
                  >
                    {settings.activeConnections.includes(i) ? <Link2 className="h-3 w-3 mr-1" /> : <Unlink className="h-3 w-3 mr-1" />}
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Connector Length: {settings.connectorLength}mm</Label>
              <Slider
                value={[settings.connectorLength]}
                onValueChange={([v]) => updateSetting("connectorLength", v)}
                min={10}
                max={50}
                step={5}
                data-testid="slider-connector-length"
              />
            </div>
            <div>
              <Label>Connector Diameter: {settings.connectorDiameter}mm</Label>
              <Slider
                value={[settings.connectorDiameter]}
                onValueChange={([v]) => updateSetting("connectorDiameter", v)}
                min={8}
                max={20}
                step={1}
                data-testid="slider-connector-diameter"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              LED Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>LED Type</Label>
              <Select
                value={settings.ledType}
                onValueChange={(v) => updateSetting("ledType", v as HexPanelLedType)}
              >
                <SelectTrigger data-testid="select-led-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hexPanelLedTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === "ws2812b" ? "WS2812B (Addressable)" :
                       type === "cob" ? "COB Strip" :
                       type === "filament" ? "LED Filament" :
                       "Neon Tube"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>LED Channel Diameter: {settings.ledChannelDiameter}mm</Label>
              <Slider
                value={[settings.ledChannelDiameter]}
                onValueChange={([v]) => updateSetting("ledChannelDiameter", v)}
                min={6}
                max={15}
                step={1}
                data-testid="slider-led-channel"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Diffuser Panel</Label>
              <Switch
                checked={settings.diffuserEnabled}
                onCheckedChange={(v) => updateSetting("diffuserEnabled", v)}
                data-testid="switch-diffuser"
              />
            </div>

            {settings.diffuserEnabled && (
              <div>
                <Label>Diffuser Thickness: {settings.diffuserThickness}mm</Label>
                <Slider
                  value={[settings.diffuserThickness]}
                  onValueChange={([v]) => updateSetting("diffuserThickness", v)}
                  min={0.8}
                  max={2}
                  step={0.1}
                  data-testid="slider-diffuser-thickness"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Export Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Export Full Module Set</Label>
              <Switch
                checked={settings.exportModuleSet}
                onCheckedChange={(v) => updateSetting("exportModuleSet", v)}
                data-testid="switch-module-set"
              />
            </div>
            {settings.exportModuleSet && (
              <p className="text-xs text-muted-foreground">
                Exports straight, 60° corner, 120° corner, T-split, and end cap variants
              </p>
            )}

            <div className="flex items-center justify-between">
              <Label>Mounting Clips</Label>
              <Switch
                checked={settings.includeMountingClips}
                onCheckedChange={(v) => updateSetting("includeMountingClips", v)}
                data-testid="switch-mounting-clips"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Wire Channels</Label>
              <Switch
                checked={settings.includeWireChannels}
                onCheckedChange={(v) => updateSetting("includeWireChannels", v)}
                data-testid="switch-wire-channels"
              />
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
              data-testid="button-export-hex"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Hex Panels
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default HexPanelEditor;
