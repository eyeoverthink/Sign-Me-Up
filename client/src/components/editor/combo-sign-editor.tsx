import { useState, useMemo, Suspense, Component, type ReactNode, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FontPreviewSelect } from "@/components/font-preview-select";
import { FontLegend } from "@/components/font-legend";
import { 
  Download, Type, Blend, Frame, Cable, Layers, AlertTriangle, Loader2, 
  Heart, Skull, Sparkles, Flame, Brain, Clock, ThumbsUp,
  Users, MessageCircle, Zap, Star, Coffee, Theater, Smile,
  Plus, Trash2, Save, Library, FolderHeart, Grid3X3, Search,
  Cat, Utensils, Car, Lightbulb, Flag, Hash, ExternalLink, Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EMOJI_BROWSER_CATEGORIES, getTotalEmojiCount } from "@/lib/emoji-browser-data";

interface ComboPreset {
  id: string;
  name: string;
  description: string;
  emojis: string[];
  category: string;
}

const COMBO_PRESETS: Record<string, ComboPreset[]> = {
  drama: [
    { id: "excuse-me", name: "Excuse Me?!", description: "Taking off sunglasses in shock", emojis: ["😎", "🤏", "🕶", "😳"], category: "drama" },
    { id: "popcorn-drama", name: "Here for Drama", description: "Eating popcorn watching gossip", emojis: ["🍿", "🤏", "😯"], category: "drama" },
    { id: "irish-goodbye", name: "Irish Goodbye", description: "Slowly fading away", emojis: ["😐", "😶", "😶‍🌫️", "🫥"], category: "drama" },
    { id: "sneeze-buildup", name: "ACHOO!", description: "Dramatic sneeze buildup", emojis: ["😧", "😩", "😫", "🤧"], category: "drama" },
    { id: "wait-for-me", name: "Wait For Me!", description: "Walking then sprinting", emojis: ["🚶‍♀️", "🚶‍♀️", "🏃‍♀️", "💨"], category: "drama" },
    { id: "never-mind", name: "Never Mind...", description: "Lost train of thought", emojis: ["😯", "☝️", "😐", "✊"], category: "drama" },
    { id: "not-listening", name: "Not Listening", description: "La la la can't hear you", emojis: ["👉", "🙄", "👈"], category: "drama" },
    { id: "backing-away", name: "Backing Away", description: "Slowly retreating", emojis: ["✋", "😬", "🤚"], category: "drama" },
    { id: "wig-snatched", name: "Wig Snatched", description: "Shocking revelation", emojis: ["👩", "🤏", "👩‍🦲"], category: "drama" },
    { id: "you-joke", name: "You're a Joke", description: "Pointing and laughing", emojis: ["🫵", "🤣"], category: "drama" },
    { id: "time-to-go", name: "Time to Go!", description: "Running for the exit", emojis: ["🚪", "🏃‍♀️", "💨"], category: "drama" },
    { id: "blank-stare", name: "Blank Stare", description: "The iconic mood", emojis: ["👁️", "👄", "👁️"], category: "drama" },
  ],
  flirty: [
    { id: "shy-poke", name: "Shy/Simping", description: "Nervous finger pointing", emojis: ["👉", "👈"], category: "flirty" },
    { id: "chefs-kiss", name: "Chef's Kiss", description: "Perfection", emojis: ["😚", "🤌"], category: "flirty" },
    { id: "heart-eyes", name: "Totally Smitten", description: "In love", emojis: ["😍", "💕"], category: "flirty" },
    { id: "wink-kiss", name: "Wink & Kiss", description: "Flirty combo", emojis: ["😉", "😘"], category: "flirty" },
    { id: "devil-wink", name: "Devilish Charm", description: "Up to no good", emojis: ["😈", "😏"], category: "flirty" },
    { id: "blushing", name: "You Make Me Blush", description: "Flustered", emojis: ["😳", "💗"], category: "flirty" },
    { id: "watching", name: "Eyes on You", description: "Can't look away", emojis: ["👀", "✨"], category: "flirty" },
    { id: "heart-hands", name: "Heart Hands", description: "Making a heart", emojis: ["🤲", "👐", "🫶"], category: "flirty" },
    { id: "fire-hot", name: "You're Hot", description: "Feeling the heat", emojis: ["🥵", "🔥"], category: "flirty" },
    { id: "drooling", name: "Drooling", description: "Mouth-watering", emojis: ["🤤", "😋"], category: "flirty" },
  ],
  sarcastic: [
    { id: "pseudo-intellectual", name: "Pseudo-Intellectual", description: "Read one page of a book", emojis: ["📖", "🤏", "🧐", "✨"], category: "sarcastic" },
    { id: "modern-socrates", name: "Modern Socrates", description: "Air-thin argument", emojis: ["🏛️", "🎭", "🤔", "💨"], category: "sarcastic" },
    { id: "lost-thought", name: "Lost Thought", description: "Train derailed", emojis: ["🚂", "💭", "🚫", "🧐"], category: "sarcastic" },
    { id: "enlightenment", name: "The Enlightenment", description: "Sarcastic praise", emojis: ["🧠", "💡", "✨", "🤡"], category: "sarcastic" },
    { id: "stoic-wall", name: "Stoic Wall", description: "Unmoved and cold", emojis: ["🗿", "🤌", "☕️", "🧊"], category: "sarcastic" },
    { id: "nerd-approval", name: "Ironic Approval", description: "Nerd thumbs up", emojis: ["🤓", "👍"], category: "sarcastic" },
    { id: "clown", name: "Clowning", description: "Foolish behavior", emojis: ["🤡", "🎪"], category: "sarcastic" },
    { id: "ok-guess", name: "Ok I Guess", description: "Reluctant agreement", emojis: ["😏", "🤝", "🙄"], category: "sarcastic" },
  ],
  moods: [
    { id: "dead", name: "I'm Dead", description: "From laughter/shock", emojis: ["💀", "⚰️"], category: "moods" },
    { id: "overwhelmed", name: "Overwhelmed", description: "Mind blown", emojis: ["🤯", "💥"], category: "moods" },
    { id: "cheeky", name: "Cheeky/Petty", description: "Sassy mood", emojis: ["🌚", "😌", "💅"], category: "moods" },
    { id: "slow-blink", name: "Slow Blink", description: "Processing...", emojis: ["😐", "😑", "😐"], category: "moods" },
    { id: "workday-end", name: "End of Workday", description: "Briefcase to wine", emojis: ["💼", "😩", "➡️", "🍷", "🛁"], category: "moods" },
    { id: "bags-under-eyes", name: "Burnout 2026", description: "Chronic exhaustion", emojis: ["🫩", "☕", "🫠"], category: "moods" },
    { id: "melting", name: "Melting", description: "Can't even", emojis: ["🫠", "💀"], category: "moods" },
    { id: "give-space", name: "Give Me Space", description: "Back off", emojis: ["🫷", "😣", "🫸"], category: "moods" },
    { id: "speechless", name: "Speechless", description: "No words", emojis: ["😶", "💬"], category: "moods" },
    { id: "high-five", name: "High Five!", description: "Collision", emojis: ["🫸", "💥", "🫷"], category: "moods" },
  ],
  trends2026: [
    { id: "tnt", name: "T'n'T", description: "Taylor & Travis", emojis: ["🧨", "❤️", "🏈"], category: "trends2026" },
    { id: "button-year", name: "Button Year", description: "2026 milestone tracking", emojis: ["🔘", "🔵", "✨"], category: "trends2026" },
    { id: "crying-laughing", name: "New LOL", description: "Crying = laughing now", emojis: ["😭", "😭", "😭"], category: "trends2026" },
    { id: "soft-vibe", name: "Soft Vibe", description: "Wholesome aesthetic", emojis: ["🌷", "✨", "🎧", "🍵"], category: "trends2026" },
    { id: "coastal-vibe", name: "Coastal Vibe", description: "Beachy aesthetic", emojis: ["🐚", "🧚", "☀️", "🌊"], category: "trends2026" },
    { id: "willful-ignore", name: "Didn't See That", description: "Pretending blindness", emojis: ["🕳️", "🧑‍🦯"], category: "trends2026" },
    { id: "sigma-moai", name: "Sigma Energy", description: "Deadpan stoic", emojis: ["🗿", "💪"], category: "trends2026" },
    { id: "gen-z-heart", name: "Gen Z Love", description: "Heart hands replacing heart", emojis: ["🫶", "💕"], category: "trends2026" },
  ],
  reactions: [
    { id: "sips-tea", name: "Sips Tea", description: "Watching drama unfold", emojis: ["☕️", "👌"], category: "reactions" },
    { id: "look-this", name: "LOOK at This!", description: "Pay attention", emojis: ["✨", "👀"], category: "reactions" },
    { id: "cheers", name: "Cheers!", description: "Celebration", emojis: ["🌝", "🥂", "🌝"], category: "reactions" },
    { id: "pumped", name: "Feeling Pumped", description: "Ready to go", emojis: ["💪", "😎"], category: "reactions" },
    { id: "talk-hand", name: "Talk to the Hand", description: "Dismissed", emojis: ["🙄", "🤚"], category: "reactions" },
    { id: "whats-here", name: "What's This?", description: "Confused observation", emojis: ["🫲", "🤨", "🫱"], category: "reactions" },
    { id: "flipping", name: "Flipping Out", description: "Going crazy", emojis: ["🙂", "🙃", "🙂", "✌️"], category: "reactions" },
    { id: "waking-up", name: "Waking Up", description: "Morning chaos", emojis: ["🛌", "🤺"], category: "reactions" },
    { id: "waiting", name: "Waiting...", description: "Impatient", emojis: ["🙄", "⌚️", "👞"], category: "reactions" },
    { id: "going-bed", name: "Going to Bed", description: "Time to sleep", emojis: ["🛌", "🏃‍♀️"], category: "reactions" },
  ],
  hearts: [
    { id: "pink-heart", name: "Pink Love", description: "Gentle affection", emojis: ["🩷", "✨"], category: "hearts" },
    { id: "broken-heart", name: "Heartbreak", description: "Sadness", emojis: ["💔", "😢"], category: "hearts" },
    { id: "heart-arrow", name: "Cupid's Arrow", description: "Romantic love", emojis: ["💘", "🏹"], category: "hearts" },
    { id: "heart-fire", name: "Burning Love", description: "Intense passion", emojis: ["❤️‍🔥", "🔥"], category: "hearts" },
    { id: "beating-heart", name: "Beating Heart", description: "Obsession", emojis: ["💓", "💗", "💓"], category: "hearts" },
    { id: "black-heart", name: "Dark Love", description: "Morbid affection", emojis: ["🖤", "🥀"], category: "hearts" },
    { id: "white-heart", name: "Pure Love", description: "Emotional support", emojis: ["🤍", "✨"], category: "hearts" },
    { id: "revolving-hearts", name: "Falling in Love", description: "Infatuation", emojis: ["💞", "🌀"], category: "hearts" },
    { id: "growing-heart", name: "Growing Love", description: "Love expanding", emojis: ["💗", "📈"], category: "hearts" },
  ],
};

