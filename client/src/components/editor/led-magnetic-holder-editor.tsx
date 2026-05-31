import { useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Magnet,
  Battery,
  Lightbulb,
  Cable,
  Coins,
  CircleDot,
  Layers,
} from "lucide-react";

interface LEDMagneticHolderConfig {
  mode: 'wired' | 'neopixel' | 'battery';
  diameter: number;
  totalThickness: number;
  wallThickness: number;
  ledType: '3mm' | '5mm' | '10mm';
  ledCount: number;
  magnetSize: '6x2' | '8x2' | '8x3' | '10x2' | '10x3' | '12x2';
  usePennySlot: boolean;
  wireCount: number;
  wireChannelDiameter: number;
  batteryType: 'CR2032' | 'CR2025' | 'CR2016';
  includeAlignment: boolean;
  exportPart: 'both' | 'top' | 'bottom';
}

const MAGNET_SIZES = {
  '6x2': { diameter: 6, thickness: 2 },
  '8x2': { diameter: 8, thickness: 2 },
  '8x3': { diameter: 8, thickness: 3 },
  '10x2': { diameter: 10, thickness: 2 },
  '10x3': { diameter: 10, thickness: 3 },
  '12x2': { diameter: 12, thickness: 2 },
};

const DEFAULT_CONFIG: LEDMagneticHolderConfig = {
  mode: 'wired',
  diameter: 25,
  totalThickness: 6,
  wallThickness: 1.5,
  ledType: '5mm',
  ledCount: 1,
  magnetSize: '8x2',
  usePennySlot: false,
  wireCount: 2,
  wireChannelDiameter: 2,
  batteryType: 'CR2032',
  includeAlignment: true,
  exportPart: 'both',
};

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

