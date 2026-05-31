import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Type, Layers, Cable, CircleDot, Settings2, Download, Cylinder, Pencil } from "lucide-react";
import { TextControls } from "./text-controls";
import { GeometryControls } from "./geometry-controls";
import { WiringControls } from "./wiring-controls";
import { MountingControls } from "./mounting-controls";
import { ViewControls } from "./view-controls";
import { ExportPanel } from "./export-panel";
import { TubeControls } from "./tube-controls";
import { SketchControls } from "./sketch-controls";
import { useEditorStore } from "@/lib/editor-store";

export function EditorSidebar() {
  const { geometrySettings } = useEditorStore();
  const isOutlineMode = geometrySettings.mode === "outline";

  return (
    <div className="w-80 border-r bg-sidebar flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Controls</h2>
        <p className="text-sm text-muted-foreground">
          Customize your 3D signage
        </p>
      </div>

      <Tabs defaultValue="text" className="flex-1 flex flex-col">
        <TabsList className={`grid w-full p-1 m-2 bg-muted/50 ${isOutlineMode ? 'grid-cols-8' : 'grid-cols-6'}`}>
          <TabsTrigger
            value="text"
            className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
            data-testid="tab-text"
          >
            <Type className="h-3.5 w-3.5" />
            <span className="text-[9px]">Text</span>
          </TabsTrigger>
          <TabsTrigger
            value="geometry"
            className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
            data-testid="tab-geometry"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="text-[9px]">Shape</span>
          </TabsTrigger>
          <TabsTrigger
            value="wiring"
            className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
            data-testid="tab-wiring"
          >
            <Cable className="h-3.5 w-3.5" />
            <span className="text-[9px]">Wiring</span>
          </TabsTrigger>
          <TabsTrigger
            value="mounting"
            className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
            data-testid="tab-mounting"
          >
            <CircleDot className="h-3.5 w-3.5" />
            <span className="text-[9px]">Mount</span>
          </TabsTrigger>
          <TabsTrigger
            value="view"
            className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
            data-testid="tab-view"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="text-[9px]">View</span>
          </TabsTrigger>
          <TabsTrigger
            value="export"
            className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
            data-testid="tab-export"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="text-[9px]">Export</span>
          </TabsTrigger>
          {isOutlineMode && (
            <>
              <TabsTrigger
                value="tube"
                className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
                data-testid="tab-tube"
              >
                <Cylinder className="h-3.5 w-3.5" />
                <span className="text-[9px]">Tube</span>
              </TabsTrigger>
              <TabsTrigger
                value="sketch"
                className="flex flex-col items-center gap-0.5 py-1.5 px-0.5"
                data-testid="tab-sketch"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="text-[9px]">Sketch</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="text" className="mt-0">
              <TextControls />
            </TabsContent>

            <TabsContent value="geometry" className="mt-0">
              <GeometryControls />
            </TabsContent>

            <TabsContent value="wiring" className="mt-0">
              <WiringControls />
            </TabsContent>

            <TabsContent value="mounting" className="mt-0">
              <MountingControls />
            </TabsContent>

            <TabsContent value="view" className="mt-0">
              <ViewControls />
            </TabsContent>

            <TabsContent value="export" className="mt-0">
              <ExportPanel />
            </TabsContent>

            {isOutlineMode && (
              <>
                <TabsContent value="tube" className="mt-0">
                  <TubeControls />
                </TabsContent>

                <TabsContent value="sketch" className="mt-0">
                  <SketchControls />
                </TabsContent>
              </>
            )}
          </div>
        </ScrollArea>
      </Tabs>

      <Separator />

      <div className="p-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Tip: Drag to rotate, scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}
