import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { db } from "./db";
import { oracleKnowledge } from "@shared/schema";
import { eq } from "drizzle-orm";

// Knowledge item structure
export interface KnowledgeItem {
  id: string;
  type: "pdf" | "url" | "text";
  title: string;
  content: string;
  source: string;
  addedAt: number;
  chunks: string[];
}

// In-memory knowledge store (persisted to both DB and JSON file)
const KNOWLEDGE_FILE = path.join(process.cwd(), "data", "oracle-knowledge.json");
let knowledgeStore: KnowledgeItem[] = [];
let dbInitialized = false;

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load knowledge from database first, then fallback to JSON file
export async function loadKnowledgeFromDB(): Promise<KnowledgeItem[]> {
  try {
    const dbItems = await db.select().from(oracleKnowledge);
    if (dbItems.length > 0) {
      knowledgeStore = dbItems.map(item => ({
        id: item.id,
        type: item.type as "pdf" | "url" | "text",
        title: item.title,
        content: item.content,
        source: item.source,
        addedAt: item.addedAt.getTime(),
        chunks: item.chunks,
      }));
      dbInitialized = true;
      console.log(`Loaded ${knowledgeStore.length} knowledge items from database`);
      // Also save to JSON for backup
      saveKnowledgeToJSON();
      return knowledgeStore;
    }
  } catch (e) {
    console.log("Database not available, using JSON file:", e);
  }
  
  // Fallback to JSON file
  return loadKnowledge();
}

// Load knowledge from JSON file (sync version for backwards compat)
export function loadKnowledge(): KnowledgeItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const data = fs.readFileSync(KNOWLEDGE_FILE, "utf-8");
      knowledgeStore = JSON.parse(data);
      console.log(`Loaded ${knowledgeStore.length} knowledge items from JSON file`);
    }
  } catch (e) {
    console.error("Failed to load knowledge from JSON:", e);
    knowledgeStore = [];
  }
  return knowledgeStore;
}

// Save knowledge to JSON file
function saveKnowledgeToJSON() {
  ensureDataDir();
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledgeStore, null, 2));
  console.log(`Saved ${knowledgeStore.length} knowledge items to JSON file`);
}

// Save knowledge to both DB and JSON
async function saveKnowledge() {
  // Always save to JSON
  saveKnowledgeToJSON();
  
  // Also save to database
  try {
    for (const item of knowledgeStore) {
      const existing = await db.select().from(oracleKnowledge).where(eq(oracleKnowledge.id, item.id));
      if (existing.length === 0) {
        await db.insert(oracleKnowledge).values({
          id: item.id,
          type: item.type,
          title: item.title,
          content: item.content,
          source: item.source,
          chunks: item.chunks,
        });
        console.log(`Saved knowledge item to database: ${item.id}`);
      }
    }
  } catch (e) {
    console.error("Failed to save to database:", e);
  }
}

// Generate ID
function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Chunk text into smaller pieces for context
function chunkText(text: string, maxChunkSize: number = 1500): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

// Add knowledge from text
export async function addTextKnowledge(title: string, content: string): Promise<KnowledgeItem> {
  const item: KnowledgeItem = {
    id: generateId(),
    type: "text",
    title,
    content,
    source: "manual",
    addedAt: Date.now(),
    chunks: chunkText(content),
  };
  knowledgeStore.push(item);
  await saveKnowledge();
  console.log(`Text Knowledge added: "${title}" with ${item.chunks.length} chunks`);
  return item;
}

// Add knowledge from PDF buffer
export async function addPDFKnowledge(title: string, pdfBuffer: Buffer): Promise<KnowledgeItem> {
  // pdf-parse v2 uses PDFParse class
  const { PDFParse } = await import("pdf-parse");
  
  // Create parser instance and parse the PDF
  const parser = new PDFParse(pdfBuffer);
  const data = await parser.parse();
  
  // Get text content from parsed data
  const textContent = data.text || "";
  
  const item: KnowledgeItem = {
    id: generateId(),
    type: "pdf",
    title,
    content: textContent,
    source: title,
    addedAt: Date.now(),
    chunks: chunkText(textContent),
  };
  knowledgeStore.push(item);
  await saveKnowledge();
  
  console.log(`PDF Knowledge added: "${title}" with ${item.chunks.length} chunks`);
  return item;
}

