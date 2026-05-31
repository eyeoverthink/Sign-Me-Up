import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Search, 
  Smile,
  ArrowLeft,
  Copy,
  Sparkles,
  Download,
  Zap,
  Filter
} from "lucide-react";

// Emoji with name and keywords for search
interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

// Comprehensive emoji database with searchable names
const EMOJI_DATABASE: Record<string, EmojiItem[]> = {
  "Smileys": [
    { emoji: "😀", name: "Grinning Face", keywords: ["happy", "smile", "joy"] },
    { emoji: "😃", name: "Grinning Big Eyes", keywords: ["happy", "joy", "excited"] },
    { emoji: "😄", name: "Grinning Smiling Eyes", keywords: ["happy", "laugh", "cheerful"] },
    { emoji: "😁", name: "Beaming Face", keywords: ["grin", "happy", "teeth"] },
    { emoji: "😆", name: "Squinting Face", keywords: ["laugh", "satisfied", "xd"] },
    { emoji: "🥹", name: "Holding Back Tears", keywords: ["emotional", "touched", "grateful"] },
    { emoji: "😅", name: "Sweat Smile", keywords: ["nervous", "relief", "awkward"] },
    { emoji: "😂", name: "Joy Tears", keywords: ["laugh", "cry", "lol", "funny"] },
    { emoji: "🤣", name: "Rolling Laughing", keywords: ["rofl", "lmao", "hilarious"] },
    { emoji: "🥲", name: "Smiling Tear", keywords: ["grateful", "touched", "bittersweet"] },
    { emoji: "☺️", name: "Smiling Face", keywords: ["happy", "content", "pleased"] },
    { emoji: "😊", name: "Smiling Blush", keywords: ["happy", "warm", "shy"] },
    { emoji: "😇", name: "Smiling Halo", keywords: ["angel", "innocent", "blessed"] },
    { emoji: "🙂", name: "Slight Smile", keywords: ["ok", "fine", "neutral"] },
    { emoji: "🙃", name: "Upside Down", keywords: ["silly", "sarcasm", "ironic"] },
    { emoji: "😉", name: "Winking", keywords: ["flirt", "joke", "playful"] },
    { emoji: "😌", name: "Relieved", keywords: ["peaceful", "calm", "zen"] },
    { emoji: "😍", name: "Heart Eyes", keywords: ["love", "crush", "adore"] },
    { emoji: "🥰", name: "Hearts Face", keywords: ["love", "adore", "affection"] },
    { emoji: "😘", name: "Kissing Heart", keywords: ["love", "kiss", "mwah"] },
    { emoji: "😗", name: "Kissing", keywords: ["kiss", "whistle", "pucker"] },
    { emoji: "😙", name: "Kissing Smiling", keywords: ["kiss", "happy", "sweet"] },
    { emoji: "😚", name: "Kissing Closed", keywords: ["kiss", "love", "affection"] },
    { emoji: "😋", name: "Yummy", keywords: ["delicious", "tasty", "food"] },
    { emoji: "😛", name: "Tongue Out", keywords: ["playful", "silly", "teasing"] },
    { emoji: "😝", name: "Squinting Tongue", keywords: ["playful", "fun", "silly"] },
    { emoji: "😜", name: "Winking Tongue", keywords: ["playful", "joke", "teasing"] },
    { emoji: "🤪", name: "Zany Face", keywords: ["crazy", "wild", "goofy"] },
    { emoji: "🤨", name: "Raised Eyebrow", keywords: ["skeptical", "suspicious", "doubt"] },
    { emoji: "🧐", name: "Monocle", keywords: ["inspect", "curious", "investigate"] },
    { emoji: "🤓", name: "Nerd Face", keywords: ["geek", "smart", "glasses"] },
    { emoji: "😎", name: "Sunglasses", keywords: ["cool", "chill", "confident"] },
    { emoji: "🥸", name: "Disguised", keywords: ["incognito", "spy", "hidden"] },
    { emoji: "🤩", name: "Star Eyes", keywords: ["excited", "wow", "amazing"] },
    { emoji: "🥳", name: "Partying", keywords: ["celebration", "birthday", "party"] },
    { emoji: "😏", name: "Smirking", keywords: ["smug", "flirt", "suggestive"] },
    { emoji: "😒", name: "Unamused", keywords: ["bored", "annoyed", "meh"] },
    { emoji: "😞", name: "Disappointed", keywords: ["sad", "let down", "upset"] },
    { emoji: "😔", name: "Pensive", keywords: ["sad", "thoughtful", "reflective"] },
    { emoji: "😟", name: "Worried", keywords: ["concerned", "anxious", "nervous"] },
    { emoji: "😕", name: "Confused", keywords: ["puzzled", "unsure", "uncertain"] },
    { emoji: "🙁", name: "Slightly Frowning", keywords: ["sad", "unhappy", "disappointed"] },
    { emoji: "☹️", name: "Frowning", keywords: ["sad", "unhappy", "upset"] },
    { emoji: "😣", name: "Persevering", keywords: ["struggling", "effort", "trying"] },
    { emoji: "😖", name: "Confounded", keywords: ["frustrated", "stressed", "upset"] },
    { emoji: "😫", name: "Tired Face", keywords: ["exhausted", "weary", "done"] },
    { emoji: "😩", name: "Weary", keywords: ["tired", "frustrated", "overwhelmed"] },
    { emoji: "🥺", name: "Pleading", keywords: ["puppy eyes", "please", "begging"] },
    { emoji: "😢", name: "Crying", keywords: ["sad", "tear", "upset"] },
    { emoji: "😭", name: "Loudly Crying", keywords: ["sob", "sad", "bawling"] },
    { emoji: "😤", name: "Huffing", keywords: ["angry", "frustrated", "annoyed"] },
    { emoji: "😠", name: "Angry", keywords: ["mad", "upset", "grumpy"] },
    { emoji: "😡", name: "Pouting", keywords: ["angry", "rage", "furious"] },
    { emoji: "🤬", name: "Cursing", keywords: ["swearing", "angry", "mad"] },
    { emoji: "🤯", name: "Mind Blown", keywords: ["shocked", "exploding", "amazed"] },
    { emoji: "😳", name: "Flushed", keywords: ["embarrassed", "shy", "surprised"] },
    { emoji: "🥵", name: "Hot Face", keywords: ["sweating", "heat", "warm"] },
    { emoji: "🥶", name: "Cold Face", keywords: ["freezing", "ice", "cold"] },
    { emoji: "😶‍🌫️", name: "Face in Clouds", keywords: ["foggy", "confused", "dreamy"] },
    { emoji: "😱", name: "Screaming", keywords: ["fear", "shocked", "horror"] },
    { emoji: "😨", name: "Fearful", keywords: ["scared", "afraid", "worried"] },
    { emoji: "😰", name: "Anxious Sweat", keywords: ["nervous", "worried", "stressed"] },
    { emoji: "😥", name: "Sad Relieved", keywords: ["disappointed", "phew", "bittersweet"] },
    { emoji: "😓", name: "Downcast Sweat", keywords: ["tired", "stressed", "working"] },
    { emoji: "🤗", name: "Hugging", keywords: ["hug", "warm", "embrace"] },
    { emoji: "🤔", name: "Thinking", keywords: ["hmm", "wonder", "pondering"] },
    { emoji: "🫣", name: "Peeking", keywords: ["shy", "curious", "hiding"] },
    { emoji: "🤭", name: "Hand Over Mouth", keywords: ["oops", "giggle", "secret"] },
    { emoji: "🫢", name: "Hand Open Mouth", keywords: ["surprised", "shocked", "gasp"] },
    { emoji: "🫡", name: "Saluting", keywords: ["salute", "respect", "honor"] },
    { emoji: "🤫", name: "Shushing", keywords: ["quiet", "secret", "hush"] },
    { emoji: "🫠", name: "Melting", keywords: ["hot", "embarrassed", "dissolving"] },
    { emoji: "🤥", name: "Lying", keywords: ["liar", "pinocchio", "fibbing"] },
    { emoji: "😶", name: "No Mouth", keywords: ["speechless", "silent", "mute"] },
    { emoji: "🫥", name: "Dotted Line", keywords: ["invisible", "hidden", "disappear"] },
    { emoji: "😐", name: "Neutral", keywords: ["meh", "indifferent", "blank"] },
    { emoji: "🫤", name: "Diagonal Mouth", keywords: ["unsure", "meh", "skeptical"] },
    { emoji: "😑", name: "Expressionless", keywords: ["blank", "unamused", "annoyed"] },
    { emoji: "🫨", name: "Shaking", keywords: ["vibrating", "shocked", "surprised"] },
    { emoji: "😬", name: "Grimacing", keywords: ["awkward", "nervous", "yikes"] },
    { emoji: "🙄", name: "Rolling Eyes", keywords: ["whatever", "bored", "annoyed"] },
    { emoji: "😯", name: "Hushed", keywords: ["surprised", "quiet", "wow"] },
    { emoji: "😦", name: "Frowning Open", keywords: ["anguish", "worried", "shocked"] },
    { emoji: "😧", name: "Anguished", keywords: ["distressed", "shocked", "worried"] },
    { emoji: "😮", name: "Open Mouth", keywords: ["surprised", "wow", "gasp"] },
    { emoji: "😲", name: "Astonished", keywords: ["shocked", "amazed", "surprised"] },
    { emoji: "🥱", name: "Yawning", keywords: ["tired", "sleepy", "bored"] },
    { emoji: "😴", name: "Sleeping", keywords: ["zzz", "tired", "asleep"] },
    { emoji: "🤤", name: "Drooling", keywords: ["hungry", "yum", "delicious"] },
    { emoji: "😪", name: "Sleepy", keywords: ["tired", "drowsy", "exhausted"] },
    { emoji: "😮‍💨", name: "Exhaling", keywords: ["relief", "sigh", "phew"] },
    { emoji: "😵", name: "Dizzy Face", keywords: ["shocked", "dead", "overwhelmed"] },
    { emoji: "😵‍💫", name: "Spiral Eyes", keywords: ["dizzy", "hypnotized", "confused"] },
    { emoji: "🤐", name: "Zipper Mouth", keywords: ["quiet", "secret", "sealed"] },
    { emoji: "🥴", name: "Woozy", keywords: ["dizzy", "drunk", "tipsy"] },
    { emoji: "🤢", name: "Nauseated", keywords: ["sick", "gross", "disgusted"] },
    { emoji: "🤮", name: "Vomiting", keywords: ["sick", "puke", "throw up"] },
    { emoji: "🤧", name: "Sneezing", keywords: ["cold", "allergies", "achoo"] },
    { emoji: "😷", name: "Mask", keywords: ["sick", "covid", "doctor"] },
    { emoji: "🤒", name: "Thermometer", keywords: ["fever", "sick", "ill"] },
    { emoji: "🤕", name: "Bandage Head", keywords: ["hurt", "injured", "accident"] },
    { emoji: "🤑", name: "Money Mouth", keywords: ["rich", "cash", "dollar"] },
    { emoji: "🤠", name: "Cowboy", keywords: ["western", "yeehaw", "country"] },
    { emoji: "😈", name: "Devil Smile", keywords: ["evil", "mischief", "naughty"] },
    { emoji: "👿", name: "Angry Devil", keywords: ["evil", "demon", "mad"] },
    { emoji: "👹", name: "Ogre", keywords: ["monster", "scary", "japanese"] },
    { emoji: "👺", name: "Goblin", keywords: ["tengu", "japanese", "monster"] },
    { emoji: "🤡", name: "Clown", keywords: ["circus", "funny", "joker"] },
    { emoji: "💩", name: "Poop", keywords: ["poo", "crap", "funny"] },
    { emoji: "👻", name: "Ghost", keywords: ["spooky", "halloween", "boo"] },
    { emoji: "💀", name: "Skull", keywords: ["dead", "death", "skeleton"] },
    { emoji: "☠️", name: "Skull Crossbones", keywords: ["danger", "death", "poison"] },
    { emoji: "👽", name: "Alien", keywords: ["ufo", "space", "extraterrestrial"] },
    { emoji: "👾", name: "Alien Monster", keywords: ["game", "space invader", "pixel"] },
    { emoji: "🤖", name: "Robot", keywords: ["machine", "android", "bot"] },
    { emoji: "🎃", name: "Jack O Lantern", keywords: ["halloween", "pumpkin", "spooky"] },
    { emoji: "😺", name: "Smiling Cat", keywords: ["happy", "cat", "pet"] },
    { emoji: "😸", name: "Grinning Cat", keywords: ["happy", "cat", "smile"] },
    { emoji: "😹", name: "Joy Cat", keywords: ["laughing", "cat", "tears"] },
    { emoji: "😻", name: "Heart Eyes Cat", keywords: ["love", "cat", "adore"] },
    { emoji: "😼", name: "Smirk Cat", keywords: ["smug", "cat", "confident"] },
    { emoji: "😽", name: "Kissing Cat", keywords: ["kiss", "cat", "love"] },
    { emoji: "🙀", name: "Weary Cat", keywords: ["shocked", "cat", "scared"] },
    { emoji: "😿", name: "Crying Cat", keywords: ["sad", "cat", "tear"] },
    { emoji: "😾", name: "Pouting Cat", keywords: ["angry", "cat", "grumpy"] }
  ],
  "Gestures": [
    { emoji: "🫶", name: "Heart Hands", keywords: ["love", "heart", "affection"] },
    { emoji: "🤲", name: "Palms Up", keywords: ["prayer", "offering", "hands"] },
    { emoji: "👐", name: "Open Hands", keywords: ["hug", "jazz hands", "open"] },
    { emoji: "🙌", name: "Raising Hands", keywords: ["celebration", "hooray", "praise"] },
    { emoji: "👏", name: "Clapping", keywords: ["applause", "bravo", "congrats"] },
    { emoji: "🤝", name: "Handshake", keywords: ["deal", "agreement", "greeting"] },
    { emoji: "👍", name: "Thumbs Up", keywords: ["like", "good", "approve"] },
    { emoji: "👎", name: "Thumbs Down", keywords: ["dislike", "bad", "disapprove"] },
    { emoji: "👊", name: "Fist Bump", keywords: ["punch", "power", "bro"] },
    { emoji: "✊", name: "Raised Fist", keywords: ["power", "solidarity", "fight"] },
    { emoji: "🤛", name: "Left Fist", keywords: ["fist bump", "punch", "left"] },
    { emoji: "🤜", name: "Right Fist", keywords: ["fist bump", "punch", "right"] },
    { emoji: "🤞", name: "Crossed Fingers", keywords: ["luck", "hope", "wish"] },
    { emoji: "✌️", name: "Victory", keywords: ["peace", "two", "v sign"] },
    { emoji: "🫰", name: "Heart Finger", keywords: ["korean heart", "love", "kpop"] },
    { emoji: "🤟", name: "Love You", keywords: ["ily", "sign language", "love"] },
    { emoji: "🤘", name: "Rock On", keywords: ["metal", "rock", "horns"] },
    { emoji: "👌", name: "OK Hand", keywords: ["perfect", "good", "nice"] },
    { emoji: "🤌", name: "Pinched Fingers", keywords: ["italian", "chef kiss", "perfect"] },
    { emoji: "🤏", name: "Pinching", keywords: ["small", "tiny", "little"] },
    { emoji: "👈", name: "Point Left", keywords: ["left", "direction", "this way"] },
    { emoji: "👉", name: "Point Right", keywords: ["right", "direction", "that way"] },
    { emoji: "👆", name: "Point Up", keywords: ["up", "above", "look"] },
    { emoji: "👇", name: "Point Down", keywords: ["down", "below", "look"] },
    { emoji: "☝️", name: "Index Up", keywords: ["one", "wait", "attention"] },
    { emoji: "✋", name: "Raised Hand", keywords: ["stop", "high five", "wave"] },
    { emoji: "🤚", name: "Back Hand", keywords: ["stop", "raised", "halt"] },
    { emoji: "🖐️", name: "Hand Fingers", keywords: ["five", "wave", "hi"] },
    { emoji: "🖖", name: "Vulcan Salute", keywords: ["spock", "star trek", "live long"] },
    { emoji: "👋", name: "Waving", keywords: ["hello", "goodbye", "hi"] },
    { emoji: "🤙", name: "Call Me", keywords: ["shaka", "hang loose", "phone"] },
    { emoji: "💪", name: "Flexed Biceps", keywords: ["strong", "muscle", "power"] },
    { emoji: "🦾", name: "Mechanical Arm", keywords: ["robot", "prosthetic", "cyborg"] },
    { emoji: "🖕", name: "Middle Finger", keywords: ["rude", "f you", "offensive"] },
    { emoji: "✍️", name: "Writing Hand", keywords: ["write", "sign", "pen"] },
    { emoji: "🙏", name: "Folded Hands", keywords: ["pray", "please", "thank you"] },
    { emoji: "🫵", name: "Pointing You", keywords: ["you", "pointing", "accusation"] },
    { emoji: "🦶", name: "Foot", keywords: ["kick", "feet", "step"] },
    { emoji: "🦵", name: "Leg", keywords: ["kick", "limb", "knee"] },
    { emoji: "💋", name: "Kiss Mark", keywords: ["lips", "kiss", "love"] },
    { emoji: "👄", name: "Mouth", keywords: ["lips", "kiss", "talk"] },
    { emoji: "🦷", name: "Tooth", keywords: ["dentist", "teeth", "bite"] },
    { emoji: "👅", name: "Tongue", keywords: ["lick", "taste", "bleh"] },
    { emoji: "👂", name: "Ear", keywords: ["listen", "hear", "sound"] },
    { emoji: "👃", name: "Nose", keywords: ["smell", "sniff", "face"] },
    { emoji: "👀", name: "Eyes", keywords: ["look", "see", "watching"] },
    { emoji: "👁️", name: "Eye", keywords: ["see", "vision", "look"] },
    { emoji: "🧠", name: "Brain", keywords: ["think", "smart", "mind"] },
    { emoji: "🫀", name: "Heart Organ", keywords: ["heartbeat", "anatomical", "love"] },
    { emoji: "🫁", name: "Lungs", keywords: ["breathe", "respiratory", "air"] },
    { emoji: "👤", name: "Silhouette", keywords: ["person", "user", "profile"] },
    { emoji: "👥", name: "Silhouettes", keywords: ["people", "group", "users"] },
    { emoji: "🫂", name: "Hugging", keywords: ["embrace", "hug", "comfort"] }
  ],
  "Animals": [
    { emoji: "🐶", name: "Dog Face", keywords: ["puppy", "pet", "cute"] },
    { emoji: "🐱", name: "Cat Face", keywords: ["kitty", "pet", "meow"] },
    { emoji: "🐭", name: "Mouse Face", keywords: ["rodent", "cute", "cheese"] },
    { emoji: "🐹", name: "Hamster", keywords: ["pet", "rodent", "cute"] },
    { emoji: "🐰", name: "Rabbit", keywords: ["bunny", "easter", "cute"] },
    { emoji: "🦊", name: "Fox", keywords: ["clever", "orange", "wild"] },
    { emoji: "🐻", name: "Bear", keywords: ["teddy", "brown", "wild"] },
    { emoji: "🐼", name: "Panda", keywords: ["bamboo", "china", "cute"] },
    { emoji: "🐻‍❄️", name: "Polar Bear", keywords: ["arctic", "white", "cold"] },
    { emoji: "🐨", name: "Koala", keywords: ["australia", "eucalyptus", "cute"] },
    { emoji: "🐯", name: "Tiger Face", keywords: ["wild", "stripes", "fierce"] },
    { emoji: "🦁", name: "Lion", keywords: ["king", "wild", "mane"] },
    { emoji: "🐮", name: "Cow Face", keywords: ["farm", "milk", "moo"] },
    { emoji: "🐷", name: "Pig Face", keywords: ["farm", "oink", "pink"] },
    { emoji: "🐸", name: "Frog", keywords: ["ribbit", "green", "amphibian"] },
    { emoji: "🐵", name: "Monkey Face", keywords: ["ape", "primate", "banana"] },
    { emoji: "🙈", name: "See No Evil", keywords: ["monkey", "hide", "shy"] },
    { emoji: "🙉", name: "Hear No Evil", keywords: ["monkey", "ignore", "ears"] },
    { emoji: "🙊", name: "Speak No Evil", keywords: ["monkey", "secret", "quiet"] },
    { emoji: "🐔", name: "Chicken", keywords: ["hen", "farm", "poultry"] },
    { emoji: "🐧", name: "Penguin", keywords: ["arctic", "cold", "bird"] },
    { emoji: "🐦", name: "Bird", keywords: ["tweet", "fly", "wing"] },
    { emoji: "🐤", name: "Baby Chick", keywords: ["chicken", "cute", "yellow"] },
    { emoji: "🦆", name: "Duck", keywords: ["quack", "bird", "pond"] },
    { emoji: "🦅", name: "Eagle", keywords: ["bird", "america", "fly"] },
    { emoji: "🦉", name: "Owl", keywords: ["night", "wise", "hoot"] },
    { emoji: "🦇", name: "Bat", keywords: ["vampire", "night", "flying"] },
    { emoji: "🐺", name: "Wolf", keywords: ["wild", "howl", "dog"] },
    { emoji: "🐴", name: "Horse Face", keywords: ["ride", "pony", "neigh"] },
    { emoji: "🦄", name: "Unicorn", keywords: ["magic", "fantasy", "rainbow"] },
    { emoji: "🐝", name: "Bee", keywords: ["honey", "buzz", "insect"] },
    { emoji: "🐛", name: "Bug", keywords: ["insect", "caterpillar", "worm"] },
    { emoji: "🦋", name: "Butterfly", keywords: ["insect", "pretty", "wings"] },
    { emoji: "🐌", name: "Snail", keywords: ["slow", "shell", "slug"] },
    { emoji: "🐞", name: "Ladybug", keywords: ["insect", "red", "spots"] },
    { emoji: "🐜", name: "Ant", keywords: ["insect", "colony", "small"] },
    { emoji: "🕷️", name: "Spider", keywords: ["web", "insect", "creepy"] },
    { emoji: "🦂", name: "Scorpion", keywords: ["desert", "sting", "zodiac"] },
    { emoji: "🐢", name: "Turtle", keywords: ["slow", "shell", "reptile"] },
    { emoji: "🐍", name: "Snake", keywords: ["reptile", "slither", "hiss"] },
    { emoji: "🦎", name: "Lizard", keywords: ["reptile", "gecko", "scales"] },
    { emoji: "🦖", name: "T-Rex", keywords: ["dinosaur", "prehistoric", "extinct"] },
    { emoji: "🦕", name: "Sauropod", keywords: ["dinosaur", "prehistoric", "long neck"] },
    { emoji: "🐙", name: "Octopus", keywords: ["sea", "tentacles", "ocean"] },
    { emoji: "🦑", name: "Squid", keywords: ["sea", "ocean", "calamari"] },
    { emoji: "🦐", name: "Shrimp", keywords: ["seafood", "ocean", "prawn"] },
    { emoji: "🦞", name: "Lobster", keywords: ["seafood", "ocean", "crab"] },
    { emoji: "🦀", name: "Crab", keywords: ["beach", "seafood", "ocean"] },
    { emoji: "🐡", name: "Blowfish", keywords: ["fish", "puffer", "ocean"] },
    { emoji: "🐠", name: "Tropical Fish", keywords: ["ocean", "aquarium", "colorful"] },
    { emoji: "🐟", name: "Fish", keywords: ["ocean", "swim", "seafood"] },
    { emoji: "🐬", name: "Dolphin", keywords: ["ocean", "smart", "swim"] },
    { emoji: "🐳", name: "Spouting Whale", keywords: ["ocean", "big", "water"] },
    { emoji: "🐋", name: "Whale", keywords: ["ocean", "humpback", "big"] },
    { emoji: "🦈", name: "Shark", keywords: ["ocean", "jaws", "scary"] },
    { emoji: "🐊", name: "Crocodile", keywords: ["alligator", "reptile", "swamp"] },
    { emoji: "🐅", name: "Tiger", keywords: ["wild", "stripes", "cat"] },
    { emoji: "🐆", name: "Leopard", keywords: ["wild", "spots", "cat"] },
    { emoji: "🦓", name: "Zebra", keywords: ["stripes", "africa", "horse"] },
    { emoji: "🦍", name: "Gorilla", keywords: ["ape", "strong", "primate"] },
    { emoji: "🐘", name: "Elephant", keywords: ["big", "trunk", "africa"] },
    { emoji: "🦛", name: "Hippo", keywords: ["africa", "river", "big"] },
    { emoji: "🦏", name: "Rhino", keywords: ["horn", "africa", "endangered"] },
    { emoji: "🐪", name: "Camel", keywords: ["desert", "hump", "ride"] },
    { emoji: "🐫", name: "Two-Hump Camel", keywords: ["desert", "bactrian", "ride"] },
    { emoji: "🦒", name: "Giraffe", keywords: ["tall", "africa", "spots"] },
    { emoji: "🦘", name: "Kangaroo", keywords: ["australia", "hop", "pouch"] },
    { emoji: "🐃", name: "Water Buffalo", keywords: ["farm", "asia", "animal"] },
    { emoji: "🐂", name: "Ox", keywords: ["farm", "strong", "bull"] },
    { emoji: "🐄", name: "Cow", keywords: ["farm", "milk", "moo"] },
    { emoji: "🐎", name: "Horse", keywords: ["race", "ride", "gallop"] },
    { emoji: "🐖", name: "Pig", keywords: ["farm", "oink", "bacon"] },
    { emoji: "🐏", name: "Ram", keywords: ["sheep", "horns", "farm"] },
    { emoji: "🐑", name: "Sheep", keywords: ["wool", "farm", "baa"] },
    { emoji: "🦙", name: "Llama", keywords: ["alpaca", "south america", "wool"] },
    { emoji: "🐐", name: "Goat", keywords: ["farm", "horns", "greatest"] },
    { emoji: "🦌", name: "Deer", keywords: ["forest", "antlers", "bambi"] },
    { emoji: "🐕", name: "Dog", keywords: ["pet", "puppy", "woof"] },
    { emoji: "🐩", name: "Poodle", keywords: ["dog", "fancy", "pet"] },
    { emoji: "🐈", name: "Cat", keywords: ["pet", "kitty", "meow"] },
    { emoji: "🐓", name: "Rooster", keywords: ["chicken", "farm", "crow"] },
    { emoji: "🦃", name: "Turkey", keywords: ["thanksgiving", "bird", "gobble"] },
    { emoji: "🦚", name: "Peacock", keywords: ["bird", "feathers", "beautiful"] },
    { emoji: "🦜", name: "Parrot", keywords: ["bird", "tropical", "talk"] },
    { emoji: "🦢", name: "Swan", keywords: ["bird", "elegant", "white"] },
    { emoji: "🦩", name: "Flamingo", keywords: ["bird", "pink", "tropical"] },
    { emoji: "🕊️", name: "Dove", keywords: ["peace", "bird", "white"] },
    { emoji: "🐇", name: "Rabbit", keywords: ["bunny", "hop", "cute"] },
    { emoji: "🦝", name: "Raccoon", keywords: ["trash panda", "nocturnal", "cute"] },
    { emoji: "🦨", name: "Skunk", keywords: ["stinky", "black white", "spray"] },
    { emoji: "🦡", name: "Badger", keywords: ["honey badger", "animal", "fierce"] },
    { emoji: "🦫", name: "Beaver", keywords: ["dam", "wood", "tail"] },
    { emoji: "🦦", name: "Otter", keywords: ["cute", "water", "swim"] },
    { emoji: "🦥", name: "Sloth", keywords: ["slow", "lazy", "hanging"] },
    { emoji: "🐁", name: "Mouse", keywords: ["rodent", "small", "cheese"] },
    { emoji: "🐀", name: "Rat", keywords: ["rodent", "pest", "sewer"] },
    { emoji: "🐿️", name: "Chipmunk", keywords: ["squirrel", "acorn", "cute"] },
    { emoji: "🦔", name: "Hedgehog", keywords: ["spiny", "cute", "sonic"] },
    { emoji: "🐾", name: "Paw Prints", keywords: ["animal", "tracks", "pet"] },
    { emoji: "🐉", name: "Dragon", keywords: ["mythical", "fire", "chinese"] },
    { emoji: "🐲", name: "Dragon Face", keywords: ["chinese", "new year", "mythical"] },
    { emoji: "🐦‍🔥", name: "Phoenix", keywords: ["fire bird", "rebirth", "mythical"] }
  ],
  "Nature": [
    { emoji: "🌵", name: "Cactus", keywords: ["desert", "plant", "prickly"] },
    { emoji: "🎄", name: "Christmas Tree", keywords: ["holiday", "festive", "december"] },
    { emoji: "🌲", name: "Evergreen", keywords: ["tree", "forest", "pine"] },
    { emoji: "🌳", name: "Deciduous Tree", keywords: ["tree", "nature", "forest"] },
    { emoji: "🌴", name: "Palm Tree", keywords: ["tropical", "beach", "vacation"] },
    { emoji: "🌱", name: "Seedling", keywords: ["plant", "grow", "new"] },
    { emoji: "🌿", name: "Herb", keywords: ["plant", "green", "nature"] },
    { emoji: "☘️", name: "Shamrock", keywords: ["irish", "luck", "clover"] },
    { emoji: "🍀", name: "Four Leaf Clover", keywords: ["lucky", "irish", "fortune"] },
    { emoji: "🎍", name: "Pine Decoration", keywords: ["japanese", "new year", "bamboo"] },
    { emoji: "🪴", name: "Potted Plant", keywords: ["houseplant", "indoor", "green"] },
    { emoji: "🍃", name: "Leaves", keywords: ["wind", "nature", "green"] },
    { emoji: "🍂", name: "Fallen Leaf", keywords: ["autumn", "fall", "orange"] },
    { emoji: "🍁", name: "Maple Leaf", keywords: ["canada", "fall", "autumn"] },
    { emoji: "🍄", name: "Mushroom", keywords: ["fungus", "forest", "mario"] },
    { emoji: "🐚", name: "Shell", keywords: ["beach", "ocean", "sea"] },
    { emoji: "🪸", name: "Coral", keywords: ["ocean", "reef", "sea"] },
    { emoji: "🪨", name: "Rock", keywords: ["stone", "boulder", "geology"] },
    { emoji: "🌾", name: "Sheaf Rice", keywords: ["grain", "farm", "harvest"] },
    { emoji: "💐", name: "Bouquet", keywords: ["flowers", "gift", "romantic"] },
    { emoji: "🌷", name: "Tulip", keywords: ["flower", "spring", "netherlands"] },
    { emoji: "🌹", name: "Rose", keywords: ["flower", "love", "romantic"] },
    { emoji: "🥀", name: "Wilted Flower", keywords: ["dead", "sad", "dying"] },
    { emoji: "🌺", name: "Hibiscus", keywords: ["flower", "tropical", "hawaii"] },
    { emoji: "🌸", name: "Cherry Blossom", keywords: ["flower", "japan", "spring"] },
    { emoji: "🌼", name: "Blossom", keywords: ["flower", "spring", "yellow"] },
    { emoji: "🌻", name: "Sunflower", keywords: ["flower", "summer", "yellow"] },
    { emoji: "🌞", name: "Sun with Face", keywords: ["sunny", "happy", "warm"] },
    { emoji: "🌝", name: "Full Moon Face", keywords: ["moon", "night", "creepy"] },
    { emoji: "🌛", name: "First Quarter Moon Face", keywords: ["moon", "night", "smile"] },
    { emoji: "🌜", name: "Last Quarter Moon Face", keywords: ["moon", "night", "smile"] },
    { emoji: "🌕", name: "Full Moon", keywords: ["night", "lunar", "werewolf"] },
    { emoji: "🌙", name: "Crescent Moon", keywords: ["night", "sleep", "dream"] },
    { emoji: "🌎", name: "Earth Americas", keywords: ["world", "globe", "planet"] },
    { emoji: "🌍", name: "Earth Europe Africa", keywords: ["world", "globe", "planet"] },
    { emoji: "🌏", name: "Earth Asia Australia", keywords: ["world", "globe", "planet"] },
    { emoji: "🪐", name: "Ringed Planet", keywords: ["saturn", "space", "planet"] },
    { emoji: "💫", name: "Dizzy", keywords: ["star", "sparkle", "shooting"] },
    { emoji: "⭐", name: "Star", keywords: ["night", "sky", "favorite"] },
    { emoji: "🌟", name: "Glowing Star", keywords: ["sparkle", "shine", "amazing"] },
    { emoji: "✨", name: "Sparkles", keywords: ["magic", "shine", "clean"] },
    { emoji: "⚡", name: "Lightning", keywords: ["bolt", "thunder", "electric"] },
    { emoji: "☄️", name: "Comet", keywords: ["space", "shooting star", "meteor"] },
    { emoji: "💥", name: "Collision", keywords: ["boom", "explosion", "crash"] },
    { emoji: "🔥", name: "Fire", keywords: ["flame", "hot", "lit"] },
    { emoji: "🌪️", name: "Tornado", keywords: ["storm", "wind", "cyclone"] },
    { emoji: "🌈", name: "Rainbow", keywords: ["colors", "gay", "pride"] },
    { emoji: "☀️", name: "Sun", keywords: ["sunny", "bright", "hot"] },
    { emoji: "⛅", name: "Partly Cloudy", keywords: ["weather", "sun", "cloud"] },
    { emoji: "☁️", name: "Cloud", keywords: ["weather", "sky", "overcast"] },
    { emoji: "🌧️", name: "Cloud with Rain", keywords: ["rainy", "weather", "wet"] },
    { emoji: "⛈️", name: "Cloud Lightning Rain", keywords: ["storm", "thunder", "weather"] },
    { emoji: "❄️", name: "Snowflake", keywords: ["cold", "winter", "frozen"] },
    { emoji: "☃️", name: "Snowman", keywords: ["winter", "cold", "christmas"] },
    { emoji: "⛄", name: "Snowman No Snow", keywords: ["winter", "cold", "frosty"] },
    { emoji: "🌬️", name: "Wind Face", keywords: ["blow", "breeze", "air"] },
    { emoji: "💨", name: "Dashing Away", keywords: ["wind", "fast", "run"] },
    { emoji: "💧", name: "Water Drop", keywords: ["sweat", "rain", "tear"] },
    { emoji: "💦", name: "Sweat Droplets", keywords: ["water", "splash", "wet"] },
    { emoji: "🫧", name: "Bubbles", keywords: ["soap", "water", "bath"] },
    { emoji: "☔", name: "Umbrella Rain", keywords: ["rainy", "wet", "weather"] },
    { emoji: "🌊", name: "Wave", keywords: ["ocean", "sea", "water", "surf"] },
    { emoji: "🌫️", name: "Fog", keywords: ["weather", "mist", "hazy"] }
  ],
  "Food": [
    { emoji: "🍎", name: "Red Apple", keywords: ["fruit", "healthy", "teacher"] },
    { emoji: "🍏", name: "Green Apple", keywords: ["fruit", "healthy", "sour"] },
    { emoji: "🍐", name: "Pear", keywords: ["fruit", "green", "healthy"] },
    { emoji: "🍊", name: "Orange", keywords: ["fruit", "citrus", "vitamin c"] },
    { emoji: "🍋", name: "Lemon", keywords: ["fruit", "sour", "yellow"] },
    { emoji: "🍌", name: "Banana", keywords: ["fruit", "monkey", "yellow"] },
    { emoji: "🍉", name: "Watermelon", keywords: ["fruit", "summer", "juicy"] },
    { emoji: "🍇", name: "Grapes", keywords: ["fruit", "wine", "purple"] },
    { emoji: "🍓", name: "Strawberry", keywords: ["fruit", "berry", "red"] },
    { emoji: "🫐", name: "Blueberries", keywords: ["fruit", "berry", "blue"] },
    { emoji: "🍈", name: "Melon", keywords: ["fruit", "honeydew", "green"] },
    { emoji: "🍒", name: "Cherries", keywords: ["fruit", "red", "pair"] },
    { emoji: "🍑", name: "Peach", keywords: ["fruit", "butt", "fuzzy"] },
    { emoji: "🥭", name: "Mango", keywords: ["fruit", "tropical", "sweet"] },
    { emoji: "🍍", name: "Pineapple", keywords: ["fruit", "tropical", "pizza"] },
    { emoji: "🥥", name: "Coconut", keywords: ["fruit", "tropical", "palm"] },
    { emoji: "🥝", name: "Kiwi", keywords: ["fruit", "green", "fuzzy"] },
    { emoji: "🍅", name: "Tomato", keywords: ["vegetable", "red", "sauce"] },
    { emoji: "🍆", name: "Eggplant", keywords: ["vegetable", "aubergine", "purple"] },
    { emoji: "🥑", name: "Avocado", keywords: ["fruit", "guacamole", "toast"] },
    { emoji: "🥦", name: "Broccoli", keywords: ["vegetable", "green", "healthy"] },
    { emoji: "🥬", name: "Leafy Green", keywords: ["vegetable", "lettuce", "salad"] },
    { emoji: "🥒", name: "Cucumber", keywords: ["vegetable", "pickle", "green"] },
    { emoji: "🌶️", name: "Hot Pepper", keywords: ["spicy", "chili", "red"] },
    { emoji: "🫑", name: "Bell Pepper", keywords: ["vegetable", "sweet", "green"] },
    { emoji: "🌽", name: "Corn", keywords: ["vegetable", "maize", "cob"] },
    { emoji: "🥕", name: "Carrot", keywords: ["vegetable", "orange", "bunny"] },
    { emoji: "🧄", name: "Garlic", keywords: ["vegetable", "spice", "vampire"] },
    { emoji: "🧅", name: "Onion", keywords: ["vegetable", "cry", "layers"] },
    { emoji: "🥔", name: "Potato", keywords: ["vegetable", "starch", "fries"] },
    { emoji: "🍠", name: "Sweet Potato", keywords: ["vegetable", "orange", "yam"] },
    { emoji: "🥐", name: "Croissant", keywords: ["bread", "french", "pastry"] },
    { emoji: "🥯", name: "Bagel", keywords: ["bread", "breakfast", "cream cheese"] },
    { emoji: "🍞", name: "Bread", keywords: ["toast", "loaf", "bakery"] },
    { emoji: "🥖", name: "Baguette", keywords: ["bread", "french", "long"] },
    { emoji: "🥨", name: "Pretzel", keywords: ["snack", "salty", "twisted"] },
    { emoji: "🧀", name: "Cheese", keywords: ["dairy", "cheddar", "mouse"] },
    { emoji: "🥚", name: "Egg", keywords: ["breakfast", "chicken", "oval"] },
    { emoji: "🍳", name: "Cooking", keywords: ["egg", "frying", "breakfast"] },
    { emoji: "🧈", name: "Butter", keywords: ["dairy", "spread", "toast"] },
    { emoji: "🥞", name: "Pancakes", keywords: ["breakfast", "syrup", "stack"] },
    { emoji: "🧇", name: "Waffle", keywords: ["breakfast", "syrup", "belgian"] },
    { emoji: "🥓", name: "Bacon", keywords: ["meat", "breakfast", "pork"] },
    { emoji: "🥩", name: "Cut of Meat", keywords: ["steak", "beef", "raw"] },
    { emoji: "🍗", name: "Poultry Leg", keywords: ["chicken", "drumstick", "turkey"] },
    { emoji: "🍖", name: "Meat on Bone", keywords: ["steak", "rib", "bbq"] },
    { emoji: "🌭", name: "Hot Dog", keywords: ["sausage", "frankfurter", "ballpark"] },
    { emoji: "🍔", name: "Hamburger", keywords: ["burger", "beef", "fast food"] },
    { emoji: "🍟", name: "French Fries", keywords: ["chips", "potato", "fast food"] },
    { emoji: "🍕", name: "Pizza", keywords: ["slice", "italian", "cheese"] },
    { emoji: "🥪", name: "Sandwich", keywords: ["lunch", "bread", "deli"] },
    { emoji: "🥙", name: "Pita", keywords: ["falafel", "middle eastern", "wrap"] },
    { emoji: "🧆", name: "Falafel", keywords: ["middle eastern", "vegetarian", "chickpea"] },
    { emoji: "🌮", name: "Taco", keywords: ["mexican", "shell", "tuesday"] },
    { emoji: "🌯", name: "Burrito", keywords: ["mexican", "wrap", "bean"] },
    { emoji: "🥗", name: "Salad", keywords: ["healthy", "green", "vegetable"] },
    { emoji: "🥘", name: "Shallow Pan", keywords: ["paella", "curry", "cooking"] },
    { emoji: "🥫", name: "Canned Food", keywords: ["soup", "preserved", "tin"] },
    { emoji: "🍝", name: "Spaghetti", keywords: ["pasta", "italian", "noodles"] },
    { emoji: "🍜", name: "Steaming Bowl", keywords: ["ramen", "noodles", "soup"] },
    { emoji: "🍲", name: "Pot of Food", keywords: ["stew", "soup", "hot"] },
    { emoji: "🍛", name: "Curry Rice", keywords: ["indian", "japanese", "spicy"] },
    { emoji: "🍣", name: "Sushi", keywords: ["japanese", "fish", "rice"] },
    { emoji: "🍱", name: "Bento Box", keywords: ["japanese", "lunch", "meal"] },
    { emoji: "🥟", name: "Dumpling", keywords: ["asian", "chinese", "pierogi"] },
    { emoji: "🍤", name: "Fried Shrimp", keywords: ["tempura", "seafood", "prawn"] },
    { emoji: "🍙", name: "Rice Ball", keywords: ["onigiri", "japanese", "nori"] },
    { emoji: "🍚", name: "Cooked Rice", keywords: ["bowl", "asian", "grain"] },
    { emoji: "🍘", name: "Rice Cracker", keywords: ["snack", "japanese", "senbei"] },
    { emoji: "🍧", name: "Shaved Ice", keywords: ["dessert", "cold", "sweet"] },
    { emoji: "🍨", name: "Ice Cream", keywords: ["dessert", "cold", "sweet"] },
    { emoji: "🍦", name: "Soft Ice Cream", keywords: ["cone", "dessert", "summer"] },
    { emoji: "🥧", name: "Pie", keywords: ["dessert", "baked", "slice"] },
    { emoji: "🧁", name: "Cupcake", keywords: ["dessert", "cake", "frosting"] },
    { emoji: "🍰", name: "Shortcake", keywords: ["dessert", "strawberry", "cake"] },
    { emoji: "🎂", name: "Birthday Cake", keywords: ["party", "candles", "celebration"] },
    { emoji: "🍮", name: "Custard", keywords: ["dessert", "pudding", "flan"] },
    { emoji: "🍭", name: "Lollipop", keywords: ["candy", "sweet", "sucker"] },
    { emoji: "🍬", name: "Candy", keywords: ["sweet", "wrapper", "sugar"] },
    { emoji: "🍫", name: "Chocolate Bar", keywords: ["candy", "sweet", "cocoa"] },
    { emoji: "🍿", name: "Popcorn", keywords: ["movie", "snack", "theater"] },
    { emoji: "🍩", name: "Doughnut", keywords: ["donut", "sweet", "fried"] },
    { emoji: "🍪", name: "Cookie", keywords: ["biscuit", "sweet", "chocolate chip"] },
    { emoji: "🌰", name: "Chestnut", keywords: ["nut", "fall", "autumn"] },
    { emoji: "🥜", name: "Peanuts", keywords: ["nut", "legume", "snack"] },
    { emoji: "🍯", name: "Honey Pot", keywords: ["sweet", "bee", "golden"] }
  ],
  "Drinks": [
    { emoji: "🥛", name: "Glass of Milk", keywords: ["dairy", "white", "drink"] },
    { emoji: "🍼", name: "Baby Bottle", keywords: ["milk", "infant", "drink"] },
    { emoji: "🫖", name: "Teapot", keywords: ["tea", "brew", "ceramic"] },
    { emoji: "☕", name: "Hot Beverage", keywords: ["coffee", "tea", "drink"] },
    { emoji: "🍵", name: "Teacup", keywords: ["tea", "green", "japanese"] },
    { emoji: "🧉", name: "Mate", keywords: ["tea", "south american", "gourd"] },
    { emoji: "🧃", name: "Juice Box", keywords: ["drink", "kids", "straw"] },
    { emoji: "🥤", name: "Cup with Straw", keywords: ["soda", "drink", "fast food"] },
    { emoji: "🧋", name: "Bubble Tea", keywords: ["boba", "milk tea", "tapioca"] },
    { emoji: "🍶", name: "Sake", keywords: ["japanese", "alcohol", "rice wine"] },
    { emoji: "🍺", name: "Beer Mug", keywords: ["alcohol", "drink", "bar"] },
    { emoji: "🍻", name: "Clinking Beer", keywords: ["cheers", "toast", "celebrate"] },
    { emoji: "🥂", name: "Clinking Glasses", keywords: ["champagne", "toast", "celebrate"] },
    { emoji: "🍷", name: "Wine Glass", keywords: ["alcohol", "red", "drink"] },
    { emoji: "🥃", name: "Tumbler Glass", keywords: ["whiskey", "alcohol", "rocks"] },
    { emoji: "🍸", name: "Cocktail Glass", keywords: ["martini", "alcohol", "bar"] },
    { emoji: "🍹", name: "Tropical Drink", keywords: ["cocktail", "vacation", "umbrella"] },
    { emoji: "🍾", name: "Champagne", keywords: ["celebrate", "bottle", "pop"] },
    { emoji: "🧊", name: "Ice", keywords: ["cold", "cube", "frozen"] },
    { emoji: "🥄", name: "Spoon", keywords: ["utensil", "eat", "silverware"] },
    { emoji: "🍴", name: "Fork and Knife", keywords: ["utensil", "eat", "restaurant"] },
    { emoji: "🍽️", name: "Plate with Cutlery", keywords: ["dining", "meal", "eat"] },
    { emoji: "🥣", name: "Bowl with Spoon", keywords: ["cereal", "soup", "breakfast"] },
    { emoji: "🥡", name: "Takeout Box", keywords: ["chinese", "food", "container"] },
    { emoji: "🥢", name: "Chopsticks", keywords: ["asian", "eat", "utensil"] },
    { emoji: "🧂", name: "Salt", keywords: ["seasoning", "shaker", "spice"] }
  ],
  "Sports": [
    { emoji: "⚽", name: "Soccer Ball", keywords: ["football", "sport", "goal"] },
    { emoji: "🏀", name: "Basketball", keywords: ["sport", "ball", "nba"] },
    { emoji: "🏈", name: "American Football", keywords: ["sport", "nfl", "touchdown"] },
    { emoji: "⚾", name: "Baseball", keywords: ["sport", "mlb", "ball"] },
    { emoji: "🥎", name: "Softball", keywords: ["sport", "ball", "game"] },
    { emoji: "🎾", name: "Tennis", keywords: ["sport", "ball", "racket"] },
    { emoji: "🏐", name: "Volleyball", keywords: ["sport", "beach", "ball"] },
    { emoji: "🏉", name: "Rugby", keywords: ["sport", "ball", "football"] },
    { emoji: "🥏", name: "Flying Disc", keywords: ["frisbee", "sport", "throw"] },
    { emoji: "🎱", name: "Pool 8 Ball", keywords: ["billiards", "game", "bar"] },
    { emoji: "🏓", name: "Ping Pong", keywords: ["table tennis", "sport", "paddle"] },
    { emoji: "🏸", name: "Badminton", keywords: ["sport", "shuttlecock", "racket"] },
    { emoji: "🏒", name: "Ice Hockey", keywords: ["sport", "nhl", "puck"] },
    { emoji: "🏑", name: "Field Hockey", keywords: ["sport", "stick", "ball"] },
    { emoji: "🥍", name: "Lacrosse", keywords: ["sport", "stick", "ball"] },
    { emoji: "🏏", name: "Cricket", keywords: ["sport", "bat", "wicket"] },
    { emoji: "🪃", name: "Boomerang", keywords: ["throw", "australia", "return"] },
    { emoji: "🥅", name: "Goal Net", keywords: ["sport", "soccer", "hockey"] },
    { emoji: "⛳", name: "Golf", keywords: ["sport", "hole", "flag"] },
    { emoji: "🪁", name: "Kite", keywords: ["fly", "wind", "toy"] },
    { emoji: "🏹", name: "Bow and Arrow", keywords: ["archery", "sport", "shoot"] },
    { emoji: "🎣", name: "Fishing", keywords: ["fish", "rod", "sport"] },
    { emoji: "🤿", name: "Diving Mask", keywords: ["scuba", "snorkel", "swim"] },
    { emoji: "🥊", name: "Boxing Glove", keywords: ["fight", "sport", "punch"] },
    { emoji: "🥋", name: "Martial Arts", keywords: ["karate", "judo", "uniform"] },
    { emoji: "🎽", name: "Running Shirt", keywords: ["sport", "race", "marathon"] },
    { emoji: "🛹", name: "Skateboard", keywords: ["sport", "skate", "trick"] },
    { emoji: "🛼", name: "Roller Skate", keywords: ["skating", "retro", "disco"] },
    { emoji: "🛷", name: "Sled", keywords: ["winter", "snow", "slide"] },
    { emoji: "⛸️", name: "Ice Skate", keywords: ["skating", "winter", "figure"] },
    { emoji: "🥌", name: "Curling Stone", keywords: ["sport", "ice", "winter"] },
    { emoji: "🎿", name: "Skis", keywords: ["skiing", "winter", "snow"] },
    { emoji: "⛷️", name: "Skier", keywords: ["skiing", "winter", "mountain"] },
    { emoji: "🏂", name: "Snowboarder", keywords: ["snowboarding", "winter", "sport"] },
    { emoji: "🪂", name: "Parachute", keywords: ["skydiving", "jump", "fall"] },
    { emoji: "🏆", name: "Trophy", keywords: ["winner", "award", "champion"] },
    { emoji: "🥇", name: "Gold Medal", keywords: ["first", "winner", "award"] },
    { emoji: "🥈", name: "Silver Medal", keywords: ["second", "runner up", "award"] },
    { emoji: "🥉", name: "Bronze Medal", keywords: ["third", "award", "place"] },
    { emoji: "🏅", name: "Sports Medal", keywords: ["award", "winner", "achievement"] },
    { emoji: "🎖️", name: "Military Medal", keywords: ["award", "honor", "service"] },
    { emoji: "🎗️", name: "Reminder Ribbon", keywords: ["awareness", "cause", "support"] },
    { emoji: "🎫", name: "Ticket", keywords: ["admission", "event", "pass"] },
    { emoji: "🎟️", name: "Admission Tickets", keywords: ["event", "show", "concert"] },
    { emoji: "🎪", name: "Circus Tent", keywords: ["carnival", "show", "entertainment"] },
    { emoji: "🎭", name: "Performing Arts", keywords: ["theater", "drama", "masks"] },
    { emoji: "🩰", name: "Ballet Shoes", keywords: ["dance", "pointe", "performance"] },
    { emoji: "🎨", name: "Artist Palette", keywords: ["paint", "art", "creative"] },
    { emoji: "🎬", name: "Clapper Board", keywords: ["movie", "film", "action"] },
    { emoji: "🎤", name: "Microphone", keywords: ["sing", "karaoke", "music"] },
    { emoji: "🎧", name: "Headphones", keywords: ["music", "listen", "audio"] },
    { emoji: "🎼", name: "Musical Score", keywords: ["music", "notes", "sheet"] },
    { emoji: "🎹", name: "Piano Keys", keywords: ["music", "keyboard", "play"] },
    { emoji: "🥁", name: "Drum", keywords: ["music", "beat", "percussion"] },
    { emoji: "🎷", name: "Saxophone", keywords: ["music", "jazz", "instrument"] },
    { emoji: "🎺", name: "Trumpet", keywords: ["music", "brass", "instrument"] },
    { emoji: "🎸", name: "Guitar", keywords: ["music", "rock", "instrument"] },
    { emoji: "🪕", name: "Banjo", keywords: ["music", "country", "instrument"] },
    { emoji: "🎻", name: "Violin", keywords: ["music", "classical", "instrument"] },
    { emoji: "🎲", name: "Game Die", keywords: ["dice", "game", "chance"] },
    { emoji: "♟️", name: "Chess Pawn", keywords: ["chess", "game", "strategy"] },
    { emoji: "🎯", name: "Bullseye", keywords: ["target", "dart", "aim"] },
    { emoji: "🎳", name: "Bowling", keywords: ["sport", "pins", "strike"] },
    { emoji: "🎮", name: "Video Game", keywords: ["controller", "gaming", "play"] },
    { emoji: "🎰", name: "Slot Machine", keywords: ["casino", "gambling", "jackpot"] },
    { emoji: "🧩", name: "Puzzle Piece", keywords: ["game", "jigsaw", "piece"] }
  ],
  "Travel": [
    { emoji: "🚗", name: "Car", keywords: ["automobile", "drive", "vehicle"] },
    { emoji: "🚕", name: "Taxi", keywords: ["cab", "yellow", "ride"] },
    { emoji: "🚙", name: "SUV", keywords: ["car", "sport utility", "vehicle"] },
    { emoji: "🛻", name: "Pickup Truck", keywords: ["vehicle", "truck", "hauling"] },
    { emoji: "🚐", name: "Minibus", keywords: ["van", "vehicle", "transport"] },
    { emoji: "🚌", name: "Bus", keywords: ["public transport", "vehicle", "ride"] },
    { emoji: "🏎️", name: "Racing Car", keywords: ["formula 1", "fast", "sport"] },
    { emoji: "🚓", name: "Police Car", keywords: ["cop", "law", "emergency"] },
    { emoji: "🚑", name: "Ambulance", keywords: ["emergency", "hospital", "medical"] },
    { emoji: "🚒", name: "Fire Engine", keywords: ["fire truck", "emergency", "rescue"] },
    { emoji: "🚚", name: "Delivery Truck", keywords: ["shipping", "freight", "moving"] },
    { emoji: "🚜", name: "Tractor", keywords: ["farm", "agriculture", "vehicle"] },
    { emoji: "🛴", name: "Kick Scooter", keywords: ["scooter", "ride", "transport"] },
    { emoji: "🚲", name: "Bicycle", keywords: ["bike", "cycle", "ride"] },
    { emoji: "🛵", name: "Motor Scooter", keywords: ["vespa", "moped", "ride"] },
    { emoji: "🏍️", name: "Motorcycle", keywords: ["bike", "chopper", "ride"] },
    { emoji: "🚨", name: "Police Light", keywords: ["emergency", "siren", "alert"] },
    { emoji: "🚄", name: "High-Speed Train", keywords: ["bullet train", "fast", "rail"] },
    { emoji: "🚅", name: "Bullet Train", keywords: ["shinkansen", "fast", "japan"] },
    { emoji: "🚂", name: "Locomotive", keywords: ["train", "steam", "engine"] },
    { emoji: "🚇", name: "Metro", keywords: ["subway", "underground", "train"] },
    { emoji: "✈️", name: "Airplane", keywords: ["plane", "fly", "travel"] },
    { emoji: "🛫", name: "Departure", keywords: ["plane", "takeoff", "airport"] },
    { emoji: "🛬", name: "Arrival", keywords: ["plane", "landing", "airport"] },
    { emoji: "🛩️", name: "Small Airplane", keywords: ["plane", "private", "jet"] },
    { emoji: "💺", name: "Seat", keywords: ["airplane", "chair", "sit"] },
    { emoji: "🚀", name: "Rocket", keywords: ["space", "launch", "fast"] },
    { emoji: "🛸", name: "Flying Saucer", keywords: ["ufo", "alien", "space"] },
    { emoji: "🚁", name: "Helicopter", keywords: ["chopper", "fly", "rescue"] },
    { emoji: "🛶", name: "Canoe", keywords: ["boat", "paddle", "kayak"] },
    { emoji: "⛵", name: "Sailboat", keywords: ["boat", "sailing", "yacht"] },
    { emoji: "🚤", name: "Speedboat", keywords: ["boat", "fast", "water"] },
    { emoji: "🛥️", name: "Motor Boat", keywords: ["yacht", "boat", "luxury"] },
    { emoji: "🛳️", name: "Passenger Ship", keywords: ["cruise", "boat", "travel"] },
    { emoji: "🚢", name: "Ship", keywords: ["boat", "ocean", "cargo"] },
    { emoji: "⚓", name: "Anchor", keywords: ["ship", "boat", "nautical"] },
    { emoji: "⛽", name: "Fuel Pump", keywords: ["gas", "petrol", "station"] },
    { emoji: "🚧", name: "Construction", keywords: ["barrier", "road work", "warning"] },
    { emoji: "🚦", name: "Traffic Light", keywords: ["signal", "stop", "road"] },
    { emoji: "🗺️", name: "World Map", keywords: ["travel", "geography", "earth"] },
    { emoji: "🗿", name: "Moai", keywords: ["easter island", "statue", "stone"] },
    { emoji: "🗽", name: "Statue of Liberty", keywords: ["new york", "usa", "landmark"] },
    { emoji: "🗼", name: "Tokyo Tower", keywords: ["japan", "landmark", "red"] },
    { emoji: "🏰", name: "Castle", keywords: ["medieval", "kingdom", "fairy tale"] },
    { emoji: "🏯", name: "Japanese Castle", keywords: ["japan", "landmark", "edo"] },
    { emoji: "🎡", name: "Ferris Wheel", keywords: ["amusement", "carnival", "park"] },
    { emoji: "🎢", name: "Roller Coaster", keywords: ["amusement", "theme park", "ride"] },
    { emoji: "🎠", name: "Carousel Horse", keywords: ["merry-go-round", "amusement", "ride"] },
    { emoji: "⛲", name: "Fountain", keywords: ["water", "park", "decoration"] },
    { emoji: "🏖️", name: "Beach", keywords: ["vacation", "sand", "umbrella"] },
    { emoji: "🏝️", name: "Desert Island", keywords: ["tropical", "palm", "vacation"] },
    { emoji: "🏜️", name: "Desert", keywords: ["sand", "hot", "dry"] },
    { emoji: "🌋", name: "Volcano", keywords: ["lava", "eruption", "mountain"] },
    { emoji: "⛰️", name: "Mountain", keywords: ["hill", "peak", "nature"] },
    { emoji: "🏔️", name: "Snow-Capped Mountain", keywords: ["alps", "peak", "winter"] },
    { emoji: "🗻", name: "Mount Fuji", keywords: ["japan", "mountain", "volcano"] },
    { emoji: "🏕️", name: "Camping", keywords: ["tent", "outdoor", "nature"] },
    { emoji: "⛺", name: "Tent", keywords: ["camping", "outdoor", "shelter"] },
    { emoji: "🏠", name: "House", keywords: ["home", "building", "residential"] },
    { emoji: "🏡", name: "House with Garden", keywords: ["home", "yard", "suburban"] },
    { emoji: "🏗️", name: "Building Construction", keywords: ["crane", "work", "site"] },
    { emoji: "🏭", name: "Factory", keywords: ["industrial", "manufacturing", "smoke"] },
    { emoji: "🏢", name: "Office Building", keywords: ["work", "business", "corporate"] },
    { emoji: "🏬", name: "Department Store", keywords: ["shop", "mall", "retail"] },
    { emoji: "🏥", name: "Hospital", keywords: ["medical", "health", "doctor"] },
    { emoji: "🏦", name: "Bank", keywords: ["money", "finance", "building"] },
    { emoji: "🏨", name: "Hotel", keywords: ["lodging", "travel", "stay"] },
    { emoji: "🏪", name: "Convenience Store", keywords: ["shop", "24h", "retail"] },
    { emoji: "🏫", name: "School", keywords: ["education", "building", "learn"] },
    { emoji: "💒", name: "Wedding", keywords: ["church", "marriage", "chapel"] },
    { emoji: "🏛️", name: "Classical Building", keywords: ["museum", "bank", "government"] },
    { emoji: "⛪", name: "Church", keywords: ["religion", "christian", "worship"] },
    { emoji: "🕌", name: "Mosque", keywords: ["islam", "religion", "worship"] },
    { emoji: "🕍", name: "Synagogue", keywords: ["jewish", "religion", "worship"] },
    { emoji: "🕋", name: "Kaaba", keywords: ["islam", "mecca", "pilgrimage"] },
    { emoji: "⛩️", name: "Shinto Shrine", keywords: ["japan", "religion", "torii"] },
    { emoji: "🌅", name: "Sunrise", keywords: ["morning", "dawn", "beach"] },
    { emoji: "🌄", name: "Sunrise over Mountains", keywords: ["morning", "dawn", "scenic"] },
    { emoji: "🌠", name: "Shooting Star", keywords: ["night", "wish", "meteor"] },
    { emoji: "🎇", name: "Sparkler", keywords: ["firework", "celebration", "july 4th"] },
    { emoji: "🎆", name: "Fireworks", keywords: ["celebration", "new year", "festival"] },
    { emoji: "🌇", name: "Sunset", keywords: ["evening", "dusk", "city"] },
    { emoji: "🌆", name: "Cityscape at Dusk", keywords: ["evening", "urban", "skyline"] },
    { emoji: "🏙️", name: "Cityscape", keywords: ["urban", "skyline", "buildings"] },
    { emoji: "🌃", name: "Night with Stars", keywords: ["city", "evening", "urban"] },
    { emoji: "🌌", name: "Milky Way", keywords: ["galaxy", "night", "stars"] },
    { emoji: "🌉", name: "Bridge at Night", keywords: ["city", "san francisco", "lights"] },
    { emoji: "🌁", name: "Foggy", keywords: ["fog", "city", "golden gate"] }
  ],
  "Objects": [
    { emoji: "⌚", name: "Watch", keywords: ["time", "clock", "wrist"] },
    { emoji: "📱", name: "Mobile Phone", keywords: ["smartphone", "iphone", "cell"] },
    { emoji: "💻", name: "Laptop", keywords: ["computer", "mac", "work"] },
    { emoji: "⌨️", name: "Keyboard", keywords: ["computer", "type", "input"] },
    { emoji: "🖥️", name: "Desktop Computer", keywords: ["monitor", "pc", "screen"] },
    { emoji: "🖨️", name: "Printer", keywords: ["print", "paper", "office"] },
    { emoji: "🖱️", name: "Computer Mouse", keywords: ["click", "cursor", "input"] },
    { emoji: "🕹️", name: "Joystick", keywords: ["gaming", "controller", "arcade"] },
    { emoji: "💾", name: "Floppy Disk", keywords: ["save", "retro", "storage"] },
    { emoji: "💿", name: "CD", keywords: ["disc", "music", "dvd"] },
    { emoji: "📷", name: "Camera", keywords: ["photo", "picture", "capture"] },
    { emoji: "🎥", name: "Movie Camera", keywords: ["film", "video", "cinema"] },
    { emoji: "📹", name: "Video Camera", keywords: ["record", "film", "camcorder"] },
    { emoji: "📺", name: "Television", keywords: ["tv", "screen", "watch"] },
    { emoji: "📻", name: "Radio", keywords: ["music", "broadcast", "audio"] },
    { emoji: "🎙️", name: "Studio Microphone", keywords: ["podcast", "record", "audio"] },
    { emoji: "⏰", name: "Alarm Clock", keywords: ["time", "wake up", "morning"] },
    { emoji: "⌛", name: "Hourglass", keywords: ["time", "sand", "wait"] },
    { emoji: "⏳", name: "Hourglass Flowing", keywords: ["time", "sand", "running"] },
    { emoji: "📡", name: "Satellite Antenna", keywords: ["signal", "broadcast", "dish"] },
    { emoji: "🔋", name: "Battery", keywords: ["power", "charge", "energy"] },
    { emoji: "🔌", name: "Electric Plug", keywords: ["power", "charge", "outlet"] },
    { emoji: "💡", name: "Light Bulb", keywords: ["idea", "bright", "lamp"] },
    { emoji: "🔦", name: "Flashlight", keywords: ["light", "torch", "dark"] },
    { emoji: "🕯️", name: "Candle", keywords: ["light", "flame", "romantic"] },
    { emoji: "💵", name: "Dollar", keywords: ["money", "cash", "bill"] },
    { emoji: "💳", name: "Credit Card", keywords: ["payment", "money", "bank"] },
    { emoji: "💎", name: "Gem Stone", keywords: ["diamond", "jewel", "precious"] },
    { emoji: "⚖️", name: "Balance Scale", keywords: ["justice", "law", "weigh"] },
    { emoji: "🧰", name: "Toolbox", keywords: ["tools", "repair", "fix"] },
    { emoji: "🔧", name: "Wrench", keywords: ["tool", "fix", "mechanic"] },
    { emoji: "🔨", name: "Hammer", keywords: ["tool", "build", "nail"] },
    { emoji: "🛠️", name: "Hammer and Wrench", keywords: ["tools", "fix", "repair"] },
    { emoji: "⚙️", name: "Gear", keywords: ["settings", "cog", "mechanical"] },
    { emoji: "🔩", name: "Nut and Bolt", keywords: ["hardware", "screw", "tool"] },
    { emoji: "🧱", name: "Brick", keywords: ["build", "wall", "construction"] },
    { emoji: "🔫", name: "Water Pistol", keywords: ["gun", "squirt", "toy"] },
    { emoji: "💣", name: "Bomb", keywords: ["explode", "boom", "danger"] },
    { emoji: "🔪", name: "Kitchen Knife", keywords: ["cut", "chef", "cook"] },
    { emoji: "🗡️", name: "Dagger", keywords: ["knife", "sword", "weapon"] },
    { emoji: "⚔️", name: "Crossed Swords", keywords: ["battle", "fight", "weapon"] },
    { emoji: "🛡️", name: "Shield", keywords: ["protection", "defense", "armor"] },
    { emoji: "🔮", name: "Crystal Ball", keywords: ["fortune", "magic", "psychic"] },
    { emoji: "🧿", name: "Nazar Amulet", keywords: ["evil eye", "protection", "luck"] },
    { emoji: "🔭", name: "Telescope", keywords: ["astronomy", "stars", "see"] },
    { emoji: "🔬", name: "Microscope", keywords: ["science", "biology", "lab"] },
    { emoji: "💊", name: "Pill", keywords: ["medicine", "drug", "capsule"] },
    { emoji: "💉", name: "Syringe", keywords: ["injection", "shot", "vaccine"] },
    { emoji: "🩸", name: "Blood", keywords: ["red", "donate", "health"] },
    { emoji: "🧬", name: "DNA", keywords: ["genetics", "science", "biology"] },
    { emoji: "🦠", name: "Microbe", keywords: ["virus", "bacteria", "germ"] },
    { emoji: "🧪", name: "Test Tube", keywords: ["science", "lab", "chemistry"] },
    { emoji: "🌡️", name: "Thermometer", keywords: ["temperature", "fever", "hot"] },
    { emoji: "🧹", name: "Broom", keywords: ["clean", "sweep", "witch"] },
    { emoji: "🧺", name: "Basket", keywords: ["laundry", "picnic", "wicker"] },
    { emoji: "🧻", name: "Roll of Paper", keywords: ["toilet paper", "tissue", "tp"] },
    { emoji: "🚽", name: "Toilet", keywords: ["bathroom", "restroom", "wc"] },
    { emoji: "🚿", name: "Shower", keywords: ["bathroom", "wash", "clean"] },
    { emoji: "🛁", name: "Bathtub", keywords: ["bath", "clean", "relax"] },
    { emoji: "🧼", name: "Soap", keywords: ["clean", "wash", "hygiene"] },
    { emoji: "🪥", name: "Toothbrush", keywords: ["dental", "hygiene", "teeth"] },
    { emoji: "🪒", name: "Razor", keywords: ["shave", "grooming", "blade"] },
    { emoji: "🔑", name: "Key", keywords: ["lock", "unlock", "password"] },
    { emoji: "🗝️", name: "Old Key", keywords: ["vintage", "antique", "lock"] },
    { emoji: "🚪", name: "Door", keywords: ["entrance", "exit", "room"] },
    { emoji: "🪑", name: "Chair", keywords: ["seat", "sit", "furniture"] },
    { emoji: "🛋️", name: "Couch", keywords: ["sofa", "furniture", "living room"] },
    { emoji: "🛏️", name: "Bed", keywords: ["sleep", "bedroom", "rest"] },
    { emoji: "🧸", name: "Teddy Bear", keywords: ["toy", "stuffed", "plush"] },
    { emoji: "🖼️", name: "Framed Picture", keywords: ["art", "painting", "frame"] },
    { emoji: "🪞", name: "Mirror", keywords: ["reflection", "vanity", "glass"] },
    { emoji: "🛒", name: "Shopping Cart", keywords: ["grocery", "store", "buy"] },
    { emoji: "🎁", name: "Gift", keywords: ["present", "wrapped", "birthday"] },
    { emoji: "🎈", name: "Balloon", keywords: ["party", "birthday", "celebration"] },
    { emoji: "🎀", name: "Ribbon", keywords: ["gift", "bow", "decoration"] },
    { emoji: "🪄", name: "Magic Wand", keywords: ["wizard", "magic", "spell"] },
    { emoji: "🎊", name: "Confetti Ball", keywords: ["party", "celebration", "festive"] },
    { emoji: "🎉", name: "Party Popper", keywords: ["celebration", "birthday", "congrats"] },
    { emoji: "🏮", name: "Red Lantern", keywords: ["chinese", "festival", "light"] },
    { emoji: "✉️", name: "Envelope", keywords: ["mail", "letter", "email"] },
    { emoji: "📩", name: "Envelope with Arrow", keywords: ["email", "incoming", "mail"] },
    { emoji: "📧", name: "E-Mail", keywords: ["email", "message", "letter"] },
    { emoji: "💌", name: "Love Letter", keywords: ["romance", "heart", "mail"] },
    { emoji: "📦", name: "Package", keywords: ["box", "shipping", "delivery"] },
    { emoji: "🏷️", name: "Label", keywords: ["tag", "price", "sale"] },
    { emoji: "📪", name: "Closed Mailbox", keywords: ["mail", "post", "letter"] },
    { emoji: "📫", name: "Closed Mailbox Flag", keywords: ["mail", "post", "letter"] },
    { emoji: "📜", name: "Scroll", keywords: ["paper", "document", "ancient"] },
    { emoji: "📄", name: "Document", keywords: ["paper", "file", "page"] },
    { emoji: "📊", name: "Bar Chart", keywords: ["graph", "data", "statistics"] },
    { emoji: "📈", name: "Chart Increasing", keywords: ["graph", "growth", "up"] },
    { emoji: "📉", name: "Chart Decreasing", keywords: ["graph", "down", "loss"] },
    { emoji: "📅", name: "Calendar", keywords: ["date", "schedule", "event"] },
    { emoji: "📆", name: "Tear-Off Calendar", keywords: ["date", "schedule", "planner"] },
    { emoji: "📋", name: "Clipboard", keywords: ["list", "document", "checklist"] },
    { emoji: "📁", name: "File Folder", keywords: ["directory", "documents", "organize"] },
    { emoji: "📂", name: "Open File Folder", keywords: ["directory", "documents", "organize"] },
    { emoji: "📰", name: "Newspaper", keywords: ["news", "press", "article"] },
    { emoji: "📕", name: "Closed Book", keywords: ["read", "library", "red"] },
    { emoji: "📗", name: "Green Book", keywords: ["read", "library", "novel"] },
    { emoji: "📘", name: "Blue Book", keywords: ["read", "library", "study"] },
    { emoji: "📙", name: "Orange Book", keywords: ["read", "library", "novel"] },
    { emoji: "📚", name: "Books", keywords: ["library", "study", "reading"] },
    { emoji: "📖", name: "Open Book", keywords: ["read", "study", "novel"] },
    { emoji: "🔖", name: "Bookmark", keywords: ["marker", "save", "read"] },
    { emoji: "🔗", name: "Link", keywords: ["chain", "url", "connect"] },
    { emoji: "📎", name: "Paperclip", keywords: ["attach", "office", "clip"] },
    { emoji: "✂️", name: "Scissors", keywords: ["cut", "snip", "tool"] },
    { emoji: "📌", name: "Pushpin", keywords: ["pin", "location", "mark"] },
    { emoji: "📍", name: "Round Pushpin", keywords: ["location", "map", "pin"] },
    { emoji: "✏️", name: "Pencil", keywords: ["write", "draw", "school"] },
    { emoji: "🖊️", name: "Pen", keywords: ["write", "sign", "ink"] },
    { emoji: "📝", name: "Memo", keywords: ["note", "write", "document"] },
    { emoji: "🔍", name: "Magnifying Glass Left", keywords: ["search", "find", "zoom"] },
    { emoji: "🔎", name: "Magnifying Glass Right", keywords: ["search", "find", "zoom"] },
    { emoji: "🔒", name: "Locked", keywords: ["security", "private", "password"] },
    { emoji: "🔓", name: "Unlocked", keywords: ["open", "access", "security"] }
  ],
  "Hearts": [
    { emoji: "🩷", name: "Pink Heart", keywords: ["love", "pink", "affection"] },
    { emoji: "❤️", name: "Red Heart", keywords: ["love", "passion", "romance"] },
    { emoji: "🧡", name: "Orange Heart", keywords: ["love", "care", "friendship"] },
    { emoji: "💛", name: "Yellow Heart", keywords: ["love", "friendship", "happy"] },
    { emoji: "💚", name: "Green Heart", keywords: ["love", "envy", "nature"] },
    { emoji: "🩵", name: "Light Blue Heart", keywords: ["love", "calm", "peace"] },
    { emoji: "💙", name: "Blue Heart", keywords: ["love", "trust", "loyalty"] },
    { emoji: "💜", name: "Purple Heart", keywords: ["love", "compassion", "support"] },
    { emoji: "🖤", name: "Black Heart", keywords: ["dark", "gothic", "sad"] },
    { emoji: "🩶", name: "Grey Heart", keywords: ["neutral", "balance", "calm"] },
    { emoji: "🤍", name: "White Heart", keywords: ["pure", "clean", "love"] },
    { emoji: "🤎", name: "Brown Heart", keywords: ["nature", "earth", "warm"] },
    { emoji: "💔", name: "Broken Heart", keywords: ["sad", "heartbreak", "pain"] },
    { emoji: "❣️", name: "Heart Exclamation", keywords: ["love", "passion", "emphasis"] },
    { emoji: "💕", name: "Two Hearts", keywords: ["love", "couple", "romance"] },
    { emoji: "💞", name: "Revolving Hearts", keywords: ["love", "romance", "couple"] },
    { emoji: "💓", name: "Beating Heart", keywords: ["love", "alive", "pulse"] },
    { emoji: "💗", name: "Growing Heart", keywords: ["love", "growing", "affection"] },
    { emoji: "💖", name: "Sparkling Heart", keywords: ["love", "sparkle", "excited"] },
    { emoji: "💘", name: "Heart with Arrow", keywords: ["love", "cupid", "romance"] },
    { emoji: "💝", name: "Heart with Ribbon", keywords: ["gift", "love", "valentine"] },
    { emoji: "❤️‍🩹", name: "Mending Heart", keywords: ["healing", "recovery", "love"] },
    { emoji: "❤️‍🔥", name: "Heart on Fire", keywords: ["passion", "lust", "desire"] },
    { emoji: "💟", name: "Heart Decoration", keywords: ["love", "cute", "purple"] }
  ],
  "Symbols": [
    { emoji: "☮️", name: "Peace Symbol", keywords: ["peace", "hippie", "love"] },
    { emoji: "✝️", name: "Latin Cross", keywords: ["christian", "religion", "church"] },
    { emoji: "☪️", name: "Star and Crescent", keywords: ["islam", "muslim", "religion"] },
    { emoji: "🕉️", name: "Om", keywords: ["hindu", "buddhist", "religion"] },
    { emoji: "☸️", name: "Wheel of Dharma", keywords: ["buddhism", "religion", "karma"] },
    { emoji: "✡️", name: "Star of David", keywords: ["jewish", "judaism", "religion"] },
    { emoji: "🔯", name: "Dotted Six-Pointed Star", keywords: ["fortune", "luck", "star"] },
    { emoji: "🕎", name: "Menorah", keywords: ["jewish", "hanukkah", "religion"] },
    { emoji: "☯️", name: "Yin Yang", keywords: ["balance", "taoism", "peace"] },
    { emoji: "♈", name: "Aries", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♉", name: "Taurus", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♊", name: "Gemini", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♋", name: "Cancer", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♌", name: "Leo", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♍", name: "Virgo", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♎", name: "Libra", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♏", name: "Scorpio", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♐", name: "Sagittarius", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♑", name: "Capricorn", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♒", name: "Aquarius", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "♓", name: "Pisces", keywords: ["zodiac", "horoscope", "astrology"] },
    { emoji: "⚛️", name: "Atom Symbol", keywords: ["science", "physics", "nuclear"] },
    { emoji: "☢️", name: "Radioactive", keywords: ["nuclear", "danger", "radiation"] },
    { emoji: "☣️", name: "Biohazard", keywords: ["danger", "toxic", "warning"] },
    { emoji: "🆔", name: "ID Button", keywords: ["identity", "identification", "badge"] },
    { emoji: "🆚", name: "VS Button", keywords: ["versus", "against", "competition"] },
    { emoji: "🅰️", name: "A Button", keywords: ["blood type", "letter", "grade"] },
    { emoji: "🅱️", name: "B Button", keywords: ["blood type", "letter", "grade"] },
    { emoji: "🆎", name: "AB Button", keywords: ["blood type", "letter", "grade"] },
    { emoji: "🅾️", name: "O Button", keywords: ["blood type", "letter", "zero"] },
    { emoji: "🆘", name: "SOS Button", keywords: ["help", "emergency", "distress"] },
    { emoji: "❌", name: "Cross Mark", keywords: ["no", "wrong", "delete"] },
    { emoji: "⭕", name: "Hollow Red Circle", keywords: ["correct", "right", "ok"] },
    { emoji: "🛑", name: "Stop Sign", keywords: ["halt", "red", "octagon"] },
    { emoji: "⛔", name: "No Entry", keywords: ["prohibited", "forbidden", "stop"] },
    { emoji: "🚫", name: "Prohibited", keywords: ["no", "banned", "forbidden"] },
    { emoji: "💯", name: "Hundred Points", keywords: ["perfect", "score", "100"] },
    { emoji: "💢", name: "Anger Symbol", keywords: ["angry", "mad", "furious"] },
    { emoji: "♨️", name: "Hot Springs", keywords: ["steam", "bath", "onsen"] },
    { emoji: "🔞", name: "No One Under Eighteen", keywords: ["adult", "18+", "restricted"] },
    { emoji: "❗", name: "Exclamation Mark", keywords: ["warning", "important", "attention"] },
    { emoji: "❓", name: "Question Mark", keywords: ["help", "confused", "what"] },
    { emoji: "‼️", name: "Double Exclamation", keywords: ["important", "warning", "urgent"] },
    { emoji: "⁉️", name: "Exclamation Question", keywords: ["surprised", "interrobang", "what"] },
    { emoji: "⚠️", name: "Warning", keywords: ["caution", "alert", "danger"] },
    { emoji: "🔱", name: "Trident Emblem", keywords: ["poseidon", "sea", "anchor"] },
    { emoji: "⚜️", name: "Fleur-de-lis", keywords: ["french", "royalty", "scout"] },
    { emoji: "♻️", name: "Recycling Symbol", keywords: ["recycle", "environment", "green"] },
    { emoji: "✅", name: "Check Mark Button", keywords: ["done", "complete", "yes"] },
    { emoji: "❇️", name: "Sparkle", keywords: ["new", "clean", "shiny"] },
    { emoji: "✳️", name: "Eight Spoked Asterisk", keywords: ["star", "sparkle", "special"] },
    { emoji: "❎", name: "Cross Mark Button", keywords: ["no", "wrong", "x"] },
    { emoji: "🌐", name: "Globe with Meridians", keywords: ["world", "internet", "web"] },
    { emoji: "💠", name: "Diamond with Dot", keywords: ["cute", "kawaii", "sparkle"] },
    { emoji: "Ⓜ️", name: "Circled M", keywords: ["metro", "subway", "letter"] },
    { emoji: "🌀", name: "Cyclone", keywords: ["hurricane", "spiral", "dizzy"] },
    { emoji: "💤", name: "Zzz", keywords: ["sleep", "tired", "snore"] },
    { emoji: "♿", name: "Wheelchair Symbol", keywords: ["accessibility", "disabled", "handicap"] },
    { emoji: "🅿️", name: "P Button", keywords: ["parking", "car", "lot"] },
    { emoji: "🚹", name: "Men's Room", keywords: ["bathroom", "toilet", "male"] },
    { emoji: "🚺", name: "Women's Room", keywords: ["bathroom", "toilet", "female"] },
    { emoji: "🚻", name: "Restroom", keywords: ["bathroom", "toilet", "wc"] },
    { emoji: "🚼", name: "Baby Symbol", keywords: ["child", "infant", "nursery"] },
    { emoji: "📶", name: "Antenna Bars", keywords: ["signal", "wifi", "cellular"] },
    { emoji: "🔣", name: "Input Symbols", keywords: ["characters", "text", "keyboard"] },
    { emoji: "ℹ️", name: "Information", keywords: ["info", "help", "about"] },
    { emoji: "🔤", name: "Input Latin", keywords: ["abc", "alphabet", "letters"] },
    { emoji: "🆗", name: "OK Button", keywords: ["okay", "yes", "agree"] },
    { emoji: "🆕", name: "NEW Button", keywords: ["new", "fresh", "latest"] },
    { emoji: "🆓", name: "FREE Button", keywords: ["gratis", "no cost", "complimentary"] },
    { emoji: "0️⃣", name: "Keycap 0", keywords: ["zero", "number", "digit"] },
    { emoji: "1️⃣", name: "Keycap 1", keywords: ["one", "number", "digit"] },
    { emoji: "2️⃣", name: "Keycap 2", keywords: ["two", "number", "digit"] },
    { emoji: "3️⃣", name: "Keycap 3", keywords: ["three", "number", "digit"] },
    { emoji: "4️⃣", name: "Keycap 4", keywords: ["four", "number", "digit"] },
    { emoji: "5️⃣", name: "Keycap 5", keywords: ["five", "number", "digit"] },
    { emoji: "6️⃣", name: "Keycap 6", keywords: ["six", "number", "digit"] },
    { emoji: "7️⃣", name: "Keycap 7", keywords: ["seven", "number", "digit"] },
    { emoji: "8️⃣", name: "Keycap 8", keywords: ["eight", "number", "digit"] },
    { emoji: "9️⃣", name: "Keycap 9", keywords: ["nine", "number", "digit"] },
    { emoji: "🔟", name: "Keycap 10", keywords: ["ten", "number", "digit"] },
    { emoji: "#️⃣", name: "Keycap #", keywords: ["hashtag", "pound", "number"] },
    { emoji: "*️⃣", name: "Keycap *", keywords: ["asterisk", "star", "multiply"] },
    { emoji: "▶️", name: "Play Button", keywords: ["play", "start", "video"] },
    { emoji: "⏸️", name: "Pause Button", keywords: ["pause", "stop", "wait"] },
    { emoji: "⏹️", name: "Stop Button", keywords: ["stop", "end", "halt"] },
    { emoji: "⏩", name: "Fast Forward", keywords: ["skip", "forward", "fast"] },
    { emoji: "⏪", name: "Rewind", keywords: ["back", "reverse", "rewind"] },
    { emoji: "🔼", name: "Upwards Button", keywords: ["up", "arrow", "increase"] },
    { emoji: "🔽", name: "Downwards Button", keywords: ["down", "arrow", "decrease"] },
    { emoji: "➡️", name: "Right Arrow", keywords: ["right", "direction", "next"] },
    { emoji: "⬅️", name: "Left Arrow", keywords: ["left", "direction", "back"] },
    { emoji: "⬆️", name: "Up Arrow", keywords: ["up", "direction", "north"] },
    { emoji: "⬇️", name: "Down Arrow", keywords: ["down", "direction", "south"] },
    { emoji: "↗️", name: "Up-Right Arrow", keywords: ["northeast", "direction", "diagonal"] },
    { emoji: "↘️", name: "Down-Right Arrow", keywords: ["southeast", "direction", "diagonal"] },
    { emoji: "↙️", name: "Down-Left Arrow", keywords: ["southwest", "direction", "diagonal"] },
    { emoji: "↖️", name: "Up-Left Arrow", keywords: ["northwest", "direction", "diagonal"] },
    { emoji: "↕️", name: "Up-Down Arrow", keywords: ["vertical", "direction", "resize"] },
    { emoji: "↔️", name: "Left-Right Arrow", keywords: ["horizontal", "direction", "resize"] },
    { emoji: "🔄", name: "Anticlockwise Arrows", keywords: ["refresh", "sync", "reload"] },
    { emoji: "🎵", name: "Musical Note", keywords: ["music", "song", "melody"] },
    { emoji: "🎶", name: "Musical Notes", keywords: ["music", "song", "melody"] },
    { emoji: "➕", name: "Plus", keywords: ["add", "positive", "increase"] },
    { emoji: "➖", name: "Minus", keywords: ["subtract", "negative", "decrease"] },
    { emoji: "➗", name: "Divide", keywords: ["division", "math", "split"] },
    { emoji: "✖️", name: "Multiply", keywords: ["times", "math", "x"] },
    { emoji: "♾️", name: "Infinity", keywords: ["forever", "endless", "eternal"] },
    { emoji: "💲", name: "Dollar Sign", keywords: ["money", "price", "currency"] },
    { emoji: "™️", name: "Trade Mark", keywords: ["trademark", "brand", "legal"] },
    { emoji: "©️", name: "Copyright", keywords: ["legal", "intellectual", "property"] },
    { emoji: "®️", name: "Registered", keywords: ["trademark", "legal", "brand"] },
    { emoji: "✔️", name: "Check Mark", keywords: ["correct", "done", "yes"] },
    { emoji: "☑️", name: "Ballot Box Check", keywords: ["vote", "tick", "done"] },
    { emoji: "🔘", name: "Radio Button", keywords: ["select", "option", "choice"] },
    { emoji: "⚪", name: "White Circle", keywords: ["round", "dot", "neutral"] },
    { emoji: "⚫", name: "Black Circle", keywords: ["round", "dot", "dark"] },
    { emoji: "🔴", name: "Red Circle", keywords: ["round", "dot", "stop"] },
    { emoji: "🔵", name: "Blue Circle", keywords: ["round", "dot", "icon"] },
    { emoji: "🟤", name: "Brown Circle", keywords: ["round", "dot", "earth"] },
    { emoji: "🟣", name: "Purple Circle", keywords: ["round", "dot", "violet"] },
    { emoji: "🟢", name: "Green Circle", keywords: ["round", "dot", "go"] },
    { emoji: "🟡", name: "Yellow Circle", keywords: ["round", "dot", "caution"] },
    { emoji: "🟠", name: "Orange Circle", keywords: ["round", "dot", "warm"] },
    { emoji: "🔺", name: "Red Triangle Up", keywords: ["arrow", "up", "red"] },
    { emoji: "🔻", name: "Red Triangle Down", keywords: ["arrow", "down", "red"] },
    { emoji: "🔶", name: "Large Orange Diamond", keywords: ["shape", "gem", "orange"] },
    { emoji: "🔷", name: "Large Blue Diamond", keywords: ["shape", "gem", "blue"] },
    { emoji: "🔳", name: "White Square Button", keywords: ["shape", "input", "white"] },
    { emoji: "🔲", name: "Black Square Button", keywords: ["shape", "input", "black"] },
    { emoji: "▪️", name: "Black Small Square", keywords: ["shape", "dot", "black"] },
    { emoji: "▫️", name: "White Small Square", keywords: ["shape", "dot", "white"] },
    { emoji: "◼️", name: "Black Medium Square", keywords: ["shape", "black", "solid"] },
    { emoji: "◻️", name: "White Medium Square", keywords: ["shape", "white", "empty"] },
    { emoji: "⬛", name: "Black Large Square", keywords: ["shape", "black", "solid"] },
    { emoji: "⬜", name: "White Large Square", keywords: ["shape", "white", "empty"] },
    { emoji: "🟧", name: "Orange Square", keywords: ["shape", "orange", "box"] },
    { emoji: "🟦", name: "Blue Square", keywords: ["shape", "blue", "box"] },
    { emoji: "🟥", name: "Red Square", keywords: ["shape", "red", "box"] },
    { emoji: "🟫", name: "Brown Square", keywords: ["shape", "brown", "box"] },
    { emoji: "🟪", name: "Purple Square", keywords: ["shape", "purple", "box"] },
    { emoji: "🟩", name: "Green Square", keywords: ["shape", "green", "box"] },
    { emoji: "🟨", name: "Yellow Square", keywords: ["shape", "yellow", "box"] },
    { emoji: "🔔", name: "Bell", keywords: ["notification", "alert", "ring"] },
    { emoji: "🔕", name: "Bell with Slash", keywords: ["mute", "silent", "quiet"] },
    { emoji: "📣", name: "Megaphone", keywords: ["announce", "loud", "cheer"] },
    { emoji: "📢", name: "Loudspeaker", keywords: ["announce", "public", "sound"] },
    { emoji: "💬", name: "Speech Balloon", keywords: ["chat", "talk", "message"] },
    { emoji: "💭", name: "Thought Balloon", keywords: ["think", "idea", "dream"] },
    { emoji: "🗯️", name: "Right Anger Bubble", keywords: ["angry", "shout", "yell"] },
    { emoji: "♠️", name: "Spade Suit", keywords: ["cards", "poker", "game"] },
    { emoji: "♣️", name: "Club Suit", keywords: ["cards", "poker", "game"] },
    { emoji: "♥️", name: "Heart Suit", keywords: ["cards", "poker", "love"] },
    { emoji: "♦️", name: "Diamond Suit", keywords: ["cards", "poker", "game"] },
    { emoji: "🃏", name: "Joker", keywords: ["cards", "wild", "game"] },
    { emoji: "🎴", name: "Flower Playing Cards", keywords: ["cards", "japanese", "hanafuda"] },
    { emoji: "🀄", name: "Mahjong Red Dragon", keywords: ["game", "tiles", "chinese"] },
    { emoji: "♀️", name: "Female Sign", keywords: ["woman", "gender", "venus"] },
    { emoji: "♂️", name: "Male Sign", keywords: ["man", "gender", "mars"] },
    { emoji: "⚧", name: "Transgender Symbol", keywords: ["gender", "trans", "lgbtq"] },
    { emoji: "⚕️", name: "Medical Symbol", keywords: ["health", "doctor", "medicine"] }
  ],
  "Ancient": [
    { emoji: "𓀀", name: "Egyptian Man", keywords: ["hieroglyph", "egypt", "ancient", "pharaoh"] },
    { emoji: "𓀁", name: "Egyptian Man Kneeling", keywords: ["hieroglyph", "egypt", "ancient"] },
    { emoji: "𓀂", name: "Egyptian Man Standing", keywords: ["hieroglyph", "egypt", "ancient"] },
    { emoji: "𓀃", name: "Egyptian Man Stick", keywords: ["hieroglyph", "egypt", "ancient"] },
    { emoji: "𓀄", name: "Egyptian Man Arms Up", keywords: ["hieroglyph", "egypt", "worship"] },
    { emoji: "𓁹", name: "Eye of Horus", keywords: ["hieroglyph", "egypt", "ancient", "protection"] },
    { emoji: "𓂀", name: "Eye", keywords: ["hieroglyph", "egypt", "ancient", "vision"] },
    { emoji: "𓂋", name: "Mouth", keywords: ["hieroglyph", "egypt", "ancient", "speak"] },
    { emoji: "𓂧", name: "Hand", keywords: ["hieroglyph", "egypt", "ancient", "give"] },
    { emoji: "𓃀", name: "Foot", keywords: ["hieroglyph", "egypt", "ancient", "walk"] },
    { emoji: "𓃭", name: "Dog", keywords: ["hieroglyph", "egypt", "ancient", "anubis"] },
    { emoji: "𓃹", name: "Cat", keywords: ["hieroglyph", "egypt", "ancient", "bastet"] },
    { emoji: "𓅃", name: "Falcon", keywords: ["hieroglyph", "egypt", "ancient", "horus"] },
    { emoji: "𓆈", name: "Crocodile", keywords: ["hieroglyph", "egypt", "ancient", "sobek"] },
    { emoji: "𓆉", name: "Snake", keywords: ["hieroglyph", "egypt", "ancient", "cobra"] },
    { emoji: "𓆏", name: "Frog", keywords: ["hieroglyph", "egypt", "ancient", "heqet"] },
    { emoji: "𓆑", name: "Horned Viper", keywords: ["hieroglyph", "egypt", "ancient", "cobra"] },
    { emoji: "𓆓", name: "Fish", keywords: ["hieroglyph", "egypt", "ancient", "nile"] },
    { emoji: "𓇋", name: "Reed", keywords: ["hieroglyph", "egypt", "ancient", "plant"] },
    { emoji: "𓇌", name: "Two Reeds", keywords: ["hieroglyph", "egypt", "ancient", "dual"] },
    { emoji: "𓇓", name: "Sedge", keywords: ["hieroglyph", "egypt", "ancient", "upper"] },
    { emoji: "𓇯", name: "Sky", keywords: ["hieroglyph", "egypt", "ancient", "heaven"] },
    { emoji: "𓇳", name: "Sun", keywords: ["hieroglyph", "egypt", "ancient", "ra", "solar"] },
    { emoji: "𓇻", name: "Moon", keywords: ["hieroglyph", "egypt", "ancient", "lunar", "thoth"] },
    { emoji: "𓈖", name: "Water", keywords: ["hieroglyph", "egypt", "ancient", "nile", "wave"] },
    { emoji: "𓈗", name: "Water Container", keywords: ["hieroglyph", "egypt", "ancient", "jar"] },
    { emoji: "𓈙", name: "Pool", keywords: ["hieroglyph", "egypt", "ancient", "water"] },
    { emoji: "𓉐", name: "House", keywords: ["hieroglyph", "egypt", "ancient", "home"] },
    { emoji: "𓉔", name: "Temple", keywords: ["hieroglyph", "egypt", "ancient", "worship"] },
    { emoji: "𓊃", name: "Bolt", keywords: ["hieroglyph", "egypt", "ancient", "door"] },
    { emoji: "𓊪", name: "Stool", keywords: ["hieroglyph", "egypt", "ancient", "seat"] },
    { emoji: "𓋴", name: "Cloth", keywords: ["hieroglyph", "egypt", "ancient", "folded"] },
    { emoji: "𓌙", name: "Hoe", keywords: ["hieroglyph", "egypt", "ancient", "tool", "farming"] },
    { emoji: "𓍯", name: "Ankh", keywords: ["hieroglyph", "egypt", "ancient", "life", "eternal"] },
    { emoji: "𓎛", name: "Flail", keywords: ["hieroglyph", "egypt", "ancient", "pharaoh", "power"] },
    { emoji: "𓏏", name: "Bread", keywords: ["hieroglyph", "egypt", "ancient", "loaf", "offering"] },
    { emoji: "𓏛", name: "Papyrus Roll", keywords: ["hieroglyph", "egypt", "ancient", "scroll", "writing"] },
    { emoji: "𓏤", name: "Stroke", keywords: ["hieroglyph", "egypt", "ancient", "one", "single"] },
    { emoji: "𓏲", name: "Jar", keywords: ["hieroglyph", "egypt", "ancient", "vessel", "container"] },
    { emoji: "𓐍", name: "Sieve", keywords: ["hieroglyph", "egypt", "ancient", "filter"] },
    { emoji: "☥", name: "Ankh Symbol", keywords: ["egypt", "life", "eternal", "cross"] },
    { emoji: "𓋹", name: "Scarab", keywords: ["hieroglyph", "egypt", "ancient", "beetle", "khepri"] },
    { emoji: "☤", name: "Caduceus", keywords: ["medical", "hermes", "staff", "snakes"] },
    { emoji: "⚱️", name: "Funeral Urn", keywords: ["urn", "ashes", "death", "memorial"] },
    { emoji: "🏺", name: "Amphora", keywords: ["vase", "greek", "roman", "pottery"] },
    { emoji: "🪬", name: "Hamsa", keywords: ["hand", "protection", "evil eye", "luck"] },
    { emoji: "🧿", name: "Evil Eye", keywords: ["protection", "luck", "turkish", "greek"] },
    { emoji: "☸️", name: "Wheel of Dharma", keywords: ["buddhism", "dharma", "wheel", "religion"] },
    { emoji: "⚛️", name: "Atom", keywords: ["science", "physics", "atomic", "nuclear"] },
    { emoji: "☯️", name: "Yin Yang", keywords: ["balance", "chinese", "taoism", "duality"] },
    { emoji: "✡️", name: "Star of David", keywords: ["jewish", "israel", "hexagram", "judaism"] },
    { emoji: "🕎", name: "Menorah", keywords: ["jewish", "hanukkah", "candles", "religion"] },
    { emoji: "☪️", name: "Star Crescent", keywords: ["islam", "muslim", "moon", "religion"] },
    { emoji: "🛕", name: "Hindu Temple", keywords: ["hindu", "temple", "india", "worship"] },
    { emoji: "⛩️", name: "Shinto Shrine", keywords: ["japan", "torii", "shinto", "gate"] }
  ],
  "Flags": [
    { emoji: "🏳️", name: "White Flag", keywords: ["surrender", "peace", "truce"] },
    { emoji: "🏴", name: "Black Flag", keywords: ["pirate", "anarchy", "dark"] },
    { emoji: "🏴‍☠️", name: "Pirate Flag", keywords: ["jolly roger", "skull", "bones"] },
    { emoji: "🏁", name: "Chequered Flag", keywords: ["race", "finish", "racing"] },
    { emoji: "🚩", name: "Triangular Flag", keywords: ["red flag", "warning", "golf"] },
    { emoji: "🏳️‍🌈", name: "Rainbow Flag", keywords: ["pride", "lgbtq", "gay"] },
    { emoji: "🏳️‍⚧️", name: "Transgender Flag", keywords: ["trans", "pride", "lgbtq"] },
    { emoji: "🇺🇸", name: "United States", keywords: ["usa", "america", "flag"] },
    { emoji: "🇬🇧", name: "United Kingdom", keywords: ["uk", "britain", "england", "flag"] },
    { emoji: "🇨🇦", name: "Canada", keywords: ["canadian", "maple", "flag"] },
    { emoji: "🇦🇺", name: "Australia", keywords: ["aussie", "down under", "flag"] },
    { emoji: "🇩🇪", name: "Germany", keywords: ["german", "deutschland", "flag"] },
    { emoji: "🇫🇷", name: "France", keywords: ["french", "paris", "flag"] },
    { emoji: "🇮🇹", name: "Italy", keywords: ["italian", "rome", "flag"] },
    { emoji: "🇪🇸", name: "Spain", keywords: ["spanish", "madrid", "flag"] },
    { emoji: "🇯🇵", name: "Japan", keywords: ["japanese", "tokyo", "flag"] },
    { emoji: "🇨🇳", name: "China", keywords: ["chinese", "beijing", "flag"] },
    { emoji: "🇰🇷", name: "South Korea", keywords: ["korean", "seoul", "flag"] },
    { emoji: "🇮🇳", name: "India", keywords: ["indian", "delhi", "flag"] },
    { emoji: "🇧🇷", name: "Brazil", keywords: ["brazilian", "rio", "flag"] },
    { emoji: "🇲🇽", name: "Mexico", keywords: ["mexican", "aztec", "flag"] },
    { emoji: "🇷🇺", name: "Russia", keywords: ["russian", "moscow", "flag"] },
    { emoji: "🇳🇱", name: "Netherlands", keywords: ["dutch", "holland", "flag"] },
    { emoji: "🇧🇪", name: "Belgium", keywords: ["belgian", "brussels", "flag"] },
    { emoji: "🇨🇭", name: "Switzerland", keywords: ["swiss", "alps", "flag"] },
    { emoji: "🇦🇹", name: "Austria", keywords: ["austrian", "vienna", "flag"] },
    { emoji: "🇵🇱", name: "Poland", keywords: ["polish", "warsaw", "flag"] },
    { emoji: "🇸🇪", name: "Sweden", keywords: ["swedish", "stockholm", "flag"] },
    { emoji: "🇳🇴", name: "Norway", keywords: ["norwegian", "oslo", "flag"] },
    { emoji: "🇩🇰", name: "Denmark", keywords: ["danish", "copenhagen", "flag"] },
    { emoji: "🇫🇮", name: "Finland", keywords: ["finnish", "helsinki", "flag"] },
    { emoji: "🇮🇪", name: "Ireland", keywords: ["irish", "dublin", "flag"] },
    { emoji: "🇵🇹", name: "Portugal", keywords: ["portuguese", "lisbon", "flag"] },
    { emoji: "🇬🇷", name: "Greece", keywords: ["greek", "athens", "flag"] },
    { emoji: "🇹🇷", name: "Turkey", keywords: ["turkish", "ankara", "flag"] },
    { emoji: "🇪🇬", name: "Egypt", keywords: ["egyptian", "cairo", "flag", "pyramids"] },
    { emoji: "🇿🇦", name: "South Africa", keywords: ["african", "cape town", "flag"] },
    { emoji: "🇳🇬", name: "Nigeria", keywords: ["nigerian", "lagos", "flag"] },
    { emoji: "🇰🇪", name: "Kenya", keywords: ["kenyan", "nairobi", "flag"] },
    { emoji: "🇦🇪", name: "United Arab Emirates", keywords: ["uae", "dubai", "flag"] },
    { emoji: "🇸🇦", name: "Saudi Arabia", keywords: ["saudi", "riyadh", "flag"] },
    { emoji: "🇮🇱", name: "Israel", keywords: ["israeli", "jerusalem", "flag"] },
    { emoji: "🇹🇭", name: "Thailand", keywords: ["thai", "bangkok", "flag"] },
    { emoji: "🇻🇳", name: "Vietnam", keywords: ["vietnamese", "hanoi", "flag"] },
    { emoji: "🇵🇭", name: "Philippines", keywords: ["filipino", "manila", "flag"] },
    { emoji: "🇮🇩", name: "Indonesia", keywords: ["indonesian", "jakarta", "flag"] },
    { emoji: "🇲🇾", name: "Malaysia", keywords: ["malaysian", "kuala lumpur", "flag"] },
    { emoji: "🇸🇬", name: "Singapore", keywords: ["singaporean", "lion city", "flag"] },
    { emoji: "🇳🇿", name: "New Zealand", keywords: ["kiwi", "auckland", "flag"] },
    { emoji: "🇦🇷", name: "Argentina", keywords: ["argentine", "buenos aires", "flag"] },
    { emoji: "🇨🇱", name: "Chile", keywords: ["chilean", "santiago", "flag"] },
    { emoji: "🇨🇴", name: "Colombia", keywords: ["colombian", "bogota", "flag"] },
    { emoji: "🇵🇪", name: "Peru", keywords: ["peruvian", "lima", "flag"] },
    { emoji: "🇺🇦", name: "Ukraine", keywords: ["ukrainian", "kyiv", "flag"] },
    { emoji: "🇭🇺", name: "Hungary", keywords: ["hungarian", "budapest", "flag"] },
    { emoji: "🇨🇿", name: "Czech Republic", keywords: ["czech", "prague", "flag"] },
    { emoji: "🇷🇴", name: "Romania", keywords: ["romanian", "bucharest", "flag"] },
    { emoji: "🇭🇰", name: "Hong Kong", keywords: ["hk", "chinese", "flag"] },
    { emoji: "🇹🇼", name: "Taiwan", keywords: ["taiwanese", "taipei", "flag"] },
    { emoji: "🇵🇰", name: "Pakistan", keywords: ["pakistani", "islamabad", "flag"] },
    { emoji: "🇧🇩", name: "Bangladesh", keywords: ["bangladeshi", "dhaka", "flag"] }
  ],
  "Combos": [
    // Love & Romance Combos
    { emoji: "❤️💕✨", name: "Pure Love Sparkle", keywords: ["love", "romance", "combo", "viral", "aesthetic"] },
    { emoji: "💖💫🌙", name: "Dreamy Romance", keywords: ["love", "dream", "moon", "combo", "aesthetic"] },
    { emoji: "🌹💋💕", name: "Passionate Romance", keywords: ["love", "kiss", "passion", "combo"] },
    { emoji: "💑👫💞", name: "Couple Goals", keywords: ["couple", "relationship", "love", "combo"] },
    { emoji: "🥰😍💕", name: "Head Over Heels", keywords: ["love", "crush", "adore", "combo"] },
    { emoji: "💍💒👰", name: "Wedding Love", keywords: ["wedding", "marriage", "bride", "combo"] },
    { emoji: "🌸💭💫", name: "Gentle Romantic", keywords: ["soft", "gentle", "dreamy", "combo"] },
    { emoji: "🦋💕🌺", name: "Butterflies", keywords: ["butterflies", "love", "nervous", "combo"] },
    
    // Celebration & Success Combos
    { emoji: "🎉🏆✨", name: "Victory Celebration", keywords: ["win", "victory", "celebrate", "combo", "success"] },
    { emoji: "🚀💫⭐", name: "Reach For Stars", keywords: ["rocket", "ambition", "goals", "combo"] },
    { emoji: "💪🔥🎯", name: "Crushing Goals", keywords: ["strong", "fire", "goals", "combo", "motivation"] },
    { emoji: "🌟💎👑", name: "Feel Like Royalty", keywords: ["royal", "crown", "diamond", "combo"] },
    { emoji: "🎉🎊🥳", name: "Ultimate Party", keywords: ["party", "celebration", "confetti", "combo"] },
    { emoji: "🍾🥂✨", name: "Champagne Toast", keywords: ["champagne", "toast", "celebrate", "combo"] },
    { emoji: "🎈🎂🎁", name: "Birthday Party", keywords: ["birthday", "cake", "gift", "combo"] },
    { emoji: "🎓📚🌟", name: "Graduation", keywords: ["graduate", "school", "achievement", "combo"] },
    
    // Motivation & Hustle Combos
    { emoji: "💪🔥⚡", name: "Unstoppable Energy", keywords: ["energy", "power", "motivation", "combo", "hustle"] },
    { emoji: "🎯💯🚀", name: "Focused Determination", keywords: ["focus", "perfect", "launch", "combo"] },
    { emoji: "⏰💼📈", name: "Time To Work", keywords: ["work", "business", "growth", "combo"] },
    { emoji: "🌅☕💪", name: "Morning Motivation", keywords: ["morning", "coffee", "energy", "combo"] },
    { emoji: "🏃‍♀️💨⚡", name: "Speed & Agility", keywords: ["run", "fast", "speed", "combo"] },
    { emoji: "🧠💡⚡", name: "Mental Power", keywords: ["brain", "idea", "smart", "combo"] },
    { emoji: "🌱📚💡", name: "Learning Growing", keywords: ["learn", "grow", "education", "combo"] },
    { emoji: "🧘‍♀️🌸✨", name: "Mindfulness Journey", keywords: ["meditation", "zen", "peace", "combo"] },
    
    // Aesthetic Style Combos
    { emoji: "💗🌸✨", name: "Cute Soft Aesthetic", keywords: ["cute", "soft", "pink", "aesthetic", "combo"] },
    { emoji: "🔥⚡💥", name: "Bold Energetic", keywords: ["bold", "energy", "power", "combo", "fire"] },
    { emoji: "🌙✨💤", name: "Dreamy Night Vibes", keywords: ["night", "dream", "sleep", "aesthetic", "combo"] },
    { emoji: "🍃🤍✨", name: "Calm Minimalist", keywords: ["calm", "minimal", "clean", "aesthetic", "combo"] },
    { emoji: "💞💐🌷", name: "Floral Love", keywords: ["flower", "love", "spring", "combo"] },
    { emoji: "🌸🤍🩷", name: "Soft Pink", keywords: ["pink", "soft", "pastel", "aesthetic", "combo"] },
    { emoji: "💫🌌⭐", name: "Galaxy Vibes", keywords: ["galaxy", "space", "stars", "aesthetic", "combo"] },
    { emoji: "🌕🌠🪐", name: "Cosmic Night", keywords: ["moon", "stars", "planet", "space", "combo"] },
    { emoji: "🌿☁️🌱", name: "Nature Peace", keywords: ["nature", "cloud", "peaceful", "combo"] },
    { emoji: "🤍🥥🌿", name: "Tropical Calm", keywords: ["tropical", "coconut", "beach", "combo"] },
    
    // Fun & Playful Combos
    { emoji: "😎👉👉", name: "Finger Guns", keywords: ["cool", "playful", "pointing", "combo", "meme"] },
    { emoji: "🤣💀☠️", name: "Dead Laughing", keywords: ["laugh", "dead", "funny", "combo", "meme"] },
    { emoji: "👀👀👀", name: "Looking Eyes", keywords: ["looking", "watching", "curious", "combo"] },
    { emoji: "🥺👉👈", name: "Shy Pleading", keywords: ["shy", "cute", "please", "combo", "meme"] },
    { emoji: "💀🤣", name: "I'm Dead", keywords: ["dead", "laugh", "hilarious", "combo", "meme"] },
    { emoji: "☠️😂", name: "Skull Laugh", keywords: ["skull", "laugh", "funny", "combo"] },
    { emoji: "👻👉🪦", name: "Ghost RIP", keywords: ["ghost", "dead", "rip", "combo", "dark humor"] },
    
    // Food & Lifestyle Combos
    { emoji: "🍕🍺👌", name: "Perfect Pizza Night", keywords: ["pizza", "beer", "perfect", "combo", "food"] },
    { emoji: "☕📚🌧️", name: "Cozy Coffee Time", keywords: ["coffee", "book", "rain", "cozy", "combo"] },
    { emoji: "🍰🎂🥳", name: "Dessert Celebration", keywords: ["dessert", "cake", "party", "combo"] },
    { emoji: "🥑🍞💚", name: "Healthy Eating", keywords: ["avocado", "toast", "healthy", "combo", "food"] },
    { emoji: "🍜🥢🔥", name: "Spicy Noodles", keywords: ["noodles", "spicy", "asian", "combo", "food"] },
    { emoji: "🍷🧀🍇", name: "Wine & Cheese", keywords: ["wine", "cheese", "grapes", "combo", "fancy"] },
    { emoji: "🏖️🌴🍹", name: "Tropical Vacation", keywords: ["beach", "vacation", "tropical", "combo"] },
    { emoji: "🛁🕯️🌸", name: "Self-Care Sunday", keywords: ["selfcare", "bath", "relax", "combo"] },
    { emoji: "🎬🍿❤️", name: "Movie Night", keywords: ["movie", "popcorn", "date", "combo"] },
    
    // Transformation & Growth Combos
    { emoji: "⛰️🧗‍♀️🏔️", name: "Climbing Mountains", keywords: ["climb", "mountain", "challenge", "combo"] },
    { emoji: "🌊🏄‍♀️⚡", name: "Riding Waves", keywords: ["surf", "wave", "energy", "combo"] },
    { emoji: "🔥💎💪", name: "Pressure Diamonds", keywords: ["pressure", "diamond", "strong", "combo", "motivation"] },
    { emoji: "🌪️🌈☀️", name: "After The Storm", keywords: ["storm", "rainbow", "hope", "combo"] },
    { emoji: "🌑🌕✨", name: "Dark To Light", keywords: ["moon", "transformation", "growth", "combo"] },
    { emoji: "🌈🦋✨", name: "Transformation", keywords: ["butterfly", "change", "growth", "combo"] },
    
    // Holiday & Occasion Combos
    { emoji: "🎄❄️💖", name: "Holiday Love", keywords: ["christmas", "holiday", "winter", "combo"] },
    { emoji: "🎉💕🥂", name: "Love Celebration", keywords: ["celebrate", "love", "toast", "combo"] },
    { emoji: "🌹💐💝", name: "Gift Giving", keywords: ["rose", "flowers", "gift", "combo", "valentine"] },
    { emoji: "🎂🎈💖", name: "Birthday Love", keywords: ["birthday", "balloon", "love", "combo"] },
    { emoji: "🏖️🌴💕", name: "Vacation Romance", keywords: ["vacation", "beach", "romance", "combo"] }
  ]
};

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  "Smileys": { icon: "😀", color: "bg-yellow-500/20" },
  "Gestures": { icon: "👋", color: "bg-orange-500/20" },
  "Animals": { icon: "🐶", color: "bg-amber-500/20" },
  "Nature": { icon: "🌿", color: "bg-green-500/20" },
  "Food": { icon: "🍎", color: "bg-red-500/20" },
  "Drinks": { icon: "☕", color: "bg-yellow-700/20" },
  "Sports": { icon: "⚽", color: "bg-emerald-500/20" },
  "Travel": { icon: "✈️", color: "bg-sky-500/20" },
  "Objects": { icon: "💡", color: "bg-slate-500/20" },
  "Hearts": { icon: "❤️", color: "bg-pink-500/20" },
  "Symbols": { icon: "⭐", color: "bg-indigo-500/20" },
  "Ancient": { icon: "☥", color: "bg-amber-600/20" },
  "Flags": { icon: "🏳️", color: "bg-cyan-500/20" },
  "Combos": { icon: "✨", color: "bg-gradient-to-r from-pink-500/20 to-purple-500/20" }
};

