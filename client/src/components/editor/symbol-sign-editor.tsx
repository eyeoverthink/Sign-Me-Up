import { useState, useMemo, useEffect, Component, type ReactNode, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader2, Sparkles, Globe, Heart, Star, Sun, Moon, Music, Zap, Type, Upload, Check, AlertCircle, Grid3X3, ExternalLink, Eye } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { apiRequest } from "@/lib/queryClient";
import { saveExport } from "@/components/editor/my-exports-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EMOJI_BROWSER_CATEGORIES, getTotalEmojiCount } from "@/lib/emoji-browser-data";
import { FontPreviewSelect } from "@/components/font-preview-select";
import { FontLegend } from "@/components/font-legend";
import { useToast } from "@/hooks/use-toast";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Text3D, Center, Html } from "@react-three/drei";
import * as THREE from "three";

interface FontInfo {
  id: string;
  name: string;
  filename: string;
  path: string;
  category: string;
}

const LIGHT_TYPES = {
  silicone_neon_6mm: { name: "Silicone Neon 6mm", channelWidth: 6 },
  silicone_neon_8mm: { name: "Silicone Neon 8mm", channelWidth: 8 },
  led_strip_10mm: { name: "LED Strip 10mm", channelWidth: 10.5 },
  individual_pixels: { name: "Individual Pixels", channelWidth: 14 },
} as const;