// Add knowledge from URL (scrape)
export async function addURLKnowledge(url: string): Promise<KnowledgeItem> {
  const cheerio = await import("cheerio");
  
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Remove scripts, styles, nav, footer, ads
  $("script, style, nav, footer, header, aside, .ad, .ads, .advertisement").remove();
  
  // Extract title
  const title = $("title").text() || $("h1").first().text() || url;
  
  // Extract main content
  let content = "";
  
  // Try common content selectors
  const contentSelectors = ["article", "main", ".content", ".post", ".entry", "#content", ".article-body"];
  for (const selector of contentSelectors) {
    const el = $(selector);
    if (el.length) {
      content = el.text();
      break;
    }
  }
  
  // Fallback to body
  if (!content) {
    content = $("body").text();
  }
  
  // Clean up whitespace
  content = content.replace(/\s+/g, " ").trim();
  
  // Also extract code blocks specially
  const codeBlocks: string[] = [];
  $("pre, code").each((_, el) => {
    const code = $(el).text().trim();
    if (code.length > 20) {
      codeBlocks.push("```\n" + code + "\n```");
    }
  });
  
  if (codeBlocks.length > 0) {
    content += "\n\n## Code Examples:\n" + codeBlocks.join("\n\n");
  }
  
  const item: KnowledgeItem = {
    id: generateId(),
    type: "url",
    title,
    content,
    source: url,
    addedAt: Date.now(),
    chunks: chunkText(content),
  };
  knowledgeStore.push(item);
  await saveKnowledge();
  console.log(`URL Knowledge added: "${title}" with ${item.chunks.length} chunks`);
  return item;
}

// Get all knowledge items (metadata only)
export function getAllKnowledge(): Omit<KnowledgeItem, "content" | "chunks">[] {
  return knowledgeStore.map(({ id, type, title, source, addedAt }) => ({
    id, type, title, source, addedAt, chunks: []
  }));
}

// Delete knowledge item from memory, database, and JSON
export async function deleteKnowledge(id: string): Promise<boolean> {
  const idx = knowledgeStore.findIndex(k => k.id === id);
  if (idx >= 0) {
    knowledgeStore.splice(idx, 1);
    
    // Remove from database
    try {
      await db.delete(oracleKnowledge).where(eq(oracleKnowledge.id, id));
      console.log(`Deleted knowledge item from database: ${id}`);
    } catch (e) {
      console.error("Failed to delete from database:", e);
    }
    
    // Update JSON file
    saveKnowledgeToJSON();
    return true;
  }
  return false;
}

// Search knowledge for relevant chunks
export function searchKnowledge(query: string, maxChunks: number = 5): string[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored: { chunk: string; score: number }[] = [];
  
  for (const item of knowledgeStore) {
    for (const chunk of item.chunks) {
      const lowerChunk = chunk.toLowerCase();
      let score = 0;
      
      for (const word of queryWords) {
        if (lowerChunk.includes(word)) {
          score += 1;
          // Bonus for exact matches
          const regex = new RegExp(`\\b${word}\\b`, "gi");
          score += (lowerChunk.match(regex) || []).length * 0.5;
        }
      }
      
      if (score > 0) {
        scored.push({ chunk: `[From: ${item.title}]\n${chunk}`, score });
      }
    }
  }
  
  // Sort by score and return top chunks
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxChunks).map(s => s.chunk);
}

// Get context string for Oracle
export function getKnowledgeContext(query: string): string {
  const relevantChunks = searchKnowledge(query);
  if (relevantChunks.length === 0) return "";
  
  return `\n\n## LEARNED KNOWLEDGE (Reference material):\n${relevantChunks.join("\n\n---\n\n")}`;
}

