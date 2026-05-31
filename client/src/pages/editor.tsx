import { Canvas3D } from "@/components/editor/canvas-3d";
import { DrawingCanvas } from "@/components/editor/drawing-canvas";
import { ImageTracer } from "@/components/editor/image-tracer";
import { PetTagEditor } from "@/components/editor/pet-tag-editor";
import { ModularShapesEditor } from "@/components/editor/modular-shapes-editor";
import { CustomShapesEditor } from "@/components/editor/custom-shapes-editor";
import { RetroNeonEditor } from "@/components/editor/retro-neon-editor";
import { LEDHolderEditor } from "@/components/editor/led-holder-editor";
import { EggisonEditor } from "@/components/editor/eggison-editor";
import { LEDGridEditor } from "@/components/editor/led-grid-editor";
import { CustomFontSignEditor } from "@/components/editor/custom-font-sign-editor";
import { LightBoxEditor } from "@/components/editor/light-box-editor";
import FilamentShapeEditor from "@/components/editor/filament-shape-editor";
import AnimationSequenceEditor from "@/components/editor/animation-sequence-editor";
import HolographicPanelEditor from "@/components/editor/holographic-panel-editor";
// import LithophaneEditor from "@/components/editor/lithophane-editor";
import PhraseDesigner from "@/components/editor/phrase-designer";
import { LEDMagneticHolderEditor } from "@/components/editor/led-magnetic-holder-editor";
import { HexPanelEditor } from "@/components/editor/hex-panel-editor";
import { LEDChannelEditor } from "@/components/editor/led-channel-editor";
import SymbolSignEditor from "@/components/editor/symbol-sign-editor";
import ComboSignEditor from "@/components/editor/combo-sign-editor";
import ImageSignEditor from "@/components/editor/image-sign-editor";
import MyExportsManager from "@/components/editor/my-exports-manager";
import ScottLaboratory from "@/components/editor/scott-laboratory";
import LEDKeychainEditor from "@/components/editor/led-keychain-editor";
// import TopographyEditor from "@/components/editor/topography-editor";
import CityLightboxEditor from "@/components/editor/city-lightbox-editor";
// import { GeoBoxLabEditor } from "@/components/editor/geobox-lab-editor";
// import ArtWallEditor from "@/components/editor/art-wall-editor";
import { LayeredLightboxEditor } from "@/components/editor/layered-lightbox-editor";
import UniverseEditor from "@/components/editor/universe-editor";
import OracleEditor from "@/components/editor/oracle-editor";
import { ToolDock } from "@/components/editor/tool-dock";
import { SettingsPanel } from "@/components/editor/settings-panel";
import { ExportPanel } from "@/components/editor/export-panel";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function Editor() {
  const { inputMode, resetAll } = useEditorStore();
  const [showSettings, setShowSettings] = useState(true);
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-12 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">SignCraft 3D</h1>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            Neon Sign Generator
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            data-testid="button-reset"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowExport(!showExport)}
            data-testid="button-export-toggle"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ToolDock />

        <main className="flex-1 relative">
          <div className="absolute inset-0 bg-muted/30">
            {inputMode === "draw" && <DrawingCanvas />}
            {inputMode === "image" && <ImageTracer />}
            {inputMode === "text" && <Canvas3D />}
            {inputMode === "pettag" && <PetTagEditor />}
            {inputMode === "modular" && <ModularShapesEditor />}
            {inputMode === "custom" && <CustomShapesEditor />}
            {inputMode === "retro" && <RetroNeonEditor />}
            {inputMode === "ledholder" && <LEDHolderEditor />}
            {inputMode === "eggison" && <EggisonEditor />}
            {inputMode === "ledgrid" && <LEDGridEditor />}
            {inputMode === "customfont" && <CustomFontSignEditor />}
            {inputMode === "lightbox" && <LightBoxEditor />}
            {inputMode === "filamentshape" && <FilamentShapeEditor />}
            {inputMode === "animation" && <AnimationSequenceEditor />}
            {inputMode === "holographic" && <HolographicPanelEditor />}
            {/* {inputMode === "lithophane" && <LithophaneEditor />} */}
            {inputMode === "phrase" && <PhraseDesigner />}
            {inputMode === "ledmagnetic" && <LEDMagneticHolderEditor />}
            {inputMode === "hexpanel" && <HexPanelEditor />}
            {inputMode === "ledchannel" && <LEDChannelEditor />}
            {inputMode === "symbolsign" && <SymbolSignEditor />}
            {inputMode === "combosign" && <ComboSignEditor />}
            {inputMode === "imagesign" && <ImageSignEditor />}
            {inputMode === "myexports" && <MyExportsManager />}
            {inputMode === "scottlab" && <ScottLaboratory />}
            {inputMode === "ledkeychain" && <LEDKeychainEditor />}
            {/* {inputMode === "topography" && <TopographyEditor />} */}
            {inputMode === "citylightbox" && <CityLightboxEditor />}
            {/* {inputMode === "geoboxlab" && <GeoBoxLabEditor />} */}
            {/* {inputMode === "artwall" && <ArtWallEditor />} */}
            {inputMode === "layeredbox" && <LayeredLightboxEditor />}
            {inputMode === "universe" && <UniverseEditor />}
            {inputMode === "oracle" && <OracleEditor />}
          </div>
          
          {inputMode !== "pettag" && inputMode !== "modular" && inputMode !== "custom" && inputMode !== "retro" && inputMode !== "ledholder" && inputMode !== "eggison" && inputMode !== "ledgrid" && inputMode !== "customfont" && inputMode !== "lightbox" && inputMode !== "filamentshape" && inputMode !== "animation" && inputMode !== "holographic" && /* inputMode !== "lithophane" && */ inputMode !== "phrase" && inputMode !== "ledmagnetic" && inputMode !== "hexpanel" && inputMode !== "ledchannel" && inputMode !== "symbolsign" && inputMode !== "combosign" && inputMode !== "imagesign" && inputMode !== "myexports" && inputMode !== "scottlab" && inputMode !== "ledkeychain" && /* inputMode !== "topography" && */ inputMode !== "citylightbox" && /* inputMode !== "geoboxlab" && */ /* inputMode !== "artwall" && */ inputMode !== "layeredbox" && inputMode !== "universe" && inputMode !== "oracle" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 border shadow-lg">
              <p className="text-xs text-muted-foreground">
                {inputMode === "text" && "Type your text, then adjust settings on the right"}
                {inputMode === "draw" && "Draw on canvas - your strokes become neon tubes"}
                {inputMode === "image" && "Upload an image to trace into bubble letter style"}
              </p>
            </div>
          )}
        </main>

        {showSettings && !showExport && inputMode !== "pettag" && inputMode !== "modular" && inputMode !== "custom" && inputMode !== "retro" && inputMode !== "ledholder" && inputMode !== "eggison" && inputMode !== "ledgrid" && inputMode !== "customfont" && inputMode !== "lightbox" && inputMode !== "filamentshape" && inputMode !== "animation" && inputMode !== "holographic" && /* inputMode !== "lithophane" && */ inputMode !== "phrase" && inputMode !== "ledmagnetic" && inputMode !== "hexpanel" && inputMode !== "ledchannel" && inputMode !== "symbolsign" && inputMode !== "combosign" && inputMode !== "imagesign" && inputMode !== "myexports" && inputMode !== "scottlab" && inputMode !== "ledkeychain" && /* inputMode !== "topography" && */ inputMode !== "citylightbox" && /* inputMode !== "geoboxlab" && */ /* inputMode !== "artwall" && */ inputMode !== "layeredbox" && inputMode !== "universe" && inputMode !== "oracle" && <SettingsPanel />}
        {showExport && inputMode !== "pettag" && inputMode !== "modular" && inputMode !== "custom" && inputMode !== "retro" && inputMode !== "ledholder" && inputMode !== "eggison" && inputMode !== "ledgrid" && inputMode !== "customfont" && inputMode !== "lightbox" && inputMode !== "filamentshape" && inputMode !== "animation" && inputMode !== "holographic" && /* inputMode !== "lithophane" && */ inputMode !== "phrase" && inputMode !== "ledmagnetic" && inputMode !== "hexpanel" && inputMode !== "ledchannel" && inputMode !== "symbolsign" && inputMode !== "combosign" && inputMode !== "imagesign" && inputMode !== "myexports" && inputMode !== "scottlab" && inputMode !== "ledkeychain" && /* inputMode !== "topography" && */ inputMode !== "citylightbox" && /* inputMode !== "geoboxlab" && */ /* inputMode !== "artwall" && */ inputMode !== "layeredbox" && inputMode !== "universe" && inputMode !== "oracle" && (
          <div className="w-80 border-l bg-sidebar p-4">
            <ExportPanel />
          </div>
        )}
      </div>
    </div>
  );
}