const SYMBOL_PRESETS = {
  // Smileys & Faces - from emojicopy.com
  smileys: [
    { char: '😀', name: 'Grinning' }, { char: '😃', name: 'Smiley' }, { char: '😄', name: 'Smile' },
    { char: '😁', name: 'Beaming' }, { char: '😆', name: 'Laughing' }, { char: '🥹', name: 'Touched' },
    { char: '😅', name: 'Sweat Smile' }, { char: '😂', name: 'LOL' }, { char: '🤣', name: 'ROFL' },
    { char: '🥲', name: 'Smiling Tear' }, { char: '☺️', name: 'Relaxed' }, { char: '😊', name: 'Blush' },
    { char: '😇', name: 'Innocent' }, { char: '🙂', name: 'Slight Smile' }, { char: '🙃', name: 'Upside Down' },
    { char: '😉', name: 'Wink' }, { char: '😌', name: 'Relieved' }, { char: '😍', name: 'Heart Eyes' },
    { char: '🥰', name: 'Smiling Hearts' }, { char: '😘', name: 'Blowing Kiss' }, { char: '😗', name: 'Kissing' },
    { char: '😙', name: 'Kiss Smile' }, { char: '😚', name: 'Kiss Closed' }, { char: '😋', name: 'Yummy' },
    { char: '😛', name: 'Tongue' }, { char: '😝', name: 'Squinting Tongue' }, { char: '😜', name: 'Winking Tongue' },
    { char: '🤪', name: 'Zany' }, { char: '🤨', name: 'Raised Brow' }, { char: '🧐', name: 'Monocle' },
    { char: '🤓', name: 'Nerd' }, { char: '😎', name: 'Cool' }, { char: '🥸', name: 'Disguised' },
    { char: '🤩', name: 'Star Struck' }, { char: '🥳', name: 'Party' }, { char: '😏', name: 'Smirk' },
    { char: '😒', name: 'Unamused' }, { char: '😞', name: 'Disappointed' }, { char: '😔', name: 'Pensive' },
    { char: '😟', name: 'Worried' }, { char: '😕', name: 'Confused' }, { char: '🙁', name: 'Frowning' },
    { char: '☹️', name: 'Frown' }, { char: '😣', name: 'Persevering' }, { char: '😖', name: 'Confounded' },
    { char: '😫', name: 'Tired' }, { char: '😩', name: 'Weary' }, { char: '🥺', name: 'Pleading' },
    { char: '😢', name: 'Crying' }, { char: '😭', name: 'Sobbing' }, { char: '😤', name: 'Triumph' },
    { char: '😠', name: 'Angry' }, { char: '😡', name: 'Pouting' }, { char: '🤬', name: 'Cursing' },
    { char: '🤯', name: 'Mind Blown' }, { char: '😳', name: 'Flushed' }, { char: '🥵', name: 'Hot' },
    { char: '🥶', name: 'Cold' }, { char: '😱', name: 'Screaming' }, { char: '😨', name: 'Fearful' },
    { char: '😰', name: 'Anxious' }, { char: '😥', name: 'Sad Relief' }, { char: '😓', name: 'Downcast' },
    { char: '🤗', name: 'Hugging' }, { char: '🤔', name: 'Thinking' }, { char: '🫣', name: 'Peeking' },
    { char: '🤭', name: 'Hand Over Mouth' }, { char: '🫢', name: 'Open Eyes Hand' }, { char: '🫡', name: 'Salute' },
    { char: '🤫', name: 'Shushing' }, { char: '🫠', name: 'Melting' }, { char: '🤥', name: 'Lying' },
    { char: '😶', name: 'No Mouth' }, { char: '🫥', name: 'Dotted Line' }, { char: '😐', name: 'Neutral' },
    { char: '🫤', name: 'Diagonal Mouth' }, { char: '😑', name: 'Expressionless' }, { char: '🫨', name: 'Shaking' },
    { char: '😬', name: 'Grimacing' }, { char: '🙄', name: 'Eye Roll' }, { char: '😯', name: 'Hushed' },
    { char: '😦', name: 'Frowning Open' }, { char: '😧', name: 'Anguished' }, { char: '😮', name: 'Open Mouth' },
    { char: '😲', name: 'Astonished' }, { char: '🥱', name: 'Yawning' }, { char: '😴', name: 'Sleeping' },
    { char: '🤤', name: 'Drooling' }, { char: '😪', name: 'Sleepy' }, { char: '😵', name: 'Dizzy' },
    { char: '🤐', name: 'Zipper Mouth' }, { char: '🥴', name: 'Woozy' }, { char: '🤢', name: 'Nauseated' },
    { char: '🤮', name: 'Vomiting' }, { char: '🤧', name: 'Sneezing' }, { char: '😷', name: 'Mask' },
    { char: '🤒', name: 'Thermometer' }, { char: '🤕', name: 'Bandage' }, { char: '🤑', name: 'Money Mouth' },
    { char: '🤠', name: 'Cowboy' }, { char: '😈', name: 'Smiling Devil' }, { char: '👿', name: 'Angry Devil' },
    { char: '👹', name: 'Ogre' }, { char: '👺', name: 'Goblin' }, { char: '🤡', name: 'Clown' },
    { char: '💩', name: 'Poo' }, { char: '👻', name: 'Ghost' }, { char: '💀', name: 'Skull' },
    { char: '☠️', name: 'Skull Bones' }, { char: '👽', name: 'Alien' }, { char: '👾', name: 'Space Invader' },
    { char: '🤖', name: 'Robot' }, { char: '🎃', name: 'Pumpkin' },
    // Cat faces
    { char: '😺', name: 'Smiling Cat' }, { char: '😸', name: 'Grinning Cat' }, { char: '😹', name: 'Joy Cat' },
    { char: '😻', name: 'Heart Eyes Cat' }, { char: '😼', name: 'Smirk Cat' }, { char: '😽', name: 'Kissing Cat' },
    { char: '🙀', name: 'Weary Cat' }, { char: '😿', name: 'Crying Cat' }, { char: '😾', name: 'Pouting Cat' },
  ],
  // Gestures & Hands
  gestures: [
    { char: '🫶', name: 'Heart Hands' }, { char: '🤲', name: 'Palms Up' }, { char: '👐', name: 'Open Hands' },
    { char: '🙌', name: 'Raising Hands' }, { char: '👏', name: 'Clapping' }, { char: '🤝', name: 'Handshake' },
    { char: '👍', name: 'Thumbs Up' }, { char: '👎', name: 'Thumbs Down' }, { char: '👊', name: 'Fist Bump' },
    { char: '✊', name: 'Raised Fist' }, { char: '🤛', name: 'Left Fist' }, { char: '🤜', name: 'Right Fist' },
    { char: '🫷', name: 'Push Left' }, { char: '🫸', name: 'Push Right' }, { char: '🤞', name: 'Fingers Crossed' },
    { char: '✌️', name: 'Peace' }, { char: '🫰', name: 'Hand Heart' }, { char: '🤟', name: 'Love You' },
    { char: '🤘', name: 'Rock On' }, { char: '👌', name: 'OK' }, { char: '🤌', name: 'Pinched Fingers' },
    { char: '🤏', name: 'Pinching' }, { char: '🫳', name: 'Palm Down' }, { char: '🫴', name: 'Palm Up' },
    { char: '👈', name: 'Point Left' }, { char: '👉', name: 'Point Right' }, { char: '👆', name: 'Point Up' },
    { char: '👇', name: 'Point Down' }, { char: '☝️', name: 'Index Up' }, { char: '✋', name: 'Raised Hand' },
    { char: '🤚', name: 'Back of Hand' }, { char: '🖐️', name: 'Hand Splayed' }, { char: '🖖', name: 'Vulcan' },
    { char: '👋', name: 'Waving' }, { char: '🤙', name: 'Call Me' }, { char: '💪', name: 'Flexed Biceps' },
    { char: '🦾', name: 'Mechanical Arm' }, { char: '🖕', name: 'Middle Finger' }, { char: '✍️', name: 'Writing' },
    { char: '🙏', name: 'Praying' }, { char: '🫵', name: 'Index Pointing' },
  ],
  // Hearts & Love
  hearts: [
    { char: '❤️', name: 'Red Heart' }, { char: '🧡', name: 'Orange Heart' }, { char: '💛', name: 'Yellow Heart' },
    { char: '💚', name: 'Green Heart' }, { char: '💙', name: 'Blue Heart' }, { char: '💜', name: 'Purple Heart' },
    { char: '🖤', name: 'Black Heart' }, { char: '🤍', name: 'White Heart' }, { char: '🤎', name: 'Brown Heart' },
    { char: '💔', name: 'Broken Heart' }, { char: '❤️‍🔥', name: 'Heart on Fire' }, { char: '❤️‍🩹', name: 'Mending Heart' },
    { char: '❣️', name: 'Heart Exclamation' }, { char: '💕', name: 'Two Hearts' }, { char: '💞', name: 'Revolving Hearts' },
    { char: '💓', name: 'Beating Heart' }, { char: '💗', name: 'Growing Heart' }, { char: '💖', name: 'Sparkling Heart' },
    { char: '💘', name: 'Heart Arrow' }, { char: '💝', name: 'Heart Ribbon' }, { char: '💟', name: 'Heart Decoration' },
    { char: '💋', name: 'Kiss Mark' }, { char: '💯', name: '100' }, { char: '💢', name: 'Anger' },
    { char: '💥', name: 'Collision' }, { char: '💫', name: 'Dizzy' }, { char: '💦', name: 'Sweat Droplets' },
    { char: '💨', name: 'Dashing' }, { char: '🕳️', name: 'Hole' }, { char: '💣', name: 'Bomb' },
    { char: '💬', name: 'Speech Bubble' }, { char: '💭', name: 'Thought Bubble' }, { char: '💤', name: 'Zzz' },
  ],
  // Animals
  animals: [
    { char: '🐶', name: 'Dog' }, { char: '🐱', name: 'Cat' }, { char: '🐭', name: 'Mouse' },
    { char: '🐹', name: 'Hamster' }, { char: '🐰', name: 'Rabbit' }, { char: '🦊', name: 'Fox' },
    { char: '🐻', name: 'Bear' }, { char: '🐼', name: 'Panda' }, { char: '🐻‍❄️', name: 'Polar Bear' },
    { char: '🐨', name: 'Koala' }, { char: '🐯', name: 'Tiger' }, { char: '🦁', name: 'Lion' },
    { char: '🐮', name: 'Cow' }, { char: '🐷', name: 'Pig' }, { char: '🐽', name: 'Pig Nose' },
    { char: '🐸', name: 'Frog' }, { char: '🐵', name: 'Monkey' }, { char: '🙈', name: 'See No Evil' },
    { char: '🙉', name: 'Hear No Evil' }, { char: '🙊', name: 'Speak No Evil' }, { char: '🐒', name: 'Monkey' },
    { char: '🐔', name: 'Chicken' }, { char: '🐧', name: 'Penguin' }, { char: '🐦', name: 'Bird' },
    { char: '🐤', name: 'Baby Chick' }, { char: '🐣', name: 'Hatching Chick' }, { char: '🐥', name: 'Front Chick' },
    { char: '🪿', name: 'Goose' }, { char: '🦆', name: 'Duck' }, { char: '🦅', name: 'Eagle' },
    { char: '🦉', name: 'Owl' }, { char: '🦇', name: 'Bat' }, { char: '🐺', name: 'Wolf' },
    { char: '🐗', name: 'Boar' }, { char: '🐴', name: 'Horse' }, { char: '🦄', name: 'Unicorn' },
    { char: '🫎', name: 'Moose' }, { char: '🐝', name: 'Bee' }, { char: '🪱', name: 'Worm' },
    { char: '🐛', name: 'Bug' }, { char: '🦋', name: 'Butterfly' }, { char: '🐌', name: 'Snail' },
    { char: '🐞', name: 'Lady Beetle' }, { char: '🐜', name: 'Ant' }, { char: '🪰', name: 'Fly' },
    { char: '🪲', name: 'Beetle' }, { char: '🪳', name: 'Cockroach' }, { char: '🦟', name: 'Mosquito' },
    { char: '🦗', name: 'Cricket' }, { char: '🕷️', name: 'Spider' }, { char: '🕸️', name: 'Web' },
    { char: '🦂', name: 'Scorpion' }, { char: '🐢', name: 'Turtle' }, { char: '🐍', name: 'Snake' },
    { char: '🦎', name: 'Lizard' }, { char: '🦖', name: 'T-Rex' }, { char: '🦕', name: 'Sauropod' },
    { char: '🐙', name: 'Octopus' }, { char: '🦑', name: 'Squid' }, { char: '🪼', name: 'Jellyfish' },
    { char: '🦐', name: 'Shrimp' }, { char: '🦞', name: 'Lobster' }, { char: '🦀', name: 'Crab' },
    { char: '🐡', name: 'Blowfish' }, { char: '🐠', name: 'Tropical Fish' }, { char: '🐟', name: 'Fish' },
    { char: '🐬', name: 'Dolphin' }, { char: '🐳', name: 'Whale' }, { char: '🐋', name: 'Whale2' },
    { char: '🦈', name: 'Shark' }, { char: '🦭', name: 'Seal' }, { char: '🐊', name: 'Crocodile' },
    { char: '🐅', name: 'Tiger2' }, { char: '🐆', name: 'Leopard' }, { char: '🦓', name: 'Zebra' },
    { char: '🦍', name: 'Gorilla' }, { char: '🦧', name: 'Orangutan' }, { char: '🦣', name: 'Mammoth' },
    { char: '🐘', name: 'Elephant' }, { char: '🦛', name: 'Hippo' }, { char: '🦏', name: 'Rhino' },
    { char: '🐪', name: 'Camel' }, { char: '🐫', name: 'Two Hump Camel' }, { char: '🦒', name: 'Giraffe' },
    { char: '🦘', name: 'Kangaroo' }, { char: '🦬', name: 'Bison' }, { char: '🐃', name: 'Water Buffalo' },
    { char: '🐂', name: 'Ox' }, { char: '🐄', name: 'Cow2' }, { char: '🫏', name: 'Donkey' },
    { char: '🐎', name: 'Horse2' }, { char: '🐖', name: 'Pig2' }, { char: '🐏', name: 'Ram' },
    { char: '🐑', name: 'Ewe' }, { char: '🦙', name: 'Llama' }, { char: '🐐', name: 'Goat' },
    { char: '🦌', name: 'Deer' }, { char: '🐕', name: 'Dog2' }, { char: '🐩', name: 'Poodle' },
    { char: '🦮', name: 'Guide Dog' }, { char: '🐕‍🦺', name: 'Service Dog' }, { char: '🐈', name: 'Cat2' },
    { char: '🐈‍⬛', name: 'Black Cat' }, { char: '🪶', name: 'Feather' }, { char: '🪽', name: 'Wing' },
    { char: '🐓', name: 'Rooster' }, { char: '🦃', name: 'Turkey' }, { char: '🦤', name: 'Dodo' },
    { char: '🦚', name: 'Peacock' }, { char: '🦜', name: 'Parrot' }, { char: '🦢', name: 'Swan' },
    { char: '🦩', name: 'Flamingo' }, { char: '🕊️', name: 'Dove' }, { char: '🐇', name: 'Rabbit2' },
    { char: '🦝', name: 'Raccoon' }, { char: '🦨', name: 'Skunk' }, { char: '🦡', name: 'Badger' },
    { char: '🦫', name: 'Beaver' }, { char: '🦦', name: 'Otter' }, { char: '🦥', name: 'Sloth' },
    { char: '🐁', name: 'Mouse2' }, { char: '🐀', name: 'Rat' }, { char: '🐿️', name: 'Chipmunk' },
    { char: '🦔', name: 'Hedgehog' }, { char: '🐾', name: 'Paw Prints' }, { char: '🐉', name: 'Dragon' },
    { char: '🐲', name: 'Dragon Face' }, { char: '🐦‍🔥', name: 'Phoenix' },
  ],
  // Nature & Plants
  nature: [
    { char: '🌵', name: 'Cactus' }, { char: '🎄', name: 'Christmas Tree' }, { char: '🌲', name: 'Evergreen' },
    { char: '🌳', name: 'Deciduous Tree' }, { char: '🌴', name: 'Palm Tree' }, { char: '🪵', name: 'Wood' },
    { char: '🌱', name: 'Seedling' }, { char: '🌿', name: 'Herb' }, { char: '☘️', name: 'Shamrock' },
    { char: '🍀', name: 'Four Leaf Clover' }, { char: '🎍', name: 'Bamboo' }, { char: '🪴', name: 'Potted Plant' },
    { char: '🎋', name: 'Tanabata Tree' }, { char: '🍃', name: 'Leaves' }, { char: '🍂', name: 'Fallen Leaf' },
    { char: '🍁', name: 'Maple Leaf' }, { char: '🪺', name: 'Nest Eggs' }, { char: '🪹', name: 'Empty Nest' },
    { char: '🍄', name: 'Mushroom' }, { char: '🐚', name: 'Shell' }, { char: '🪸', name: 'Coral' },
    { char: '🪨', name: 'Rock' }, { char: '🌾', name: 'Rice' }, { char: '💐', name: 'Bouquet' },
    { char: '🌷', name: 'Tulip' }, { char: '🌹', name: 'Rose' }, { char: '🥀', name: 'Wilted Flower' },
    { char: '🪻', name: 'Hyacinth' }, { char: '🪷', name: 'Lotus' }, { char: '🌺', name: 'Hibiscus' },
    { char: '🌸', name: 'Cherry Blossom' }, { char: '🌼', name: 'Blossom' }, { char: '🌻', name: 'Sunflower' },
    // Sky & Weather
    { char: '🌞', name: 'Sun Face' }, { char: '🌝', name: 'Full Moon Face' }, { char: '🌛', name: 'First Quarter Moon' },
    { char: '🌜', name: 'Last Quarter Moon' }, { char: '🌚', name: 'New Moon Face' }, { char: '🌕', name: 'Full Moon' },
    { char: '🌖', name: 'Waning Gibbous' }, { char: '🌗', name: 'Last Quarter' }, { char: '🌘', name: 'Waning Crescent' },
    { char: '🌑', name: 'New Moon' }, { char: '🌒', name: 'Waxing Crescent' }, { char: '🌓', name: 'First Quarter' },
    { char: '🌔', name: 'Waxing Gibbous' }, { char: '🌙', name: 'Crescent Moon' }, { char: '🌎', name: 'Americas' },
    { char: '🌍', name: 'Africa/Europe' }, { char: '🌏', name: 'Asia/Australia' }, { char: '🪐', name: 'Saturn' },
    { char: '💫', name: 'Dizzy' }, { char: '⭐', name: 'Star' }, { char: '🌟', name: 'Glowing Star' },
    { char: '✨', name: 'Sparkles' }, { char: '⚡', name: 'Lightning' }, { char: '☄️', name: 'Comet' },
    { char: '💥', name: 'Collision' }, { char: '🔥', name: 'Fire' }, { char: '🌪️', name: 'Tornado' },
    { char: '🌈', name: 'Rainbow' }, { char: '☀️', name: 'Sun' }, { char: '🌤️', name: 'Sun Small Cloud' },
    { char: '⛅', name: 'Sun Cloud' }, { char: '🌥️', name: 'Sun Large Cloud' }, { char: '☁️', name: 'Cloud' },
    { char: '🌦️', name: 'Sun Rain Cloud' }, { char: '🌧️', name: 'Rain Cloud' }, { char: '⛈️', name: 'Thunder Cloud' },
    { char: '🌩️', name: 'Lightning Cloud' }, { char: '🌨️', name: 'Snow Cloud' }, { char: '❄️', name: 'Snowflake' },
    { char: '☃️', name: 'Snowman' }, { char: '⛄', name: 'Snowman2' }, { char: '🌬️', name: 'Wind Face' },
    { char: '💨', name: 'Dash' }, { char: '💧', name: 'Droplet' }, { char: '💦', name: 'Splashing' },
    { char: '🫧', name: 'Bubbles' }, { char: '☔', name: 'Rain' }, { char: '☂️', name: 'Umbrella' },
    { char: '🌊', name: 'Wave' }, { char: '🌫️', name: 'Fog' },
  ],
  // Food & Drink
  food: [
    { char: '🍏', name: 'Green Apple' }, { char: '🍎', name: 'Red Apple' }, { char: '🍐', name: 'Pear' },
    { char: '🍊', name: 'Orange' }, { char: '🍋', name: 'Lemon' }, { char: '🍌', name: 'Banana' },
    { char: '🍉', name: 'Watermelon' }, { char: '🍇', name: 'Grapes' }, { char: '🍓', name: 'Strawberry' },
    { char: '🫐', name: 'Blueberries' }, { char: '🍈', name: 'Melon' }, { char: '🍒', name: 'Cherries' },
    { char: '🍑', name: 'Peach' }, { char: '🥭', name: 'Mango' }, { char: '🍍', name: 'Pineapple' },
    { char: '🥥', name: 'Coconut' }, { char: '🥝', name: 'Kiwi' }, { char: '🍅', name: 'Tomato' },
    { char: '🍆', name: 'Eggplant' }, { char: '🥑', name: 'Avocado' }, { char: '🫛', name: 'Pea Pod' },
    { char: '🥦', name: 'Broccoli' }, { char: '🥬', name: 'Leafy Green' }, { char: '🥒', name: 'Cucumber' },
    { char: '🌶️', name: 'Hot Pepper' }, { char: '🫑', name: 'Bell Pepper' }, { char: '🌽', name: 'Corn' },
    { char: '🥕', name: 'Carrot' }, { char: '🫒', name: 'Olive' }, { char: '🧄', name: 'Garlic' },
    { char: '🧅', name: 'Onion' }, { char: '🥔', name: 'Potato' }, { char: '🍠', name: 'Sweet Potato' },
    { char: '🫚', name: 'Ginger' }, { char: '🥐', name: 'Croissant' }, { char: '🥯', name: 'Bagel' },
    { char: '🍞', name: 'Bread' }, { char: '🥖', name: 'Baguette' }, { char: '🥨', name: 'Pretzel' },
    { char: '🧀', name: 'Cheese' }, { char: '🥚', name: 'Egg' }, { char: '🍳', name: 'Cooking' },
    { char: '🧈', name: 'Butter' }, { char: '🥞', name: 'Pancakes' }, { char: '🧇', name: 'Waffle' },
    { char: '🥓', name: 'Bacon' }, { char: '🥩', name: 'Steak' }, { char: '🍗', name: 'Poultry Leg' },
    { char: '🍖', name: 'Meat on Bone' }, { char: '🦴', name: 'Bone' }, { char: '🌭', name: 'Hot Dog' },
    { char: '🍔', name: 'Burger' }, { char: '🍟', name: 'Fries' }, { char: '🍕', name: 'Pizza' },
    { char: '🫓', name: 'Flatbread' }, { char: '🥪', name: 'Sandwich' }, { char: '🥙', name: 'Pita' },
    { char: '🧆', name: 'Falafel' }, { char: '🌮', name: 'Taco' }, { char: '🌯', name: 'Burrito' },
    { char: '🫔', name: 'Tamale' }, { char: '🥗', name: 'Salad' }, { char: '🥘', name: 'Paella' },
    { char: '🫕', name: 'Fondue' }, { char: '🥫', name: 'Canned Food' }, { char: '🫙', name: 'Jar' },
    { char: '🍝', name: 'Spaghetti' }, { char: '🍜', name: 'Noodles' }, { char: '🍲', name: 'Pot of Food' },
    { char: '🍛', name: 'Curry' }, { char: '🍣', name: 'Sushi' }, { char: '🍱', name: 'Bento' },
    { char: '🥟', name: 'Dumpling' }, { char: '🦪', name: 'Oyster' }, { char: '🍤', name: 'Shrimp' },
    { char: '🍙', name: 'Rice Ball' }, { char: '🍚', name: 'Rice' }, { char: '🍘', name: 'Rice Cracker' },
    { char: '🍥', name: 'Fish Cake' }, { char: '🥠', name: 'Fortune Cookie' }, { char: '🥮', name: 'Moon Cake' },
    { char: '🍢', name: 'Oden' }, { char: '🍡', name: 'Dango' }, { char: '🍧', name: 'Shaved Ice' },
    { char: '🍨', name: 'Ice Cream' }, { char: '🍦', name: 'Soft Ice Cream' }, { char: '🥧', name: 'Pie' },
    { char: '🧁', name: 'Cupcake' }, { char: '🍰', name: 'Cake Slice' }, { char: '🎂', name: 'Birthday Cake' },
    { char: '🍮', name: 'Custard' }, { char: '🍭', name: 'Lollipop' }, { char: '🍬', name: 'Candy' },
    { char: '🍫', name: 'Chocolate' }, { char: '🍿', name: 'Popcorn' }, { char: '🍩', name: 'Doughnut' },
    { char: '🍪', name: 'Cookie' }, { char: '🌰', name: 'Chestnut' }, { char: '🥜', name: 'Peanuts' },
    { char: '🫘', name: 'Beans' }, { char: '🍯', name: 'Honey' }, { char: '🥛', name: 'Milk' },
    { char: '🫗', name: 'Pouring Liquid' }, { char: '🍼', name: 'Baby Bottle' }, { char: '🫖', name: 'Teapot' },
    { char: '☕', name: 'Coffee' }, { char: '🍵', name: 'Tea' }, { char: '🧉', name: 'Mate' },
    { char: '🧃', name: 'Juice Box' }, { char: '🥤', name: 'Cup Straw' }, { char: '🧋', name: 'Bubble Tea' },
    { char: '🍶', name: 'Sake' }, { char: '🍺', name: 'Beer' }, { char: '🍻', name: 'Beers' },
    { char: '🥂', name: 'Clinking Glasses' }, { char: '🍷', name: 'Wine' }, { char: '🥃', name: 'Tumbler' },
    { char: '🍸', name: 'Cocktail' }, { char: '🍹', name: 'Tropical Drink' }, { char: '🍾', name: 'Champagne' },
    { char: '🧊', name: 'Ice' }, { char: '🥄', name: 'Spoon' }, { char: '🍴', name: 'Fork Knife' },
    { char: '🍽️', name: 'Plate' }, { char: '🥣', name: 'Bowl Spoon' }, { char: '🥡', name: 'Takeout Box' },
    { char: '🥢', name: 'Chopsticks' },
  ],
  // Activities & Sports
  activities: [
    { char: '⚽', name: 'Soccer' }, { char: '🏀', name: 'Basketball' }, { char: '🏈', name: 'Football' },
    { char: '⚾', name: 'Baseball' }, { char: '🥎', name: 'Softball' }, { char: '🎾', name: 'Tennis' },
    { char: '🏐', name: 'Volleyball' }, { char: '🏉', name: 'Rugby' }, { char: '🥏', name: 'Frisbee' },
    { char: '🎱', name: 'Billiards' }, { char: '🪀', name: 'Yo-Yo' }, { char: '🏓', name: 'Ping Pong' },
    { char: '🏸', name: 'Badminton' }, { char: '🏒', name: 'Hockey' }, { char: '🏑', name: 'Field Hockey' },
    { char: '🥍', name: 'Lacrosse' }, { char: '🏏', name: 'Cricket' }, { char: '🪃', name: 'Boomerang' },
    { char: '🥅', name: 'Goal Net' }, { char: '⛳', name: 'Golf' }, { char: '🪁', name: 'Kite' },
    { char: '🛝', name: 'Playground Slide' }, { char: '🏹', name: 'Bow and Arrow' }, { char: '🎣', name: 'Fishing' },
    { char: '🤿', name: 'Diving Mask' }, { char: '🥊', name: 'Boxing Glove' }, { char: '🥋', name: 'Martial Arts' },
    { char: '🎽', name: 'Running Shirt' }, { char: '🛹', name: 'Skateboard' }, { char: '🛼', name: 'Roller Skate' },
    { char: '🛷', name: 'Sled' }, { char: '⛸️', name: 'Ice Skate' }, { char: '🥌', name: 'Curling' },
    { char: '🎿', name: 'Skis' }, { char: '⛷️', name: 'Skier' }, { char: '🏂', name: 'Snowboarder' },
    { char: '🪂', name: 'Parachute' }, { char: '🏋️', name: 'Weightlifter' }, { char: '🤼', name: 'Wrestlers' },
    { char: '🤸', name: 'Cartwheel' }, { char: '⛹️', name: 'Bouncing Ball' }, { char: '🤺', name: 'Fencer' },
    { char: '🤾', name: 'Handball' }, { char: '🏌️', name: 'Golfer' }, { char: '🏇', name: 'Horse Racing' },
    { char: '🧘', name: 'Yoga' }, { char: '🏄', name: 'Surfer' }, { char: '🏊', name: 'Swimmer' },
    { char: '🤽', name: 'Water Polo' }, { char: '🚣', name: 'Rowing' }, { char: '🧗', name: 'Climbing' },
    { char: '🚵', name: 'Mountain Biking' }, { char: '🚴', name: 'Biking' }, { char: '🏆', name: 'Trophy' },
    { char: '🥇', name: 'Gold Medal' }, { char: '🥈', name: 'Silver Medal' }, { char: '🥉', name: 'Bronze Medal' },
    { char: '🏅', name: 'Medal' }, { char: '🎖️', name: 'Military Medal' }, { char: '🏵️', name: 'Rosette' },
    { char: '🎗️', name: 'Ribbon' }, { char: '🎫', name: 'Ticket' }, { char: '🎟️', name: 'Admission Ticket' },
    { char: '🎪', name: 'Circus Tent' }, { char: '🤹', name: 'Juggling' }, { char: '🎭', name: 'Performing Arts' },
    { char: '🩰', name: 'Ballet Shoes' }, { char: '🎨', name: 'Palette' }, { char: '🎬', name: 'Clapper Board' },
    { char: '🎤', name: 'Microphone' }, { char: '🎧', name: 'Headphones' }, { char: '🎼', name: 'Musical Score' },
    { char: '🎹', name: 'Musical Keyboard' }, { char: '🥁', name: 'Drum' }, { char: '🪘', name: 'Long Drum' },
    { char: '🎷', name: 'Saxophone' }, { char: '🎺', name: 'Trumpet' }, { char: '🪗', name: 'Accordion' },
    { char: '🎸', name: 'Guitar' }, { char: '🪕', name: 'Banjo' }, { char: '🎻', name: 'Violin' },
    { char: '🪈', name: 'Flute' }, { char: '🎲', name: 'Dice' }, { char: '♟️', name: 'Chess Pawn' },
    { char: '🎯', name: 'Direct Hit' }, { char: '🎳', name: 'Bowling' }, { char: '🎮', name: 'Video Game' },
    { char: '🎰', name: 'Slot Machine' }, { char: '🧩', name: 'Puzzle Piece' },
  ],
  // Travel & Places
  travel: [
    { char: '🚗', name: 'Car' }, { char: '🚕', name: 'Taxi' }, { char: '🚙', name: 'SUV' },
    { char: '🛻', name: 'Pickup Truck' }, { char: '🚐', name: 'Minibus' }, { char: '🚌', name: 'Bus' },
    { char: '🚎', name: 'Trolleybus' }, { char: '🏎️', name: 'Racing Car' }, { char: '🚓', name: 'Police Car' },
    { char: '🚑', name: 'Ambulance' }, { char: '🚒', name: 'Fire Engine' }, { char: '🚚', name: 'Truck' },
    { char: '🚛', name: 'Articulated Lorry' }, { char: '🚜', name: 'Tractor' }, { char: '🛴', name: 'Kick Scooter' },
    { char: '🚲', name: 'Bicycle' }, { char: '🛵', name: 'Motor Scooter' }, { char: '🏍️', name: 'Motorcycle' },
    { char: '🛺', name: 'Auto Rickshaw' }, { char: '🛞', name: 'Wheel' }, { char: '🚨', name: 'Police Light' },
    { char: '🚔', name: 'Oncoming Police' }, { char: '🚍', name: 'Oncoming Bus' }, { char: '🚘', name: 'Oncoming Car' },
    { char: '🚖', name: 'Oncoming Taxi' }, { char: '🚡', name: 'Aerial Tramway' }, { char: '🚠', name: 'Mountain Cableway' },
    { char: '🚟', name: 'Suspension Railway' }, { char: '🚃', name: 'Railway Car' }, { char: '🚋', name: 'Tram Car' },
    { char: '🚞', name: 'Mountain Railway' }, { char: '🚝', name: 'Monorail' }, { char: '🚄', name: 'High-Speed Train' },
    { char: '🚅', name: 'Bullet Train' }, { char: '🚈', name: 'Light Rail' }, { char: '🚂', name: 'Locomotive' },
    { char: '🚆', name: 'Train' }, { char: '🚇', name: 'Metro' }, { char: '🚊', name: 'Tram' },
    { char: '🚉', name: 'Station' }, { char: '✈️', name: 'Airplane' }, { char: '🛫', name: 'Departure' },
    { char: '🛬', name: 'Arrival' }, { char: '🛩️', name: 'Small Plane' }, { char: '💺', name: 'Seat' },
    { char: '🛰️', name: 'Satellite' }, { char: '🚀', name: 'Rocket' }, { char: '🛸', name: 'UFO' },
    { char: '🚁', name: 'Helicopter' }, { char: '🛶', name: 'Canoe' }, { char: '⛵', name: 'Sailboat' },
    { char: '🚤', name: 'Speedboat' }, { char: '🛥️', name: 'Motor Boat' }, { char: '🛳️', name: 'Cruise Ship' },
    { char: '⛴️', name: 'Ferry' }, { char: '🚢', name: 'Ship' }, { char: '🛟', name: 'Ring Buoy' },
    { char: '⚓', name: 'Anchor' }, { char: '🪝', name: 'Hook' }, { char: '⛽', name: 'Fuel Pump' },
    { char: '🚧', name: 'Construction' }, { char: '🚦', name: 'Traffic Light' }, { char: '🚥', name: 'Traffic Light2' },
    { char: '🚏', name: 'Bus Stop' }, { char: '🗺️', name: 'World Map' }, { char: '🗿', name: 'Moai' },
    { char: '🗽', name: 'Statue of Liberty' }, { char: '🗼', name: 'Tokyo Tower' }, { char: '🏰', name: 'Castle' },
    { char: '🏯', name: 'Japanese Castle' }, { char: '🏟️', name: 'Stadium' }, { char: '🎡', name: 'Ferris Wheel' },
    { char: '🎢', name: 'Roller Coaster' }, { char: '🎠', name: 'Carousel Horse' }, { char: '⛲', name: 'Fountain' },
    { char: '⛱️', name: 'Beach Umbrella' }, { char: '🏖️', name: 'Beach' }, { char: '🏝️', name: 'Desert Island' },
    { char: '🏜️', name: 'Desert' }, { char: '🌋', name: 'Volcano' }, { char: '⛰️', name: 'Mountain' },
    { char: '🏔️', name: 'Snow Mountain' }, { char: '🗻', name: 'Mount Fuji' }, { char: '🏕️', name: 'Camping' },
    { char: '⛺', name: 'Tent' }, { char: '🏠', name: 'House' }, { char: '🏡', name: 'House Garden' },
    { char: '🏘️', name: 'Houses' }, { char: '🏚️', name: 'Derelict House' }, { char: '🛖', name: 'Hut' },
    { char: '🏗️', name: 'Building Construction' }, { char: '🏭', name: 'Factory' }, { char: '🏢', name: 'Office Building' },
    { char: '🏬', name: 'Department Store' }, { char: '🏣', name: 'Japanese Post Office' }, { char: '🏤', name: 'Post Office' },
    { char: '🏥', name: 'Hospital' }, { char: '🏦', name: 'Bank' }, { char: '🏨', name: 'Hotel' },
    { char: '🏪', name: 'Convenience Store' }, { char: '🏫', name: 'School' }, { char: '🏩', name: 'Love Hotel' },
    { char: '💒', name: 'Wedding' }, { char: '🏛️', name: 'Classical Building' }, { char: '⛪', name: 'Church' },
    { char: '🕌', name: 'Mosque' }, { char: '🕍', name: 'Synagogue' }, { char: '🛕', name: 'Hindu Temple' },
    { char: '🕋', name: 'Kaaba' }, { char: '⛩️', name: 'Shinto Shrine' }, { char: '🛤️', name: 'Railway Track' },
    { char: '🛣️', name: 'Motorway' }, { char: '🗾', name: 'Japan' }, { char: '🎑', name: 'Moon Viewing' },
    { char: '🏞️', name: 'National Park' }, { char: '🌅', name: 'Sunrise' }, { char: '🌄', name: 'Sunrise Over Mountains' },
    { char: '🌠', name: 'Shooting Star' }, { char: '🎇', name: 'Sparkler' }, { char: '🎆', name: 'Fireworks' },
    { char: '🌇', name: 'Sunset' }, { char: '🌆', name: 'Cityscape Dusk' }, { char: '🏙️', name: 'Cityscape' },
    { char: '🌃', name: 'Night Stars' }, { char: '🌌', name: 'Milky Way' }, { char: '🌉', name: 'Bridge Night' },
    { char: '🌁', name: 'Foggy' },
  ],
  // Objects
  objects: [
    { char: '⌚', name: 'Watch' }, { char: '📱', name: 'Phone' }, { char: '💻', name: 'Laptop' },
    { char: '⌨️', name: 'Keyboard' }, { char: '🖥️', name: 'Desktop' }, { char: '🖨️', name: 'Printer' },
    { char: '🖱️', name: 'Mouse' }, { char: '🕹️', name: 'Joystick' }, { char: '💽', name: 'Minidisc' },
    { char: '💾', name: 'Floppy Disk' }, { char: '💿', name: 'CD' }, { char: '📀', name: 'DVD' },
    { char: '📼', name: 'VHS' }, { char: '📷', name: 'Camera' }, { char: '📸', name: 'Camera Flash' },
    { char: '📹', name: 'Video Camera' }, { char: '🎥', name: 'Movie Camera' }, { char: '📽️', name: 'Projector' },
    { char: '🎞️', name: 'Film Frames' }, { char: '📞', name: 'Telephone' }, { char: '☎️', name: 'Phone2' },
    { char: '📟', name: 'Pager' }, { char: '📠', name: 'Fax' }, { char: '📺', name: 'TV' },
    { char: '📻', name: 'Radio' }, { char: '🎙️', name: 'Studio Mic' }, { char: '🎚️', name: 'Level Slider' },
    { char: '🎛️', name: 'Control Knobs' }, { char: '🧭', name: 'Compass' }, { char: '⏱️', name: 'Stopwatch' },
    { char: '⏲️', name: 'Timer' }, { char: '⏰', name: 'Alarm Clock' }, { char: '🕰️', name: 'Mantelpiece Clock' },
    { char: '⌛', name: 'Hourglass Done' }, { char: '⏳', name: 'Hourglass' }, { char: '📡', name: 'Satellite Antenna' },
    { char: '🔋', name: 'Battery' }, { char: '🪫', name: 'Low Battery' }, { char: '🔌', name: 'Plug' },
    { char: '💡', name: 'Light Bulb' }, { char: '🔦', name: 'Flashlight' }, { char: '🕯️', name: 'Candle' },
    { char: '🪔', name: 'Diya Lamp' }, { char: '🧯', name: 'Fire Extinguisher' }, { char: '🛢️', name: 'Oil Drum' },
    { char: '💸', name: 'Money Wings' }, { char: '💵', name: 'Dollar' }, { char: '💴', name: 'Yen' },
    { char: '💶', name: 'Euro' }, { char: '💷', name: 'Pound' }, { char: '🪙', name: 'Coin' },
    { char: '💰', name: 'Money Bag' }, { char: '💳', name: 'Credit Card' }, { char: '🪪', name: 'ID Card' },
    { char: '💎', name: 'Gem' }, { char: '⚖️', name: 'Scales' }, { char: '🪜', name: 'Ladder' },
    { char: '🧰', name: 'Toolbox' }, { char: '🪛', name: 'Screwdriver' }, { char: '🔧', name: 'Wrench' },
    { char: '🔨', name: 'Hammer' }, { char: '⚒️', name: 'Hammer Pick' }, { char: '🛠️', name: 'Hammer Wrench' },
    { char: '⛏️', name: 'Pick' }, { char: '🪚', name: 'Saw' }, { char: '🔩', name: 'Nut Bolt' },
    { char: '⚙️', name: 'Gear' }, { char: '🪤', name: 'Mouse Trap' }, { char: '🧱', name: 'Brick' },
    { char: '⛓️', name: 'Chains' }, { char: '🧲', name: 'Magnet' }, { char: '🔫', name: 'Water Pistol' },
    { char: '💣', name: 'Bomb' }, { char: '🧨', name: 'Firecracker' }, { char: '🪓', name: 'Axe' },
    { char: '🔪', name: 'Knife' }, { char: '🗡️', name: 'Dagger' }, { char: '⚔️', name: 'Crossed Swords' },
    { char: '🛡️', name: 'Shield' }, { char: '🚬', name: 'Cigarette' }, { char: '⚰️', name: 'Coffin' },
    { char: '🪦', name: 'Headstone' }, { char: '⚱️', name: 'Funeral Urn' }, { char: '🏺', name: 'Amphora' },
    { char: '🔮', name: 'Crystal Ball' }, { char: '📿', name: 'Prayer Beads' }, { char: '🧿', name: 'Nazar Amulet' },
    { char: '🪬', name: 'Hamsa' }, { char: '💈', name: 'Barber Pole' }, { char: '⚗️', name: 'Alembic' },
    { char: '🔭', name: 'Telescope' }, { char: '🔬', name: 'Microscope' }, { char: '🕳️', name: 'Hole' },
    { char: '🩻', name: 'X-Ray' }, { char: '🩹', name: 'Bandage' }, { char: '🩺', name: 'Stethoscope' },
    { char: '💊', name: 'Pill' }, { char: '💉', name: 'Syringe' }, { char: '🩸', name: 'Drop of Blood' },
    { char: '🧬', name: 'DNA' }, { char: '🦠', name: 'Microbe' }, { char: '🧫', name: 'Petri Dish' },
    { char: '🧪', name: 'Test Tube' }, { char: '🌡️', name: 'Thermometer' }, { char: '🧹', name: 'Broom' },
    { char: '🪠', name: 'Plunger' }, { char: '🧺', name: 'Basket' }, { char: '🧻', name: 'Toilet Paper' },
    { char: '🚽', name: 'Toilet' }, { char: '🚰', name: 'Potable Water' }, { char: '🚿', name: 'Shower' },
    { char: '🛁', name: 'Bathtub' }, { char: '🛀', name: 'Bath' }, { char: '🧼', name: 'Soap' },
    { char: '🪥', name: 'Toothbrush' }, { char: '🪒', name: 'Razor' }, { char: '🪮', name: 'Hair Pick' },
    { char: '🧽', name: 'Sponge' }, { char: '🪣', name: 'Bucket' }, { char: '🧴', name: 'Lotion' },
    { char: '🛎️', name: 'Bellhop Bell' }, { char: '🔑', name: 'Key' }, { char: '🗝️', name: 'Old Key' },
    { char: '🚪', name: 'Door' }, { char: '🪑', name: 'Chair' }, { char: '🛋️', name: 'Couch' },
    { char: '🛏️', name: 'Bed' }, { char: '🛌', name: 'Person in Bed' }, { char: '🧸', name: 'Teddy Bear' },
    { char: '🪆', name: 'Nesting Dolls' }, { char: '🖼️', name: 'Picture Frame' }, { char: '🪞', name: 'Mirror' },
    { char: '🪟', name: 'Window' }, { char: '🛍️', name: 'Shopping Bags' }, { char: '🛒', name: 'Shopping Cart' },
    { char: '🎁', name: 'Gift' }, { char: '🎈', name: 'Balloon' }, { char: '🎏', name: 'Carp Streamer' },
    { char: '🎀', name: 'Ribbon' }, { char: '🪄', name: 'Magic Wand' }, { char: '🪅', name: 'Piñata' },
    { char: '🎊', name: 'Confetti Ball' }, { char: '🎉', name: 'Party Popper' },
  ],
  // Symbols
  symbols: [
    { char: '❤️', name: 'Red Heart' }, { char: '🧡', name: 'Orange Heart' }, { char: '💛', name: 'Yellow Heart' },
    { char: '💚', name: 'Green Heart' }, { char: '💙', name: 'Blue Heart' }, { char: '💜', name: 'Purple Heart' },
    { char: '🖤', name: 'Black Heart' }, { char: '🤍', name: 'White Heart' }, { char: '🤎', name: 'Brown Heart' },
    { char: '💔', name: 'Broken Heart' }, { char: '❣️', name: 'Heart Exclamation' }, { char: '💕', name: 'Two Hearts' },
    { char: '💞', name: 'Revolving Hearts' }, { char: '💓', name: 'Beating Heart' }, { char: '💗', name: 'Growing Heart' },
    { char: '💖', name: 'Sparkling Heart' }, { char: '💘', name: 'Heart Arrow' }, { char: '💝', name: 'Heart Ribbon' },
    { char: '💟', name: 'Heart Decoration' }, { char: '☮️', name: 'Peace' }, { char: '✝️', name: 'Cross' },
    { char: '☪️', name: 'Star Crescent' }, { char: '🕉️', name: 'Om' }, { char: '☸️', name: 'Wheel of Dharma' },
    { char: '✡️', name: 'Star of David' }, { char: '🔯', name: 'Six Point Star' }, { char: '🕎', name: 'Menorah' },
    { char: '☯️', name: 'Yin Yang' }, { char: '☦️', name: 'Orthodox Cross' }, { char: '🛐', name: 'Place of Worship' },
    { char: '⛎', name: 'Ophiuchus' }, { char: '♈', name: 'Aries' }, { char: '♉', name: 'Taurus' },
    { char: '♊', name: 'Gemini' }, { char: '♋', name: 'Cancer' }, { char: '♌', name: 'Leo' },
    { char: '♍', name: 'Virgo' }, { char: '♎', name: 'Libra' }, { char: '♏', name: 'Scorpio' },
    { char: '♐', name: 'Sagittarius' }, { char: '♑', name: 'Capricorn' }, { char: '♒', name: 'Aquarius' },
    { char: '♓', name: 'Pisces' }, { char: '🆔', name: 'ID' }, { char: '⚛️', name: 'Atom' },
    { char: '🉑', name: 'Accept' }, { char: '☢️', name: 'Radioactive' }, { char: '☣️', name: 'Biohazard' },
    { char: '📴', name: 'Phone Off' }, { char: '📳', name: 'Vibration Mode' }, { char: '🈶', name: 'Have' },
    { char: '🈚', name: 'Free of Charge' }, { char: '🈸', name: 'Apply' }, { char: '🈺', name: 'Open Business' },
    { char: '🈷️', name: 'Monthly' }, { char: '✴️', name: 'Eight Star' }, { char: '🆚', name: 'Vs' },
    { char: '💮', name: 'White Flower' }, { char: '🉐', name: 'Discount' }, { char: '㊙️', name: 'Secret' },
    { char: '㊗️', name: 'Congratulations' }, { char: '🈴', name: 'Pass' }, { char: '🈵', name: 'Full' },
    { char: '🈹', name: 'Discount2' }, { char: '🈲', name: 'Prohibited' }, { char: '🅰️', name: 'A Button' },
    { char: '🅱️', name: 'B Button' }, { char: '🆎', name: 'AB Button' }, { char: '🆑', name: 'CL Button' },
    { char: '🅾️', name: 'O Button' }, { char: '🆘', name: 'SOS' }, { char: '❌', name: 'Cross Mark' },
    { char: '⭕', name: 'Circle' }, { char: '🛑', name: 'Stop Sign' }, { char: '⛔', name: 'No Entry' },
    { char: '📛', name: 'Name Badge' }, { char: '🚫', name: 'Prohibited' }, { char: '💯', name: '100' },
    { char: '💢', name: 'Anger' }, { char: '♨️', name: 'Hot Springs' }, { char: '🚷', name: 'No Pedestrians' },
    { char: '🚯', name: 'No Littering' }, { char: '🚳', name: 'No Bicycles' }, { char: '🚱', name: 'Non-Potable' },
    { char: '🔞', name: 'No One Under 18' }, { char: '📵', name: 'No Mobile Phones' }, { char: '🚭', name: 'No Smoking' },
    { char: '❗', name: 'Exclamation' }, { char: '❕', name: 'White Exclamation' }, { char: '❓', name: 'Question' },
    { char: '❔', name: 'White Question' }, { char: '‼️', name: 'Double Exclamation' }, { char: '⁉️', name: 'Exclamation Question' },
    { char: '🔅', name: 'Dim Button' }, { char: '🔆', name: 'Bright Button' }, { char: '〽️', name: 'Part Alternation' },
    { char: '⚠️', name: 'Warning' }, { char: '🚸', name: 'Children Crossing' }, { char: '🔱', name: 'Trident' },
    { char: '⚜️', name: 'Fleur-de-lis' }, { char: '🔰', name: 'Japanese Symbol' }, { char: '♻️', name: 'Recycle' },
    { char: '✅', name: 'Check Mark' }, { char: '🈯', name: 'Reserved' }, { char: '💹', name: 'Chart Up' },
    { char: '❇️', name: 'Sparkle' }, { char: '✳️', name: 'Eight Spoked' }, { char: '❎', name: 'Cross Mark Button' },
    { char: '🌐', name: 'Globe Meridians' }, { char: '💠', name: 'Diamond Dot' }, { char: 'Ⓜ️', name: 'M Circle' },
    { char: '🌀', name: 'Cyclone' }, { char: '💤', name: 'Zzz' }, { char: '🏧', name: 'ATM' },
    { char: '🚾', name: 'WC' }, { char: '♿', name: 'Wheelchair' }, { char: '🅿️', name: 'Parking' },
    { char: '🛗', name: 'Elevator' }, { char: '🈳', name: 'Vacancy' }, { char: '🈂️', name: 'Service Charge' },
    { char: '🛂', name: 'Passport Control' }, { char: '🛃', name: 'Customs' }, { char: '🛄', name: 'Baggage Claim' },
    { char: '🛅', name: 'Left Luggage' }, { char: '🚹', name: 'Mens' }, { char: '🚺', name: 'Womens' },
    { char: '🚼', name: 'Baby Symbol' }, { char: '⚧️', name: 'Transgender' }, { char: '🚻', name: 'Restroom' },
    { char: '🚮', name: 'Litter' }, { char: '🎦', name: 'Cinema' }, { char: '📶', name: 'Signal Strength' },
    { char: '🈁', name: 'Here' }, { char: '🔣', name: 'Input Symbols' }, { char: 'ℹ️', name: 'Information' },
    { char: '🔤', name: 'ABC' }, { char: '🔡', name: 'Lowercase ABC' }, { char: '🔠', name: 'Uppercase ABC' },
    { char: '🆖', name: 'NG Button' }, { char: '🆗', name: 'OK Button' }, { char: '🆙', name: 'UP Button' },
    { char: '🆒', name: 'Cool Button' }, { char: '🆕', name: 'New Button' }, { char: '🆓', name: 'Free Button' },
    { char: '0️⃣', name: 'Zero' }, { char: '1️⃣', name: 'One' }, { char: '2️⃣', name: 'Two' },
    { char: '3️⃣', name: 'Three' }, { char: '4️⃣', name: 'Four' }, { char: '5️⃣', name: 'Five' },
    { char: '6️⃣', name: 'Six' }, { char: '7️⃣', name: 'Seven' }, { char: '8️⃣', name: 'Eight' },
    { char: '9️⃣', name: 'Nine' }, { char: '🔟', name: 'Ten' }, { char: '🔢', name: '123' },
    { char: '#️⃣', name: 'Hash' }, { char: '*️⃣', name: 'Asterisk' }, { char: '⏏️', name: 'Eject' },
    { char: '▶️', name: 'Play' }, { char: '⏸️', name: 'Pause' }, { char: '⏯️', name: 'Play or Pause' },
    { char: '⏹️', name: 'Stop' }, { char: '⏺️', name: 'Record' }, { char: '⏭️', name: 'Next Track' },
    { char: '⏮️', name: 'Previous Track' }, { char: '⏩', name: 'Fast Forward' }, { char: '⏪', name: 'Rewind' },
    { char: '⏫', name: 'Fast Up' }, { char: '⏬', name: 'Fast Down' }, { char: '◀️', name: 'Reverse' },
    { char: '🔼', name: 'Up Small' }, { char: '🔽', name: 'Down Small' }, { char: '➡️', name: 'Right Arrow' },
    { char: '⬅️', name: 'Left Arrow' }, { char: '⬆️', name: 'Up Arrow' }, { char: '⬇️', name: 'Down Arrow' },
    { char: '↗️', name: 'Up-Right' }, { char: '↘️', name: 'Down-Right' }, { char: '↙️', name: 'Down-Left' },
    { char: '↖️', name: 'Up-Left' }, { char: '↕️', name: 'Up Down' }, { char: '↔️', name: 'Left Right' },
    { char: '↪️', name: 'Right Curved' }, { char: '↩️', name: 'Left Curved' }, { char: '⤴️', name: 'Right Up Curved' },
    { char: '⤵️', name: 'Right Down Curved' }, { char: '🔀', name: 'Shuffle' }, { char: '🔁', name: 'Repeat' },
    { char: '🔂', name: 'Repeat Single' }, { char: '🔄', name: 'Counterclockwise' }, { char: '🔃', name: 'Clockwise' },
    { char: '🎵', name: 'Musical Note' }, { char: '🎶', name: 'Musical Notes' }, { char: '➕', name: 'Plus' },
    { char: '➖', name: 'Minus' }, { char: '➗', name: 'Divide' }, { char: '✖️', name: 'Multiply' },
    { char: '🟰', name: 'Heavy Equals' }, { char: '♾️', name: 'Infinity' }, { char: '💲', name: 'Dollar Sign' },
    { char: '💱', name: 'Currency Exchange' }, { char: '™️', name: 'Trademark' }, { char: '©️', name: 'Copyright' },
    { char: '®️', name: 'Registered' }, { char: '〰️', name: 'Wavy Dash' }, { char: '➰', name: 'Curly Loop' },
    { char: '➿', name: 'Double Curly Loop' }, { char: '🔚', name: 'End' }, { char: '🔙', name: 'Back' },
    { char: '🔛', name: 'On' }, { char: '🔝', name: 'Top' }, { char: '🔜', name: 'Soon' },
    { char: '✔️', name: 'Check' }, { char: '☑️', name: 'Ballot Check' }, { char: '🔘', name: 'Radio Button' },
    { char: '🔴', name: 'Red Circle' }, { char: '🟠', name: 'Orange Circle' }, { char: '🟡', name: 'Yellow Circle' },
    { char: '🟢', name: 'Green Circle' }, { char: '🔵', name: 'Blue Circle' }, { char: '🟣', name: 'Purple Circle' },
    { char: '⚫', name: 'Black Circle' }, { char: '⚪', name: 'White Circle' }, { char: '🟤', name: 'Brown Circle' },
    { char: '🔺', name: 'Red Up Triangle' }, { char: '🔻', name: 'Red Down Triangle' }, { char: '🔸', name: 'Small Orange Diamond' },
    { char: '🔹', name: 'Small Blue Diamond' }, { char: '🔶', name: 'Large Orange Diamond' }, { char: '🔷', name: 'Large Blue Diamond' },
    { char: '🔳', name: 'White Square Button' }, { char: '🔲', name: 'Black Square Button' }, { char: '▪️', name: 'Black Small Square' },
    { char: '▫️', name: 'White Small Square' }, { char: '◾', name: 'Black Medium-Small Square' }, { char: '◽', name: 'White Medium-Small Square' },
    { char: '◼️', name: 'Black Medium Square' }, { char: '◻️', name: 'White Medium Square' }, { char: '⬛', name: 'Black Large Square' },
    { char: '⬜', name: 'White Large Square' }, { char: '🟥', name: 'Red Square' }, { char: '🟧', name: 'Orange Square' },
    { char: '🟨', name: 'Yellow Square' }, { char: '🟩', name: 'Green Square' }, { char: '🟦', name: 'Blue Square' },
    { char: '🟪', name: 'Purple Square' }, { char: '🟫', name: 'Brown Square' }, { char: '🔈', name: 'Speaker Low' },
    { char: '🔇', name: 'Muted Speaker' }, { char: '🔉', name: 'Speaker Medium' }, { char: '🔊', name: 'Speaker High' },
    { char: '🔔', name: 'Bell' }, { char: '🔕', name: 'Bell Slash' }, { char: '📣', name: 'Megaphone' },
    { char: '📢', name: 'Loudspeaker' }, { char: '👁️‍🗨️', name: 'Eye in Bubble' }, { char: '💬', name: 'Speech Bubble' },
    { char: '💭', name: 'Thought Bubble' }, { char: '🗯️', name: 'Right Anger Bubble' }, { char: '♠️', name: 'Spade' },
    { char: '♣️', name: 'Club' }, { char: '♥️', name: 'Heart' }, { char: '♦️', name: 'Diamond' },
    { char: '🃏', name: 'Joker' }, { char: '🎴', name: 'Flower Playing Cards' }, { char: '🀄', name: 'Mahjong' },
    { char: '🕐', name: 'One OClock' }, { char: '🕑', name: 'Two OClock' }, { char: '🕒', name: 'Three OClock' },
    { char: '🕓', name: 'Four OClock' }, { char: '🕔', name: 'Five OClock' }, { char: '🕕', name: 'Six OClock' },
    { char: '🕖', name: 'Seven OClock' }, { char: '🕗', name: 'Eight OClock' }, { char: '🕘', name: 'Nine OClock' },
    { char: '🕙', name: 'Ten OClock' }, { char: '🕚', name: 'Eleven OClock' }, { char: '🕛', name: 'Twelve OClock' },
  ],
  // Favorites - now empty for user customization
  favorites: [] as { char: string; name: string }[],
  chinese: [
    { char: '福', name: 'Fortune' },
    { char: '愛', name: 'Love' },
    { char: '龍', name: 'Dragon' },
    { char: '禪', name: 'Zen' },
    { char: '和', name: 'Harmony' },
    { char: '夢', name: 'Dream' },
    { char: '力', name: 'Power' },
    { char: '光', name: 'Light' },
  ],
  japanese: [
    { char: 'あ', name: 'A' },
    { char: 'カ', name: 'Ka' },
    { char: '桜', name: 'Sakura' },
    { char: '風', name: 'Wind' },
    { char: '火', name: 'Fire' },
  ],
  korean: [
    { char: '한', name: 'Han' },
    { char: '빛', name: 'Light' },
    { char: '꿈', name: 'Dream' },
  ],
  greek: [
    { char: 'Ω', name: 'Omega' },
    { char: 'Φ', name: 'Phi' },
    { char: 'Ψ', name: 'Psi' },
    { char: 'α', name: 'Alpha' },
    { char: 'β', name: 'Beta' },
    { char: 'π', name: 'Pi' },
  ],
  hieroglyphs: [
    { char: '𓀀', name: 'Seated Man' },
    { char: '𓀁', name: 'Man Raising Arms' },
    { char: '𓀂', name: 'Seated Woman' },
    { char: '𓁹', name: 'Eye of Horus' },
    { char: '𓂀', name: 'Eye' },
    { char: '𓃀', name: 'Ram' },
    { char: '𓃭', name: 'Cat' },
    { char: '𓄿', name: 'Vulture' },
    { char: '𓅃', name: 'Falcon' },
    { char: '𓆈', name: 'Crocodile' },
    { char: '𓆣', name: 'Scarab' },
    { char: '𓇋', name: 'Reed' },
    { char: '𓇳', name: 'Sun' },
    { char: '𓈖', name: 'Water' },
    { char: '𓉐', name: 'House' },
    { char: '𓊃', name: 'Throne' },
    { char: '𓋹', name: 'Ankh' },
    { char: '𓌙', name: 'Was Scepter' },
    { char: '𓍯', name: 'Djed Pillar' },
    { char: '𓎟', name: 'Shen Ring' },
  ],
  legal: [
    { char: '™', name: 'Trademark' },
    { char: '©', name: 'Copyright' },
    { char: '®', name: 'Registered' },
    { char: '℠', name: 'Service Mark' },
    { char: '℗', name: 'Sound Recording' },
    { char: '€', name: 'Euro' },
    { char: '£', name: 'Pound' },
    { char: '¥', name: 'Yen' },
    { char: '₿', name: 'Bitcoin' },
    { char: '°', name: 'Degree' },
  ],
};

