import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Download, 
  Box, 
  Layers,
  Settings,
  FileCode,
  Zap,
  Upload,
  FolderOpen
} from "lucide-react";

interface SovereignSettings {
  renderTarget: 'Body' | 'Lid' | 'Detail' | 'All';
  imageFile: string;
  fontSize: number;
  signHeight: number;
  channelWidth: number;
  lidTolerance: number;
  wireExitEnabled: boolean;
  mountingKeyholeEnabled: boolean;
}

const defaultSettings: SovereignSettings = {
  renderTarget: 'All',
  imageFile: 'logo.svg',
  fontSize: 100,
  signHeight: 30,
  channelWidth: 6.0,
  lidTolerance: 0.18,
  wireExitEnabled: true,
  mountingKeyholeEnabled: true
};

export default function SovereignEnginePage() {
  const [settings, setSettings] = useState<SovereignSettings>(defaultSettings);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.svg')) {
        toast({
          title: "Invalid File",
          description: "Please select an SVG file",
          variant: "destructive"
        });
        return;
      }
      setUploadedFile(file);
      setSettings({ ...settings, imageFile: file.name });
      toast({
        title: "SVG Selected",
        description: `${file.name} will be referenced in the generated .scad file`
      });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/openscad/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sovereign_engine_${settings.renderTarget.toLowerCase()}.scad`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "OpenSCAD Generated",
        description: `Downloaded ${settings.renderTarget} layer .scad file`
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const layerInfo = {
    Body: { color: "bg-red-500", material: "PLA+ (Red/Black)", desc: "Main chassis with LED channel" },
    Lid: { color: "bg-white border", material: "Translucent White PLA", desc: "Snap-fit diffuser cover" },
    Detail: { color: "bg-gray-900", material: "Carbon Fiber PLA", desc: "Fine line overlay" },
    All: { color: "bg-gradient-to-r from-red-500 via-white to-gray-900", material: "Multi-material", desc: "Preview all layers" }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="ghost" size="icon" data-testid="button-back-portal">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Box className="h-8 w-8 text-primary" />
              Sovereign Engine V16
            </h1>
            <p className="text-muted-foreground">
              Tri-Layer Metabolism System for Multi-Material LED Signs
            </p>
          </div>
          <Badge variant="secondary">OpenSCAD</Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Layer System
                </CardTitle>
                <CardDescription>
                  The Tri-Layer system creates perfect LED signs with separate printable parts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(['Body', 'Lid', 'Detail', 'All'] as const).map((layer) => (
                    <button
                      key={layer}
                      onClick={() => setSettings({ ...settings, renderTarget: layer })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        settings.renderTarget === layer 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover-elevate'
                      }`}
                      data-testid={`button-layer-${layer.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded ${layerInfo[layer].color}`} />
                        <span className="font-semibold">{layer}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{layerInfo[layer].desc}</p>
                      <p className="text-xs text-primary mt-1">{layerInfo[layer].material}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Engineering Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>SVG File</Label>
                  <input
                    type="file"
                    accept=".svg"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-svg-file"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={settings.imageFile}
                      onChange={(e) => setSettings({ ...settings, imageFile: e.target.value })}
                      placeholder="logo.svg"
                      className="flex-1"
                      data-testid="input-image-file"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-browse-svg"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                  {uploadedFile && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Upload className="h-4 w-4" />
                      Selected: {uploadedFile.name}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select your SVG file, then place it in the same folder as the downloaded .scad file
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font Size (mm): {settings.fontSize}</Label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={([v]) => setSettings({ ...settings, fontSize: v })}
                      min={20}
                      max={300}
                      step={5}
                      data-testid="slider-font-size"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sign Height (mm): {settings.signHeight}</Label>
                    <Slider
                      value={[settings.signHeight]}
                      onValueChange={([v]) => setSettings({ ...settings, signHeight: v })}
                      min={10}
                      max={80}
                      step={1}
                      data-testid="slider-sign-height"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Channel Width (mm): {settings.channelWidth}</Label>
                    <Slider
                      value={[settings.channelWidth]}
                      onValueChange={([v]) => setSettings({ ...settings, channelWidth: v })}
                      min={3}
                      max={12}
                      step={0.5}
                      data-testid="slider-channel-width"
                    />
                    <p className="text-xs text-muted-foreground">Width of LED/neon channel</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Lid Tolerance (mm): {settings.lidTolerance}</Label>
                    <Slider
                      value={[settings.lidTolerance]}
                      onValueChange={([v]) => setSettings({ ...settings, lidTolerance: v })}
                      min={0.1}
                      max={0.5}
                      step={0.02}
                      data-testid="slider-lid-tolerance"
                    />
                    <p className="text-xs text-muted-foreground">Gap for snap-fit lid</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Wire Exit Hole</Label>
                      <p className="text-xs text-muted-foreground">3mm hole for LED wires</p>
                    </div>
                    <Switch
                      checked={settings.wireExitEnabled}
                      onCheckedChange={(v) => setSettings({ ...settings, wireExitEnabled: v })}
                      data-testid="switch-wire-exit"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mounting Keyhole</Label>
                      <p className="text-xs text-muted-foreground">Wall-hanging keyhole slot</p>
                    </div>
                    <Switch
                      checked={settings.mountingKeyholeEnabled}
                      onCheckedChange={(v) => setSettings({ ...settings, mountingKeyholeEnabled: v })}
                      data-testid="switch-mounting"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Generate OpenSCAD
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  data-testid="button-generate-scad"
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download .scad
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Open in OpenSCAD, place your SVG file in the same folder, and render
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium">Body (Chassis)</p>
                    <p className="text-xs text-muted-foreground">Print in PLA+ with LED channel cavity</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-white border flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium">Lid (Diffuser)</p>
                    <p className="text-xs text-muted-foreground">Print in translucent PLA for glow</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium">Detail (Overlay)</p>
                    <p className="text-xs text-muted-foreground">Captures fine "Pilot" lines</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Based on your Sovereign Engine V16</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
