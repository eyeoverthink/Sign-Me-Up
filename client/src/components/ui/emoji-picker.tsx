import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile, Search } from "lucide-react";

interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

const QUICK_EMOJIS: EmojiItem[] = [
  { emoji: "😀", name: "Grinning", keywords: ["happy", "smile"] },
  { emoji: "😍", name: "Heart Eyes", keywords: ["love", "crush"] },
  { emoji: "🔥", name: "Fire", keywords: ["hot", "lit"] },
  { emoji: "⭐", name: "Star", keywords: ["favorite", "best"] },
  { emoji: "❤️", name: "Red Heart", keywords: ["love", "heart"] },
  { emoji: "💖", name: "Sparkling Heart", keywords: ["love", "pink"] },
  { emoji: "✨", name: "Sparkles", keywords: ["magic", "shine"] },
  { emoji: "💎", name: "Diamond", keywords: ["gem", "precious"] },
  { emoji: "🌟", name: "Glowing Star", keywords: ["star", "glow"] },
  { emoji: "🎉", name: "Party", keywords: ["celebration", "confetti"] },
  { emoji: "🏆", name: "Trophy", keywords: ["win", "champion"] },
  { emoji: "👑", name: "Crown", keywords: ["king", "queen", "royal"] },
  { emoji: "💪", name: "Flexed Biceps", keywords: ["strong", "power"] },
  { emoji: "🚀", name: "Rocket", keywords: ["launch", "fast"] },
  { emoji: "⚡", name: "Lightning", keywords: ["power", "electric"] },
  { emoji: "🌈", name: "Rainbow", keywords: ["colorful", "pride"] },
  { emoji: "🦋", name: "Butterfly", keywords: ["beautiful", "change"] },
  { emoji: "🌸", name: "Cherry Blossom", keywords: ["flower", "spring"] },
  { emoji: "🌙", name: "Moon", keywords: ["night", "dream"] },
  { emoji: "☀️", name: "Sun", keywords: ["bright", "day"] },
  { emoji: "🐶", name: "Dog", keywords: ["puppy", "pet"] },
  { emoji: "🐱", name: "Cat", keywords: ["kitty", "pet"] },
  { emoji: "🦁", name: "Lion", keywords: ["king", "brave"] },
  { emoji: "🐻", name: "Bear", keywords: ["teddy", "animal"] },
  { emoji: "🍕", name: "Pizza", keywords: ["food", "italian"] },
  { emoji: "☕", name: "Coffee", keywords: ["drink", "morning"] },
  { emoji: "🎵", name: "Music Note", keywords: ["song", "melody"] },
  { emoji: "🎸", name: "Guitar", keywords: ["music", "rock"] },
  { emoji: "⚽", name: "Soccer", keywords: ["football", "sport"] },
  { emoji: "🏀", name: "Basketball", keywords: ["sport", "ball"] },
  { emoji: "☥", name: "Ankh", keywords: ["egypt", "ancient", "life"] },
  { emoji: "𓀀", name: "Egyptian Man", keywords: ["hieroglyph", "egypt"] },
  { emoji: "𓁹", name: "Eye of Horus", keywords: ["egypt", "eye", "protection"] },
  { emoji: "𓆉", name: "Egyptian Snake", keywords: ["egypt", "cobra", "serpent"] },
  { emoji: "𓇳", name: "Egyptian Sun", keywords: ["egypt", "ra", "sun"] },
  { emoji: "♠️", name: "Spade", keywords: ["cards", "poker"] },
  { emoji: "♥️", name: "Heart Suit", keywords: ["cards", "love"] },
  { emoji: "♦️", name: "Diamond Suit", keywords: ["cards", "poker"] },
  { emoji: "♣️", name: "Club", keywords: ["cards", "poker"] },
  { emoji: "☮️", name: "Peace", keywords: ["peace", "symbol"] },
  { emoji: "☯️", name: "Yin Yang", keywords: ["balance", "zen"] },
  { emoji: "♾️", name: "Infinity", keywords: ["forever", "endless"] },
  { emoji: "⚔️", name: "Crossed Swords", keywords: ["battle", "fight"] },
  { emoji: "🛡️", name: "Shield", keywords: ["protect", "defense"] },
  { emoji: "⚜️", name: "Fleur-de-lis", keywords: ["royal", "french"] },
];

const COMBO_EMOJIS: EmojiItem[] = [
  { emoji: "❤️💕✨", name: "Pure Love", keywords: ["love", "combo"] },
  { emoji: "💖💫🌙", name: "Dreamy Romance", keywords: ["love", "dream", "combo"] },
  { emoji: "🎉🏆✨", name: "Victory", keywords: ["win", "celebrate", "combo"] },
  { emoji: "💪🔥⚡", name: "Power Up", keywords: ["energy", "strong", "combo"] },
  { emoji: "💗🌸✨", name: "Soft Aesthetic", keywords: ["cute", "pink", "combo"] },
  { emoji: "🔥⚡💥", name: "Bold Energy", keywords: ["fire", "power", "combo"] },
  { emoji: "🌙✨💤", name: "Night Vibes", keywords: ["sleep", "dream", "combo"] },
  { emoji: "🚀💫⭐", name: "Reach Stars", keywords: ["rocket", "goals", "combo"] },
  { emoji: "☕📚🌧️", name: "Cozy Vibes", keywords: ["coffee", "cozy", "combo"] },
  { emoji: "🌟💎👑", name: "Royalty", keywords: ["crown", "royal", "combo"] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  triggerClassName?: string;
}

export function EmojiPicker({ onSelect, triggerClassName }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"quick" | "combos">("quick");

  const filteredEmojis = useMemo(() => {
    const query = search.toLowerCase();
    const source = activeTab === "quick" ? QUICK_EMOJIS : COMBO_EMOJIS;
    
    if (!query) return source;
    
    return source.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.keywords.some(kw => kw.includes(query))
    );
  }, [search, activeTab]);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={triggerClassName}
          data-testid="button-emoji-picker"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex gap-2 mb-2">
            <Button
              variant={activeTab === "quick" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("quick")}
              className="flex-1"
            >
              Quick Picks
            </Button>
            <Button
              variant={activeTab === "combos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("combos")}
              className="flex-1"
            >
              Combos
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emojis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
              data-testid="input-emoji-search"
            />
          </div>
        </div>
        <ScrollArea className="h-48">
          <div className="p-2 grid grid-cols-6 gap-1">
            {filteredEmojis.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSelect(item.emoji)}
                className="p-2 text-xl hover:bg-accent rounded transition-colors text-center"
                title={item.name}
                data-testid={`button-emoji-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.emoji}
              </button>
            ))}
            {filteredEmojis.length === 0 && (
              <p className="col-span-6 text-center text-sm text-muted-foreground py-4">
                No emojis found
              </p>
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <a 
            href="/emoji-library" 
            className="text-xs text-primary hover:underline"
            onClick={() => setIsOpen(false)}
          >
            Browse Full Library →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
