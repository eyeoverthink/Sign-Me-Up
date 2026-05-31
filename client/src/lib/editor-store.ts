import { create } from "zustand";
import {
  type LetterSettings,
  type GeometrySettings,
  type WiringSettings,
  type MountingSettings,
  type TubeSettings,
  type TwoPartSystem,
  type SketchPath,
  type InputMode,
  type PetTagSettings,
  type ModularShapeSettings,
  type CustomShapeSettings,
  type RetroNeonSettings,
  type LEDHolderSettings,
  type EggisonSettings,
  defaultLetterSettings,
  defaultGeometrySettings,
  defaultWiringSettings,
  defaultMountingSettings,
  defaultTubeSettings,
  defaultTwoPartSystem,
  defaultPetTagSettings,
  defaultModularShapeSettings,
  defaultCustomShapeSettings,
  defaultRetroNeonSettings,
  defaultLEDHolderSettings,
  defaultEggisonSettings,
} from "@shared/schema";

interface EditorState {
  letterSettings: LetterSettings;
  geometrySettings: GeometrySettings;
  wiringSettings: WiringSettings;
  mountingSettings: MountingSettings;
  tubeSettings: TubeSettings;
  twoPartSystem: TwoPartSystem;
  petTagSettings: PetTagSettings;
  modularShapeSettings: ModularShapeSettings;
  customShapeSettings: CustomShapeSettings;
  retroNeonSettings: RetroNeonSettings;
  ledHolderSettings: LEDHolderSettings;
  eggisonSettings: EggisonSettings;
  sketchPaths: SketchPath[];
  inputMode: InputMode;
  uploadedImageData: string | null;
  tracedPaths: SketchPath[];
  showGrid: boolean;
  showWireframe: boolean;
  showMeasurements: boolean;
  isExporting: boolean;
  isDrawing: boolean;
  setLetterSettings: (settings: Partial<LetterSettings>) => void;
  setGeometrySettings: (settings: Partial<GeometrySettings>) => void;
  setWiringSettings: (settings: Partial<WiringSettings>) => void;
  setMountingSettings: (settings: Partial<MountingSettings>) => void;
  setTubeSettings: (settings: Partial<TubeSettings>) => void;
  setTwoPartSystem: (settings: Partial<TwoPartSystem>) => void;
  setPetTagSettings: (settings: Partial<PetTagSettings>) => void;
  setModularShapeSettings: (settings: Partial<ModularShapeSettings>) => void;
  setCustomShapeSettings: (settings: Partial<CustomShapeSettings>) => void;
  setRetroNeonSettings: (settings: Partial<RetroNeonSettings>) => void;
  setLEDHolderSettings: (settings: Partial<LEDHolderSettings>) => void;
  setEggisonSettings: (settings: Partial<EggisonSettings>) => void;
  setSketchPaths: (paths: SketchPath[]) => void;
  addSketchPath: (path: SketchPath) => void;
  removeSketchPath: (id: string) => void;
  setInputMode: (mode: InputMode) => void;
  setUploadedImageData: (data: string | null) => void;
  setTracedPaths: (paths: SketchPath[]) => void;
  setShowGrid: (show: boolean) => void;
  setShowWireframe: (show: boolean) => void;
  setShowMeasurements: (show: boolean) => void;
  setIsExporting: (exporting: boolean) => void;
  setIsDrawing: (drawing: boolean) => void;
  resetAll: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  letterSettings: defaultLetterSettings,
  geometrySettings: { ...defaultGeometrySettings, mode: "outline", enableBacking: false },
  wiringSettings: defaultWiringSettings,
  mountingSettings: defaultMountingSettings,
  tubeSettings: defaultTubeSettings,
  twoPartSystem: defaultTwoPartSystem,
  petTagSettings: defaultPetTagSettings,
  modularShapeSettings: defaultModularShapeSettings,
  customShapeSettings: defaultCustomShapeSettings,
  retroNeonSettings: defaultRetroNeonSettings,
  ledHolderSettings: defaultLEDHolderSettings,
  eggisonSettings: defaultEggisonSettings,
  sketchPaths: [],
  inputMode: "text",
  uploadedImageData: null,
  tracedPaths: [],
  showGrid: true,
  showWireframe: false,
  showMeasurements: true,
  isExporting: false,
  isDrawing: false,
  setLetterSettings: (settings) =>
    set((state) => ({
      letterSettings: { ...state.letterSettings, ...settings },
    })),
  setGeometrySettings: (settings) =>
    set((state) => ({
      geometrySettings: { ...state.geometrySettings, ...settings },
    })),
  setWiringSettings: (settings) =>
    set((state) => ({
      wiringSettings: { ...state.wiringSettings, ...settings },
    })),
  setMountingSettings: (settings) =>
    set((state) => ({
      mountingSettings: { ...state.mountingSettings, ...settings },
    })),
  setTubeSettings: (settings) =>
    set((state) => ({
      tubeSettings: { ...state.tubeSettings, ...settings },
    })),
  setTwoPartSystem: (settings) =>
    set((state) => ({
      twoPartSystem: { ...state.twoPartSystem, ...settings },
    })),
  setPetTagSettings: (settings) =>
    set((state) => ({
      petTagSettings: { ...state.petTagSettings, ...settings },
    })),
  setModularShapeSettings: (settings) =>
    set((state) => ({
      modularShapeSettings: { ...state.modularShapeSettings, ...settings },
    })),
  setCustomShapeSettings: (settings) =>
    set((state) => ({
      customShapeSettings: { ...state.customShapeSettings, ...settings },
    })),
  setRetroNeonSettings: (settings) =>
    set((state) => ({
      retroNeonSettings: { ...state.retroNeonSettings, ...settings },
    })),
  setLEDHolderSettings: (settings) =>
    set((state) => ({
      ledHolderSettings: { ...state.ledHolderSettings, ...settings },
    })),
  setEggisonSettings: (settings) =>
    set((state) => ({
      eggisonSettings: { ...state.eggisonSettings, ...settings },
    })),
  setSketchPaths: (paths) => set({ sketchPaths: paths }),
  addSketchPath: (path) =>
    set((state) => ({
      sketchPaths: [...state.sketchPaths, path],
    })),
  removeSketchPath: (id) =>
    set((state) => ({
      sketchPaths: state.sketchPaths.filter((p) => p.id !== id),
    })),
  setInputMode: (mode) => set({ inputMode: mode }),
  setUploadedImageData: (data) => set({ uploadedImageData: data }),
  setTracedPaths: (paths) => set({ tracedPaths: paths }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowWireframe: (showWireframe) => set({ showWireframe }),
  setShowMeasurements: (showMeasurements) => set({ showMeasurements }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  resetAll: () =>
    set({
      letterSettings: defaultLetterSettings,
      geometrySettings: { ...defaultGeometrySettings, mode: "outline", enableBacking: false },
      wiringSettings: defaultWiringSettings,
      mountingSettings: defaultMountingSettings,
      tubeSettings: defaultTubeSettings,
      twoPartSystem: defaultTwoPartSystem,
      petTagSettings: defaultPetTagSettings,
      modularShapeSettings: defaultModularShapeSettings,
      customShapeSettings: defaultCustomShapeSettings,
      retroNeonSettings: defaultRetroNeonSettings,
      ledHolderSettings: defaultLEDHolderSettings,
      eggisonSettings: defaultEggisonSettings,
      sketchPaths: [],
      inputMode: "text",
      uploadedImageData: null,
      tracedPaths: [],
      showGrid: true,
      showWireframe: false,
      showMeasurements: true,
      isDrawing: false,
    }),
}));