function OreoPreview({ config, showExploded }: { config: LEDMagneticHolderConfig; showExploded: boolean }) {
  const geometry = useMemo(() => {
    const group = new THREE.Group();
    
    const outerRadius = config.diameter / 2;
    const halfThickness = config.totalThickness / 2;
    const magnet = MAGNET_SIZES[config.magnetSize];
    
    const bottomMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a, 
      metalness: 0.4,
      roughness: 0.6,
    });
    const topMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x5a5a5a, 
      metalness: 0.4,
      roughness: 0.6,
    });
    const magnetMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a, 
      metalness: 0.8,
      roughness: 0.2,
    });
    const batteryMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xc0c0c0, 
      metalness: 0.9,
      roughness: 0.1,
    });
    const ledMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffcc,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
    });
    
    // BOTTOM HALF - Flat disc with magnet pocket on top
    const bottomDiscHeight = halfThickness;
    
    // Main flat disc body
    const bottomDiscGeom = new THREE.CylinderGeometry(outerRadius, outerRadius, bottomDiscHeight, 48);
    const bottomDiscMesh = new THREE.Mesh(bottomDiscGeom, bottomMaterial);
    bottomDiscMesh.position.y = bottomDiscHeight / 2;
    group.add(bottomDiscMesh);
    
    // Knurling pattern visualization (ridges around edge)
    const knurlCount = 36;
    for (let k = 0; k < knurlCount; k++) {
      const angle = (k / knurlCount) * Math.PI * 2;
      const knurlGeom = new THREE.BoxGeometry(0.8, Math.min(2, bottomDiscHeight * 0.6), 0.5);
      const knurlMesh = new THREE.Mesh(knurlGeom, bottomMaterial);
      knurlMesh.position.x = Math.cos(angle) * (outerRadius + 0.3);
      knurlMesh.position.z = Math.sin(angle) * (outerRadius + 0.3);
      knurlMesh.position.y = Math.min(1, bottomDiscHeight * 0.3);
      knurlMesh.rotation.y = angle;
      group.add(knurlMesh);
    }
    
    // Magnet or penny slot visualization on TOP of bottom disc
    if (config.usePennySlot) {
      const pennyGeom = new THREE.CylinderGeometry(9.6, 9.6, 1.6, 32);
      const pennyMesh = new THREE.Mesh(pennyGeom, new THREE.MeshStandardMaterial({ color: 0xb87333 }));
      pennyMesh.position.y = bottomDiscHeight - 0.8;
      group.add(pennyMesh);
    } else if (config.mode !== 'battery') {
      const magnetGeom = new THREE.CylinderGeometry(magnet.diameter / 2, magnet.diameter / 2, magnet.thickness, 32);
      const magnetMesh = new THREE.Mesh(magnetGeom, magnetMaterial);
      magnetMesh.position.y = bottomDiscHeight - magnet.thickness / 2;
      group.add(magnetMesh);
    }
    
    // Battery visualization (for battery mode)
    if (config.mode === 'battery') {
      const batterySpecs: Record<string, { diameter: number; thickness: number }> = {
        'CR2032': { diameter: 20, thickness: 3.2 },
        'CR2025': { diameter: 20, thickness: 2.5 },
        'CR2016': { diameter: 20, thickness: 1.6 },
      };
      const battery = batterySpecs[config.batteryType];
      const batteryGeom = new THREE.CylinderGeometry(battery.diameter / 2, battery.diameter / 2, battery.thickness, 32);
      const batteryMesh = new THREE.Mesh(batteryGeom, batteryMaterial);
      batteryMesh.position.y = bottomDiscHeight - battery.thickness / 2;
      group.add(batteryMesh);
    }
    
    // TOP HALF - Flat disc that sits on top (magnetically attached)
    const topOffset = showExploded ? halfThickness + 10 : halfThickness;
    const topDiscHeight = halfThickness;
    
    // Main flat disc body of top
    const topDiscGeom = new THREE.CylinderGeometry(outerRadius, outerRadius, topDiscHeight, 48);
    const topDiscMesh = new THREE.Mesh(topDiscGeom, topMaterial);
    topDiscMesh.position.y = topOffset + topDiscHeight / 2;
    group.add(topDiscMesh);
    
    // Magnet on bottom of top half (only visible when exploded)
    if (showExploded && config.mode !== 'battery' && !config.usePennySlot) {
      const topMagnetGeom = new THREE.CylinderGeometry(magnet.diameter / 2, magnet.diameter / 2, magnet.thickness, 32);
      const topMagnetMesh = new THREE.Mesh(topMagnetGeom, magnetMaterial);
      topMagnetMesh.position.y = topOffset + magnet.thickness / 2;
      group.add(topMagnetMesh);
    }
    
    // LED visualization
    const ledSpecs: Record<string, { diameter: number; length: number }> = {
      '3mm': { diameter: 3, length: 5 },
      '5mm': { diameter: 5, length: 8.6 },
      '10mm': { diameter: 10, length: 13 },
    };
    const led = ledSpecs[config.ledType] || ledSpecs['5mm'];
    const ledY = topOffset + topDiscHeight - led.length / 2;
    
    if (config.ledCount === 1) {
      const ledGeom = new THREE.CylinderGeometry(led.diameter / 2, led.diameter / 2, led.length, 16);
      const ledMesh = new THREE.Mesh(ledGeom, ledMaterial);
      ledMesh.position.y = ledY;
      group.add(ledMesh);
    } else {
      const ledCircleRadius = (outerRadius - led.diameter / 2 - config.wallThickness) * 0.5;
      for (let l = 0; l < config.ledCount; l++) {
        const angle = (l / config.ledCount) * Math.PI * 2;
        const ledGeom = new THREE.CylinderGeometry(led.diameter / 2, led.diameter / 2, led.length, 16);
        const ledMesh = new THREE.Mesh(ledGeom, ledMaterial);
        ledMesh.position.x = Math.cos(angle) * ledCircleRadius;
        ledMesh.position.z = Math.sin(angle) * ledCircleRadius;
        ledMesh.position.y = ledY;
        group.add(ledMesh);
      }
    }
    
    // Wire/lead visualization through bottom half
    if (config.mode !== 'battery') {
      const leadRadius = 0.6;
      const leadSpacing = 2.54 / 2;
      const leadHeight = halfThickness;
      
      // LED leads going down through bottom
      const leadMat1 = new THREE.MeshStandardMaterial({ color: 0xff3333 });
      const leadMat2 = new THREE.MeshStandardMaterial({ color: 0x222222 });
      
      const lead1Geom = new THREE.CylinderGeometry(leadRadius, leadRadius, leadHeight, 8);
      const lead1Mesh = new THREE.Mesh(lead1Geom, leadMat1);
      lead1Mesh.position.x = -leadSpacing;
      lead1Mesh.position.y = leadHeight / 2;
      group.add(lead1Mesh);
      
      const lead2Mesh = new THREE.Mesh(lead1Geom.clone(), leadMat2);
      lead2Mesh.position.x = leadSpacing;
      lead2Mesh.position.y = leadHeight / 2;
      group.add(lead2Mesh);
    }
    
    return group;
  }, [config, showExploded]);
  
  return <primitive object={geometry} />;
}

