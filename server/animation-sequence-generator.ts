import { AnimationSequenceSettings, FilamentShapeType, AnimationControllerType, filamentClipStyles } from "@shared/schema";

interface Triangle {
  vertices: [number, number, number][];
  normal: [number, number, number];
}

interface Point2D {
  x: number;
  y: number;
}

function generateShapePath(shapeType: FilamentShapeType, width: number, height: number, segments: number = 64): Point2D[] {
  const points: Point2D[] = [];
  const hw = width / 2;
  const hh = height / 2;
  
  switch (shapeType) {
    case "heart": {
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        points.push({ x: (x / 16) * hw, y: (y / 17) * hh });
      }
      break;
    }
    case "star": {
      const outerRadius = Math.min(hw, hh);
      const innerRadius = outerRadius * 0.4;
      const starPoints = 5;
      for (let i = 0; i <= starPoints * 2; i++) {
        const angle = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      points.push(points[0]);
      break;
    }
    case "circle": {
      const radius = Math.min(hw, hh);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
      break;
    }
    case "stick_figure": {
      const headR = hh * 0.15;
      const bodyTop = hh * 0.5;
      const bodyBot = -hh * 0.1;
      const legBot = -hh;
      const armSpan = hw * 0.6;
      for (let i = 0; i <= segments / 2; i++) {
        const angle = (i / (segments / 2)) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * headR, y: Math.sin(angle) * headR + hh - headR });
      }
      points.push({ x: 0, y: bodyTop });
      points.push({ x: 0, y: bodyBot });
      points.push({ x: -hw * 0.3, y: legBot });
      points.push({ x: 0, y: bodyBot });
      points.push({ x: hw * 0.3, y: legBot });
      points.push({ x: 0, y: bodyBot });
      points.push({ x: 0, y: bodyTop * 0.7 });
      points.push({ x: -armSpan, y: bodyTop * 0.5 });
      points.push({ x: 0, y: bodyTop * 0.7 });
      points.push({ x: armSpan, y: hh * 0.8 });
      break;
    }
    case "t_rex": {
      const pts = [
        { x: hw * 0.3, y: hh },
        { x: hw * 0.6, y: hh * 0.8 },
        { x: hw * 0.8, y: hh * 0.7 },
        { x: hw * 0.6, y: hh * 0.5 },
        { x: hw * 0.3, y: hh * 0.4 },
        { x: hw * 0.4, y: hh * 0.2 },
        { x: hw * 0.5, y: hh * 0.1 },
        { x: hw * 0.4, y: 0 },
        { x: hw * 0.3, y: -hh * 0.2 },
        { x: hw * 0.4, y: -hh * 0.6 },
        { x: hw * 0.2, y: -hh },
        { x: 0, y: -hh },
        { x: hw * 0.1, y: -hh * 0.5 },
        { x: -hw * 0.2, y: -hh * 0.5 },
        { x: -hw * 0.4, y: -hh },
        { x: -hw * 0.6, y: -hh },
        { x: -hw * 0.5, y: -hh * 0.4 },
        { x: -hw * 0.6, y: -hh * 0.2 },
        { x: -hw * 0.9, y: 0 },
        { x: -hw * 0.7, y: hh * 0.2 },
        { x: -hw * 0.2, y: hh * 0.3 },
        { x: 0, y: hh * 0.6 },
        { x: hw * 0.3, y: hh },
      ];
      points.push(...pts);
      break;
    }
    default:
      const radius = Math.min(hw, hh);
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
  }
  
  return points;
}

