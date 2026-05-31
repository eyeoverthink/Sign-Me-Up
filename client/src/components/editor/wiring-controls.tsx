import { Cable, Circle, Lightbulb } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { wiringChannelTypes, type WiringChannelType } from "@shared/schema";
import { useEditorStore } from "@/lib/editor-store";

const channelDescriptions: Record<WiringChannelType, string> = {
  none: "No wiring channel",
  center: "Channel runs through the center",
  back: "Channel on the back surface",
  ws2812b: "WS2812B LED strip channel (10-12mm wide)",
  filament: "Filament/neon light channel",
  custom: "Custom channel placement",
};

export function WiringControls() {
  const { wiringSettings, setWiringSettings } = useEditorStore();

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Cable className="h-4 w-4" />
          Wiring Channel
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Channel Type</Label>
          <Select
            value={wiringSettings.channelType}
            onValueChange={(value: WiringChannelType) =>
              setWiringSettings({ channelType: value })
            }
          >
            <SelectTrigger data-testid="select-channel-type" className="h-10">
              <SelectValue placeholder="Select channel type" />
            </SelectTrigger>
            <SelectContent>
              {wiringChannelTypes.map((type) => (
                <SelectItem
                  key={type}
                  value={type}
                  data-testid={`channel-option-${type}`}
                >
                  <div className="flex items-center gap-2">
                    <Circle
                      className={`h-2 w-2 ${
                        type === "none"
                          ? "text-muted-foreground"
                          : "text-primary fill-primary"
                      }`}
                    />
                    <span className="capitalize">{type}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {channelDescriptions[wiringSettings.channelType]}
          </p>
        </div>

        {wiringSettings.channelType !== "none" && (
          <>
            {(wiringSettings.channelType === "center" || wiringSettings.channelType === "back" || wiringSettings.channelType === "custom") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Channel Diameter</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {wiringSettings.channelDiameter}mm
                  </span>
                </div>
                <Slider
                  data-testid="slider-channel-diameter"
                  value={[wiringSettings.channelDiameter]}
                  onValueChange={([value]) =>
                    setWiringSettings({ channelDiameter: value })
                  }
                  min={3}
                  max={20}
                  step={0.5}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Fits wires up to{" "}
                  {(wiringSettings.channelDiameter * 0.8).toFixed(1)}mm
                </p>
              </div>
            )}

            {wiringSettings.channelType === "ws2812b" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Strip Width</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {wiringSettings.channelWidth || 12}mm
                    </span>
                  </div>
                  <Slider
                    data-testid="slider-channel-width"
                    value={[wiringSettings.channelWidth || 12]}
                    onValueChange={([value]) =>
                      setWiringSettings({ channelWidth: value })
                    }
                    min={8}
                    max={20}
                    step={0.5}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    WS2812B strips are typically 10-12mm wide
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Strip Thickness</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {wiringSettings.channelDepth}mm
                    </span>
                  </div>
                  <Slider
                    data-testid="slider-channel-depth"
                    value={[wiringSettings.channelDepth]}
                    onValueChange={([value]) =>
                      setWiringSettings({ channelDepth: value })
                    }
                    min={2}
                    max={10}
                    step={0.5}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical LED strip thickness: 3-5mm
                  </p>
                </div>
              </>
            )}

            {wiringSettings.channelType === "filament" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Tube Diameter</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {wiringSettings.channelDiameter}mm
                  </span>
                </div>
                <Slider
                  data-testid="slider-filament-diameter"
                  value={[wiringSettings.channelDiameter]}
                  onValueChange={([value]) =>
                    setWiringSettings({ channelDiameter: value })
                  }
                  min={5}
                  max={20}
                  step={0.5}
                  className="py-2"
                />
                <p className="text-xs text-muted-foreground">
                  Filament/neon tubes are typically 8-15mm diameter
                </p>
              </div>
            )}

            {(wiringSettings.channelType === "center" || wiringSettings.channelType === "back" || wiringSettings.channelType === "custom") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Channel Depth</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {wiringSettings.channelDepth}mm
                  </span>
                </div>
                <Slider
                  data-testid="slider-channel-depth"
                  value={[wiringSettings.channelDepth]}
                  onValueChange={([value]) =>
                    setWiringSettings({ channelDepth: value })
                  }
                  min={0}
                  max={100}
                  step={1}
                  className="py-2"
                />
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    LED Channel Tips
                  </p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>WS2812B strips: 10-12mm wide channels</li>
                    <li>Filament/neon: 8-15mm round channels</li>
                    <li>Leave extra room for connectors</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
