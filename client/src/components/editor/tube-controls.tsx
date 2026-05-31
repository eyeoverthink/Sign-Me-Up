import { Cylinder, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "@/lib/editor-store";
import { neonTubeSizes } from "@shared/schema";

export function TubeControls() {
  const { tubeSettings, setTubeSettings, geometrySettings } = useEditorStore();

  if (geometrySettings.mode !== "outline") {
    return null;
  }

  const tubeSizeToMm: Record<string, number> = {
    "8mm": 8,
    "10mm": 10,
    "12mm": 12,
    "15mm": 15,
    "custom": tubeSettings.neonTubeDiameter,
  };

  const handleTubeSizeChange = (size: string) => {
    const diameter = tubeSizeToMm[size] || 12;
    console.log(`[TubeControls] Setting tube size to ${size}, diameter=${diameter}`);
    setTubeSettings({ 
      neonTubeSize: size as typeof neonTubeSizes[number],
      neonTubeDiameter: diameter,
      filamentDiameter: diameter 
    });
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Cylinder className="h-4 w-4" />
          Neon Tube Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="p-3 bg-muted/50 rounded-md border border-dashed">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
                3D Printed Modular System
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Precision snap-fit base holds LED light source. The cap creates 
              a diffused neon-style glow. No microcontrollers needed - just connect power.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Tube Profile Size</Label>
          <Select
            value={tubeSettings.neonTubeSize || "12mm"}
            onValueChange={handleTubeSizeChange}
          >
            <SelectTrigger data-testid="select-tube-size" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {neonTubeSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size === "custom" ? "Custom Size" : `${size} Profile`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tubeSettings.neonTubeSize === "custom" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Custom Diameter</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">Outer diameter of the neon tube profile</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                {tubeSettings.neonTubeDiameter}mm
              </span>
            </div>
            <Slider
              data-testid="slider-tube-diameter"
              value={[tubeSettings.neonTubeDiameter]}
              onValueChange={([value]) => setTubeSettings({ 
                neonTubeDiameter: value,
                filamentDiameter: value 
              })}
              min={6}
              max={20}
              step={1}
              className="py-2"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Wall Thickness</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">Thickness of base walls for structural strength</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {tubeSettings.wallThickness}mm
            </span>
          </div>
          <Slider
            data-testid="slider-wall-thickness"
            value={[tubeSettings.wallThickness]}
            onValueChange={([value]) => setTubeSettings({ wallThickness: value })}
            min={1}
            max={5}
            step={0.5}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Wall Height</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">Height of base walls - determines how deep the light sits</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {tubeSettings.wallHeight}mm
            </span>
          </div>
          <Slider
            data-testid="slider-wall-height"
            value={[tubeSettings.wallHeight]}
            onValueChange={([value]) => setTubeSettings({ wallHeight: value })}
            min={5}
            max={30}
            step={1}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Tube Width</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">Overall width of the neon tube profile</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {tubeSettings.tubeWidth}mm
            </span>
          </div>
          <Slider
            data-testid="slider-tube-width"
            value={[tubeSettings.tubeWidth]}
            onValueChange={([value]) => setTubeSettings({ tubeWidth: value })}
            min={15}
            max={50}
            step={1}
            className="py-2"
          />
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Continuous Path</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect all letters for single wire run
              </p>
            </div>
            <Switch
              data-testid="switch-continuous-path"
              checked={tubeSettings.continuousPath}
              onCheckedChange={(checked) => setTubeSettings({ continuousPath: checked })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Diffuser Cap</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add snap-on diffuser overlay
            </p>
          </div>
          <Switch
            data-testid="switch-overlay"
            checked={tubeSettings.enableOverlay}
            onCheckedChange={(checked) => setTubeSettings({ enableOverlay: checked })}
          />
        </div>

        {tubeSettings.enableOverlay && (
          <div className="space-y-2 pl-2 border-l-2 border-muted">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Cap Thickness</Label>
              <span className="text-sm font-mono text-muted-foreground">
                {tubeSettings.overlayThickness}mm
              </span>
            </div>
            <Slider
              data-testid="slider-overlay-thickness"
              value={[tubeSettings.overlayThickness]}
              onValueChange={([value]) => setTubeSettings({ overlayThickness: value })}
              min={1}
              max={5}
              step={0.5}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              Thicker caps = more diffusion, softer glow
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