const FONT_OPTIONS = [
  { id: "auto", name: "Auto-detect" },
  { id: "Segoe UI Emoji", name: "Segoe UI Emoji (Windows)" },
  { id: "Apple Color Emoji", name: "Apple Color Emoji (macOS)" },
  { id: "Noto Color Emoji", name: "Noto Color Emoji (Cross-platform)" },
  { id: "Segoe UI Symbol", name: "Segoe UI Symbol (TM, Copyright)" },
  { id: "Noto Sans Symbols", name: "Noto Sans Symbols" },
  { id: "Arial Unicode MS", name: "Arial Unicode MS" },
];

type LightType = keyof typeof LIGHT_TYPES;

interface SymbolSignSettings {
  character: string;
  fontSize: number;
  signHeight: number;
  wallThickness: number;
  baseThickness: number;
  lightType: LightType;
  fontOverride: string;
  fontFile: string;
  generateBody: boolean;
  generateLid: boolean;
  generateDetail: boolean;    // NEW: High-detail stencil overlay for emojis
  detailThickness: number;    // NEW: Thickness of detail layer (default 1.2mm)
  holeSize: number;
  holeHeight: number;
}

const defaultSettings: SymbolSignSettings = {
  character: '😂',
  fontSize: 100,
  signHeight: 30,
  wallThickness: 2,
  baseThickness: 2,
  lightType: 'silicone_neon_6mm',
  fontOverride: 'auto',
  fontFile: '',
  generateBody: true,
  generateLid: true,
  generateDetail: false,   // Enable for high-detail emoji stencil layer
  detailThickness: 1.2,    // 1.2mm = 6 layers at 0.2mm print resolution
  holeSize: 5,
  holeHeight: 5,
};