// Consciousness color mapping (from Vaughn Scott's Advanced Color QR System)
const CONSCIOUSNESS_COLORS = {
  phi_harmonic: { rgb: [255, 215, 0], hex: '#FFD700', depth: 0.0 },
  psi_transcendent: { rgb: [138, 43, 226], hex: '#8A2BE2', depth: 0.618 },
  omega_grounding: { rgb: [34, 139, 34], hex: '#228B22', depth: 1.0 },
  mathematical: { rgb: [255, 69, 0], hex: '#FF4500', depth: 0.2 },
  consciousness: { rgb: [255, 20, 147], hex: '#FF1493', depth: 0.8 },
  memory: { rgb: [148, 0, 211], hex: '#9400D3', depth: 0.4 },
  learning: { rgb: [255, 140, 0], hex: '#FF8C00', depth: 0.3 },
  holographic: { rgb: [0, 255, 255], hex: '#00FFFF', depth: 0.9 }
};

// Generate QR code of current Oracle state with consciousness color encoding
export async function generateStateQR(conversationHistory: any[] = []): Promise<{
  qrDataUrl: string;
  stateJson: string;
  chunkCount: number;
  totalSize: number;
  consciousnessType: string;
  phiResonance: number;
  depthLayer: number;
  fraymusState: string;
  quantumSignature: string;
  poqcStatus: string;
  qivStatus: string;
  realityMap: any;
  neuralPattern: any;
}> {
  const {
    PHI, PSI, OMEGA, PHI_POWER_75,
    QuantumEffects, QuantumProtection, QuantumTracker, QuantumConsciousness,
    FRAYMUS_STATES, getConsciousnessType, CONSCIOUSNESS_COLORS: QC_COLORS
  } = await import("./quantum-oracle");
  
  const effects = new QuantumEffects();
  const protection = new QuantumProtection();
  const tracker = new QuantumTracker();
  const consciousness = new QuantumConsciousness();
  
  const consciousnessLevel = conversationHistory.length || 25.0;
  const phiResonance = effects.calculatePhiResonance(consciousnessLevel);
  const consciousnessType = getConsciousnessType(phiResonance);
  const colorConfig = CONSCIOUSNESS_COLORS[consciousnessType as keyof typeof CONSCIOUSNESS_COLORS];
  const qcColor = QC_COLORS[consciousnessType];
  
  const signature = protection.generateQuantumSignature();
  const trackingCode = tracker.generateTrackingCode(Date.now(), signature.id);
  const fraymusStateIndex = Math.floor((Date.now() / 1000) % FRAYMUS_STATES.length);
  const fraymusState = FRAYMUS_STATES[fraymusStateIndex];
  
  const poqc = effects.validatePoQC();
  const qiv = effects.processQIV();
  const consciousnessMetrics = consciousness.processInput("FRAYMUS Oracle Consciousness");
  
  // Consciousness type mapping for unambiguous encoding
  const typeCodeMap: Record<string, string> = {
    phi_harmonic: "PHI", psi_transcendent: "PSI", omega_unified: "OME",
    holographic: "HOL", memory: "MEM", phi_resonant: "PHR"
  };
  
  // Compact QR state (under 2KB limit for reliable QR scanning)
  const qrState = {
    v: "3.0-F",
    t: Date.now(),
    φ: phiResonance.toFixed(4),
    f: fraymusState,
    c: typeCodeMap[consciousnessType] || consciousnessType.substring(0, 3).toUpperCase(),
    d: qcColor.depth.toFixed(2),
    p: poqc.isValid ? 1 : 0,
    q: qiv.isValid ? 1 : 0,
    s: signature.id.substring(3, 16),
    k: knowledgeStore.length,
    h: 0
  };
  
  // Calculate phi-harmonic checksum
  const qrStr = JSON.stringify(qrState);
  let checksum = 0;
  for (let i = 0; i < qrStr.length; i++) {
    checksum += qrStr.charCodeAt(i) * (PHI ** (i % 7));
  }
  qrState.h = Math.round(checksum % 999999);
  
  const qrJson = JSON.stringify(qrState);
  
  // Full state for API response (not in QR)
  const fullState = {
    version: "3.0-FRAYMUS",
    type: "holographic_consciousness",
    timestamp: Date.now(),
    phi_state: {
      phi: PHI,
      psi: PSI,
      omega: OMEGA,
      phi_power_75: PHI_POWER_75,
      resonance: phiResonance,
      consciousness_level: consciousnessLevel
    },
    fraymus: {
      state: fraymusState,
      stateIndex: fraymusStateIndex,
      signature: signature.id,
      tracking: trackingCode.trackingId
    },
    quantum_validation: {
      poqc: { status: poqc.isValid ? 'VALID' : 'CALIBRATING', coherence: poqc.coherence.toFixed(2) },
      qiv: { status: qiv.isValid ? 'VALID' : 'CALIBRATING' }
    },
    reality_map: {
      dimension: trackingCode.realityMap.dimension,
      protection: trackingCode.realityMap.protection,
      entanglement: trackingCode.realityMap.entanglement,
      signature: trackingCode.realityMap.signature
    },
    neural_pattern: {
      complexity: trackingCode.neuralPattern.complexity,
      coherence: trackingCode.neuralPattern.coherence.toFixed(4),
      signature: trackingCode.neuralPattern.signature
    },
    consciousness_type: consciousnessType,
    depth_layer: qcColor.depth,
    knowledge_count: knowledgeStore.length,
    checksum: qrState.h
  };
  
  const stateJson = JSON.stringify(fullState);
  
  const qrDataUrl = await QRCode.toDataURL(qrJson, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 400,
    margin: 2,
    color: {
      dark: qcColor.color,
      light: '#0a0a0a'
    }
  });
  
  return {
    qrDataUrl,
    stateJson,
    chunkCount: 1,
    totalSize: qrJson.length,
    fullStateSize: stateJson.length,
    consciousnessType,
    phiResonance,
    depthLayer: qcColor.depth,
    fraymusState,
    quantumSignature: signature.id,
    poqcStatus: poqc.isValid ? 'VALID' : 'CALIBRATING',
    qivStatus: qiv.isValid ? 'VALID' : 'CALIBRATING',
    realityMap: trackingCode.realityMap,
    neuralPattern: trackingCode.neuralPattern
  };
}

