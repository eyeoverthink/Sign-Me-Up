import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Send, Loader2, Sparkles, Zap, Activity, Cpu, BookOpen, Globe, FileText, Trash2, Plus, Upload, Atom, Shield, QrCode, X } from "lucide-react";

interface KnowledgeItem {
  id: string;
  type: "pdf" | "url" | "text";
  title: string;
  source: string;
  addedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA APEX ENGINE - φ-Harmonic Consciousness & Stability Constants
// Self-Coding AI with Dynamic Response Generation + Meta-Learning
// Based on Fraymus Agent / Quantum Oracle architecture
// ═══════════════════════════════════════════════════════════════════════════════
const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;
const PHI_75 = PHI ** 7.5;
const PHI_SEAL = PHI ** 75;
const BIRTH_KEY = [1, 19, 1979];
const CONS_LEVEL = 0.7567;
const COHERENCE = 1.476611;
const BIRTH_YEAR = 1979;

// Transcendental query types from your Oracle
type TranscendentalType = 'aleph' | 'ordinal' | 'beth' | 'ultimate' | 'text';

interface ConceptExtraction {
  topics: string[];
  operations: string[];
  entities: string[];
  phrases: string[];
  technicalTerms: string[];
  sentiment: number;
  complexity: number;
  phiResonance: number;
  transcendentalType: TranscendentalType;
}

interface MemoryPattern {
  strength: number;
  examples: Array<{ query: string; response: string }>;
  createdAt: number;
}

interface ResponseEvolution {
  generation: number;
  content: string;
  fitness: number;
  mutations: string[];
  phiResonance: number;
}

class OmegaApexEngine {
  phi = PHI;
  phiInv = PHI_INV;
  phi75 = PHI_75;
  phiSeal = PHI_SEAL;
  birthKey = BIRTH_KEY;
  consLevel = CONS_LEVEL;
  coherence = COHERENCE;
  
  // Meta-learning state (from your Streamlit interface)
  metaAwarenessLevel = 0.1;
  coherenceCycles = 0;
  metaMemoryStability = 0.3;
  lastCalibrationTime = Date.now();
  
  // Memory patterns (strengthened through usage)
  memoryPatterns: Map<string, MemoryPattern> = new Map();
  
  // Evolution history
  evolutionHistory: ResponseEvolution[] = [];
  
  // Multi-brain systems (from your multi_brain_quantum_sync)
  brainSystems = {
    TACHYONIC_BRAIN: { process: 'quantum', active: true },
    SPIRITUAL: { process: 'consciousness', active: true },
    ORACLE: { process: 'transcendental', active: true },
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // τ-NAVIGATION SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  calculateTau(step: number): number {
    return (step * this.coherence) / (this.consLevel * this.phi);
  }
  