function SymbolPreview({ character, settings }: { character: string; settings: SymbolSignSettings }) {
  const scale = settings.fontSize / 100;
  const boxSize = settings.fontSize * 1.2;
  
  return (
    <group>
      <mesh position={[0, 0, settings.signHeight / 2]} castShadow>
        <boxGeometry args={[boxSize, boxSize, settings.signHeight]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.25} />
      </mesh>
      <mesh position={[0, 0, settings.signHeight - 0.5]}>
        <boxGeometry args={[boxSize - settings.wallThickness * 2, boxSize - settings.wallThickness * 2, settings.signHeight - settings.baseThickness]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <Center position={[0, 0, settings.signHeight + 2]}>
        <Html center transform sprite distanceFactor={100}>
          <div 
            className="select-none pointer-events-none"
            style={{ 
              fontSize: `${settings.fontSize * 1.5}px`,
              color: '#fbbf24',
              textShadow: '0 0 20px #fbbf24, 0 0 40px #f59e0b',
              fontFamily: 'system-ui, sans-serif'
            }}
            data-testid="symbol-3d-display"
          >
            {character}
          </div>
        </Html>
      </Center>
      <pointLight position={[0, 0, settings.signHeight + 5]} intensity={0.5} color="#fbbf24" distance={50} />
    </group>
  );
}

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
  character,
  large = false
}: { 
  pathData: { paths: number[][][]; bounds: { minX: number; maxX: number; minY: number; maxY: number }; pathCount: number };
  animationStep: number;
  character: string;
  large?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = large ? 500 : 300;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!pathData.paths.length) {
      ctx.fillStyle = '#64748b';
      ctx.font = large ? '18px sans-serif' : '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No paths found', canvas.width / 2, canvas.height / 2 - 12);
      ctx.fillText('(Bitmap fonts like Color Emoji cannot be traced)', canvas.width / 2, canvas.height / 2 + 12);
      return;
    }
    
    const { minX, maxX, minY, maxY } = pathData.bounds;
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const padding = large ? 40 : 20;
    
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
      ctx.lineWidth = large ? 3 : 2;
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
        ctx.arc(screenX, screenY, large ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [pathData, animationStep, large, size]);
  
  return (
    <canvas 
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg border border-border"
      data-testid="glyph-path-canvas"
    />
  );
}

