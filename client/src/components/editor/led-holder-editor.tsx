import { useEditorStore } from "@/lib/editor-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, Lightbulb, Magnet, Wrench, Cable, Zap, Sun, AlertCircle, MoveVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { LEDHolderLedType, LEDHolderMountType, LEDHolderStyle, LEDHolderSettings } from "@shared/schema";

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

function PreviewFallback({ settings }: { settings: LEDHolderSettings }) {
  const led = ledTypeOptions.find(o => o.value === settings.ledType);
  const mount = mountTypeOptions.find(o => o.value === settings.mountType);
  
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <Lightbulb className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold">LED Holder Preview</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>LED Type: <span className="font-medium text-foreground">{led?.label}</span></p>
          <p>Mount: <span className="font-medium text-foreground">{mount?.label}</span></p>
          <p>Tilt: <span className="font-medium text-foreground">{settings.tiltAngle}°</span></p>
          <p>Wall: <span className="font-medium text-foreground">{settings.wallThickness}mm</span></p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span>3D preview requires WebGL</span>
        </div>
      </div>
    </div>
  );
}

const ledTypeOptions: { value: LEDHolderLedType; label: string; description: string }[] = [
  { value: "3mm", label: "3mm LED", description: "Standard small LED" },
  { value: "5mm", label: "5mm LED", description: "Standard LED bulb" },
  { value: "10mm_uv", label: "10mm UV/Black Light", description: "Large UV LED for glow effects" },
  { value: "ws2812b", label: "WS2812B", description: "Addressable RGB LED" },
  { value: "ws2812b_strip", label: "WS2812B Strip", description: "Addressable LED strip segment" },
];

const holderStyleOptions: { value: LEDHolderStyle; label: string; description?: string }[] = [
  { value: "socket", label: "Socket", description: "LED sits in circular socket" },
  { value: "clip", label: "Clip", description: "Spring clip holds LED" },
  { value: "cradle", label: "Cradle", description: "LED rests in curved cradle" },
  { value: "canvas_glow_clip", label: "Canvas Glow-Clip", description: "Wide diffuser for canvas lighting" },
];

const mountTypeOptions: { value: LEDHolderMountType; label: string; icon: typeof Magnet }[] = [
  { value: "magnetic", label: "Magnetic Mount", icon: Magnet },
  { value: "screw", label: "Screw Mount", icon: Wrench },
  { value: "adhesive", label: "Adhesive Pad", icon: Lightbulb },
  { value: "clip_on", label: "Clip-On (Frame)", icon: Cable },
];

function getLEDDimensions(ledType: LEDHolderLedType) {
  switch (ledType) {
    case "3mm":
      return { bodyRadius: 1.5, bodyHeight: 5, legSpacing: 2.54 };
    case "5mm":
      return { bodyRadius: 2.5, bodyHeight: 8.6, legSpacing: 2.54 };
    case "10mm_uv":
      return { bodyRadius: 5, bodyHeight: 13, legSpacing: 2.54 };
    case "ws2812b":
      return { bodyRadius: 2.5, bodyHeight: 1.6, legSpacing: 5.0 };
    case "ws2812b_strip":
      return { bodyRadius: 6, bodyHeight: 3, legSpacing: 10 };
    default:
      return { bodyRadius: 2.5, bodyHeight: 8.6, legSpacing: 2.54 };
  }
}