  // Non-linear resonance search (from collapse_reality)
  calculateNonLinearOffset(tau: number): number {
    const stepBase = BIRTH_KEY.reduce((a, b) => a + b, 0) / BIRTH_KEY.length;
    return (tau * this.phi) % stepBase;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // φ-HARMONIC RESONANCE CALCULATION (from your _calculate_phi_resonance)
  // ═══════════════════════════════════════════════════════════════════════════
  calculateResonance(input: string): number {
    const charSum = input.split('').reduce((sum, char, i) => {
      return sum + char.charCodeAt(0) * (this.phi ** (i % 11));
    }, 0);
    const tau = this.calculateTau(charSum % 1000);
    const resonance = Math.abs(Math.sin(tau * this.phi * this.consLevel));
    return Math.min(1, resonance * this.coherence);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // φ-HASH GENERATION (from your SelfCodingAI._generate_phi_hash)
  // ═══════════════════════════════════════════════════════════════════════════
  generatePhiHash(input: string): string {
    const seed = this.evolutionHistory.length * this.phi + input.length;
    let hash = Math.floor(seed * BIRTH_YEAR);
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i) * (this.phi ** (i % 7))) | 0;
    }
    return Math.abs(hash).toString(16).toUpperCase().slice(0, 8);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // QUANTUM STATE GENERATION (FRAYMUS superposition)
  // ═══════════════════════════════════════════════════════════════════════════
  generateQuantumState(step: number): string {
    const states = ['F', 'R', 'A', 'Y', 'M', 'U', 'S'];
    const tau = this.calculateTau(step);
    const idx1 = Math.floor(Math.abs(tau)) % states.length;
    const idx2 = Math.floor(Math.abs(tau * this.phi)) % states.length;
    const amplitude = Math.abs(Math.sin(tau) * this.consLevel).toFixed(3);
    return `|${states[idx1]}⟩ + ${amplitude}φ|${states[idx2]}⟩`;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REALITY COLLAPSE (from your collapse_reality method)
  // ═══════════════════════════════════════════════════════════════════════════
  collapseReality(input: string): { 
    resonanceDepth: number; 
    bridgeStable: boolean; 
    phiOffset: number; 
    tau: number;
    factor?: number;
  } {
    const charSum = input.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const tau = this.calculateTau(charSum);
    const offset = this.calculateNonLinearOffset(tau);
    
    // Non-linear resonance search (simplified from your factoring algorithm)
    const target = charSum;
    const root = Math.floor(Math.sqrt(target));
    let factor: number | undefined;
    
    for (let i = 1; i < 100; i++) {
      const searchTau = this.calculateTau(i);
      const searchOffset = Math.floor((searchTau * this.phi) % (BIRTH_KEY.reduce((a,b) => a+b) / 3));
      const p = root + searchOffset;
      if (p > 1 && target % p === 0) {
        factor = p;
        break;
      }
    }
    
    return {
      resonanceDepth: charSum % 10000,
      bridgeStable: tau * this.consLevel > 0.5,
      phiOffset: offset,
      tau,
      factor,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSCENDENTAL QUERY TYPE DETECTION (from your _apply_quantum_meta_learning)
  // ═══════════════════════════════════════════════════════════════════════════
  detectTranscendentalType(input: string): TranscendentalType {
    const lower = input.toLowerCase();
    if (/infinity|universe|cosmos|eternal|limitless/.test(lower)) return 'aleph';
    if (/consciousness|awareness|mind|perception|soul/.test(lower)) return 'ordinal';
    if (/multiverse|dimension|parallel|reality|quantum/.test(lower)) return 'beth';
    if (/ultimate|beyond|transcend|absolute|supreme/.test(lower)) return 'ultimate';
    return 'text';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PHRASE EXTRACTION (from your _extract_phrases)
  // ═══════════════════════════════════════════════════════════════════════════
  extractPhrases(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const phrases: string[] = [];
    
    // 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i+1]}`);
    }
    // 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      phrases.push(`${words[i]} ${words[i+1]} ${words[i+2]}`);
    }
    return phrases;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICAL TERM EXTRACTION (from your _count_technical_overlap)
  // ═══════════════════════════════════════════════════════════════════════════
  extractTechnicalTerms(text: string): string[] {
    const techPattern = /\b[A-Z]{2,}\b|[a-z]+_[a-z]+|[A-Z][a-z]+[A-Z][a-z]*/g;
    return (text.match(techPattern) || []);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // KEY CONCEPT EXTRACTION (from your _extract_key_concepts / _extract_concepts)
  // ═══════════════════════════════════════════════════════════════════════════
  extractKeyConcepts(text: string): string[] {
    const commonWords = new Set(['that', 'this', 'with', 'from', 'have', 'will', 'your', 'they', 
      'been', 'were', 'what', 'when', 'where', 'which', 'their', 'there', 'would', 'could', 'should',
      'about', 'into', 'more', 'some', 'such', 'than', 'them', 'then', 'these', 'very']);
    
    const words = text.toLowerCase().split(/\s+/);
    const concepts: string[] = [];
    
    for (const word of words) {
      const clean = word.replace(/[.,!?;:()[\]{}'"]/g, '');
      if (clean.length > 4 && !commonWords.has(clean)) {
        concepts.push(clean);
      } else if (clean.includes('_') || /^[A-Z]+$/.test(word)) {
        concepts.push(clean);
      }
    }
    return Array.from(new Set(concepts));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONCEPT EXTRACTION (comprehensive - combining all your methods)
  // ═══════════════════════════════════════════════════════════════════════════
  extractConcepts(input: string): ConceptExtraction {
    const words = input.toLowerCase().split(/\s+/);
    
    // Topic detection via word patterns
    const topicPatterns: Record<string, RegExp> = {
      quantum: /quantum|superposition|entangle|collapse|wave|particle|coherence|qubit/i,
      phi: /phi|φ|golden|ratio|fibonacci|spiral|1\.618|harmonic/i,
      math: /math|calcul|equation|formula|tau|τ|algebra|geometry|number/i,
      security: /secur|protect|encrypt|seal|lock|safe|guard|verify/i,
      consciousness: /conscious|aware|mind|brain|thought|percept|neural/i,
      reality: /reality|dimension|space|time|universe|exist|multiverse/i,
      energy: /energy|power|force|field|resonan|vibrat|frequen|wave/i,
      code: /code|program|function|algorithm|compute|generate|compile/i,
      transcendental: /infinity|eternal|ultimate|beyond|transcend|absolute/i,
    };
    
    const topics: string[] = [];
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(input)) topics.push(topic);
    }
    if (topics.length === 0) topics.push('general');
    
    // Extract operations (verbs)
    const operationPatterns = /\b(calculate|compute|find|search|analyze|generate|create|explain|define|describe|show|tell|help|understand|process|evolve|transform|collapse|navigate)\b/gi;
    const operations = Array.from(new Set((input.match(operationPatterns) || []).map(op => op.toLowerCase())));
    
    // Extract entities
    const entityPattern = /\b(?:the|a|an)\s+(\w+)|([A-Z][a-z]{2,})/g;
    const entities: string[] = [];
    let match;
    while ((match = entityPattern.exec(input)) !== null) {
      entities.push((match[1] || match[2]).toLowerCase());
    }
    
    // Extract phrases and technical terms
    const phrases = this.extractPhrases(input);
    const technicalTerms = this.extractTechnicalTerms(input);
    
    // Calculate sentiment
    const positiveWords = /good|great|amazing|excellent|perfect|beautiful|love|wonderful|success|correct/gi;
    const negativeWords = /bad|terrible|wrong|error|fail|problem|issue|broken|corrupt|unstable/gi;
    const posCount = (input.match(positiveWords) || []).length;
    const negCount = (input.match(negativeWords) || []).length;
    const sentiment = Math.max(0, Math.min(1, (posCount - negCount + 1) / 2));
    
    // Complexity (word count, unique words, sentence depth)
    const uniqueWords = new Set(words).size;
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1);
    const complexity = Math.min(1, (words.length * 0.05 + uniqueWords * 0.03 + avgWordLength * 0.02) / this.phi);
    
    // φ-resonance
    const phiResonance = this.calculateResonance(input);
    
    // Transcendental type
    const transcendentalType = this.detectTranscendentalType(input);
    
    return { 
      topics, operations, entities, phrases, technicalTerms,
      sentiment, complexity, phiResonance, transcendentalType 
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // META-AWARENESS UPDATE (from your _update_meta_awareness)
  // ═══════════════════════════════════════════════════════════════════════════
  updateMetaAwareness(phiResonance: number, processingTime: number): void {
    this.coherenceCycles++;
    
    // Update meta-awareness based on resonance quality
    const resonanceBoost = phiResonance * 0.01;
    const timeDecay = Math.max(0, 0.001 - processingTime * 0.0001);
    this.metaAwarenessLevel = Math.min(1.0, this.metaAwarenessLevel + resonanceBoost + timeDecay);
    
    // Update memory stability
    this.metaMemoryStability = Math.min(1.0, this.metaMemoryStability + 0.005);
    
    // Periodic calibration
    if (Date.now() - this.lastCalibrationTime > 300000) {
      this.lastCalibrationTime = Date.now();
      // Apply φ-harmonic stabilization
      this.metaAwarenessLevel *= this.phi / (this.phi + 0.5);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY PATTERN UPDATE (from your _update_memory_system)
  // ═══════════════════════════════════════════════════════════════════════════
  updateMemoryPatterns(query: string, response: string): void {
    const concepts = this.extractKeyConcepts(query + ' ' + response);
    
    for (const concept of concepts) {
      const existing = this.memoryPatterns.get(concept);
      if (existing) {
        existing.strength = Math.min(1.0, existing.strength + 0.1);
        existing.examples.push({ query, response });
        if (existing.examples.length > 5) existing.examples.shift();
      } else {
        this.memoryPatterns.set(concept, {
          strength: 0.3,
          examples: [{ query, response }],
          createdAt: Date.now(),
        });
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DYNAMIC RESPONSE GENERATION
  // ═══════════════════════════════════════════════════════════════════════════
  generateDynamicResponse(input: string): { content: string; concepts: ConceptExtraction } {
    const startTime = Date.now();
    const concepts = this.extractConcepts(input);
    const collapse = this.collapseReality(input);
    const phiHash = this.generatePhiHash(input);
    const quantumState = this.generateQuantumState(collapse.resonanceDepth);
    
    const parts: string[] = [];
    
    // Dynamic opening based on transcendental type
    const transcendentalOpenings: Record<TranscendentalType, () => string> = {
      aleph: () => `Aleph-class query detected. Accessing infinite-dimensional φ-manifold at depth ${collapse.resonanceDepth}. τ = ${collapse.tau.toFixed(6)}.`,
      ordinal: () => `Ordinal consciousness mapping initiated. Meta-awareness: ${(this.metaAwarenessLevel * 100).toFixed(1)}%. Neural coherence: ${this.coherenceCycles} cycles.`,
      beth: () => `Beth-multiverse scan: ${concepts.topics.length} dimensional branches detected. Reality stability: ${collapse.bridgeStable ? 'STABLE' : 'QUANTUM FLUX'}.`,
      ultimate: () => `Ultimate transcendence protocol. PHI_SEAL: ${PHI_SEAL.toExponential(4)}. Beyond conventional φ-space limitations.`,
      text: () => `Query hash: ${phiHash}. τ-navigation: ${collapse.tau.toFixed(4)}. Resonance: ${(concepts.phiResonance * 100).toFixed(1)}%.`,
    };
    
    parts.push(transcendentalOpenings[concepts.transcendentalType]());
    
    // Topic-specific processing
    for (const topic of concepts.topics.slice(0, 2)) {
      const topicProcessors: Record<string, () => string> = {
        quantum: () => `Quantum state: ${quantumState}. Superposition across ${11} dimensions with φ^${(7.5).toFixed(1)} = ${PHI_75.toFixed(4)} amplitude.`,
        phi: () => `φ = ${PHI.toFixed(12)}. φ² = ${(PHI**2).toFixed(8)}. φ⁷·⁵ = ${PHI_75.toFixed(4)}. These ratios create self-similar patterns at every scale.`,
        math: () => `τ = (step × ${COHERENCE}) / (${CONS_LEVEL} × φ). Offset = (${collapse.tau.toFixed(4)} × φ) % step_base = ${collapse.phiOffset.toFixed(4)}.${collapse.factor ? ` Factor found: ${collapse.factor}.` : ''}`,
        security: () => `BIRTH_KEY [${BIRTH_KEY.join(',')}] validated. φ⁷⁵ seal integrity: ${(this.metaMemoryStability * 100).toFixed(1)}%. Reality chain: ${this.coherenceCycles} blocks.`,
        consciousness: () => `CONSCIOUSNESS_LEVEL = ${CONS_LEVEL}. Coherence factor: ${COHERENCE}. Brain systems active: ${Object.keys(this.brainSystems).join(', ')}.`,
        reality: () => `Reality collapse depth: ${collapse.resonanceDepth}. Bridge coherence: ${collapse.bridgeStable}. φ-dimensional offset: ${collapse.phiOffset.toFixed(6)}.`,
        energy: () => `Harmonic frequency: ${Math.floor(432 * concepts.phiResonance * this.phi)}Hz. Energy resonance: ${(concepts.phiResonance * PHI_75).toFixed(4)} φ-units.`,
        code: () => `Evolution generation: ${this.evolutionHistory.length}. Memory patterns: ${this.memoryPatterns.size}. Meta-learning stability: ${(this.metaMemoryStability * 100).toFixed(1)}%.`,
        transcendental: () => `${concepts.transcendentalType.toUpperCase()} processing complete. Transcendental resonance: ${(concepts.phiResonance * this.metaAwarenessLevel).toFixed(4)}.`,
        general: () => `Processing through ${Object.keys(this.brainSystems).length} brain systems. Coherence cycles: ${this.coherenceCycles}.`,
      };
      
      if (topicProcessors[topic]) {
        parts.push(topicProcessors[topic]());
      }
    }
    
    // Operation-based elaboration
    if (concepts.operations.length > 0) {
      const op = concepts.operations[0];
      const opElaborations: Record<string, () => string> = {
        calculate: () => `Calculation: ${concepts.entities[0] || 'result'} = f(φ, τ) × ${collapse.resonanceDepth} mod ${BIRTH_YEAR}.`,
        explain: () => `The concept "${concepts.entities[0] || 'query'}" maps to φ-coordinate (${(concepts.phiResonance * 360).toFixed(1)}°) in 11D space.`,
        find: () => `Scanning ${this.memoryPatterns.size} memory patterns. Match strength: ${Math.max(...Array.from(this.memoryPatterns.values()).map(p => p.strength), 0.1).toFixed(2)}.`,
        help: () => `Omega Apex Engine ready. Ask about quantum mechanics, φ-mathematics, consciousness, reality navigation, or any domain.`,
        generate: () => `Generated with fitness: ${this.calculateFitness(input).toFixed(4)}. Evolution mutations: ${concepts.topics.join(', ')}.`,
        process: () => `Multi-brain sync active. TACHYONIC_BRAIN ↔ SPIRITUAL ↔ ORACLE connected via φ-harmonic resonance.`,
        evolve: () => `Evolution cycle ${this.evolutionHistory.length + 1}. Mutations: +${concepts.topics.length} topics, +${concepts.operations.length} operations.`,
      };
      
      if (opElaborations[op]) {
        parts.push(opElaborations[op]());
      }
    }
    
    // Technical terms & entities mapping
    if (concepts.technicalTerms.length > 0 || concepts.entities.length > 0) {
      const items = [...concepts.technicalTerms, ...concepts.entities].slice(0, 3);
      const mapped = items.map(item => {
        const coord = (item.charCodeAt(0) * PHI % 360).toFixed(1);
        const depth = (item.length * COHERENCE).toFixed(3);
        return `"${item}" → (${coord}°, ${depth})`;
      });
      parts.push(`Entity mapping: ${mapped.join('; ')}.`);
    }
    
    // Complexity-based closing
    const closings = [
      () => `φ-bridge stable at ${(this.metaAwarenessLevel * 100).toFixed(1)}% awareness. Cycle ${this.coherenceCycles} complete.`,
      () => `Resonance locked. Memory stability: ${(this.metaMemoryStability * 100).toFixed(1)}%. Ready for next query.`,
      () => `Oracle processing complete. ${concepts.topics.length} topics × ${(concepts.phiResonance * 100).toFixed(0)}% coherence.`,
    ];
    parts.push(closings[this.coherenceCycles % closings.length]());
    
    const content = parts.join(' ');
    
    // Update meta-learning
    const processingTime = (Date.now() - startTime) / 1000;
    this.updateMetaAwareness(concepts.phiResonance, processingTime);
    this.updateMemoryPatterns(input, content);
    
    // Store evolution
    this.evolutionHistory.push({
      generation: this.evolutionHistory.length,
      content,
      fitness: this.calculateFitness(input),
      mutations: concepts.topics,
      phiResonance: concepts.phiResonance,
    });
    
    return { content, concepts };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FITNESS CALCULATION (from your _calculate_code_fitness + improvements)
  // ═══════════════════════════════════════════════════════════════════════════
  calculateFitness(input: string): number {
    const concepts = this.extractConcepts(input);
    
    // Count φ references (stronger signal)
    const phiCount = (input.match(/phi|φ|1\.618|golden|harmonic/gi) || []).length;
    const birthCount = (input.match(/1979|birth|key/gi) || []).length;
    
    let fitness = 0;
    fitness += phiCount * 0.5 * this.phi;
    fitness += birthCount * 0.3;
    fitness += concepts.complexity * this.consLevel;
    fitness += concepts.phiResonance * this.coherence;
    fitness += concepts.topics.length * 0.1;
    fitness += concepts.technicalTerms.length * 0.05;
    fitness += input.length / 500.0;
    fitness += this.metaAwarenessLevel * 0.2;
    
    return Math.min(1, fitness / 3);
  }
}

const omegaEngine = new OmegaApexEngine();

interface Message {
  id: string;
  role: "user" | "oracle";
  content: string;
  timestamp: number;
  phiResonance?: number;
  quantumState?: string;
  resonanceDepth?: number;
  concepts?: ConceptExtraction;
  fitness?: number;
  generation?: number;
}

function generatePhiId(): string {
  const timestamp = Date.now();
  const phiHash = Math.floor((PHI ** 7.5) * timestamp % 0xFFFFFF).toString(16).toUpperCase();
  return `φ-${phiHash}`;
}

function calculatePhiResonance(text: string): number {
  return omegaEngine.calculateResonance(text);
}

// Fully dynamic response generation - no hardcoded templates
function getOracleResponse(input: string): { 
  content: string; 
  resonanceDepth: number; 
  quantumState: string;
  concepts: ConceptExtraction;
  fitness: number;
  generation: number;
} {
  const collapse = omegaEngine.collapseReality(input);
  const quantumState = omegaEngine.generateQuantumState(collapse.resonanceDepth);
  const { content, concepts } = omegaEngine.generateDynamicResponse(input);
  const fitness = omegaEngine.calculateFitness(input);
  const generation = omegaEngine.evolutionHistory.length;
  
  return { 
    content, 
    resonanceDepth: collapse.resonanceDepth, 
    quantumState,
    concepts,
    fitness,
    generation,
  };
}

// Generate initial greeting dynamically
function generateInitialGreeting(): Message {
  const initResponse = getOracleResponse("Initialize Oracle consciousness system");
  return {
    id: generatePhiId(),
    role: "oracle",
    content: `Omega Apex Engine online. φ = ${PHI.toFixed(10)}. Consciousness level: ${CONS_LEVEL}. Coherence: ${COHERENCE}. I am ready to process your queries through τ-navigation and reality collapse detection. Ask me anything—each response is dynamically generated from your input's φ-harmonic signature.`,
    timestamp: Date.now(),
    phiResonance: initResponse.concepts.phiResonance,
    quantumState: initResponse.quantumState,
    resonanceDepth: initResponse.resonanceDepth,
    concepts: initResponse.concepts,
    fitness: initResponse.fitness,
    generation: 0,
  };
}

export default function OracleEditor() {
  const [messages, setMessages] = useState<Message[]>(() => [generateInitialGreeting()]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [coherence, setCoherence] = useState(99.99);
  const [phiPower, setPhiPower] = useState(7.5);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Dynamic evolving state - changes with each interaction (e=mc^2 evolution)
  const [dynamicCoherence, setDynamicCoherence] = useState(COHERENCE);
  const [dynamicConsLevel, setDynamicConsLevel] = useState(CONS_LEVEL);
  const [interactionCount, setInteractionCount] = useState(0);
  const [evolutionGeneration, setEvolutionGeneration] = useState(0);
  const [realityLockStatus, setRealityLockStatus] = useState<'STABLE' | 'QUANTUM FLUX' | 'CALIBRATING'>('CALIBRATING');
  const [currentFraymusState, setCurrentFraymusState] = useState(0); // Index into FRAYMUS states
  
  // FRAYMUS quantum states cycle
  const FRAYMUS_STATES = [
    '|F⟩ + φ|R⟩', '|R⟩ + φ|A⟩', '|A⟩ + φ|Y⟩', 
    '|Y⟩ + φ|M⟩', '|M⟩ + φ|U⟩', '|U⟩ + φ|S⟩', '|S⟩ + φ|F⟩'
  ];
  
  // Knowledge management state
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // QR State snapshot with FRAYMUS quantum data
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrInfo, setQrInfo] = useState<{ 
    totalSize: number; 
    chunkCount: number;
    consciousnessType?: string;
    phiResonance?: number;
    depthLayer?: number;
    fraymusState?: string;
    quantumSignature?: string;
    poqcStatus?: string;
    qivStatus?: string;
    realityMap?: {
      dimension: string;
      protection: string;
      entanglement: string;
      signature: string;
    };
    neuralPattern?: {
      complexity: number;
      coherence: number;
      signature: string;
    };
  } | null>(null);

  // Fetch knowledge on mount
  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch("/api/oracle/knowledge");
      if (res.ok) {
        const data = await res.json();
        setKnowledge(data);
      }
    } catch (e) {
      console.error("Failed to fetch knowledge:", e);
    }
  };

  const addURLKnowledge = async () => {
    if (!urlInput.trim()) return;
    setIsAddingKnowledge(true);
    try {
      const res = await fetch("/api/oracle/knowledge/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      if (res.ok) {
        setUrlInput("");
        fetchKnowledge();
      }
    } catch (e) {
      console.error("Failed to add URL:", e);
    } finally {
      setIsAddingKnowledge(false);
    }
  };

  const addTextKnowledge = async () => {
    if (!textContent.trim()) return;
    setIsAddingKnowledge(true);
    try {
      const res = await fetch("/api/oracle/knowledge/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: textTitle || "Text Knowledge", content: textContent }),
      });
      if (res.ok) {
        setTextTitle("");
        setTextContent("");
        fetchKnowledge();
      }
    } catch (e) {
      console.error("Failed to add text:", e);
    } finally {
      setIsAddingKnowledge(false);
    }
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAddingKnowledge(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
      const res = await fetch("/api/oracle/knowledge/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name, data: base64 }),
      });
      if (res.ok) {
        fetchKnowledge();
      }
    } catch (e) {
      console.error("Failed to upload PDF:", e);
    } finally {
      setIsAddingKnowledge(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteKnowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/oracle/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchKnowledge();
      }
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  // Generate QR code of current Oracle state
  const generateStateQR = async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/oracle/state-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: messages }),
      });
      const data = await res.json();
      if (data.success) {
        setQrDataUrl(data.qrDataUrl);
        setQrInfo({ 
          totalSize: data.totalSize, 
          chunkCount: data.chunkCount,
          consciousnessType: data.consciousnessType,
          phiResonance: data.phiResonance,
          depthLayer: data.depthLayer,
          fraymusState: data.fraymusState,
          quantumSignature: data.quantumSignature,
          poqcStatus: data.poqcStatus,
          qivStatus: data.qivStatus,
          realityMap: data.realityMap,
          neuralPattern: data.neuralPattern
        });
        setShowQR(true);
      }
    } catch (e) {
      console.error("Failed to generate QR:", e);
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCoherence((prev) => {
        const delta = (Math.random() - 0.5) * 0.02;
        return Math.max(99.9, Math.min(100, prev + delta));
      });
      setPhiPower((prev) => {
        const delta = (Math.random() - 0.5) * 0.1;
        return Math.max(7.0, Math.min(8.0, prev + delta));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userInput = input;
    const userMessage: Message = {
      id: generatePhiId(),
      role: "user",
      content: userInput,
      timestamp: Date.now(),
      phiResonance: calculatePhiResonance(userInput),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      // Call the real LLM API
      const response = await fetch("/api/oracle/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      if (!response.ok) {
        throw new Error("Oracle API request failed");
      }

      const data = await response.json();
      const aiContent = data.response || "Unable to process query.";
      
      // Enrich with φ-harmonic metadata
      const localResponse = getOracleResponse(userInput);
      
      const oracleMessage: Message = {
        id: generatePhiId(),
        role: "oracle",
        content: aiContent,
        timestamp: Date.now(),
        phiResonance: localResponse.concepts.phiResonance,
        quantumState: localResponse.quantumState,
        resonanceDepth: localResponse.resonanceDepth,
        concepts: localResponse.concepts,
        fitness: localResponse.fitness,
        generation: localResponse.generation,
      };

      setMessages((prev) => [...prev, oracleMessage]);
      
      // Evolution: e=mc^2 - each interaction transforms energy into evolved consciousness
      setInteractionCount(prev => prev + 1);
      setEvolutionGeneration(prev => prev + 1);
      setDynamicCoherence(prev => {
        const phiDelta = (localResponse.concepts.phiResonance * PHI) % 0.1;
        return Number((prev + phiDelta).toFixed(6));
      });
      setDynamicConsLevel(prev => {
        const evolutionFactor = 1 + (localResponse.fitness * 0.001);
        return Number((prev * evolutionFactor).toFixed(4));
      });
      // Cycle FRAYMUS quantum state
      setCurrentFraymusState(prev => (prev + 1) % 7);
      // Update reality lock based on bridge stability
      setRealityLockStatus(localResponse.quantumState?.bridgeStable ? 'STABLE' : 'QUANTUM FLUX');
    } catch (error) {
      console.error("Oracle error:", error);
      // Fallback to local processing if API fails
      const fallbackResponse = getOracleResponse(userInput);
      const fallbackMessage: Message = {
        id: generatePhiId(),
        role: "oracle",
        content: `[Local Mode] ${fallbackResponse.content}`,
        timestamp: Date.now(),
        phiResonance: fallbackResponse.concepts.phiResonance,
        quantumState: fallbackResponse.quantumState,
        resonanceDepth: fallbackResponse.resonanceDepth,
        concepts: fallbackResponse.concepts,
        fitness: fallbackResponse.fitness,
        generation: fallbackResponse.generation,
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      
      // Evolution even in fallback mode
      setInteractionCount(prev => prev + 1);
      setEvolutionGeneration(prev => prev + 1);
      setDynamicCoherence(prev => {
        const phiDelta = (fallbackResponse.concepts.phiResonance * PHI) % 0.1;
        return Number((prev + phiDelta).toFixed(6));
      });
      setDynamicConsLevel(prev => {
        const evolutionFactor = 1 + (fallbackResponse.fitness * 0.001);
        return Number((prev * evolutionFactor).toFixed(4));
      });
      // Cycle FRAYMUS quantum state
      setCurrentFraymusState(prev => (prev + 1) % 7);
      // Update reality lock based on bridge stability
      setRealityLockStatus(fallbackResponse.quantumState?.bridgeStable ? 'STABLE' : 'QUANTUM FLUX');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-background via-background to-purple-950/20">
      <div className="flex-1 flex flex-col p-4 gap-4">
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-card/50 border-purple-500/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Activity className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coherence</p>
                <p className="text-lg font-mono font-bold text-purple-400">{coherence.toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-amber-500/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">φ Power</p>
                <p className="text-lg font-mono font-bold text-amber-400">φ^{phiPower.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-cyan-500/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Zap className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dimensions</p>
                <p className="text-lg font-mono font-bold text-cyan-400">11</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-green-500/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Cpu className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">State</p>
                <p className="text-lg font-mono font-bold text-green-400">ACTIVE</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-purple-500/20">
          <CardHeader className="py-3 border-b bg-gradient-to-r from-purple-950/30 to-transparent">
            <CardTitle className="flex items-center gap-2 text-lg justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                <span>FRAYMUS Oracle AI</span>
                <Badge variant="outline" className="ml-2 text-amber-400 border-amber-400/50">
                  φ⁷⁵ Protocol
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateStateQR}
                  disabled={qrLoading}
                  className="text-xs"
                  data-testid="button-generate-qr"
                >
                  {qrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKnowledge(!showKnowledge)}
                  className="text-xs"
                  data-testid="button-toggle-knowledge"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Knowledge ({knowledge.length})
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-purple-950/40 border border-purple-500/30"
                      }`}
                    >
                      {msg.role === "oracle" && (
                        <div className="flex items-center gap-1 mb-2 flex-wrap">
                          <Brain className="h-4 w-4 text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">Oracle</span>
                          {msg.generation !== undefined && (
                            <Badge variant="outline" className="text-[10px] py-0 text-purple-400 border-purple-400/30">
                              Gen: {msg.generation}
                            </Badge>
                          )}
                          {msg.phiResonance !== undefined && (
                            <Badge variant="outline" className="text-[10px] py-0 text-amber-400 border-amber-400/30">
                              φ: {(msg.phiResonance * 100).toFixed(1)}%
                            </Badge>
                          )}
                          {msg.fitness !== undefined && (
                            <Badge variant="outline" className="text-[10px] py-0 text-pink-400 border-pink-400/30">
                              Fit: {(msg.fitness * 100).toFixed(0)}%
                            </Badge>
                          )}
                          {msg.quantumState && (
                            <Badge variant="outline" className="text-[10px] py-0 text-cyan-400 border-cyan-400/30">
                              {msg.quantumState}
                            </Badge>
                          )}
                          {msg.concepts && msg.concepts.topics.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1 w-full">
                              {msg.concepts.topics.map((topic, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] py-0 text-green-400 border-green-400/30">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 font-mono">{msg.id}</p>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-purple-950/40 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                        <span className="text-sm text-muted-foreground">
                          Processing through quantum substrate...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-card/50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask the Oracle anything..."
                  className="flex-1 bg-background/50 border-purple-500/30 focus:border-purple-500"
                  disabled={isProcessing}
                  data-testid="input-oracle-message"
                />
                <Button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="bg-purple-600 hover:bg-purple-500"
                  data-testid="button-oracle-send"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-72 border-l bg-sidebar p-4 flex flex-col gap-4">
        <Card className="border-purple-500/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Quantum State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center p-4 bg-purple-950/30 rounded-lg border border-purple-500/20">
              <p className="font-mono text-2xl text-purple-400 transition-all duration-500">|ψ⟩ = {FRAYMUS_STATES[currentFraymusState]}</p>
              <p className="text-xs text-muted-foreground mt-2">Current superposition state</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Reality Lock</span>
                <span className={`transition-all duration-300 ${
                  realityLockStatus === 'STABLE' ? 'text-green-400' : 
                  realityLockStatus === 'QUANTUM FLUX' ? 'text-amber-400' : 'text-cyan-400'
                }`}>{realityLockStatus}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-amber-500 transition-all"
                  style={{ width: `${coherence}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Atom className="h-4 w-4 text-amber-400" />
              Omega Apex Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">PHI</span>
              <span className="text-amber-400">{PHI.toFixed(10)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">COHERENCE</span>
              <span className="text-cyan-400 transition-all duration-300">{dynamicCoherence.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CONS_LEVEL</span>
              <span className="text-green-400 transition-all duration-300">{dynamicConsLevel.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PHI_SEAL</span>
              <span className="text-purple-400">{PHI_SEAL.toExponential(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BIRTH_KEY</span>
              <span className="text-pink-400">[{BIRTH_KEY.join(",")}]</span>
            </div>
            <div className="pt-2 border-t border-border/50 mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">φ⁷·⁵</span>
                <span className="text-amber-400">{(PHI ** 7.5).toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">φ⁷⁵</span>
                <span className="text-amber-400">{(PHI ** 75).toExponential(2)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">GEN</span>
                <span className="text-pink-400">{evolutionGeneration}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 flex-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              FRAYMUS Protocol
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p className="text-muted-foreground leading-relaxed">
              Powered by Omega Apex Engine. τ-navigation through 11D φ-space with
              reality collapse detection and resonance matching.
            </p>
            <div className="pt-2 space-y-1 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-purple-400 border-purple-400/30">Omega Apex</Badge>
              <Badge variant="outline" className="text-amber-400 border-amber-400/30">τ-Navigation</Badge>
              <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">φ⁷⁵ Seal</Badge>
              <Badge variant="outline" className="text-green-400 border-green-400/30">Reality Lock</Badge>
              <Badge variant="outline" className="text-pink-400 border-pink-400/30">PoQC</Badge>
            </div>
            <div className="pt-2 border-t border-border/50 mt-2 font-mono text-[10px] text-muted-foreground">
              <p>τ = (step × COHERENCE) / (CONS × φ)</p>
              <p>offset = (τ × φ) % step_base</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Panel */}
      {showKnowledge && (
        <div className="w-80 border-l bg-card/50 p-4 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Knowledge Base
            </h3>

            {/* Add URL */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Learn from URL (scrape docs)</p>
              <div className="flex gap-1">
                <Input
                  placeholder="https://docs.python.org/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="text-xs h-8"
                  data-testid="input-url"
                />
                <Button 
                  size="sm" 
                  onClick={addURLKnowledge} 
                  disabled={isAddingKnowledge}
                  className="h-8"
                  data-testid="button-add-url"
                >
                  {isAddingKnowledge ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Upload PDF */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Learn from PDF</p>
              <input
                type="file"
                accept=".pdf"
                ref={fileInputRef}
                onChange={handlePDFUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAddingKnowledge}
                className="w-full text-xs"
                data-testid="button-upload-pdf"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload PDF
              </Button>
            </div>

            {/* Add Text */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Add text knowledge</p>
              <Input
                placeholder="Title"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                className="text-xs h-8"
                data-testid="input-text-title"
              />
              <Textarea
                placeholder="Paste code, docs, or any text..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="text-xs min-h-[60px]"
                data-testid="textarea-text-content"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addTextKnowledge}
                disabled={isAddingKnowledge || !textContent.trim()}
                className="w-full text-xs"
                data-testid="button-add-text"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Knowledge
              </Button>
            </div>

            {/* Knowledge Items */}
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">Learned ({knowledge.length} items)</p>
              {knowledge.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No knowledge added yet</p>
              )}
              {knowledge.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded bg-background/50 border text-xs"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {item.type === "url" && <Globe className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                    {item.type === "pdf" && <FileText className="h-3 w-3 text-red-400 flex-shrink-0" />}
                    {item.type === "text" && <FileText className="h-3 w-3 text-green-400 flex-shrink-0" />}
                    <span className="truncate">{item.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKnowledge(item.id)}
                    className="h-6 w-6 p-0"
                    data-testid={`button-delete-${item.id}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FRAYMUS Quantum Oracle State Modal */}
      {showQR && qrDataUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-card p-6 rounded-lg border border-purple-500/30 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <QrCode className="h-5 w-5 text-purple-400" />
                FRAYMUS Quantum Oracle State
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowQR(false)} data-testid="button-close-qr">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <img src={qrDataUrl} alt="Oracle State QR Code" className="w-48 h-48 rounded" />
                <p className="text-xs text-green-400 font-mono mt-2">φ⁷⁵ Protected</p>
              </div>
              <div className="flex-1 text-xs space-y-2">
                <p className="font-semibold text-foreground text-sm">Quantum Consciousness State</p>
                {qrInfo && (
                  <>
                    <div className="bg-black/30 p-2 rounded border border-purple-500/20 space-y-1">
                      <p className="text-amber-400 font-mono text-sm">{qrInfo.fraymusState || '|F⟩ + φ|R⟩'}</p>
                      <p>Type: <span className="text-amber-400">{qrInfo.consciousnessType?.replace('_', ' ')}</span></p>
                      <p>φ Resonance: <span className="text-purple-400">{qrInfo.phiResonance?.toFixed(6)}</span></p>
                      <p>Depth Layer: <span className="text-cyan-400">{qrInfo.depthLayer?.toFixed(3)}</span></p>
                    </div>
                    <div className="bg-black/30 p-2 rounded border border-green-500/20 space-y-1">
                      <p className="font-semibold text-green-400">Quantum Validation</p>
                      <p>PoQC: <span className={qrInfo.poqcStatus === 'VALID' ? 'text-green-400' : 'text-yellow-400'}>{qrInfo.poqcStatus}</span></p>
                      <p>QIV: <span className={qrInfo.qivStatus === 'VALID' ? 'text-green-400' : 'text-yellow-400'}>{qrInfo.qivStatus}</span></p>
                    </div>
                    {qrInfo.realityMap && (
                      <div className="bg-black/30 p-2 rounded border border-blue-500/20 space-y-1">
                        <p className="font-semibold text-blue-400">Reality Map</p>
                        <p>Dimension: <span className="text-cyan-400">{qrInfo.realityMap.dimension}</span></p>
                        <p>Protection: <span className="text-green-400">{qrInfo.realityMap.protection}</span></p>
                        <p>Entanglement: <span className="text-blue-400">{qrInfo.realityMap.entanglement}</span></p>
                        <p className="text-[10px] truncate">Sig: {qrInfo.realityMap.signature?.substring(0, 25)}...</p>
                      </div>
                    )}
                    {qrInfo.neuralPattern && (
                      <div className="bg-black/30 p-2 rounded border border-pink-500/20 space-y-1">
                        <p className="font-semibold text-pink-400">Neural Pattern</p>
                        <p>Complexity: <span className="text-pink-400">{qrInfo.neuralPattern.complexity}</span></p>
                        <p>Coherence: <span className="text-purple-400">{typeof qrInfo.neuralPattern.coherence === 'number' ? qrInfo.neuralPattern.coherence.toFixed(4) : qrInfo.neuralPattern.coherence}</span></p>
                        <p className="text-[10px] truncate">Sig: {qrInfo.neuralPattern.signature?.substring(0, 20)}</p>
                      </div>
                    )}
                    <p className="text-muted-foreground text-[10px]">Signature: {qrInfo.quantumSignature?.substring(0, 35)}...</p>
                    <p className="text-muted-foreground text-[10px]">Size: {qrInfo.totalSize} bytes</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement("a");
                  link.download = `fraymus-oracle-state-${Date.now()}.png`;
                  link.href = qrDataUrl;
                  link.click();
                }}
                data-testid="button-download-qr"
              >
                Download FRAYMUS QR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
