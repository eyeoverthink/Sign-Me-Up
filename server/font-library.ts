import fs from 'fs';
import path from 'path';

export interface FontInfo {
  id: string;
  name: string;
  filename: string;
  path: string;
  category: string;
}

const FONTS_DIR = path.join(process.cwd(), 'FONTS');

const FONT_CATEGORIES: Record<string, string[]> = {
  'Emoji': ['NotoColorEmoji', 'seguiemj', 'Segoe-UI-Emoji', 'OpenMoji', 'Twemoji'],
  'Signs': ['Signs', 'Signage', 'Roadsigns', 'Road Signs', 'Ale Signs', 'Warn'],
  'Logos': ['Logo', 'Logos', 'Brand', 'Corporate', 'Channel', 'BBC', 'Yahoo', 'Pepsi', 'Adobe'],
  'Symbol': ['Symbola', 'NotoSansSymbols', 'Segoe-UI-Symbol', 'SymbolsNerdFont', 'SegoeMDL2', 
             'Symbol', 'Dingbat', 'Pi Std', 'Pi.', 'Pict', 'Icon', 'Bats', 'Math', 'Zeichen'],
  'Hieroglyphs': ['NotoSansEgyptianHieroglyphs', 'Gardiner', 'NewGardiner', 'Aegyptus', 'Egyptian'],
  'Neon': ['neonderthaw', 'tilt-neon', 'Neoncity', 'electronica', 'disco', 'future-light', 'Aerioz', 'Neon'],
  'Script': ['alex-brush', 'allura', 'allison', 'arizonia', 'ballet', 'birthstone', 'bonheur', 
             'caveat', 'chilanka', 'charm', 'aguafina', 'swash', 'cursive', 'script'],
  'Display': ['Playfair', 'Oxanium', 'SpaceGrotesk', 'Outfit', 'Montserrat', 'Poppins', 'Roboto', 
              'Inter', 'Lora', 'amatic', 'archivo', 'berkshire', 'merriweather', 'open-sans'],
  'Handwritten': ['architects-daughter', 'bad-script', 'beth-ellen', 'bilbo', 'calligraffitti', 
                  'cedarville', 'annie', 'amita', 'bonbon', 'borel', 'butterfly', 'beau-rivage'],
  'Fun': ['Dirtyboy', 'Cookiemonster', 'Halimun', 'Alliston', 'Apocalypso', 'Artsy'],
  'DevIcons': ['SymbolsNerdFontMono', 'NerdFont', 'Devicons', 'FontAwesome'],
  'Transport': ['Auto', 'Bundesbahn', 'BVG', 'Audio Video', 'Transport'],
};

function categorizeFont(filename: string): string {
  const lowerName = filename.toLowerCase();
  for (const [category, patterns] of Object.entries(FONT_CATEGORIES)) {
    if (patterns.some(p => lowerName.includes(p.toLowerCase()))) {
      return category;
    }
  }
  return 'Other';
}

function formatFontName(filename: string): string {
  return filename
    .replace(/\.(ttf|otf)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/v\d+/g, '')
    .replace(/latin|regular|bold|italic/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function getAvailableFonts(): FontInfo[] {
  const fonts: FontInfo[] = [];
  const seenPaths = new Set<string>();

  function scanDirectory(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && /\.(ttf|otf)$/i.test(entry.name)) {
        const filename = entry.name;
        const lowerFilename = filename.toLowerCase();
        
        // Skip copies and exact path duplicates
        if (lowerFilename.includes(' copy')) {
          continue;
        }
        
        // Use full path for deduplication so same-named fonts in different folders are included
        const normalizedPath = fullPath.toLowerCase();
        if (seenPaths.has(normalizedPath)) {
          continue;
        }
        seenPaths.add(normalizedPath);
        
        // Create unique ID using parent folder name + filename for fonts in subdirectories
        const relativePath = path.relative(FONTS_DIR, fullPath);
        const parentFolder = path.dirname(relativePath);
        const uniqueId = parentFolder !== '.' 
          ? `${parentFolder.replace(/[\/\\]/g, '-')}-${filename.replace(/\.(ttf|otf)$/i, '')}`
          : filename.replace(/\.(ttf|otf)$/i, '');
        
        // Better display name including folder context for subdirectory fonts
        const displayName = parentFolder !== '.'
          ? `${formatFontName(filename)} (${formatFontName(parentFolder.split(/[\/\\]/)[0])})`
          : formatFontName(filename);
        
        fonts.push({
          id: uniqueId.replace(/\s+/g, '-'),
          name: displayName,
          filename: relativePath, // Store relative path for serving
          path: fullPath,
          category: categorizeFont(fullPath), // Use full path for better categorization
        });
      }
    }
  }

  scanDirectory(FONTS_DIR);
  
  fonts.sort((a, b) => {
    if (a.category !== b.category) {
      const order = [
        'Emoji', 'Symbol', 'Signs', 'Logos', 'Hieroglyphs', 
        'Neon', 'Script', 'Display', 'Handwritten', 'Fun', 
        'DevIcons', 'Transport', 'Other'
      ];
      const aIdx = order.indexOf(a.category);
      const bIdx = order.indexOf(b.category);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    }
    return a.name.localeCompare(b.name);
  });

  return fonts;
}

export function getFontByFilename(filename: string): FontInfo | null {
  const fonts = getAvailableFonts();
  return fonts.find(f => f.filename === filename || f.id === filename) || null;
}

// Find font by matching font name (e.g., "Noto Color Emoji" -> NotoColorEmoji-Regular.ttf)
export function getFontByName(fontName: string): FontInfo | null {
  const fonts = getAvailableFonts();
  const normalizedSearch = fontName.toLowerCase().replace(/[\s\-_]/g, '');
  
  // Try exact match first
  let match = fonts.find(f => f.name.toLowerCase() === fontName.toLowerCase());
  if (match) return match;
  
  // Try normalized match (remove spaces, hyphens, underscores)
  match = fonts.find(f => {
    const normalizedFilename = f.filename.toLowerCase().replace(/[\s\-_]/g, '').replace(/\.(ttf|otf)$/i, '');
    return normalizedFilename.includes(normalizedSearch) || normalizedSearch.includes(normalizedFilename);
  });
  if (match) return match;
  
  // Try partial match on filename
  match = fonts.find(f => {
    const lowerFilename = f.filename.toLowerCase();
    const searchParts = fontName.toLowerCase().split(/\s+/);
    return searchParts.every(part => lowerFilename.includes(part));
  });
  
  return match || null;
}

export function readFontFile(fontPath: string): Buffer | null {
  try {
    if (fs.existsSync(fontPath)) {
      return fs.readFileSync(fontPath);
    }
  } catch (e) {
    console.error('Error reading font file:', e);
  }
  return null;
}