export default function EmojiLibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Smileys");
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();

  // Get all categories
  const categories = Object.keys(EMOJI_DATABASE);

  // Search across all emojis with names and keywords
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    const results: EmojiItem[] = [];
    
    Object.values(EMOJI_DATABASE).forEach(emojis => {
      emojis.forEach(item => {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesKeyword = item.keywords.some(kw => kw.toLowerCase().includes(query));
        if (matchesName || matchesKeyword) {
          results.push(item);
        }
      });
    });
    
    return results;
  }, [searchQuery]);

  // Get popular search suggestions
  const searchSuggestions = [
    "happy", "love", "heart", "combo", "aesthetic", "viral", "meme",
    "motivation", "party", "celebration", "fire", "star", "moon",
    "egypt", "hieroglyph", "ancient", "cat", "dog", "food", "travel"
  ];

  // Count total emojis
  const totalEmojis = useMemo(() => {
    return Object.values(EMOJI_DATABASE).reduce((sum, arr) => sum + arr.length, 0);
  }, []);

  const handleCopyEmoji = async (emoji: string, name?: string) => {
    try {
      await navigator.clipboard.writeText(emoji);
      setCopiedEmoji(emoji);
      toast({
        title: "Copied!",
        description: `${emoji} ${name || ''} copied to clipboard`
      });
      setTimeout(() => setCopiedEmoji(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const currentEmojis = searchResults || EMOJI_DATABASE[selectedCategory] || [];

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="ghost" size="icon" data-testid="button-back-portal">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Smile className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Emoji Library</h1>
              <Badge variant="secondary">Native</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {totalEmojis.toLocaleString()} emojis with searchable names across {categories.length} categories
            </p>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or keyword (e.g. 'happy', 'love', 'egypt', 'hieroglyph')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-emoji-search"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat]?.icon} {cat} ({EMOJI_DATABASE[cat]?.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Quick Search Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Quick search:
              </span>
              {searchSuggestions.slice(0, 12).map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setSearchQuery(tag)}
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <Copy className="h-3 w-3" />
                Click to copy
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Hover for name
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Search Results or Category View */}
        {searchResults ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Results for "{searchQuery}"
                <Badge variant="secondary">{searchResults.length} found</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No emojis found. Try different keywords like "happy", "heart", "egypt", etc.
                </p>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1">
                  {searchResults.map((item, idx) => (
                    <Button
                      key={`${item.emoji}-${idx}`}
                      variant="ghost"
                      className={`h-14 w-14 text-2xl p-0 hover:bg-primary/10 transition-all relative group ${
                        copiedEmoji === item.emoji ? "ring-2 ring-primary bg-primary/20" : ""
                      }`}
                      onClick={() => handleCopyEmoji(item.emoji, item.name)}
                      title={`${item.name}\nKeywords: ${item.keywords.join(', ')}`}
                      data-testid={`emoji-${idx}`}
                    >
                      {item.emoji}
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 truncate max-w-full px-1">
                        {item.name}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Category Tabs */
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-2">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="flex items-center gap-1 data-[state=active]:bg-background"
                  data-testid={`tab-${category.toLowerCase()}`}
                >
                  <span>{CATEGORY_CONFIG[category]?.icon || "📁"}</span>
                  <span className="hidden sm:inline">{category}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {EMOJI_DATABASE[category]?.length || 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{CATEGORY_CONFIG[category]?.icon}</span>
                      {category}
                      <Badge variant="secondary">{EMOJI_DATABASE[category]?.length} emojis</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1">
                      {EMOJI_DATABASE[category]?.map((item, idx) => (
                        <Button
                          key={`${item.emoji}-${idx}`}
                          variant="ghost"
                          className={`h-14 w-14 text-2xl p-0 hover:bg-primary/10 transition-all relative group ${
                            copiedEmoji === item.emoji ? "ring-2 ring-primary bg-primary/20" : ""
                          }`}
                          onClick={() => handleCopyEmoji(item.emoji, item.name)}
                          title={`${item.name}\nKeywords: ${item.keywords.join(', ')}`}
                          data-testid={`emoji-${idx}`}
                        >
                          {item.emoji}
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 truncate max-w-full px-1">
                            {item.name}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Quick Stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{totalEmojis.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Emojis</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{categories.length}</div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Searchable</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">Free</div>
                <div className="text-sm text-muted-foreground">No API Required</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge>1</Badge>
              <p>Search by name or keyword - try "happy", "love", "egypt", "hieroglyph", etc.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge>2</Badge>
              <p>Use the category dropdown or tabs to browse by type</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge>3</Badge>
              <p>Click any emoji to copy it - hover to see its name</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge>4</Badge>
              <p>Paste into the Direct STL Export tool to create 3D printable signs</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
