import { useState } from "react";
import { Type, RotateCcw, Lightbulb, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { baseTemplates } from "@shared/schema";
import { useEditorStore } from "@/lib/editor-store";
import { FontSelector, type UploadedFont } from "@/components/shared/FontSelector";

export function TextControls() {
  const { letterSettings, setLetterSettings } = useEditorStore();
  const [selectedFontFile, setSelectedFontFile] = useState(letterSettings.fontId || '');
  const [uploadedFont, setUploadedFont] = useState<UploadedFont | null>(null);

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Type className="h-4 w-4" />
          Text & Font
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Base Template</Label>
          <Select
            value={letterSettings.templateId || "none"}
            onValueChange={(value) => setLetterSettings({ templateId: value })}
          >
            <SelectTrigger data-testid="select-template" className="h-10">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {baseTemplates.map((template) => (
                <SelectItem
                  key={template.id}
                  value={template.id}
                  data-testid={`template-option-${template.id}`}
                >
                  <div className="flex flex-col">
                    <span>{template.name}</span>
                    <span className="text-xs text-muted-foreground">{template.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {letterSettings.templateId && letterSettings.templateId !== "none" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                window.open(`/api/templates/${letterSettings.templateId}/download`, "_blank");
              }}
              data-testid="button-download-template"
            >
              <Download className="h-3 w-3 mr-2" />
              Download Template STL
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-input" className="text-sm font-medium">
            Letter / Text
          </Label>
          <Input
            id="text-input"
            data-testid="input-text"
            value={letterSettings.text}
            onChange={(e) =>
              setLetterSettings({ text: e.target.value.slice(0, 10) })
            }
            placeholder="Enter letter(s)"
            className="font-mono text-lg h-12 text-center"
            maxLength={10}
          />
          <p className="text-xs text-muted-foreground text-right">
            {letterSettings.text.length}/10 characters
          </p>
        </div>

        <FontSelector
          selectedFont={selectedFontFile}
          onFontSelect={(fontFile, familyName) => {
            setSelectedFontFile(fontFile);
            if (familyName) {
              setLetterSettings({ fontId: familyName });
            }
          }}
          uploadedFont={uploadedFont}
          onFontUpload={setUploadedFont}
          showPreview={true}
          previewCharacter={letterSettings.text?.slice(0, 2) || "Aa"}
          compact={true}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Depth</Label>
            <span className="text-sm font-mono text-muted-foreground">
              {letterSettings.depth}mm
            </span>
          </div>
          <Slider
            data-testid="slider-depth"
            value={[letterSettings.depth]}
            onValueChange={([value]) => setLetterSettings({ depth: value })}
            min={5}
            max={100}
            step={1}
            className="py-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Scale</Label>
            <span className="text-sm font-mono text-muted-foreground">
              {letterSettings.scale.toFixed(1)}x
            </span>
          </div>
          <Slider
            data-testid="slider-scale"
            value={[letterSettings.scale]}
            onValueChange={([value]) => setLetterSettings({ scale: value })}
            min={0.1}
            max={5}
            step={0.1}
            className="py-2"
          />
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="bevel-toggle" className="text-sm font-medium">
              Bevel Edges
            </Label>
            <Switch
              id="bevel-toggle"
              data-testid="switch-bevel"
              checked={letterSettings.bevelEnabled}
              onCheckedChange={(checked) =>
                setLetterSettings({ bevelEnabled: checked })
              }
            />
          </div>

          {letterSettings.bevelEnabled && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Bevel Thickness
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {letterSettings.bevelThickness}mm
                  </span>
                </div>
                <Slider
                  data-testid="slider-bevel-thickness"
                  value={[letterSettings.bevelThickness]}
                  onValueChange={([value]) =>
                    setLetterSettings({ bevelThickness: value })
                  }
                  min={0}
                  max={10}
                  step={0.5}
                  className="py-1"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Bevel Size
                  </Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {letterSettings.bevelSize}mm
                  </span>
                </div>
                <Slider
                  data-testid="slider-bevel-size"
                  value={[letterSettings.bevelSize]}
                  onValueChange={([value]) =>
                    setLetterSettings({ bevelSize: value })
                  }
                  min={0}
                  max={5}
                  step={0.25}
                  className="py-1"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <Label htmlFor="diffuser-toggle" className="text-sm font-medium">
                Light Diffuser Bevel
              </Label>
            </div>
            <Switch
              id="diffuser-toggle"
              data-testid="switch-diffuser"
              checked={letterSettings.lightDiffuserBevel || false}
              onCheckedChange={(checked) =>
                setLetterSettings({ lightDiffuserBevel: checked })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Adds angled edges to help diffuse LED light evenly
          </p>

          {letterSettings.lightDiffuserBevel && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Diffuser Angle
                </Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {letterSettings.diffuserBevelAngle || 45}°
                </span>
              </div>
              <Slider
                data-testid="slider-diffuser-angle"
                value={[letterSettings.diffuserBevelAngle || 45]}
                onValueChange={([value]) =>
                  setLetterSettings({ diffuserBevelAngle: value })
                }
                min={15}
                max={60}
                step={5}
                className="py-1"
              />
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() =>
            setLetterSettings({
              text: "A",
              fontId: "inter",
              depth: 20,
              scale: 1,
              bevelEnabled: true,
              bevelThickness: 2,
              bevelSize: 1,
              templateId: "none",
              lightDiffuserBevel: false,
              diffuserBevelAngle: 45,
            })
          }
          data-testid="button-reset-text"
        >
          <RotateCcw className="h-3 w-3 mr-2" />
          Reset Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
