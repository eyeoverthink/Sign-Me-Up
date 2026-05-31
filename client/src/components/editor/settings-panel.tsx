import { useEditorStore } from "@/lib/editor-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { fontOptions } from "@shared/schema";
import { Upload, FlipHorizontal2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";

export function SettingsPanel() {
  const {
    inputMode,
    letterSettings,
    setLetterSettings,
    tubeSettings,
    setTubeSettings,
    twoPartSystem,
    setTwoPartSystem,
    geometrySettings,
    setGeometrySettings,
    setUploadedImageData,
  } = useEditorStore();

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImageData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [setUploadedImageData]);

  const isFilament = tubeSettings.channelType === "filament";

  return (
    <div className="w-72 border-l bg-sidebar flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Settings</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Configure your neon sign
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {inputMode === "text" && (
            <section className="space-y-4">
              <h3 className="text-sm font-medium">Text Input</h3>
              
              <div className="space-y-2">
                <Label>Your Text</Label>
                <div className="flex gap-2">
                  <Input
                    value={letterSettings.text}
                    onChange={(e) => setLetterSettings({ text: e.target.value })}
                    placeholder="Type here..."
                    data-testid="input-text"
                    className="text-lg flex-1"
                  />
                  <EmojiPicker 
                    onSelect={(emoji) => setLetterSettings({ text: letterSettings.text + emoji })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter any text - no character limit
                </p>
              </div>

              <div className="space-y-2">
                <Label>Font Style</Label>
                <Select
                  value={letterSettings.fontId}
                  onValueChange={(value) => setLetterSettings({ fontId: value })}
                >
                  <SelectTrigger data-testid="select-font">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font.id} value={font.id}>
                        {font.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Size</Label>
                  <span className="text-xs text-muted-foreground">{letterSettings.scale.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[letterSettings.scale]}
                  onValueChange={([v]) => setLetterSettings({ scale: v })}
                  min={0.5}
                  max={3}
                  step={0.1}
                  data-testid="slider-scale"
                />
              </div>
            </section>
          )}

          {inputMode === "image" && (
            <section className="space-y-4">
              <h3 className="text-sm font-medium">Image Upload</h3>
              
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Upload handwriting or drawing
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload-input"
                  data-testid="input-image-upload"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                  data-testid="button-choose-image"
                >
                  Choose Image
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Your image will be traced into bubble letter style paths
              </p>
            </section>
          )}

          {inputMode === "draw" && (
            <section className="space-y-4">
              <h3 className="text-sm font-medium">Drawing Tools</h3>
              <p className="text-sm text-muted-foreground">
                Draw directly on the canvas. Your strokes will become neon tube paths.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => useEditorStore.getState().setSketchPaths([])}
                data-testid="button-clear-drawing"
              >
                Clear Drawing
              </Button>
            </section>
          )}

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Tube Settings</h3>
            
            <div className="space-y-2">
              <Label>Light Type</Label>
              <Select
                value={tubeSettings.channelType}
                onValueChange={(value: "led_strip" | "filament") => 
                  setTubeSettings({ channelType: value })
                }
              >
                <SelectTrigger data-testid="select-channel-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="led_strip">LED Strip (rectangular)</SelectItem>
                  <SelectItem value="filament">Neon/Filament (circular)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isFilament ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Tube Diameter</Label>
                  <span className="text-xs text-muted-foreground">{tubeSettings.filamentDiameter}mm</span>
                </div>
                <Slider
                  value={[tubeSettings.filamentDiameter]}
                  onValueChange={([v]) => setTubeSettings({ 
                    filamentDiameter: v, 
                    neonTubeDiameter: v,
                    neonTubeSize: `${v}mm` as any
                  })}
                  min={8}
                  max={20}
                  step={1}
                  data-testid="slider-filament-diameter"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Channel Width</Label>
                  <span className="text-xs text-muted-foreground">{tubeSettings.tubeWidth}mm</span>
                </div>
                <Slider
                  value={[tubeSettings.tubeWidth]}
                  onValueChange={([v]) => setTubeSettings({ tubeWidth: v })}
                  min={15}
                  max={50}
                  step={1}
                  data-testid="slider-tube-width"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Wall Thickness</Label>
                <span className="text-xs text-muted-foreground">{tubeSettings.wallThickness}mm</span>
              </div>
              <Slider
                value={[tubeSettings.wallThickness]}
                onValueChange={([v]) => setTubeSettings({ wallThickness: v })}
                min={1}
                max={5}
                step={0.5}
                data-testid="slider-wall-thickness"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Wall Height</Label>
                <span className="text-xs text-muted-foreground">{tubeSettings.wallHeight}mm</span>
              </div>
              <Slider
                value={[tubeSettings.wallHeight]}
                onValueChange={([v]) => setTubeSettings({ wallHeight: v })}
                min={5}
                max={30}
                step={1}
                data-testid="slider-wall-height"
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">2-Part System</h3>
              <Switch
                checked={twoPartSystem.enabled}
                onCheckedChange={(checked) => setTwoPartSystem({ enabled: checked })}
                data-testid="switch-two-part"
              />
            </div>
            
            {twoPartSystem.enabled && (
              <>
                <p className="text-xs text-muted-foreground">
                  LEGO-style snap-fit system with precision alignment
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Base Wall Height</Label>
                    <span className="text-xs text-muted-foreground">{twoPartSystem.baseWallHeight}mm</span>
                  </div>
                  <Slider
                    value={[twoPartSystem.baseWallHeight]}
                    onValueChange={([v]) => setTwoPartSystem({ baseWallHeight: v })}
                    min={5}
                    max={40}
                    step={1}
                    data-testid="slider-base-wall-height"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Cap Thickness</Label>
                    <span className="text-xs text-muted-foreground">{twoPartSystem.capThickness}mm</span>
                  </div>
                  <Slider
                    value={[twoPartSystem.capThickness]}
                    onValueChange={([v]) => setTwoPartSystem({ capThickness: v })}
                    min={1}
                    max={5}
                    step={0.5}
                    data-testid="slider-cap-thickness"
                  />
                </div>

                <Separator className="my-3" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Snap-Fit Tabs</Label>
                    <p className="text-xs text-muted-foreground">Click-fit assembly</p>
                  </div>
                  <Switch
                    checked={twoPartSystem.snapTabsEnabled ?? true}
                    onCheckedChange={(checked) => setTwoPartSystem({ snapTabsEnabled: checked })}
                    data-testid="switch-snap-tabs"
                  />
                </div>

                {twoPartSystem.snapTabsEnabled && (
                  <div className="space-y-3 pl-2 border-l-2 border-muted">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Tab Height</Label>
                        <span className="text-xs text-muted-foreground">{twoPartSystem.snapTabHeight ?? 2}mm</span>
                      </div>
                      <Slider
                        value={[twoPartSystem.snapTabHeight ?? 2]}
                        onValueChange={([v]) => setTwoPartSystem({ snapTabHeight: v })}
                        min={1}
                        max={4}
                        step={0.5}
                        data-testid="slider-snap-tab-height"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Tab Width</Label>
                        <span className="text-xs text-muted-foreground">{twoPartSystem.snapTabWidth ?? 4}mm</span>
                      </div>
                      <Slider
                        value={[twoPartSystem.snapTabWidth ?? 4]}
                        onValueChange={([v]) => setTwoPartSystem({ snapTabWidth: v })}
                        min={2}
                        max={8}
                        step={1}
                        data-testid="slider-snap-tab-width"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Tab Spacing</Label>
                        <span className="text-xs text-muted-foreground">{twoPartSystem.snapTabSpacing ?? 25}mm</span>
                      </div>
                      <Slider
                        value={[twoPartSystem.snapTabSpacing ?? 25]}
                        onValueChange={([v]) => setTwoPartSystem({ snapTabSpacing: v })}
                        min={10}
                        max={50}
                        step={5}
                        data-testid="slider-snap-tab-spacing"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Registration Pins</Label>
                    <p className="text-xs text-muted-foreground">Perfect alignment</p>
                  </div>
                  <Switch
                    checked={twoPartSystem.registrationPinsEnabled ?? true}
                    onCheckedChange={(checked) => setTwoPartSystem({ registrationPinsEnabled: checked })}
                    data-testid="switch-registration-pins"
                  />
                </div>

                {twoPartSystem.registrationPinsEnabled && (
                  <div className="space-y-3 pl-2 border-l-2 border-muted">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Pin Diameter</Label>
                        <span className="text-xs text-muted-foreground">{twoPartSystem.pinDiameter ?? 2.5}mm</span>
                      </div>
                      <Slider
                        value={[twoPartSystem.pinDiameter ?? 2.5]}
                        onValueChange={([v]) => setTwoPartSystem({ pinDiameter: v })}
                        min={1.5}
                        max={4}
                        step={0.5}
                        data-testid="slider-pin-diameter"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Pin Height</Label>
                        <span className="text-xs text-muted-foreground">{twoPartSystem.pinHeight ?? 3}mm</span>
                      </div>
                      <Slider
                        value={[twoPartSystem.pinHeight ?? 3]}
                        onValueChange={([v]) => setTwoPartSystem({ pinHeight: v })}
                        min={2}
                        max={6}
                        step={0.5}
                        data-testid="slider-pin-height"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs">Pin Spacing</Label>
                        <span className="text-xs text-muted-foreground">{twoPartSystem.pinSpacing ?? 30}mm</span>
                      </div>
                      <Slider
                        value={[twoPartSystem.pinSpacing ?? 30]}
                        onValueChange={([v]) => setTwoPartSystem({ pinSpacing: v })}
                        min={15}
                        max={60}
                        step={5}
                        data-testid="slider-pin-spacing"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Diffusion Ribs</Label>
                    <p className="text-xs text-muted-foreground">Even light spread</p>
                  </div>
                  <Switch
                    checked={twoPartSystem.diffusionRibsEnabled ?? true}
                    onCheckedChange={(checked) => setTwoPartSystem({ diffusionRibsEnabled: checked })}
                    data-testid="switch-diffusion-ribs"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Cable Channels</Label>
                    <p className="text-xs text-muted-foreground">Wire routing</p>
                  </div>
                  <Switch
                    checked={twoPartSystem.cableChannelEnabled ?? true}
                    onCheckedChange={(checked) => setTwoPartSystem({ cableChannelEnabled: checked })}
                    data-testid="switch-cable-channel"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Print Tolerance</Label>
                    <span className="text-xs text-muted-foreground">{twoPartSystem.snapTolerance ?? 0.2}mm</span>
                  </div>
                  <Slider
                    value={[twoPartSystem.snapTolerance ?? 0.2]}
                    onValueChange={([v]) => setTwoPartSystem({ snapTolerance: v })}
                    min={0.1}
                    max={0.5}
                    step={0.05}
                    data-testid="slider-snap-tolerance"
                  />
                  <p className="text-xs text-muted-foreground">
                    Adjust for your 3D printer accuracy
                  </p>
                </div>
              </>
            )}
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-sm font-medium">Export Options</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlipHorizontal2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs">Mirror (Flip)</Label>
                  <p className="text-xs text-muted-foreground">For back-lit mounting</p>
                </div>
              </div>
              <Switch
                checked={geometrySettings.mirrorX || false}
                onCheckedChange={(checked) => setGeometrySettings({ mirrorX: checked })}
                data-testid="switch-mirror-x"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs">Diffuser Cap</Label>
                  <p className="text-xs text-muted-foreground">Snap-on lid for light diffusion</p>
                </div>
              </div>
              <Switch
                checked={geometrySettings.generateDiffuserCap || false}
                onCheckedChange={(checked) => setGeometrySettings({ generateDiffuserCap: checked })}
                data-testid="switch-diffuser-cap"
              />
            </div>
            
            {geometrySettings.generateDiffuserCap && (
              <p className="text-xs text-muted-foreground pl-6">
                Print cap in translucent filament for best light diffusion
              </p>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