function createBox(x: number, y: number, z: number, w: number, h: number, d: number): Triangle[] {
  const triangles: Triangle[] = [];
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const cx = x, cy = y, cz = z;
  
  const addFace = (vertices: [number, number, number][], normal: [number, number, number]) => {
    triangles.push({ vertices: [vertices[0], vertices[1], vertices[2]], normal });
    if (vertices.length > 3) {
      triangles.push({ vertices: [vertices[0], vertices[2], vertices[3]], normal });
    }
  };
  
  addFace([
    [cx - hw, cy - hh, cz + hd],
    [cx + hw, cy - hh, cz + hd],
    [cx + hw, cy + hh, cz + hd],
    [cx - hw, cy + hh, cz + hd],
  ], [0, 0, 1]);
  
  addFace([
    [cx + hw, cy - hh, cz - hd],
    [cx - hw, cy - hh, cz - hd],
    [cx - hw, cy + hh, cz - hd],
    [cx + hw, cy + hh, cz - hd],
  ], [0, 0, -1]);
  
  addFace([
    [cx - hw, cy + hh, cz - hd],
    [cx - hw, cy + hh, cz + hd],
    [cx + hw, cy + hh, cz + hd],
    [cx + hw, cy + hh, cz - hd],
  ], [0, 1, 0]);
  
  addFace([
    [cx - hw, cy - hh, cz + hd],
    [cx - hw, cy - hh, cz - hd],
    [cx + hw, cy - hh, cz - hd],
    [cx + hw, cy - hh, cz + hd],
  ], [0, -1, 0]);
  
  addFace([
    [cx + hw, cy - hh, cz + hd],
    [cx + hw, cy - hh, cz - hd],
    [cx + hw, cy + hh, cz - hd],
    [cx + hw, cy + hh, cz + hd],
  ], [1, 0, 0]);
  
  addFace([
    [cx - hw, cy - hh, cz - hd],
    [cx - hw, cy - hh, cz + hd],
    [cx - hw, cy + hh, cz + hd],
    [cx - hw, cy + hh, cz - hd],
  ], [-1, 0, 0]);
  
  return triangles;
}

function createCylinder(x: number, y: number, z: number, radius: number, height: number, segments: number = 16): Triangle[] {
  const triangles: Triangle[] = [];
  const halfHeight = height / 2;
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i / segments) * Math.PI * 2;
    const angle2 = ((i + 1) / segments) * Math.PI * 2;
    
    const x1 = x + Math.cos(angle1) * radius;
    const z1 = z + Math.sin(angle1) * radius;
    const x2 = x + Math.cos(angle2) * radius;
    const z2 = z + Math.sin(angle2) * radius;
    
    const nx = (Math.cos(angle1) + Math.cos(angle2)) / 2;
    const nz = (Math.sin(angle1) + Math.sin(angle2)) / 2;
    const len = Math.sqrt(nx * nx + nz * nz);
    
    triangles.push({
      vertices: [[x1, y - halfHeight, z1], [x2, y - halfHeight, z2], [x2, y + halfHeight, z2]],
      normal: [nx / len, 0, nz / len]
    });
    triangles.push({
      vertices: [[x1, y - halfHeight, z1], [x2, y + halfHeight, z2], [x1, y + halfHeight, z1]],
      normal: [nx / len, 0, nz / len]
    });
    
    triangles.push({
      vertices: [[x, y + halfHeight, z], [x1, y + halfHeight, z1], [x2, y + halfHeight, z2]],
      normal: [0, 1, 0]
    });
    triangles.push({
      vertices: [[x, y - halfHeight, z], [x2, y - halfHeight, z2], [x1, y - halfHeight, z1]],
      normal: [0, -1, 0]
    });
  }
  
  return triangles;
}