const CATEGORY_INFO: Record<string, { label: string; icon: typeof Theater; color: string }> = {
  mylibrary: { label: "My Library", icon: FolderHeart, color: "bg-emerald-500" },
  drama: { label: "Drama", icon: Theater, color: "bg-purple-500" },
  flirty: { label: "Flirty", icon: Heart, color: "bg-pink-500" },
  sarcastic: { label: "Sarcastic", icon: Brain, color: "bg-orange-500" },
  moods: { label: "Moods", icon: Skull, color: "bg-slate-500" },
  trends2026: { label: "2026 Trends", icon: Sparkles, color: "bg-cyan-500" },
  reactions: { label: "Reactions", icon: Zap, color: "bg-yellow-500" },
  hearts: { label: "Hearts", icon: Heart, color: "bg-red-500" },
};

// Local storage key for saved combos
const SAVED_COMBOS_KEY = "signcraft_saved_combos";

// Load saved combos from localStorage
function loadSavedCombos(): ComboPreset[] {
  try {
    const saved = localStorage.getItem(SAVED_COMBOS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Failed to load saved combos:", e);
  }
  return [];
}

// Save combos to localStorage
function saveCombosToStorage(combos: ComboPreset[]) {
  try {
    localStorage.setItem(SAVED_COMBOS_KEY, JSON.stringify(combos));
  } catch (e) {
    console.warn("Failed to save combos:", e);
  }
}

interface ComboSignSettings {
  selectedCombo: ComboPreset | null;
  customEmojis: string[];
  useCustom: boolean;
  signHeight: number;
  emojiSpacing: number;
  backingEnabled: boolean;
  backingStyle: "connected" | "individual" | "strip";
  backingPadding: number;
  backingThickness: number;
  ledChannelEnabled: boolean;
  ledChannelWidth: number;
  mountingHoles: boolean;
  fontFile: string;
  fontOverride: string;
}

const defaultSettings: ComboSignSettings = {
  selectedCombo: null,
  customEmojis: [],
  useCustom: false,
  signHeight: 15,
  emojiSpacing: 5,
  backingEnabled: true,
  backingStyle: "connected",
  backingPadding: 8,
  backingThickness: 3,
  ledChannelEnabled: false,
  ledChannelWidth: 10,
  mountingHoles: true,
  fontFile: "NotoEmoji-Regular.ttf",
  fontOverride: "Noto Emoji",
};

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Component colors for path visualization
const PATH_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

// Glyph Path Visualization Component - Shows traced font paths
function GlyphPathVisualization({ 
  pathData, 
  animationStep,
  emojis
}: { 
  pathData: { paths: number[][][]; bounds: { minX: number; maxX: number; minY: number; maxY: number }; pathCount: number };
  animationStep: number;
  emojis: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pathData.paths.length) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const { minX, maxX, minY, maxY } = pathData.bounds;
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const padding = 20;
    
    const scaleX = (canvas.width - padding * 2) / width;
    const scaleY = (canvas.height - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (canvas.width - width * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - height * scale) / 2 - minY * scale;
    
    // Draw each path with different colors
    let pointIndex = 0;
    for (let p = 0; p < pathData.paths.length; p++) {
      const path = pathData.paths[p];
      const color = PATH_COLORS[p % PATH_COLORS.length];
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      
      for (let i = 0; i < path.length; i++) {
        if (pointIndex >= animationStep) break;
        
        const [x, y] = path[i];
        const screenX = x * scale + offsetX;
        const screenY = canvas.height - (y * scale + offsetY);
        
        if (i === 0) {
          ctx.moveTo(screenX, screenY);
        } else {
          ctx.lineTo(screenX, screenY);
        }
        pointIndex++;
      }
      
      ctx.stroke();
      
      // Draw points
      ctx.fillStyle = color;
      let pi = pointIndex - path.length;
      if (pi < 0) pi = 0;
      for (let i = 0; i < path.length && pi + i < animationStep; i++) {
        const [x, y] = path[i];
        const screenX = x * scale + offsetX;
        const screenY = canvas.height - (y * scale + offsetY);
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [pathData, animationStep]);
  
  return (
    <canvas 
      ref={canvasRef}
      width={300}
      height={200}
      className="rounded-lg border border-border"
      data-testid="combo-path-canvas"
    />
  );
}

function ComboPreview({ settings }: { settings: ComboSignSettings }) {
  const emojis = settings.useCustom ? settings.customEmojis : (settings.selectedCombo?.emojis || []);
  const scale = 0.01;
  
  const previewGeometry = useMemo(() => {
    if (emojis.length === 0) return null;
    
    const totalWidth = emojis.length * (settings.signHeight + settings.emojiSpacing) - settings.emojiSpacing;
    const height = settings.signHeight;
    
    return { totalWidth, height };
  }, [emojis, settings.signHeight, settings.emojiSpacing]);
  
  if (!previewGeometry) {
    return (
      <>
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry args={[1, 0.5, 0.1]} />
          <meshStandardMaterial color="#333" opacity={0.5} transparent />
        </mesh>
      </>
    );
  }
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, -3, 3]} intensity={0.5} color="#ff69b4" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <Environment preset="studio" />
      
      <Center>
        <group>
          {emojis.map((emoji, idx) => {
            const xPos = (idx - (emojis.length - 1) / 2) * (settings.signHeight + settings.emojiSpacing) * scale;
            
            return (
              <group key={idx} position={[xPos, 0, 0]}>
                <mesh castShadow>
                  <boxGeometry args={[settings.signHeight * scale, settings.signHeight * scale, settings.signHeight * 0.3 * scale]} />
                  <meshStandardMaterial 
                    color="#ff69b4"
                    emissive="#ff1493"
                    emissiveIntensity={0.3}
                    roughness={0.3}
                  />
                </mesh>
              </group>
            );
          })}
          
          {settings.backingEnabled && settings.backingStyle === "connected" && (
            <mesh position={[0, 0, -(settings.signHeight * 0.15 + settings.backingThickness * 0.5) * scale]} receiveShadow>
              <boxGeometry 
                args={[
                  (previewGeometry.totalWidth + settings.backingPadding * 2) * scale,
                  (settings.signHeight + settings.backingPadding * 2) * scale,
                  settings.backingThickness * scale
                ]} 
              />
              <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
            </mesh>
          )}
          
          {settings.backingEnabled && settings.backingStyle === "strip" && (
            <mesh position={[0, 0, -(settings.signHeight * 0.15 + settings.backingThickness * 0.5) * scale]} receiveShadow>
              <boxGeometry 
                args={[
                  (previewGeometry.totalWidth + settings.backingPadding * 2) * scale,
                  (settings.signHeight * 0.4) * scale,
                  settings.backingThickness * scale
                ]} 
              />
              <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
            </mesh>
          )}
        </group>
      </Center>
    </>
  );
}