function LEDHolderPreview({ settings }: { settings: LEDHolderSettings }) {
  const led = getLEDDimensions(settings.ledType);
  const tiltRad = (settings.tiltAngle * Math.PI) / 180;
  const magnetRadius = settings.magnetDiameter / 2;
  const reflectorDepth = settings.reflectorDepth || 12;
  const beamAngle = settings.beamAngle || 45;
  const hasDiffuser = settings.hasDiffuser !== false;

  const scale = 0.035;

  const holderGeometry = useMemo(() => {
    const group = new THREE.Group();
    
    const reflectorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xc0c0c0,
      roughness: 0.2,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });
    
    const diffuserMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,
    });
    
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6b7280,
      roughness: 0.5,
      metalness: 0.3,
    });
    
    const channelMaterial = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.6,
      metalness: 0.2,
    });

    const beamRad = (beamAngle * Math.PI) / 180;
    const openingRadius = led.bodyRadius + reflectorDepth * Math.tan(beamRad / 2);

    if (settings.adjustableHeight) {
      const baseRadius = Math.max(10, led.bodyRadius + 7);
      const baseHeight = 5;
      const baseGeom = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 24);
      const baseMesh = new THREE.Mesh(baseGeom, baseMaterial);
      baseMesh.position.set(0, baseHeight / 2, 0);
      group.add(baseMesh);

      const magnetGeom = new THREE.CylinderGeometry(magnetRadius, magnetRadius, settings.magnetDepth, 24);
      const magnetMesh = new THREE.Mesh(magnetGeom, new THREE.MeshStandardMaterial({ color: 0x333333 }));
      magnetMesh.position.set(0, settings.magnetDepth / 2, 0);
      group.add(magnetMesh);

      const channelLength = settings.maxHeight || 30;
      const channelRadius = settings.wireChannelDiameter / 2 + settings.wallThickness;
      const channelGeom = new THREE.CylinderGeometry(channelRadius, channelRadius, channelLength, 16);
      const channelMesh = new THREE.Mesh(channelGeom, channelMaterial);
      channelMesh.position.set(0, baseHeight + channelLength / 2, 0);
      group.add(channelMesh);

      const socketY = baseHeight + channelLength;
      
      const reflectorGeom = new THREE.CylinderGeometry(openingRadius, led.bodyRadius + 1, reflectorDepth, 32, 1, true);
      const reflectorMesh = new THREE.Mesh(reflectorGeom, reflectorMaterial);
      reflectorMesh.position.set(0, socketY + reflectorDepth / 2, 0);
      group.add(reflectorMesh);

      const socketGeom = new THREE.CylinderGeometry(led.bodyRadius + 1, led.bodyRadius + 1, led.bodyHeight * 0.6, 16);
      const socketMesh = new THREE.Mesh(socketGeom, new THREE.MeshStandardMaterial({ color: 0x374151 }));
      socketMesh.position.set(0, socketY - led.bodyHeight * 0.3, 0);
      group.add(socketMesh);

      if (hasDiffuser) {
        const domeGeom = new THREE.SphereGeometry(openingRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMesh = new THREE.Mesh(domeGeom, diffuserMaterial);
        domeMesh.rotation.x = Math.PI;
        domeMesh.position.set(0, socketY + reflectorDepth, 0);
        group.add(domeMesh);
      }

    } else {
      const plateW = 24;
      const plateH = 18;
      const plateD = 6;
      
      const frontPlateGeom = new THREE.BoxGeometry(plateW, plateD, plateH);
      const frontPlateMesh = new THREE.Mesh(frontPlateGeom, baseMaterial);
      frontPlateMesh.position.set(0, plateD / 2, plateH / 2);
      group.add(frontPlateMesh);

      const reflectorY = plateD;
      const reflectorGeom = new THREE.CylinderGeometry(openingRadius, led.bodyRadius + 1, reflectorDepth, 32, 1, true);
      const reflectorMesh = new THREE.Mesh(reflectorGeom, reflectorMaterial);
      reflectorMesh.rotation.x = -tiltRad;
      reflectorMesh.position.set(
        0, 
        reflectorY + (reflectorDepth / 2) * Math.cos(tiltRad), 
        plateH / 2 - (reflectorDepth / 2) * Math.sin(tiltRad)
      );
      group.add(reflectorMesh);

      if (hasDiffuser) {
        const domeGeom = new THREE.SphereGeometry(openingRadius * 0.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMesh = new THREE.Mesh(domeGeom, diffuserMaterial);
        domeMesh.rotation.x = Math.PI - tiltRad;
        domeMesh.position.set(
          0,
          reflectorY + reflectorDepth * Math.cos(tiltRad),
          plateH / 2 - reflectorDepth * Math.sin(tiltRad)
        );
        group.add(domeMesh);
      }

      const magnetPocketGeom = new THREE.CylinderGeometry(magnetRadius, magnetRadius, settings.magnetDepth, 24);
      const magnetPocketMesh = new THREE.Mesh(magnetPocketGeom, new THREE.MeshStandardMaterial({ color: 0x333333 }));
      magnetPocketMesh.rotation.x = Math.PI / 2;
      magnetPocketMesh.position.set(0, -settings.magnetDepth / 2, plateH / 2);
      group.add(magnetPocketMesh);

      const backPlateGeom = new THREE.BoxGeometry(plateW, plateD, plateH);
      const backPlateMesh = new THREE.Mesh(backPlateGeom, baseMaterial);
      backPlateMesh.position.set(35, plateD / 2, plateH / 2);
      group.add(backPlateMesh);

      const backMagnetGeom = new THREE.CylinderGeometry(magnetRadius, magnetRadius, settings.magnetDepth, 24);
      const backMagnetMesh = new THREE.Mesh(backMagnetGeom, new THREE.MeshStandardMaterial({ color: 0x333333 }));
      backMagnetMesh.rotation.x = Math.PI / 2;
      backMagnetMesh.position.set(35, plateD + settings.magnetDepth / 2, plateH / 2);
      group.add(backMagnetMesh);
    }

    return group;
  }, [settings.ledType, settings.mountType, settings.wallThickness, settings.wireChannelDiameter, 
      settings.magnetDiameter, settings.magnetDepth, settings.tiltAngle, settings.adjustableHeight,
      settings.minHeight, settings.maxHeight, reflectorDepth, beamAngle, hasDiffuser,
      led.bodyRadius, led.bodyHeight, tiltRad, magnetRadius]);

  return (
    <primitive object={holderGeometry} scale={scale} />
  );
}