function generateFrameHolder(
  settings: AnimationSequenceSettings,
  frameIndex: number,
  shapeType: FilamentShapeType
): Triangle[] {
  const triangles: Triangle[] = [];
  const { frameWidth, frameHeight, filamentDiameter, clipSpacing, wallThickness, basePlateThickness } = settings;
  
  const shapePath = generateShapePath(shapeType, frameWidth, frameHeight);
  
  if (settings.includeBasePlate) {
    const plateWidth = frameWidth + 20;
    const plateDepth = 30;
    triangles.push(...createBox(0, -basePlateThickness / 2, 0, plateWidth, basePlateThickness, plateDepth));
  }
  
  const clipWidth = 5;
  const clipHeight = filamentDiameter * 2.5;
  let totalDist = 0;
  
  for (let i = 1; i < shapePath.length; i++) {
    const dx = shapePath[i].x - shapePath[i - 1].x;
    const dy = shapePath[i].y - shapePath[i - 1].y;
    totalDist += Math.sqrt(dx * dx + dy * dy);
  }
  
  const numClips = Math.max(4, Math.floor(totalDist / clipSpacing));
  const actualSpacing = totalDist / numClips;
  
  let traveled = 0;
  let clipIndex = 0;
  let nextClipDist = actualSpacing / 2;
  
  for (let i = 1; i < shapePath.length && clipIndex < numClips; i++) {
    const p1 = shapePath[i - 1];
    const p2 = shapePath[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    
    while (traveled + segLen >= nextClipDist && clipIndex < numClips) {
      const t = (nextClipDist - traveled) / segLen;
      const clipX = p1.x + dx * t;
      const clipY = p1.y + dy * t;
      const clipZ = 0;
      
      triangles.push(...createBox(clipX, clipY + clipHeight / 2, clipZ, clipWidth, clipHeight, clipWidth));
      
      const channelWidth = filamentDiameter + 0.5;
      const channelDepth = filamentDiameter * 0.8;
      
      clipIndex++;
      nextClipDist += actualSpacing;
    }
    traveled += segLen;
  }
  
  if (settings.includeWireChannels) {
    const channelHeight = 2;
    const channelWidth = 3;
    triangles.push(...createBox(0, -basePlateThickness + channelHeight / 2, -10, channelWidth, channelHeight, 20));
  }
  
  return triangles;
}

function generateControllerHousing(settings: AnimationSequenceSettings): Triangle[] {
  const triangles: Triangle[] = [];
  
  let housingWidth = 40;
  let housingHeight = 25;
  let housingDepth = 60;
  
  switch (settings.controllerType) {
    case "555_timer":
      housingWidth = 35;
      housingHeight = 20;
      housingDepth = 45;
      break;
    case "arduino_nano":
      housingWidth = 25;
      housingHeight = 15;
      housingDepth = 50;
      break;
    case "attiny85":
      housingWidth = 20;
      housingHeight = 15;
      housingDepth = 25;
      break;
    case "esp32":
      housingWidth = 35;
      housingHeight = 20;
      housingDepth = 55;
      break;
    case "pico":
      housingWidth = 30;
      housingHeight = 15;
      housingDepth = 55;
      break;
  }
  
  const wallT = 2;
  const innerW = housingWidth - wallT * 2;
  const innerH = housingHeight - wallT * 2;
  const innerD = housingDepth - wallT * 2;
  
  triangles.push(...createBox(0, housingHeight / 2, 0, housingWidth, housingHeight, housingDepth));
  
  const usbWidth = 12;
  const usbHeight = 6;
  triangles.push(...createBox(0, housingHeight - wallT - usbHeight / 2, housingDepth / 2 - wallT / 2, usbWidth, usbHeight, wallT + 1));
  
  for (let i = 0; i < settings.frameCount; i++) {
    const wireHoleX = -housingWidth / 2 + 5 + i * 8;
    triangles.push(...createCylinder(wireHoleX, wallT + 2, -housingDepth / 2, 1.5, wallT + 1, 8));
  }
  
  return triangles;
}

function trianglesToSTL(triangles: Triangle[], name: string = "Model"): string {
  let stl = `solid ${name}\n`;
  
  for (const tri of triangles) {
    const [nx, ny, nz] = tri.normal;
    stl += `  facet normal ${nx.toExponential(6)} ${ny.toExponential(6)} ${nz.toExponential(6)}\n`;
    stl += "    outer loop\n";
    for (const vertex of tri.vertices) {
      const [vx, vy, vz] = vertex;
      stl += `      vertex ${vx.toExponential(6)} ${vy.toExponential(6)} ${vz.toExponential(6)}\n`;
    }
    stl += "    endloop\n";
    stl += "  endfacet\n";
  }
  
  stl += `endsolid ${name}\n`;
  return stl;
}

export function generate555TimerCode(settings: AnimationSequenceSettings): string {
  const { frameCount, frameDelayMs } = settings;
  
  return `/*
 * 555 Timer Animation Sequencer
 * ${settings.sequenceName}
 * 
 * This uses a 4017 decade counter with a 555 timer to sequence ${frameCount} LEDs.
 * Each LED stays on for approximately ${frameDelayMs}ms.
 * 
 * CIRCUIT:
 * - 555 Timer in astable mode controls the clock
 * - 4017 Decade Counter sequences through outputs
 * - Each Q output (Q0-Q${frameCount - 1}) drives one LED through a resistor
 * 
 * COMPONENTS:
 * - 1x 555 Timer IC
 * - 1x 4017 Decade Counter IC
 * - ${frameCount}x LEDs
 * - ${frameCount}x 220Ω resistors (LED current limiting)
 * - 1x ${Math.round(1.44 / ((frameDelayMs / 1000) * 0.00001) / 1000)}kΩ resistor (R1 for 555)
 * - 1x ${Math.round(0.7 / ((frameDelayMs / 1000) * 0.00001) / 1000)}kΩ resistor (R2 for 555)
 * - 1x ${(frameDelayMs * 10).toFixed(0)}nF capacitor (C1 for 555)
 * - 1x 0.01µF capacitor (bypass for 555 pin 5)
 * 
 * WIRING:
 * 555 Timer:
 *   Pin 1 (GND) → Ground
 *   Pin 2 (TRIG) → Pin 6 (THR)
 *   Pin 3 (OUT) → 4017 Pin 14 (CLK)
 *   Pin 4 (RST) → VCC
 *   Pin 5 (CTRL) → 0.01µF to Ground
 *   Pin 6 (THR) → C1 to Ground
 *   Pin 7 (DIS) → R2 to Pin 6, R1 to VCC
 *   Pin 8 (VCC) → 5V
 * 
 * 4017 Decade Counter:
 *   Pin 16 (VCC) → 5V
 *   Pin 8 (GND) → Ground
 *   Pin 14 (CLK) → 555 Pin 3
 *   Pin 13 (CLK-EN) → Ground
 *   Pin 15 (RST) → Q${frameCount} (to reset after ${frameCount} counts)
 *   Q0-Q${frameCount - 1} → LED${frameCount > 1 ? 's' : ''} through 220Ω
 */

// No code needed - this is a hardware-only solution!
// The 555 timer generates clock pulses at the specified rate,
// and the 4017 counter sequences through the LED outputs.
`;
}

export function generateArduinoCode(settings: AnimationSequenceSettings): string {
  const { frameCount, frameDelayMs, controllerType, ledType, sequenceName } = settings;
  
  const isNano = controllerType === "arduino_nano";
  const isUno = controllerType === "arduino_uno";
  
  let ledPins = "";
  for (let i = 0; i < frameCount; i++) {
    ledPins += `${i === 0 ? "" : ", "}${2 + i}`;
  }
  
  if (ledType === "ws2812b") {
    return `/*
 * Animation Sequencer: ${sequenceName}
 * Controller: ${controllerType.toUpperCase()}
 * LED Type: WS2812B Addressable RGB
 * Frames: ${frameCount}
 * Frame Delay: ${frameDelayMs}ms
 */

#include <FastLED.h>

#define NUM_LEDS ${frameCount}
#define DATA_PIN 6
#define BRIGHTNESS 128

CRGB leds[NUM_LEDS];

${settings.useRgbColors && settings.frameColors?.length ? 
  `CRGB frameColors[${frameCount}] = {${settings.frameColors.slice(0, frameCount).map(c => {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `CRGB(${r}, ${g}, ${b})`;
  }).join(", ")}};` 
  : `CRGB frameColors[${frameCount}] = {${Array(frameCount).fill("CRGB::White").join(", ")}};`}

int currentFrame = 0;

void setup() {
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.clear();
  FastLED.show();
}

void loop() {
  // Turn off all LEDs
  FastLED.clear();
  
  // Light up current frame
  leds[currentFrame] = frameColors[currentFrame];
  FastLED.show();
  
  delay(${frameDelayMs});
  
  // Advance to next frame
  currentFrame = (currentFrame + 1) % NUM_LEDS;
}
`;
  }
  
  return `/*
 * Animation Sequencer: ${sequenceName}
 * Controller: ${controllerType.toUpperCase()}
 * LED Type: Simple LED
 * Frames: ${frameCount}
 * Frame Delay: ${frameDelayMs}ms
 */

const int LED_PINS[] = {${ledPins}};
const int NUM_FRAMES = ${frameCount};

int currentFrame = 0;

void setup() {
  for (int i = 0; i < NUM_FRAMES; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
  }
}

void loop() {
  // Turn off all LEDs
  for (int i = 0; i < NUM_FRAMES; i++) {
    digitalWrite(LED_PINS[i], LOW);
  }
  
  // Light up current frame
  digitalWrite(LED_PINS[currentFrame], HIGH);
  
  delay(${frameDelayMs});
  
  // Advance to next frame
  currentFrame = (currentFrame + 1) % NUM_FRAMES;
}
`;
}

export function generateESP32Code(settings: AnimationSequenceSettings): string {
  const { frameCount, frameDelayMs, ledType, sequenceName } = settings;
  
  if (ledType === "ws2812b") {
    return `/*
 * Animation Sequencer: ${sequenceName}
 * Controller: ESP32
 * LED Type: WS2812B Addressable RGB
 * Frames: ${frameCount}
 * Frame Delay: ${frameDelayMs}ms
 * 
 * Features WiFi control for remote brightness/speed adjustment
 */

#include <FastLED.h>
#include <WiFi.h>
#include <WebServer.h>

#define NUM_LEDS ${frameCount}
#define DATA_PIN 5
#define BRIGHTNESS 128

CRGB leds[NUM_LEDS];
WebServer server(80);

int currentFrame = 0;
int frameDelay = ${frameDelayMs};
int brightness = BRIGHTNESS;
bool animationRunning = true;

void handleRoot() {
  String html = "<html><body><h1>${sequenceName}</h1>";
  html += "<p>Frame Delay: <input type='range' min='50' max='2000' value='" + String(frameDelay) + "' onchange='fetch(\"/delay?v=\"+this.value)'></p>";
  html += "<p>Brightness: <input type='range' min='0' max='255' value='" + String(brightness) + "' onchange='fetch(\"/brightness?v=\"+this.value)'></p>";
  html += "<button onclick='fetch(\"/toggle\")'>Toggle Animation</button>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleDelay() {
  frameDelay = server.arg("v").toInt();
  server.send(200, "text/plain", "OK");
}

void handleBrightness() {
  brightness = server.arg("v").toInt();
  FastLED.setBrightness(brightness);
  server.send(200, "text/plain", "OK");
}

void handleToggle() {
  animationRunning = !animationRunning;
  server.send(200, "text/plain", animationRunning ? "Running" : "Paused");
}

void setup() {
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(brightness);
  
  // Start WiFi AP
  WiFi.softAP("${sequenceName.replace(/[^a-zA-Z0-9]/g, "_")}", "animation123");
  
  server.on("/", handleRoot);
  server.on("/delay", handleDelay);
  server.on("/brightness", handleBrightness);
  server.on("/toggle", handleToggle);
  server.begin();
}

void loop() {
  server.handleClient();
  
  if (animationRunning) {
    FastLED.clear();
    leds[currentFrame] = CRGB::White;
    FastLED.show();
    
    delay(frameDelay);
    currentFrame = (currentFrame + 1) % NUM_LEDS;
  }
}
`;
  }
  
  return generateArduinoCode({ ...settings, controllerType: "arduino_uno" }).replace("Arduino UNO", "ESP32");
}

export function generatePicoCode(settings: AnimationSequenceSettings): string {
  const { frameCount, frameDelayMs, sequenceName } = settings;
  
  let ledPins = "";
  for (let i = 0; i < frameCount; i++) {
    ledPins += `${i === 0 ? "" : ", "}${2 + i}`;
  }
  
  return `"""
Animation Sequencer: ${sequenceName}
Controller: Raspberry Pi Pico
Frames: ${frameCount}
Frame Delay: ${frameDelayMs}ms

MicroPython code for Raspberry Pi Pico
"""

from machine import Pin
import time

LED_PINS = [${ledPins}]
NUM_FRAMES = ${frameCount}
FRAME_DELAY_MS = ${frameDelayMs}

leds = [Pin(pin, Pin.OUT) for pin in LED_PINS]
current_frame = 0

def all_off():
    for led in leds:
        led.value(0)

def animate():
    global current_frame
    
    all_off()
    leds[current_frame].value(1)
    
    time.sleep_ms(FRAME_DELAY_MS)
    current_frame = (current_frame + 1) % NUM_FRAMES

# Main loop
while True:
    animate()
`;
}

export function generateATtiny85Code(settings: AnimationSequenceSettings): string {
  const { frameCount, frameDelayMs, sequenceName } = settings;
  
  const maxPins = Math.min(frameCount, 5);
  let ledPins = "";
  for (let i = 0; i < maxPins; i++) {
    ledPins += `${i === 0 ? "" : ", "}${i}`;
  }
  
  return `/*
 * Animation Sequencer: ${sequenceName}
 * Controller: ATtiny85
 * Frames: ${maxPins} (ATtiny85 has 5 usable pins)
 * Frame Delay: ${frameDelayMs}ms
 * 
 * Note: ATtiny85 has limited pins. Use charlieplexing for more LEDs.
 */

const int LED_PINS[] = {${ledPins}};
const int NUM_FRAMES = ${maxPins};

int currentFrame = 0;

void setup() {
  for (int i = 0; i < NUM_FRAMES; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
  }
}

void loop() {
  for (int i = 0; i < NUM_FRAMES; i++) {
    digitalWrite(LED_PINS[i], LOW);
  }
  
  digitalWrite(LED_PINS[currentFrame], HIGH);
  delay(${frameDelayMs});
  
  currentFrame = (currentFrame + 1) % NUM_FRAMES;
}
`;
}

export function generateControllerCode(settings: AnimationSequenceSettings): string {
  switch (settings.controllerType) {
    case "555_timer":
      return generate555TimerCode(settings);
    case "arduino_uno":
    case "arduino_nano":
      return generateArduinoCode(settings);
    case "esp32":
      return generateESP32Code(settings);
    case "pico":
      return generatePicoCode(settings);
    case "attiny85":
      return generateATtiny85Code(settings);
    default:
      return generateArduinoCode(settings);
  }
}

export function generateAnimationSequence(settings: AnimationSequenceSettings): {
  files: Record<string, string>;
  readme: string;
} {
  const files: Record<string, string> = {};
  
  for (let i = 0; i < settings.frameCount; i++) {
    const frame = settings.frames[i];
    const shapeType = frame?.shapeType || "circle";
    const triangles = generateFrameHolder(settings, i, shapeType);
    files[`frame_${i + 1}_${shapeType}.stl`] = trianglesToSTL(triangles, `Frame_${i + 1}`);
  }
  
  if (settings.includeControllerHousing) {
    const housingTriangles = generateControllerHousing(settings);
    files["controller_housing.stl"] = trianglesToSTL(housingTriangles, "Controller_Housing");
  }
  
  const controllerCode = generateControllerCode(settings);
  const extension = settings.controllerType === "pico" ? ".py" : ".ino";
  const filename = settings.controllerType === "555_timer" ? "circuit_diagram.txt" : `animation_controller${extension}`;
  files[filename] = controllerCode;
  
  const readme = `# ${settings.sequenceName}

## Animation Sequence Export

This package contains everything you need to build your animated LED sign.

### Contents

**3D Print Files:**
${Object.keys(files).filter(f => f.endsWith('.stl')).map(f => `- ${f}`).join('\n')}

**Controller Code:**
- ${filename}

### Assembly Instructions

1. **Print all frame holders** at 0.2mm layer height with 20% infill
2. **Install LED filaments** into each frame's clip holders
3. **Wire the LEDs** to the controller:
${settings.controllerType === "555_timer" ? 
  `   - Follow the 555 timer circuit diagram in the code file
   - Use a 4017 decade counter for sequencing` :
  `   - Connect LED ${settings.frames.length > 1 ? 'grounds' : 'ground'} to controller GND
   - Connect each LED's positive lead to the specified GPIO pin`}
4. **Mount the controller** in the housing (if included)
5. **Power up** and enjoy your animation!

### Specifications

- **Frame Count:** ${settings.frameCount}
- **Frame Delay:** ${settings.frameDelayMs}ms
- **Controller:** ${settings.controllerType.replace(/_/g, ' ').toUpperCase()}
- **LED Type:** ${settings.ledType.replace(/_/g, ' ')}
- **Frame Size:** ${settings.frameWidth}mm x ${settings.frameHeight}mm

### Tips

- Use diffusion material in front of LEDs for smoother glow
- Consider PWM dimming for smoother transitions
- For outdoor use, seal electronics with conformal coating
`;
  
  files["README.md"] = readme;
  
  return { files, readme };
}