export function LEDMagneticHolderEditor() {
  const { toast } = useToast();
  const [config, setConfig] = useState<LEDMagneticHolderConfig>(DEFAULT_CONFIG);
  const [showExploded, setShowExploded] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [webGLSupported] = useState(checkWebGLSupport);
  
  const updateConfig = (updates: Partial<LEDMagneticHolderConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };
  
  const handleExport = async (part: 'both' | 'top' | 'bottom') => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/led-magnetic-holder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, exportPart: part }),
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = part === 'both' ? "led_magnetic_holder.zip" : `led_holder_${part}.stl`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `LED Magnetic Holder ${part === 'both' ? 'files' : part + ' half'} downloaded successfully!`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate STL file(s)",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="flex h-full" data-testid="led-magnetic-holder-editor">
      <div className="w-80 border-r p-4 overflow-y-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Magnet className="w-5 h-5" />
              LED Magnetic Holder
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Magnetic holder design. Two halves snap together with magnets for easy assembly.
          </CardContent>
        </Card>
        
        <Tabs defaultValue="mode" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mode" data-testid="tab-mode">Mode</TabsTrigger>
            <TabsTrigger value="size" data-testid="tab-size">Size</TabsTrigger>
            <TabsTrigger value="options" data-testid="tab-options">Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mode" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Power Mode</Label>
              <Select 
                value={config.mode} 
                onValueChange={(v) => updateConfig({ 
                  mode: v as LEDMagneticHolderConfig['mode'],
                  wireCount: v === 'neopixel' ? 3 : v === 'wired' ? 2 : 0,
                })}
              >
                <SelectTrigger data-testid="select-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wired">
                    <div className="flex items-center gap-2">
                      <Cable className="w-4 h-4" />
                      Wired LED (2 wires)
                    </div>
                  </SelectItem>
                  <SelectItem value="neopixel">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      NeoPixel (3-4 wires)
                    </div>
                  </SelectItem>
                  <SelectItem value="battery">
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4" />
                      Battery Powered
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>LED Type</Label>
              <Select value={config.ledType} onValueChange={(v) => updateConfig({ ledType: v as LEDMagneticHolderConfig['ledType'] })}>
                <SelectTrigger data-testid="select-led-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3mm">3mm LED</SelectItem>
                  <SelectItem value="5mm">5mm LED</SelectItem>
                  <SelectItem value="10mm">10mm LED</SelectItem>
                  <SelectItem value="neopixel_mini">NeoPixel Mini</SelectItem>
                  <SelectItem value="neopixel_standard">NeoPixel Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>LED Count: {config.ledCount}</Label>
              <Slider
                value={[config.ledCount]}
                onValueChange={([v]) => updateConfig({ ledCount: v })}
                min={1}
                max={4}
                step={1}
                data-testid="slider-led-count"
              />
            </div>
            
            {config.mode === 'battery' && (
              <div className="space-y-2">
                <Label>Battery Type</Label>
                <Select value={config.batteryType} onValueChange={(v) => updateConfig({ batteryType: v as LEDMagneticHolderConfig['batteryType'] })}>
                  <SelectTrigger data-testid="select-battery-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CR2032">CR2032 (3.2mm thick)</SelectItem>
                    <SelectItem value="CR2025">CR2025 (2.5mm thick)</SelectItem>
                    <SelectItem value="CR2016">CR2016 (1.6mm thick)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {config.mode !== 'battery' && (
              <>
                <div className="space-y-2">
                  <Label>Wire Count: {config.wireCount}</Label>
                  <Slider
                    value={[config.wireCount]}
                    onValueChange={([v]) => updateConfig({ wireCount: v })}
                    min={2}
                    max={4}
                    step={1}
                    data-testid="slider-wire-count"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Use Penny Slot</Label>
                  <Switch
                    checked={config.usePennySlot}
                    onCheckedChange={(v) => updateConfig({ usePennySlot: v })}
                    data-testid="switch-penny-slot"
                  />
                </div>
                
                {!config.usePennySlot && (
                  <div className="space-y-2">
                    <Label>Magnet Size</Label>
                    <Select
                      value={config.magnetSize}
                      onValueChange={(v: LEDMagneticHolderConfig['magnetSize']) => updateConfig({ magnetSize: v })}
                    >
                      <SelectTrigger data-testid="select-magnet-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6x2">6mm x 2mm</SelectItem>
                        <SelectItem value="8x2">8mm x 2mm</SelectItem>
                        <SelectItem value="8x3">8mm x 3mm</SelectItem>
                        <SelectItem value="10x2">10mm x 2mm</SelectItem>
                        <SelectItem value="10x3">10mm x 3mm</SelectItem>
                        <SelectItem value="12x2">12mm x 2mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="size" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Overall Diameter: {config.diameter}mm</Label>
              <Slider
                value={[config.diameter]}
                onValueChange={([v]) => updateConfig({ diameter: v })}
                min={15}
                max={40}
                step={1}
                data-testid="slider-diameter"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Total Thickness: {config.totalThickness}mm</Label>
              <Slider
                value={[config.totalThickness]}
                onValueChange={([v]) => updateConfig({ totalThickness: v })}
                min={4}
                max={12}
                step={1}
                data-testid="slider-total-thickness"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Wall Thickness: {config.wallThickness}mm</Label>
              <Slider
                value={[config.wallThickness]}
                onValueChange={([v]) => updateConfig({ wallThickness: v })}
                min={1}
                max={3}
                step={0.5}
                data-testid="slider-wall-thickness"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="options" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <Label>Include Alignment Feature</Label>
              <Switch
                checked={config.includeAlignment}
                onCheckedChange={(v) => updateConfig({ includeAlignment: v })}
                data-testid="switch-alignment"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Alignment feature helps halves snap together in the correct orientation
            </p>
            
            <div className="flex items-center justify-between">
              <Label>Show Exploded View</Label>
              <Switch
                checked={showExploded}
                onCheckedChange={setShowExploded}
                data-testid="switch-exploded"
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="w-5 h-5" />
              Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full" 
              onClick={() => handleExport('both')}
              disabled={isExporting}
              data-testid="button-export-both"
            >
              <Layers className="w-4 h-4 mr-2" />
              Download Both Halves (ZIP)
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleExport('bottom')}
                disabled={isExporting}
                data-testid="button-export-bottom"
              >
                Bottom Half
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleExport('top')}
                disabled={isExporting}
                data-testid="button-export-top"
              >
                Top Half
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex-1 bg-muted/20">
        {webGLSupported ? (
          <Canvas>
            <PerspectiveCamera makeDefault position={[50, 40, 50]} />
            <OrbitControls enableDamping dampingFactor={0.05} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
            <OreoPreview config={config} showExploded={showExploded} />
            <gridHelper args={[100, 20, 0x444444, 0x222222]} />
          </Canvas>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <CircleDot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>WebGL not available</p>
              <p className="text-sm">3D preview requires WebGL support</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