export default function ComboSignEditor() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ComboSignSettings>(defaultSettings);
  const [activeCategory, setActiveCategory] = useState("mylibrary");
  const [customInput, setCustomInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [savedCombos, setSavedCombos] = useState<ComboPreset[]>(() => loadSavedCombos());
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [browserCategory, setBrowserCategory] = useState("smileys");
  const [browserSearch, setBrowserSearch] = useState("");
  const [browserOpen, setBrowserOpen] = useState(false);
  
  // Path trace visualization state
  const [showTrace, setShowTrace] = useState(false);
  const [pathData, setPathData] = useState<{ paths: number[][][]; bounds: { minX: number; maxX: number; minY: number; maxY: number }; pathCount: number; originalPoints: number; simplifiedPoints: number } | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  
  // Get current emojis for trace
  const currentEmojisForTrace = settings.useCustom ? settings.customEmojis : (settings.selectedCombo?.emojis || []);
  
  // Fetch glyph paths for visualization
  const fetchGlyphPaths = async () => {
    if (currentEmojisForTrace.length === 0) return;
    
    setIsLoadingTrace(true);
    try {
      const response = await apiRequest("POST", "/api/glyph-paths", {
        text: currentEmojisForTrace.join(''),
        fontFile: settings.fontFile || undefined,
        fontSize: 100
      });
      const data = await response.json();
      if (data.success) {
        setPathData(data);
        setShowTrace(true);
        setAnimationStep(0);
      }
    } catch (e) {
      console.error("Failed to fetch glyph paths:", e);
      toast({ title: "Path extraction failed", description: "Could not load font paths for visualization", variant: "destructive" });
    } finally {
      setIsLoadingTrace(false);
    }
  };
  
  // Animate trace visualization
  useEffect(() => {
    if (!showTrace || !pathData) return;
    
    const totalPoints = pathData.paths.reduce((sum, path) => sum + path.length, 0);
    if (animationStep >= totalPoints + 20) return;
    
    const timer = setTimeout(() => {
      setAnimationStep(prev => prev + 3);
    }, 16);
    
    return () => clearTimeout(timer);
  }, [showTrace, pathData, animationStep]);
  
  // Add emoji from browser to current input
  const addEmojiFromBrowser = (emoji: string) => {
    const newInput = customInput + emoji;
    handleCustomInput(newInput);
  };
  
  // Filter emojis in browser by search
  const filteredBrowserEmojis = useMemo(() => {
    const category = EMOJI_BROWSER_CATEGORIES[browserCategory as keyof typeof EMOJI_BROWSER_CATEGORIES];
    if (!category) return [];
    if (!browserSearch) return [...category.emojis];
    return category.emojis.filter((e: string) => e.includes(browserSearch));
  }, [browserCategory, browserSearch]);
  
  const updateSetting = <K extends keyof ComboSignSettings>(key: K, value: ComboSignSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const selectCombo = (combo: ComboPreset) => {
    setSettings(prev => ({
      ...prev,
      selectedCombo: combo,
      useCustom: false,
    }));
  };
  
  const handleCustomInput = (input: string) => {
    setCustomInput(input);
    const chars = Array.from(input);
    setSettings(prev => ({
      ...prev,
      customEmojis: chars,
      useCustom: chars.length > 0,
    }));
  };
  
  // Save current emojis to library
  const saveToLibrary = () => {
    if (currentEmojis.length === 0) {
      toast({ title: "Nothing to save", description: "Enter or select emojis first", variant: "destructive" });
      return;
    }
    
    const name = saveName.trim() || `Combo ${savedCombos.length + 1}`;
    const newCombo: ComboPreset = {
      id: `saved-${Date.now()}`,
      name,
      description: `${currentEmojis.length} emoji sequence`,
      emojis: [...currentEmojis],
      category: "mylibrary",
    };
    
    const updated = [newCombo, ...savedCombos];
    setSavedCombos(updated);
    saveCombosToStorage(updated);
    setSaveName("");
    setShowSaveInput(false);
    toast({ title: "Saved to Library!", description: `"${name}" added to your collection` });
  };
  
  // Delete a saved combo
  const deleteFromLibrary = (id: string) => {
    const updated = savedCombos.filter(c => c.id !== id);
    setSavedCombos(updated);
    saveCombosToStorage(updated);
    toast({ title: "Removed", description: "Combo deleted from library" });
  };
  
  const currentEmojis = settings.useCustom ? settings.customEmojis : (settings.selectedCombo?.emojis || []);
  
  const handleExport = async (format: "stl" | "scad" | "obj") => {
    if (currentEmojis.length === 0) {
      toast({ title: "No emojis selected", description: "Select a combo or enter custom emojis", variant: "destructive" });
      return;
    }
    
    setIsExporting(true);
    
    try {
      const response = await apiRequest("POST", "/api/generate/combo-sign", {
        emojis: currentEmojis,
        settings: {
          signHeight: settings.signHeight,
          emojiSpacing: settings.emojiSpacing,
          backingEnabled: settings.backingEnabled,
          backingStyle: settings.backingStyle,
          backingPadding: settings.backingPadding,
          backingThickness: settings.backingThickness,
          ledChannelEnabled: settings.ledChannelEnabled,
          ledChannelWidth: settings.ledChannelWidth,
          mountingHoles: settings.mountingHoles,
          fontFile: settings.fontFile,
        },
        format,
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      // Server returns a ZIP file directly
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `combo_sign_${currentEmojis.length}emojis.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: "Export Complete!", description: `Downloaded combo sign with ${currentEmojis.length} emoji(s)` });
    } catch (error) {
      toast({ title: "Export Failed", description: String(error), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 relative bg-gradient-to-br from-slate-900 to-slate-800">
        <WebGLErrorBoundary
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">3D Preview unavailable</p>
              </div>
            </div>
          }
        >
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }>
            <Canvas
              camera={{ position: [0, 0, 3], fov: 50 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: "transparent" }}
            >
              <ComboPreview settings={settings} />
            </Canvas>
          </Suspense>
        </WebGLErrorBoundary>
        
        {currentEmojis.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm rounded-lg px-6 py-3 border shadow-lg">
            <div className="flex items-center gap-2 text-3xl">
              {currentEmojis.map((emoji, idx) => (
                <span key={idx} className="hover:scale-110 transition-transform">{emoji}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {settings.selectedCombo?.name || "Custom Combo"}
            </p>
          </div>
        )}
      </div>
      
      <ScrollArea className="w-96 border-l bg-sidebar">
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Emoji Combo Presets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Custom Sequence</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste or type emojis..."
                    value={customInput}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    className="text-xl flex-1"
                    data-testid="input-custom-emojis"
                  />
                  
                  <Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        title="Browse Emojis"
                        data-testid="button-emoji-browser"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Grid3X3 className="h-5 w-5" />
                          Emoji Browser
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Current sequence:</span>
                          <span className="text-xl">{customInput || "(empty)"}</span>
                          {customInput && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCustomInput("")}
                              className="ml-auto"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        
                        <Tabs value={browserCategory} onValueChange={setBrowserCategory}>
                          <TabsList className="flex flex-wrap gap-1 h-auto">
                            {Object.entries(EMOJI_BROWSER_CATEGORIES).map(([key, { label, icon: Icon }]) => (
                              <TabsTrigger key={key} value={key} className="text-xs gap-1">
                                <Icon className="h-3 w-3" />
                                {label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          
                          {Object.entries(EMOJI_BROWSER_CATEGORIES).map(([category, { emojis }]) => (
                            <TabsContent key={category} value={category} className="mt-3">
                              <ScrollArea className="h-[300px]">
                                <div className="grid grid-cols-10 gap-1">
                                  {emojis.map((emoji, idx) => (
                                    <Button
                                      key={`${category}-${idx}`}
                                      variant="ghost"
                                      className="h-10 w-10 text-2xl p-0 hover:bg-accent"
                                      onClick={() => addEmojiFromBrowser(emoji)}
                                      data-testid={`emoji-${category}-${idx}`}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                              </ScrollArea>
                            </TabsContent>
                          ))}
                        </Tabs>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <a 
                            href="https://emojicopy.com/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            More emojis at emojicopy.com
                          </a>
                          <Button onClick={() => setBrowserOpen(false)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setShowSaveInput(!showSaveInput)}
                    disabled={currentEmojis.length === 0}
                    title="Save to My Library"
                    data-testid="button-show-save"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {showSaveInput && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Name your combo..."
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      className="flex-1"
                      data-testid="input-save-name"
                      onKeyDown={(e) => e.key === "Enter" && saveToLibrary()}
                    />
                    <Button size="sm" onClick={saveToLibrary} data-testid="button-save-combo">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Click the grid icon to browse emojis, or paste from emojicopy.com
                </p>
              </div>
              
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                <TabsList className="flex flex-wrap gap-1 w-full h-auto" data-testid="tabs-combo-categories">
                  {Object.entries(CATEGORY_INFO).map(([key, { label, icon: Icon }]) => (
                    <TabsTrigger key={key} value={key} className="flex-1 min-w-[70px] text-xs gap-1" data-testid={`tab-${key}`}>
                      <Icon className="h-3 w-3" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value="mylibrary" className="mt-3">
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {savedCombos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FolderHeart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Your library is empty</p>
                          <p className="text-xs mt-1">Paste emojis above and click + to save</p>
                        </div>
                      ) : (
                        savedCombos.map((combo) => (
                          <div key={combo.id} className="flex items-center gap-2">
                            <Button
                              variant={settings.selectedCombo?.id === combo.id && !settings.useCustom ? "default" : "outline"}
                              className="flex-1 justify-start h-auto py-2 px-3"
                              onClick={() => selectCombo(combo)}
                              data-testid={`button-saved-${combo.id}`}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="text-2xl flex gap-0.5">
                                  {combo.emojis.slice(0, 4).map((e, i) => (
                                    <span key={i}>{e}</span>
                                  ))}
                                  {combo.emojis.length > 4 && <span className="text-xs">+{combo.emojis.length - 4}</span>}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{combo.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{combo.description}</div>
                                </div>
                              </div>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteFromLibrary(combo.id)}
                              title="Delete from library"
                              data-testid={`button-delete-${combo.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                {Object.entries(COMBO_PRESETS).map(([category, combos]) => (
                  <TabsContent key={category} value={category} className="mt-3">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-4">
                        {combos.map((combo) => (
                          <Button
                            key={combo.id}
                            variant={settings.selectedCombo?.id === combo.id && !settings.useCustom ? "default" : "outline"}
                            className="w-full justify-start h-auto py-2 px-3"
                            onClick={() => selectCombo(combo)}
                            data-testid={`button-combo-${combo.id}`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="text-2xl flex gap-0.5">
                                {combo.emojis.slice(0, 4).map((e, i) => (
                                  <span key={i}>{e}</span>
                                ))}
                                {combo.emojis.length > 4 && <span className="text-xs">+{combo.emojis.length - 4}</span>}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{combo.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{combo.description}</div>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Sign Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sign Height: {settings.signHeight}mm</Label>
                <Slider
                  value={[settings.signHeight]}
                  onValueChange={([v]) => updateSetting("signHeight", v)}
                  min={10}
                  max={100}
                  step={1}
                  data-testid="slider-sign-height"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Emoji Spacing: {settings.emojiSpacing}mm</Label>
                <Slider
                  value={[settings.emojiSpacing]}
                  onValueChange={([v]) => updateSetting("emojiSpacing", v)}
                  min={0}
                  max={30}
                  step={1}
                  data-testid="slider-emoji-spacing"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Backing Plate</Label>
                <Switch
                  checked={settings.backingEnabled}
                  onCheckedChange={(v) => updateSetting("backingEnabled", v)}
                  data-testid="switch-backing"
                />
              </div>
              
              {settings.backingEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Backing Style</Label>
                    <Select
                      value={settings.backingStyle}
                      onValueChange={(v) => updateSetting("backingStyle", v as "connected" | "individual" | "strip")}
                    >
                      <SelectTrigger data-testid="select-backing-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="connected">Connected (Single Plate)</SelectItem>
                        <SelectItem value="strip">Strip (Horizontal Bar)</SelectItem>
                        <SelectItem value="individual">Individual (Per Emoji)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Backing Padding: {settings.backingPadding}mm</Label>
                    <Slider
                      value={[settings.backingPadding]}
                      onValueChange={([v]) => updateSetting("backingPadding", v)}
                      min={2}
                      max={20}
                      step={1}
                      data-testid="slider-backing-padding"
                    />
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between">
                <Label>LED Channel</Label>
                <Switch
                  checked={settings.ledChannelEnabled}
                  onCheckedChange={(v) => updateSetting("ledChannelEnabled", v)}
                  data-testid="switch-led-channel"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Mounting Holes</Label>
                <Switch
                  checked={settings.mountingHoles}
                  onCheckedChange={(v) => updateSetting("mountingHoles", v)}
                  data-testid="switch-mounting"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Font Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label>Font Library</Label>
                  <div className="ml-auto">
                    <FontLegend 
                      selectedFontFilename={settings.fontFile} 
                      onSelectFont={(font) => {
                        updateSetting("fontFile", font.filename);
                        updateSetting("fontOverride", font.name);
                      }}
                    />
                  </div>
                </div>
                <FontPreviewSelect
                  value={settings.fontFile || "NotoEmoji-Regular.ttf"}
                  onValueChange={(filename, fontName) => {
                    updateSetting("fontFile", filename);
                    updateSetting("fontOverride", fontName || "");
                  }}
                  placeholder="Select emoji font..."
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Glyph Path Trace Visualization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4" />
                Path Trace Visualization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant={showTrace ? "default" : "outline"}
                className="w-full"
                onClick={() => {
                  if (showTrace) {
                    setShowTrace(false);
                  } else {
                    fetchGlyphPaths();
                  }
                }}
                disabled={isLoadingTrace || currentEmojis.length === 0}
                data-testid="button-show-combo-trace"
              >
                {isLoadingTrace ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting Paths...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    {showTrace ? "Hide" : "Show"} Glyph Paths
                  </>
                )}
              </Button>
              
              {showTrace && pathData && (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <GlyphPathVisualization 
                      pathData={pathData}
                      animationStep={animationStep}
                      emojis={currentEmojis}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">{pathData.pathCount}</div>
                      <div className="text-xs text-muted-foreground">Paths</div>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <div className="text-lg font-bold">{pathData.simplifiedPoints}</div>
                      <div className="text-xs text-muted-foreground">Points</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleExport("stl")}
                  disabled={isExporting || currentEmojis.length === 0}
                  data-testid="button-export-stl"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "STL"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("scad")}
                  disabled={isExporting || currentEmojis.length === 0}
                  data-testid="button-export-scad"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SCAD"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("obj")}
                  disabled={isExporting || currentEmojis.length === 0}
                  data-testid="button-export-obj"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "OBJ"}
                </Button>
              </div>
              
              {currentEmojis.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Select a combo or enter custom emojis to export
                </p>
              )}
              
              {currentEmojis.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Exporting {currentEmojis.length} emoji(s) as 3D printable sign</p>
                  <p>Style: {settings.backingEnabled ? settings.backingStyle : "No backing"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
