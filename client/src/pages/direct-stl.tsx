import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Download, 
  FileImage, 
  Box,
  Loader2,
  ArrowLeft,
  Sparkles,
  Info
} from "lucide-react";
import { Link } from "wouter";

export default function DirectSTLPage() {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [mode, setMode] = useState<'extrude' | 'heightmap'>('extrude');
  const [width, setWidth] = useState(100);
  const [maxDepth, setMaxDepth] = useState(5);
  const [baseThickness, setBaseThickness] = useState(2);
  const [invert, setInvert] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(true);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const generateSTL = async () => {
    if (!imagePreview) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/image-to-stl/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imagePreview,
          settings: {
            mode,
            width,
            maxDepth,
            baseThickness,
            invert,
            removeBackground
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate STL');
      }

      const blob = await response.blob();
      const triangleCount = response.headers.get('X-Triangle-Count');
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signcraft-${mode}-${Date.now()}.stl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "STL Generated!",
        description: `Downloaded with ${triangleCount || 'many'} triangles`
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="ghost" size="icon" data-testid="button-back-portal">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileImage className="h-8 w-8 text-primary" />
              Direct STL Export
            </h1>
            <p className="text-muted-foreground">
              Convert images to 3D printable STL files instantly
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto">Free Tool</Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Drag and drop or click to upload PNG, JPG, or WebP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('image-upload')?.click()}
                data-testid="dropzone-image"
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="input-image-upload"
                />
                {imagePreview ? (
                  <div className="space-y-4">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-h-64 mx-auto rounded-lg"
                      data-testid="img-preview"
                    />
                    <p className="text-sm text-muted-foreground">
                      {imageFile?.name} - Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileImage className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium">Drop your image here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                STL Settings
              </CardTitle>
              <CardDescription>
                Configure how your image converts to 3D
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Conversion Mode</Label>
                <Select value={mode} onValueChange={(v: 'extrude' | 'heightmap') => setMode(v)}>
                  <SelectTrigger data-testid="select-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extrude">
                      <div className="flex flex-col">
                        <span>Extrude (Silhouette)</span>
                        <span className="text-xs text-muted-foreground">Flat shape at uniform height</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="heightmap">
                      <div className="flex flex-col">
                        <span>Heightmap (Relief)</span>
                        <span className="text-xs text-muted-foreground">Brightness controls depth</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Width</Label>
                  <span className="text-sm text-muted-foreground">{width}mm</span>
                </div>
                <Slider
                  value={[width]}
                  onValueChange={([v]) => setWidth(v)}
                  min={20}
                  max={300}
                  step={5}
                  data-testid="slider-width"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Max Depth</Label>
                  <span className="text-sm text-muted-foreground">{maxDepth}mm</span>
                </div>
                <Slider
                  value={[maxDepth]}
                  onValueChange={([v]) => setMaxDepth(v)}
                  min={1}
                  max={30}
                  step={0.5}
                  data-testid="slider-depth"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Base Thickness</Label>
                  <span className="text-sm text-muted-foreground">{baseThickness}mm</span>
                </div>
                <Slider
                  value={[baseThickness]}
                  onValueChange={([v]) => setBaseThickness(v)}
                  min={0}
                  max={10}
                  step={0.5}
                  data-testid="slider-base"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Invert Colors</Label>
                  <p className="text-xs text-muted-foreground">Swap light/dark areas</p>
                </div>
                <Switch
                  checked={invert}
                  onCheckedChange={setInvert}
                  data-testid="switch-invert"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Remove Background</Label>
                  <p className="text-xs text-muted-foreground">Exclude white/light areas</p>
                </div>
                <Switch
                  checked={removeBackground}
                  onCheckedChange={setRemoveBackground}
                  data-testid="switch-remove-bg"
                />
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={generateSTL}
                disabled={!imagePreview || isGenerating}
                data-testid="button-generate-stl"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Generate & Download STL
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">How it works</p>
                <p className="text-muted-foreground">
                  <strong>Extrude mode:</strong> Creates a flat-topped 3D shape from your image silhouette. 
                  Perfect for logos and simple shapes.
                </p>
                <p className="text-muted-foreground">
                  <strong>Heightmap mode:</strong> Converts brightness to height - bright areas are raised, 
                  dark areas are lowered. Great for photos and detailed images.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