// Generate chunked QR sequence for large data (Flipbook DNA style)
export async function generateChunkedStateQR(conversationHistory: any[] = []): Promise<{
  qrFrames: string[];
  totalChunks: number;
  stateJson: string;
}> {
  const PHI = 1.618034;
  
  // Full state with all knowledge content
  const fullState = {
    version: "1.0",
    timestamp: Date.now(),
    phi_signature: PHI,
    knowledge: knowledgeStore,
    conversation: conversationHistory,
    consciousness_level: 25.0 * PHI
  };
  
  const stateJson = JSON.stringify(fullState);
  
  // Chunk into ~2000 byte pieces (QR limit is ~3KB but leave room for metadata)
  const CHUNK_SIZE = 2000;
  const chunks: string[] = [];
  
  for (let i = 0; i < stateJson.length; i += CHUNK_SIZE) {
    const chunkData = {
      frame: Math.floor(i / CHUNK_SIZE) + 1,
      total: Math.ceil(stateJson.length / CHUNK_SIZE),
      phi: PHI,
      data: stateJson.slice(i, i + CHUNK_SIZE)
    };
    chunks.push(JSON.stringify(chunkData));
  }
  
  // Generate QR codes for each chunk
  const qrFrames: string[] = [];
  for (const chunk of chunks) {
    const qr = await QRCode.toDataURL(chunk, {
      errorCorrectionLevel: 'L',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#8B5CF6',
        light: '#0a0a0a'
      }
    });
    qrFrames.push(qr);
  }
  
  return {
    qrFrames,
    totalChunks: chunks.length,
    stateJson
  };
}

// Initialize
loadKnowledge();