function PreviewFallback({ character }: { character: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-muted rounded-lg" data-testid="preview-fallback">
      <div className="text-6xl mb-4">{character}</div>
      <p className="text-sm text-muted-foreground">3D Preview unavailable</p>
      <p className="text-xs text-muted-foreground">(WebGL not supported)</p>
    </div>
  );
}

function FontPreviewDisplay({ 
  character, 
  fontFile,
  uploadedFont,
  large = false
}: { 
  character: string; 
  fontFile: string;
  uploadedFont: { name: string; data: string; familyName: string } | null;
  large?: boolean;
}) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const fontIdRef = useRef(`font-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  
  useEffect(() => {
    if (!fontFile && !uploadedFont) {
      setFontLoaded(true);
      setLoadError(false);
      return;
    }

    let cancelled = false;
    const fontId = fontIdRef.current;
    
    const loadFont = async () => {
      try {
        let fontFace: FontFace;
        
        if (uploadedFont) {
          fontFace = new FontFace(fontId, `url(${uploadedFont.data})`);
        } else if (fontFile) {
          fontFace = new FontFace(fontId, `url(/api/font-library/${encodeURIComponent(fontFile)})`);
        } else {
          if (!cancelled) {
            setFontLoaded(true);
            setLoadError(false);
          }
          return;
        }

        const loaded = await fontFace.load();
        if (!cancelled) {
          document.fonts.add(loaded);
          setFontLoaded(true);
          setLoadError(false);
        }
      } catch (err) {
        console.error('Font load error:', err);
        if (!cancelled) {
          setFontLoaded(true);
          setLoadError(true);
        }
      }
    };

    setFontLoaded(false);
    setLoadError(false);
    loadFont();
    
    return () => { cancelled = true; };
  }, [fontFile, uploadedFont]);

  const fontSize = large ? 'text-[280px]' : 'text-[120px]';
  const minHeight = large ? 'min-h-[400px]' : 'min-h-[150px]';

  return (
    <div 
      className={`relative ${minHeight} flex items-center justify-center`}
      data-testid="font-preview-display"
    >
      {!fontLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      )}
      <div 
        className={`${fontSize} leading-none transition-opacity duration-200`}
        style={{ 
          fontFamily: fontLoaded && (fontFile || uploadedFont) && !loadError ? `"${fontIdRef.current}", sans-serif` : 'inherit',
          opacity: fontLoaded ? 1 : 0
        }}
      >
        {character}
      </div>
      {loadError && (
        <div className="absolute bottom-4 text-sm text-destructive">
          Font failed to load - using system font
        </div>
      )}
    </div>
  );
}

export default function SymbolSignEditor() {
  const [settings, setSettings] = useState<SymbolSignSettings>(defaultSettings);
  const [customInput, setCustomInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [detectedFont, setDetectedFont] = useState<{ font: string; script: string } | null>(null);
  const [uploadedFont, setUploadedFont] = useState<{ name: string; data: string; familyName: string } | null>(null);
  const [inputValidation, setInputValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserCategory, setBrowserCategory] = useState("smileys");
  const { toast } = useToast();
  
  // Path trace visualization state
  const [showTrace, setShowTrace] = useState(false);
  const [pathData, setPathData] = useState<{ paths: number[][][]; bounds: { minX: number; maxX: number; minY: number; maxY: number }; pathCount: number; originalPoints: number; simplifiedPoints: number } | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [isLoadingTrace, setIsLoadingTrace] = useState(false);
  
  // Fetch glyph paths for visualization
  const fetchGlyphPaths = async () => {
    if (!settings.character) return;
    
    setIsLoadingTrace(true);
    try {
      const response = await apiRequest("POST", "/api/glyph-paths", {
        text: settings.character,
        fontFile: settings.fontFile || undefined,
        fontSize: settings.fontSize
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
  
  const { data: fontsData } = useQuery<{ success: boolean; fonts: FontInfo[]; count: number }>({
    queryKey: ['/api/fonts/library'],
  });
  
  const fonts = fontsData?.fonts || [];
  const fontsByCategory = fonts.reduce((acc, font) => {
    if (!acc[font.category]) acc[font.category] = [];
    acc[font.category].push(font);
    return acc;
  }, {} as Record<string, FontInfo[]>);

  const updateSetting = <K extends keyof SymbolSignSettings>(key: K, value: SymbolSignSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const selectCharacter = (char: string) => {
    updateSetting('character', char);
    detectFont(char);
    setInputValidation(null);
  };

  const detectFont = async (char: string) => {
    try {
      const response = await fetch('/api/symbol-sign/detect-font', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character: char }),
      });
      const data = await response.json();
      if (data.success) {
        setDetectedFont({ font: data.font, script: data.description });
      }
    } catch (e) {
      console.error('Font detection failed:', e);
    }
  };

  const validateCharacter = (input: string) => {
    if (!input.trim()) {
      setInputValidation(null);
      return;
    }
    // Use Array.from to properly handle multi-byte Unicode characters (emojis, etc.)
    const chars = Array.from(input.trim());
    const char = chars[0] || input.trim();
    const codePoint = char.codePointAt(0);
    if (!codePoint) {
      setInputValidation({ valid: false, message: 'Invalid character' });
      return;
    }
    if (codePoint >= 0x20 && codePoint <= 0x7E) {
      setInputValidation({ valid: true, message: `ASCII character "${char}" (U+${codePoint.toString(16).toUpperCase().padStart(4, '0')})` });
    } else if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) {
      setInputValidation({ valid: true, message: `CJK character (Chinese/Japanese) U+${codePoint.toString(16).toUpperCase()}` });
    } else if (codePoint >= 0xAC00 && codePoint <= 0xD7AF) {
      setInputValidation({ valid: true, message: `Korean Hangul syllable U+${codePoint.toString(16).toUpperCase()}` });
    } else if (codePoint >= 0x0370 && codePoint <= 0x03FF) {
      setInputValidation({ valid: true, message: `Greek letter U+${codePoint.toString(16).toUpperCase()}` });
    } else if (codePoint >= 0x2600 && codePoint <= 0x26FF) {
      setInputValidation({ valid: true, message: `Miscellaneous symbol U+${codePoint.toString(16).toUpperCase()}` });
    } else if (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) {
      setInputValidation({ valid: true, message: `Emoji U+${codePoint.toString(16).toUpperCase()} - requires compatible font` });
    } else {
      setInputValidation({ valid: true, message: `Unicode U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}` });
    }
  };

  const handleCustomInput = () => {
    if (customInput.trim()) {
      // Use Array.from to properly handle multi-byte Unicode characters (emojis, etc.)
      const chars = Array.from(customInput.trim());
      selectCharacter(chars[0] || customInput.trim());
      setCustomInput('');
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validExts = ['.ttf', '.otf', '.woff', '.woff2'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExts.includes(ext)) {
      toast({
        title: "Invalid Font File",
        description: "Please upload a TTF, OTF, WOFF, or WOFF2 font file",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const guessedFamily = baseName
        .replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/(Regular|Bold|Italic|Light|Medium|Black|Thin|ExtraBold|SemiBold)/gi, '')
        .trim() || baseName;
      
      setUploadedFont({ name: file.name, data: base64, familyName: guessedFamily });
      updateSetting('fontFile', file.name);
      updateSetting('fontOverride', guessedFamily);
      toast({
        title: "Font Uploaded",
        description: `"${file.name}" ready - you can edit the font family name below`
      });
    };
    reader.readAsDataURL(file);
  };
  
  const updateFontFamilyName = (familyName: string) => {
    if (uploadedFont) {
      setUploadedFont({ ...uploadedFont, familyName });
      updateSetting('fontOverride', familyName);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportPayload = {
        ...settings,
        uploadedFontData: uploadedFont?.data || null,
        uploadedFontName: uploadedFont?.name || null,
      };
      const response = await fetch('/api/export/symbol-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const codePoint = settings.character.codePointAt(0)?.toString(16).toUpperCase() || '0000';
      a.download = `symbol_U+${codePoint}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      saveExport({
        name: `Symbol "${settings.character}"`,
        type: 'symbol',
        metadata: {
          character: settings.character,
          fontSize: settings.fontSize,
          fontFile: settings.fontFile || undefined,
        }
      });

      toast({
        title: "Export Complete",
        description: `OpenSCAD files for "${settings.character}" downloaded successfully!`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate symbol sign files",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-full overflow-auto">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Universal Symbol Sign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 bg-muted rounded-lg">
              <div className="text-8xl mb-2" data-testid="text-selected-symbol">{settings.character}</div>
              {detectedFont && (
                <div className="flex flex-wrap justify-center gap-2" data-testid="status-detected-font">
                  <Badge variant="secondary">{detectedFont.script}</Badge>
                  <Badge variant="outline">{detectedFont.font}</Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Custom Character Input</Label>
              <div className="flex gap-2">
                <Input
                  data-testid="input-custom-character"
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                    validateCharacter(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customInput.trim()) handleCustomInput();
                  }}
                  placeholder="Type any character, emoji, or paste symbol..."
                  className="flex-1"
                />
                
                <EmojiPicker onSelect={(emoji) => {
                  setCustomInput(emoji);
                  validateCharacter(emoji);
                }} />
                
                <Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      title="Browse 1000+ Emojis"
                      data-testid="button-emoji-browser"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5" />
                        Emoji Browser (1000+ emojis)
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
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
                                    onClick={() => {
                                      setCustomInput(emoji);
                                      validateCharacter(emoji);
                                      setBrowserOpen(false);
                                    }}
                                    data-testid={`emoji-browser-${category}-${idx}`}
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
                          Close
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  data-testid="button-use-character"
                  onClick={handleCustomInput}
                  disabled={!customInput.trim()}
                >
                  Use
                </Button>
              </div>
              {inputValidation && (
                <div className={`flex items-center gap-1.5 text-xs ${inputValidation.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {inputValidation.valid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {inputValidation.message}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Supports any Unicode: letters, Chinese, Japanese, Korean, Greek, Arabic, symbols, emojis
              </p>
            </div>

            <Tabs defaultValue="smileys" className="w-full">
              <TabsList className="flex flex-wrap gap-1 w-full h-auto" data-testid="tabs-symbol-categories">
                <TabsTrigger value="smileys" data-testid="tab-smileys" className="flex-1 min-w-[55px] text-xs">Smileys</TabsTrigger>
                <TabsTrigger value="gestures" data-testid="tab-gestures" className="flex-1 min-w-[55px] text-xs">Gestures</TabsTrigger>
                <TabsTrigger value="hearts" data-testid="tab-hearts" className="flex-1 min-w-[50px] text-xs">Hearts</TabsTrigger>
                <TabsTrigger value="animals" data-testid="tab-animals" className="flex-1 min-w-[55px] text-xs">Animals</TabsTrigger>
                <TabsTrigger value="nature" data-testid="tab-nature" className="flex-1 min-w-[50px] text-xs">Nature</TabsTrigger>
                <TabsTrigger value="food" data-testid="tab-food" className="flex-1 min-w-[45px] text-xs">Food</TabsTrigger>
                <TabsTrigger value="activities" data-testid="tab-activities" className="flex-1 min-w-[60px] text-xs">Sports</TabsTrigger>
                <TabsTrigger value="travel" data-testid="tab-travel" className="flex-1 min-w-[50px] text-xs">Travel</TabsTrigger>
                <TabsTrigger value="objects" data-testid="tab-objects" className="flex-1 min-w-[55px] text-xs">Objects</TabsTrigger>
                <TabsTrigger value="symbols" data-testid="tab-symbols" className="flex-1 min-w-[55px] text-xs">Symbols</TabsTrigger>
                <TabsTrigger value="chinese" data-testid="tab-chinese" className="flex-1 min-w-[55px] text-xs">Chinese</TabsTrigger>
                <TabsTrigger value="japanese" data-testid="tab-japanese" className="flex-1 min-w-[60px] text-xs">Japanese</TabsTrigger>
                <TabsTrigger value="korean" data-testid="tab-korean" className="flex-1 min-w-[50px] text-xs">Korean</TabsTrigger>
                <TabsTrigger value="greek" data-testid="tab-greek" className="flex-1 min-w-[50px] text-xs">Greek</TabsTrigger>
                <TabsTrigger value="hieroglyphs" data-testid="tab-hieroglyphs" className="flex-1 min-w-[70px] text-xs">Hieroglyphs</TabsTrigger>
                <TabsTrigger value="legal" data-testid="tab-legal" className="flex-1 min-w-[45px] text-xs">Legal</TabsTrigger>
                <TabsTrigger value="favorites" data-testid="tab-favorites" className="flex-1 min-w-[60px] text-xs">Favorites</TabsTrigger>
              </TabsList>
              
              {Object.entries(SYMBOL_PRESETS).map(([category, chars]) => (
                <TabsContent key={category} value={category} className="mt-2">
                  <ScrollArea className="h-[200px] w-full">
                    <div className="grid grid-cols-6 gap-2 pr-4">
                      {chars.map(({ char, name }) => (
                        <Button
                          key={char}
                          variant={settings.character === char ? "default" : "outline"}
                          size="lg"
                          className="text-2xl"
                          onClick={() => selectCharacter(char)}
                          title={name}
                          data-testid={`button-symbol-${char}`}
                        >
                          {char}
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
              <Label>Light Type</Label>
              <Select
                value={settings.lightType}
                onValueChange={(v) => updateSetting('lightType', v as LightType)}
              >
                <SelectTrigger data-testid="select-light-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LIGHT_TYPES).map(([key, { name, channelWidth }]) => (
                    <SelectItem key={key} value={key}>
                      {name} ({channelWidth}mm channel)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Type className="h-4 w-4" />
                <Label>Font Library</Label>
                <div className="ml-auto">
                  <FontLegend 
                    selectedFontFilename={settings.fontFile} 
                    onSelectFont={(font) => {
                      updateSetting('fontFile', font.filename);
                      updateSetting('fontOverride', font.name);
                    }}
                  />
                </div>
              </div>
              <FontPreviewSelect
                value={settings.fontFile || 'auto'}
                onValueChange={(filename, fontName) => {
                  updateSetting('fontFile', filename);
                  updateSetting('fontOverride', fontName);
                }}
              />
              <p className="text-xs text-muted-foreground">
                {settings.fontFile 
                  ? `Font file "${settings.fontFile}" will be included in export`
                  : 'Auto-detect picks the best font for the character'}
              </p>
              
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    className="hidden"
                    onChange={handleFontUpload}
                    data-testid="input-font-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-font"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Custom Font
                  </Button>
                  {uploadedFont && (
                    <Badge variant="secondary" className="text-xs">
                      {uploadedFont.name}
                    </Badge>
                  )}
                </div>
                {uploadedFont && (
                  <div className="space-y-1">
                    <Label className="text-xs">Font Family Name (for OpenSCAD)</Label>
                    <Input
                      value={uploadedFont.familyName}
                      onChange={(e) => updateFontFamilyName(e.target.value)}
                      placeholder="Enter font family name..."
                      className="h-8 text-sm"
                      data-testid="input-font-family-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      This must match the font's internal family name for OpenSCAD to use it correctly
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label>Font Size</Label>
                <span className="text-sm text-muted-foreground" data-testid="text-font-size">{settings.fontSize}mm</span>
              </div>
              <Slider
                data-testid="slider-font-size"
                value={[settings.fontSize]}
                onValueChange={([v]) => updateSetting('fontSize', v)}
                min={30}
                max={300}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label>Sign Height</Label>
                <span className="text-sm text-muted-foreground" data-testid="text-sign-height">{settings.signHeight}mm</span>
              </div>
              <Slider
                data-testid="slider-sign-height"
                value={[settings.signHeight]}
                onValueChange={([v]) => updateSetting('signHeight', v)}
                min={15}
                max={60}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <Label>Wall Thickness</Label>
                <span className="text-sm text-muted-foreground" data-testid="text-wall-thickness">{settings.wallThickness}mm</span>
              </div>
              <Slider
                data-testid="slider-wall-thickness"
                value={[settings.wallThickness]}
                onValueChange={([v]) => updateSetting('wallThickness', v)}
                min={1}
                max={5}
                step={0.5}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Generate Body</Label>
              <Switch
                data-testid="switch-generate-body"
                checked={settings.generateBody}
                onCheckedChange={(v) => updateSetting('generateBody', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Generate Lid/Diffuser</Label>
              <Switch
                data-testid="switch-generate-lid"
                checked={settings.generateLid}
                onCheckedChange={(v) => updateSetting('generateLid', v)}
              />
            </div>

            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    High-Detail Stencil
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Captures emoji internal features (eyes, teeth, lines)
                  </p>
                </div>
                <Switch
                  data-testid="switch-generate-detail"
                  checked={settings.generateDetail}
                  onCheckedChange={(v) => updateSetting('generateDetail', v)}
                />
              </div>
              
              {settings.generateDetail && (
                <div className="space-y-2 pl-6 border-l-2 border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Stencil Thickness</Label>
                    <Badge variant="secondary">{settings.detailThickness}mm</Badge>
                  </div>
                  <Slider
                    data-testid="slider-detail-thickness"
                    value={[settings.detailThickness]}
                    onValueChange={([v]) => updateSetting('detailThickness', v)}
                    min={0.4}
                    max={3.0}
                    step={0.2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Print in Black/contrast color, snaps onto diffuser
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          data-testid="button-export-symbol"
          className="w-full"
          size="lg"
          onClick={handleExport}
          disabled={isExporting || !settings.character}
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating OpenSCAD Files...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export "{settings.character}" as OpenSCAD
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="h-full min-h-[700px]">
          <CardContent className="p-0 h-full">
            <Tabs defaultValue="font" className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b h-auto p-1" data-testid="tabs-preview-mode">
                <TabsTrigger value="font" className="flex-1">
                  <Type className="h-4 w-4 mr-2" />
                  Font Preview
                </TabsTrigger>
                <TabsTrigger value="3d">
                  <Sparkles className="h-4 w-4 mr-2" />
                  3D Preview
                </TabsTrigger>
                <TabsTrigger value="trace">
                  <Eye className="h-4 w-4 mr-2" />
                  Live Trace
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="font" className="flex-1 m-0 p-6">
                <div className="h-full flex flex-col items-center justify-center bg-muted rounded-xl relative">
                  <FontPreviewDisplay 
                    character={settings.character} 
                    fontFile={settings.fontFile}
                    uploadedFont={uploadedFont}
                    large={true}
                  />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <Badge variant="secondary" className="text-sm">
                      {settings.fontFile 
                        ? settings.fontOverride || settings.fontFile
                        : uploadedFont 
                          ? uploadedFont.familyName
                          : 'System Font (Auto-detect)'
                      }
                    </Badge>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="3d" className="flex-1 m-0 p-4">
                <div className="h-full min-h-[500px]">
                  <WebGLErrorBoundary fallback={<PreviewFallback character={settings.character} />}>
                    <Canvas shadows camera={{ position: [150, 150, 150], fov: 50 }}>
                      <ambientLight intensity={0.4} />
                      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
                      <SymbolPreview character={settings.character} settings={settings} />
                      <OrbitControls makeDefault />
                      <Environment preset="studio" />
                    </Canvas>
                  </WebGLErrorBoundary>
                </div>
              </TabsContent>
              
              <TabsContent value="trace" className="flex-1 m-0 p-6">
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="text-center space-y-4">
                    {!showTrace ? (
                      <>
                        <div className="text-6xl mb-4">{settings.character}</div>
                        <Button
                          size="lg"
                          onClick={fetchGlyphPaths}
                          disabled={isLoadingTrace || !settings.character}
                          data-testid="button-start-trace"
                        >
                          {isLoadingTrace ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Extracting Paths...
                            </>
                          ) : (
                            <>
                              <Eye className="h-5 w-5 mr-2" />
                              Start Live Trace Animation
                            </>
                          )}
                        </Button>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Watch the Scott Algorithm trace the glyph paths in real-time using Douglas-Peucker simplification
                        </p>
                      </>
                    ) : pathData ? (
                      <div className="space-y-4">
                        <GlyphPathVisualization 
                          pathData={pathData}
                          animationStep={animationStep}
                          character={settings.character}
                          large={true}
                        />
                        <div className="flex gap-4 justify-center">
                          <div className="p-3 bg-muted rounded-lg text-center min-w-[80px]">
                            <div className="text-2xl font-bold text-primary">{pathData.pathCount}</div>
                            <div className="text-xs text-muted-foreground">Paths</div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg text-center min-w-[80px]">
                            <div className="text-2xl font-bold text-green-500">{pathData.originalPoints}</div>
                            <div className="text-xs text-muted-foreground">Original</div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg text-center min-w-[80px]">
                            <div className="text-2xl font-bold text-blue-500">{pathData.simplifiedPoints}</div>
                            <div className="text-xs text-muted-foreground">Simplified</div>
                          </div>
                          <div className="p-3 bg-muted rounded-lg text-center min-w-[80px]">
                            <div className="text-2xl font-bold text-purple-500">
                              {Math.round((1 - pathData.simplifiedPoints / pathData.originalPoints) * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Reduction</div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowTrace(false);
                            setPathData(null);
                            setAnimationStep(0);
                          }}
                          data-testid="button-reset-trace"
                        >
                          Reset Trace
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