export function LEDHolderEditor() {
  const { ledHolderSettings, setLEDHolderSettings } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setWebglSupported(checkWebGLSupport());
  }, []);

  if (webglSupported === null) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="led-holder-editor-loading">
        <div className="text-muted-foreground">Loading preview...</div>
      </div>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/led-holder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ledHolderSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "led_holder.stl";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `LED holder downloaded as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedLedType = ledTypeOptions.find(o => o.value === ledHolderSettings.ledType);

  return (
    <div className="h-full flex" data-testid="led-holder-editor">
      {webglSupported ? (
        <div className="flex-1 relative bg-gradient-to-br from-slate-900 to-slate-800">
          <Suspense fallback={<PreviewFallback settings={ledHolderSettings} />}>
            <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 5, 5]} intensity={1} />
              <directionalLight position={[-5, 3, -5]} intensity={0.5} />
              <LEDHolderPreview settings={ledHolderSettings} />
              <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} />
              <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
              <Environment preset="studio" />
            </Canvas>
          </Suspense>
          
          <div className="absolute bottom-4 left-4 right-4 flex justify-center">
            <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border shadow-lg">
              <p className="text-xs text-muted-foreground text-center">
                Drag to rotate, scroll to zoom, right-click to pan
              </p>
            </div>
          </div>
        </div>
      ) : (
        <PreviewFallback settings={ledHolderSettings} />
      )}

      <div className="w-96 border-l bg-sidebar p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">LED Holder Designer</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create 3D printable LED holders for accent lighting
            </p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Holder Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={ledHolderSettings.holderStyle}
                onValueChange={(value: LEDHolderStyle) => setLEDHolderSettings({ holderStyle: value })}
              >
                <SelectTrigger data-testid="select-holder-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {holderStyleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`option-style-${option.value}`}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        )}
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
                <Lightbulb className="w-4 h-4" />
                LED Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={ledHolderSettings.ledType}
                onValueChange={(value: LEDHolderLedType) => setLEDHolderSettings({ ledType: value })}
              >
                <SelectTrigger data-testid="select-led-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ledTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} data-testid={`option-led-${option.value}`}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLedType && (
                <p className="text-xs text-muted-foreground">{selectedLedType.description}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Magnet className="w-4 h-4" />
                Mount Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {mountTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={ledHolderSettings.mountType === option.value ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col h-auto py-3 gap-1"
                      onClick={() => setLEDHolderSettings({ mountType: option.value })}
                      data-testid={`button-mount-${option.value}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cable className="w-4 h-4" />
                Wire Channel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Channel Diameter: {ledHolderSettings.wireChannelDiameter}mm
                </Label>
                <Slider
                  value={[ledHolderSettings.wireChannelDiameter]}
                  onValueChange={([value]) => setLEDHolderSettings({ wireChannelDiameter: value })}
                  min={1}
                  max={10}
                  step={0.5}
                  className="mt-2"
                  data-testid="slider-wire-channel"
                />
              </div>
            </CardContent>
          </Card>

          {ledHolderSettings.mountType === "magnetic" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Magnet Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Magnet Diameter: {ledHolderSettings.magnetDiameter}mm
                  </Label>
                  <Slider
                    value={[ledHolderSettings.magnetDiameter]}
                    onValueChange={([value]) => setLEDHolderSettings({ magnetDiameter: value })}
                    min={3}
                    max={15}
                    step={1}
                    className="mt-2"
                    data-testid="slider-magnet-diameter"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Magnet Depth: {ledHolderSettings.magnetDepth}mm
                  </Label>
                  <Slider
                    value={[ledHolderSettings.magnetDepth]}
                    onValueChange={([value]) => setLEDHolderSettings({ magnetDepth: value })}
                    min={1}
                    max={5}
                    step={0.5}
                    className="mt-2"
                    data-testid="slider-magnet-depth"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {ledHolderSettings.mountType === "screw" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Screw Mount Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-xs text-muted-foreground">
                  Screw Hole Diameter: {ledHolderSettings.screwHoleDiameter}mm
                </Label>
                <Slider
                  value={[ledHolderSettings.screwHoleDiameter]}
                  onValueChange={([value]) => setLEDHolderSettings({ screwHoleDiameter: value })}
                  min={2}
                  max={6}
                  step={0.5}
                  className="mt-2"
                  data-testid="slider-screw-diameter"
                />
              </CardContent>
            </Card>
          )}

          {ledHolderSettings.holderStyle === "canvas_glow_clip" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Wide Diffuser Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  "Duckbill" diffuser spreads LED light into a wide wash pattern for canvas/glow sign illumination.
                </p>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Diffuser Width: {ledHolderSettings.diffuserWidth || 30}mm
                  </Label>
                  <Slider
                    value={[ledHolderSettings.diffuserWidth || 30]}
                    onValueChange={([value]) => setLEDHolderSettings({ diffuserWidth: value })}
                    min={15}
                    max={50}
                    step={1}
                    className="mt-2"
                    data-testid="slider-diffuser-width"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Diffuser Height: {ledHolderSettings.diffuserHeight || 10}mm
                  </Label>
                  <Slider
                    value={[ledHolderSettings.diffuserHeight || 10]}
                    onValueChange={([value]) => setLEDHolderSettings({ diffuserHeight: value })}
                    min={5}
                    max={20}
                    step={1}
                    className="mt-2"
                    data-testid="slider-diffuser-height"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Diffuser Length: {ledHolderSettings.diffuserLength || 15}mm
                  </Label>
                  <Slider
                    value={[ledHolderSettings.diffuserLength || 15]}
                    onValueChange={([value]) => setLEDHolderSettings({ diffuserLength: value })}
                    min={10}
                    max={30}
                    step={1}
                    className="mt-2"
                    data-testid="slider-diffuser-length"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge 
                    variant={ledHolderSettings.lightingMode === "wash" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setLEDHolderSettings({ lightingMode: "wash" })}
                    data-testid="badge-mode-wash"
                  >
                    Wash (Wide)
                  </Badge>
                  <Badge 
                    variant={ledHolderSettings.lightingMode === "spot" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setLEDHolderSettings({ lightingMode: "spot" })}
                    data-testid="badge-mode-spot"
                  >
                    Spot (Focused)
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MoveVertical className="w-4 h-4" />
                Height Adjustment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Adjustable Height</Label>
                <Switch
                  checked={ledHolderSettings.adjustableHeight || false}
                  onCheckedChange={(checked) => setLEDHolderSettings({ adjustableHeight: checked })}
                  data-testid="switch-adjustable-height"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {ledHolderSettings.adjustableHeight 
                  ? "Threaded post design - screw the light up/down to adjust height" 
                  : "Fixed height canvas clip design"}
              </p>
              {ledHolderSettings.adjustableHeight && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Min Height: {ledHolderSettings.minHeight || 20}mm
                    </Label>
                    <Slider
                      value={[ledHolderSettings.minHeight || 20]}
                      onValueChange={([value]) => setLEDHolderSettings({ minHeight: value })}
                      min={10}
                      max={50}
                      step={5}
                      className="mt-2"
                      data-testid="slider-min-height"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Max Height: {ledHolderSettings.maxHeight || 60}mm
                    </Label>
                    <Slider
                      value={[ledHolderSettings.maxHeight || 60]}
                      onValueChange={([value]) => setLEDHolderSettings({ maxHeight: value })}
                      min={20}
                      max={100}
                      step={5}
                      className="mt-2"
                      data-testid="slider-max-height"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sun className="w-4 h-4" />
                Light Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Reflector Depth: {ledHolderSettings.reflectorDepth || 12}mm
                </Label>
                <Slider
                  value={[ledHolderSettings.reflectorDepth || 12]}
                  onValueChange={([value]) => setLEDHolderSettings({ reflectorDepth: value })}
                  min={5}
                  max={25}
                  step={1}
                  className="mt-2"
                  data-testid="slider-reflector-depth"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deeper reflector = more focused beam
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Beam Angle: {ledHolderSettings.beamAngle || 45}°
                </Label>
                <Slider
                  value={[ledHolderSettings.beamAngle || 45]}
                  onValueChange={([value]) => setLEDHolderSettings({ beamAngle: value })}
                  min={15}
                  max={120}
                  step={5}
                  className="mt-2"
                  data-testid="slider-beam-angle"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Narrow = spotlight, Wide = flood
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Diffuser Dome</Label>
                  <p className="text-xs text-muted-foreground">Softens and spreads light evenly</p>
                </div>
                <Switch
                  checked={ledHolderSettings.hasDiffuser !== false}
                  onCheckedChange={(checked) => setLEDHolderSettings({ hasDiffuser: checked })}
                  data-testid="switch-diffuser"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Wall Thickness: {ledHolderSettings.wallThickness}mm
                </Label>
                <Slider
                  value={[ledHolderSettings.wallThickness]}
                  onValueChange={([value]) => setLEDHolderSettings({ wallThickness: value })}
                  min={1}
                  max={5}
                  step={0.5}
                  className="mt-2"
                  data-testid="slider-wall-thickness"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Tilt Angle: {ledHolderSettings.tiltAngle}°
                </Label>
                <Slider
                  value={[ledHolderSettings.tiltAngle]}
                  onValueChange={([value]) => setLEDHolderSettings({ tiltAngle: value })}
                  min={0}
                  max={90}
                  step={5}
                  className="mt-2"
                  data-testid="slider-tilt-angle"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Slider
                  value={[ledHolderSettings.quantity]}
                  onValueChange={([value]) => setLEDHolderSettings({ quantity: value })}
                  min={1}
                  max={20}
                  step={1}
                  className="flex-1"
                  data-testid="slider-quantity"
                />
                <Badge variant="secondary" className="min-w-[3rem] justify-center">
                  {ledHolderSettings.quantity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {ledHolderSettings.quantity > 1 ? "Exports as ZIP file" : "Exports as single STL"}
              </p>
            </CardContent>
          </Card>

          <Separator />

          <Button
            className="w-full"
            size="lg"
            onClick={handleExport}
            disabled={isExporting}
            data-testid="button-export-led-holder"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Generating..." : `Export LED Holder${ledHolderSettings.quantity > 1 ? "s" : ""}`}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Holder includes:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Socket for {selectedLedType?.label || ledHolderSettings.ledType} LED</li>
              <li>{ledHolderSettings.wireChannelDiameter}mm wire channel</li>
              <li>{mountTypeOptions.find(m => m.value === ledHolderSettings.mountType)?.label}</li>
              {ledHolderSettings.tiltAngle > 0 && <li>{ledHolderSettings.tiltAngle}° tilt angle</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
