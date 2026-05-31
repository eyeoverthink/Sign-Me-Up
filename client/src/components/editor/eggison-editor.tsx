import { useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEditorStore } from "@/lib/editor-store";
import { 
  type EggisonSettings,
  type EggisonBaseType,
  type EggisonShellStyle,
  type EggisonLightType,
  type EggisonDiffusionPattern,
  type EggisonThreadType,
  type EggisonShellMode,
  eggisonBaseTypes,
  eggisonShellStyles,
  eggisonLightTypes,
  eggisonDiffusionPatterns,
  eggisonThreadTypes,
  eggisonShellModes,
} from "@shared/schema";
import { 
  Egg, 
  Download, 
  Glasses, 
  Footprints, 
  Battery, 
  Lightbulb,
  Zap,
  Cable,
  Grid3X3,
  Image,
  Upload,
  Layers,
  RotateCcw,
} from "lucide-react";

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

const baseTypeLabels: Record<EggisonBaseType, string> = {
  "E26": "E26 (US Standard)",
  "E27": "E27 (European)",
  "E14": "E14 (Small/Candelabra)",
};

const shellStyleLabels: Record<EggisonShellStyle, string> = {
  "classic": "Classic Egg",
  "tall": "Tall Egg",
  "wide": "Wide Egg",
  "mini": "Mini Egg",
  "cracked": "Cracked/Hatched",
  "split": "Split (2 Halves)",
  "jar": "Mason Jar",
  "tube": "Test Tube",
  "bulb": "Edison Bulb",
  "teardrop": "Teardrop",
  "globe": "Globe/Balloon",
};

const lightTypeLabels: Record<EggisonLightType, string> = {
  "filament": "LED Filament",
  "ws2812b": "WS2812B Addressable",
  "led_strip": "LED Strip",
  "fairy_lights": "Fairy Lights",
};

const lightTypeIcons: Record<EggisonLightType, typeof Lightbulb> = {
  "filament": Lightbulb,
  "ws2812b": Zap,
  "led_strip": Cable,
  "fairy_lights": Lightbulb,
};

const diffusionPatternLabels: Record<EggisonDiffusionPattern, string> = {
  "none": "None (Clear)",
  "checkered": "Checkered",
  "cubes": "3D Cubes",
  "modular_lines": "Modular Lines",
  "hexagons": "Hexagons",
  "houndstooth": "Houndstooth",
  "diamonds": "Diamonds",
  "waves": "Waves",
};

const threadTypeLabels: Record<EggisonThreadType, string> = {
  "iso": "ISO Standard",
  "lobular": "Lobular (Vase-friendly)",
};

const shellModeLabels: Record<EggisonShellMode, string> = {
  "solid": "Solid (Standard)",
  "vase": "Vase Mode (Spiral)",
};

function generatePatternTexture(pattern: EggisonDiffusionPattern, scale: number = 1, depth: number = 0.3): THREE.CanvasTexture | null {
  if (pattern === "none") return null;
  
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(0, 0, size, size);
  
  const cellSize = Math.max(8, Math.floor(32 / scale));
  const patternOpacity = 0.2 + depth * 0.6;
  
  switch (pattern) {
    case "checkered":
      ctx.fillStyle = `rgba(200, 200, 200, ${patternOpacity})`;
      for (let y = 0; y < size; y += cellSize) {
        for (let x = 0; x < size; x += cellSize) {
          if (((x / cellSize) + (y / cellSize)) % 2 === 0) {
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
      break;
      
    case "cubes":
      ctx.strokeStyle = `rgba(150, 150, 150, ${patternOpacity})`;
      ctx.lineWidth = 1;
      for (let y = 0; y < size; y += cellSize) {
        for (let x = 0; x < size; x += cellSize) {
          const offset = (y / cellSize) % 2 === 0 ? 0 : cellSize / 2;
          ctx.beginPath();
          ctx.moveTo(x + offset, y);
          ctx.lineTo(x + offset + cellSize / 2, y + cellSize / 3);
          ctx.lineTo(x + offset, y + cellSize * 2 / 3);
          ctx.lineTo(x + offset - cellSize / 2, y + cellSize / 3);
          ctx.closePath();
          ctx.stroke();
        }
      }
      break;
      
    case "modular_lines":
      ctx.strokeStyle = `rgba(180, 180, 180, ${patternOpacity})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < size; i += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
        if (i % (cellSize * 2) === 0) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, size);
          ctx.stroke();
        }
      }
      break;
      
    case "hexagons":
      ctx.strokeStyle = `rgba(160, 160, 160, ${patternOpacity})`;
      ctx.lineWidth = 1.5;
      const hexR = cellSize * 0.6;
      for (let row = 0; row < size / (hexR * 1.5); row++) {
        for (let col = 0; col < size / (hexR * 1.73); col++) {
          const cx = col * hexR * 1.73 + (row % 2 === 1 ? hexR * 0.866 : 0);
          const cy = row * hexR * 1.5 + hexR;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + hexR * Math.cos(angle);
            const y = cy + hexR * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      break;
      
    case "houndstooth":
      const hs = cellSize;
      for (let y = 0; y < size; y += hs * 2) {
        for (let x = 0; x < size; x += hs * 2) {
          ctx.fillStyle = `rgba(180, 180, 180, ${patternOpacity})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + hs, y);
          ctx.lineTo(x + hs, y + hs / 2);
          ctx.lineTo(x + hs / 2, y + hs);
          ctx.lineTo(x, y + hs);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x + hs, y + hs);
          ctx.lineTo(x + hs * 2, y + hs);
          ctx.lineTo(x + hs * 2, y + hs * 1.5);
          ctx.lineTo(x + hs * 1.5, y + hs * 2);
          ctx.lineTo(x + hs, y + hs * 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
      
    case "diamonds":
      ctx.strokeStyle = `rgba(170, 170, 170, ${patternOpacity})`;
      ctx.lineWidth = 1.5;
      for (let y = 0; y < size + cellSize; y += cellSize) {
        for (let x = 0; x < size + cellSize; x += cellSize) {
          ctx.beginPath();
          ctx.moveTo(x, y - cellSize / 2);
          ctx.lineTo(x + cellSize / 2, y);
          ctx.lineTo(x, y + cellSize / 2);
          ctx.lineTo(x - cellSize / 2, y);
          ctx.closePath();
          ctx.stroke();
        }
      }
      break;
      
    case "waves":
      ctx.strokeStyle = `rgba(160, 160, 160, ${patternOpacity})`;
      ctx.lineWidth = 2;
      for (let y = 0; y < size; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < size; x += 4) {
          ctx.lineTo(x, y + Math.sin(x / cellSize * Math.PI * 2) * (cellSize / 3));
        }
        ctx.stroke();
      }
      break;
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  return texture;
}

function getShellDimensions(style: EggisonShellStyle): { height: number; width: number } {
  switch (style) {
    case "classic": return { height: 100, width: 70 };
    case "tall": return { height: 130, width: 60 };
    case "wide": return { height: 80, width: 90 };
    case "mini": return { height: 50, width: 35 };
    case "cracked": return { height: 80, width: 70 };
    case "split": return { height: 100, width: 70 };
    case "jar": return { height: 90, width: 70 };
    case "tube": return { height: 120, width: 40 };
    case "bulb": return { height: 100, width: 80 };
    case "teardrop": return { height: 110, width: 65 };
    case "globe": return { height: 100, width: 100 };
    default: return { height: 100, width: 70 };
  }
}

function EggisonPreview({ settings }: { settings: EggisonSettings }) {
  const scale = 0.012;

  const eggGeometry = useMemo(() => {
    const group = new THREE.Group();
    
    const patternTexture = generatePatternTexture(
      settings.diffusionPattern || "none", 
      settings.diffusionPatternScale || 1,
      settings.diffusionPatternDepth || 0.3
    );
    
    let lithophaneTexture: THREE.Texture | null = null;
    if (settings.lithophaneEnabled && settings.lithophaneImageData) {
      const loader = new THREE.TextureLoader();
      try {
        lithophaneTexture = loader.load(settings.lithophaneImageData);
        lithophaneTexture.wrapS = THREE.RepeatWrapping;
        lithophaneTexture.wrapT = THREE.RepeatWrapping;
      } catch {
        lithophaneTexture = null;
      }
    }
    
    const shellTexture = lithophaneTexture || patternTexture;
    
    const shellMaterial = new THREE.MeshStandardMaterial({ 
      color: settings.lithophaneEnabled ? 0xf0e8dc : 0xffffff,
      roughness: settings.lithophaneEnabled ? 0.95 : 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: settings.lithophaneEnabled ? 0.9 : 0.6,
      side: THREE.DoubleSide,
      ...(shellTexture ? { map: shellTexture } : {}),
    });
    
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6b7280,
      roughness: 0.4,
      metalness: 0.5,
    });
    
    const threadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xb8860b,
      roughness: 0.3,
      metalness: 0.8,
    });
    
    const accessoryMaterial = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.5,
      metalness: 0.3,
    });
    
    const filamentMaterial = new THREE.MeshStandardMaterial({
      color: 0xffa500,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0xff8c00,
      emissiveIntensity: 0.5,
    });

    const { shellHeight, shellWidth } = settings;
    
    if (settings.shellStyle === "split") {
      // Show two halves side by side with gap
      const halfHeight = shellHeight / 2;
      const gap = 15; // Gap between halves for visibility
      
      // Bottom half (left side)
      const bottomGeom = new THREE.SphereGeometry(shellWidth / 2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      bottomGeom.scale(1, shellHeight / shellWidth, 1);
      const bottomMesh = new THREE.Mesh(bottomGeom, shellMaterial);
      bottomMesh.position.set(-shellWidth / 2 - gap / 2, halfHeight / 2 + 10, 0);
      group.add(bottomMesh);
      
      // Lip ring on bottom half (inner ledge)
      const bottomLipGeom = new THREE.RingGeometry(shellWidth / 2 - 4, shellWidth / 2 - 1.5, 32);
      const bottomLipMesh = new THREE.Mesh(bottomLipGeom, shellMaterial);
      bottomLipMesh.rotation.x = -Math.PI / 2;
      bottomLipMesh.position.set(-shellWidth / 2 - gap / 2, halfHeight + 10, 0);
      group.add(bottomLipMesh);
      
      // Top half (right side) - shown upside down as it would print
      const topGeom = new THREE.SphereGeometry(shellWidth / 2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
      topGeom.scale(1, shellHeight / shellWidth, 1);
      const topMesh = new THREE.Mesh(topGeom, shellMaterial);
      topMesh.position.set(shellWidth / 2 + gap / 2, halfHeight / 2 + 10, 0);
      group.add(topMesh);
      
      // Lip ring on top half (extends down)
      const topLipGeom = new THREE.CylinderGeometry(shellWidth / 2 - 1.5, shellWidth / 2 - 1.5, 3, 32, 1, true);
      const topLipMesh = new THREE.Mesh(topLipGeom, shellMaterial);
      topLipMesh.position.set(shellWidth / 2 + gap / 2, 10 - 1.5, 0);
      group.add(topLipMesh);
    } else if (settings.shellStyle === "globe") {
      // Perfect hollow globe/balloon (like baby balloon print)
      const radius = shellWidth / 2;
      
      // Create hollow sphere using two hemispheres for split printing
      // Bottom hemisphere
      const bottomGeom = new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const bottomMesh = new THREE.Mesh(bottomGeom, shellMaterial);
      bottomMesh.position.set(0, radius + 10, 0);
      group.add(bottomMesh);
      
      // Top hemisphere
      const topGeom = new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      const topMesh = new THREE.Mesh(topGeom, shellMaterial);
      topMesh.position.set(0, radius + 10, 0);
      group.add(topMesh);
      
      // Equator ring (alignment/joining ring)
      const ringGeom = new THREE.TorusGeometry(radius - 1, 1, 8, 48);
      const ringMesh = new THREE.Mesh(ringGeom, baseMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(0, radius + 10, 0);
      group.add(ringMesh);
      
    } else if (settings.shellStyle === "cracked") {
      // Cracked egg with zig-zag broken edge at 55% height
      const crackHeight = shellHeight * 0.55;
      const crackBaseY = 10 + crackHeight;
      
      // Bottom part of cracked egg
      const bottomGeom = new THREE.SphereGeometry(shellWidth / 2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      bottomGeom.scale(1, shellHeight / shellWidth, 1);
      const bottomMesh = new THREE.Mesh(bottomGeom, shellMaterial);
      bottomMesh.position.set(0, shellHeight / 2 + 10, 0);
      group.add(bottomMesh);
      
      // Create zig-zag edge using a custom shape
      const zigzagSegments = 16;
      const zigzagAmplitude = shellHeight * 0.08;
      const zigzagPoints: THREE.Vector3[] = [];
      
      for (let i = 0; i <= zigzagSegments; i++) {
        const angle = (i / zigzagSegments) * Math.PI * 2;
        const radius = shellWidth / 2 * 0.95;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const zigzagY = crackBaseY + (i % 2 === 0 ? zigzagAmplitude : -zigzagAmplitude);
        zigzagPoints.push(new THREE.Vector3(x, zigzagY, z));
      }
      
      // Draw zig-zag edge as line segments
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 2 });
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(zigzagPoints);
      const edgeLine = new THREE.Line(edgeGeometry, edgeMaterial);
      group.add(edgeLine);
    } else {
      // Regular full egg
      const eggGeom = new THREE.SphereGeometry(shellWidth / 2, 32, 32);
      eggGeom.scale(1, shellHeight / shellWidth, 1);
      const eggMesh = new THREE.Mesh(eggGeom, shellMaterial);
      eggMesh.position.set(0, shellHeight / 2 + 10, 0);
      group.add(eggMesh);
    }

    const baseDiameter = settings.baseType === "E14" ? 14 : settings.baseType === "E26" ? 26 : 27;
    const baseRadius = baseDiameter / 2;
    const collarHeight = 10;
    const collarRadius = baseRadius + 4;
    const wireHoleRadius = 2.5;
    const tipRadius = 4;
    const tipHeight = 4;
    
    // Solid collar (outer wall)
    const collarGeom = new THREE.CylinderGeometry(collarRadius, collarRadius, collarHeight, 32, 1, true);
    const collarMesh = new THREE.Mesh(collarGeom, baseMaterial);
    collarMesh.position.set(0, collarHeight / 2, 0);
    group.add(collarMesh);
    
    // Collar top cap (solid with wire hole)
    const topCapGeom = new THREE.RingGeometry(wireHoleRadius, collarRadius, 32);
    const topCapMesh = new THREE.Mesh(topCapGeom, baseMaterial);
    topCapMesh.rotation.x = -Math.PI / 2;
    topCapMesh.position.set(0, collarHeight, 0);
    group.add(topCapMesh);

    const threadHeight = settings.baseHeight - collarHeight;
    const threadGeom = new THREE.CylinderGeometry(baseRadius, baseRadius * 0.9, threadHeight, 32, 1, true);
    const threadMesh = new THREE.Mesh(threadGeom, threadMaterial);
    threadMesh.position.set(0, -threadHeight / 2, 0);
    group.add(threadMesh);

    for (let i = 0; i < 6; i++) {
      const y = -i * (threadHeight / 6);
      const ringGeom = new THREE.TorusGeometry(baseRadius - 1, 1, 8, 32);
      const ringMesh = new THREE.Mesh(ringGeom, threadMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(0, y, 0);
      group.add(ringMesh);
    }
    
    // Bottom cap (closes thread section)
    const bottomCapGeom = new THREE.RingGeometry(tipRadius, baseRadius - 1.2, 32);
    const bottomCapMesh = new THREE.Mesh(bottomCapGeom, baseMaterial);
    bottomCapMesh.rotation.x = Math.PI / 2;
    bottomCapMesh.position.set(0, -threadHeight, 0);
    group.add(bottomCapMesh);
    
    // Center tip (positive contact - extends below bottom)
    const tipGeom = new THREE.CylinderGeometry(tipRadius, tipRadius * 0.9, tipHeight, 16);
    const tipMesh = new THREE.Mesh(tipGeom, baseMaterial);
    tipMesh.position.set(0, -threadHeight - tipHeight / 2, 0);
    group.add(tipMesh);
    
    // Tip bottom (solid cap with wire hole)
    const tipBottomGeom = new THREE.RingGeometry(wireHoleRadius, tipRadius, 16);
    const tipBottomMesh = new THREE.Mesh(tipBottomGeom, baseMaterial);
    tipBottomMesh.rotation.x = Math.PI / 2;
    tipBottomMesh.position.set(0, -threadHeight - tipHeight, 0);
    group.add(tipBottomMesh);

    if (settings.includeFilamentChannel) {
      // Scale filament to fit inside shell (30% of inner radius, 60% of inner height)
      const innerWidth = shellWidth - settings.wallThickness * 2;
      const maxRadius = innerWidth / 2 * 0.25; // Max horizontal spread
      const filamentRadius = 1;
      const startY = 15; // Above base connection
      const endY = startY + (shellHeight - settings.wallThickness * 2) * 0.6;
      const midY1 = startY + (endY - startY) * 0.33;
      const midY2 = startY + (endY - startY) * 0.66;
      
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, startY, 0),
        new THREE.Vector3(-maxRadius * 0.8, midY1, maxRadius * 0.4),
        new THREE.Vector3(maxRadius * 0.8, midY2, -maxRadius * 0.4),
        new THREE.Vector3(-maxRadius * 0.4, endY * 0.85, 0),
        new THREE.Vector3(maxRadius * 0.3, endY, maxRadius * 0.2),
      ]);
      const tubeGeom = new THREE.TubeGeometry(curve, 50, filamentRadius, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeom, filamentMaterial);
      group.add(tubeMesh);
    }

    if (settings.includeGlasses) {
      const eyeLevel = shellHeight * 0.65 + 10;
      const eyeSpacing = shellWidth * 0.22;
      const lensRadius = shellWidth * 0.1;
      
      for (let side = -1; side <= 1; side += 2) {
        const frameGeom = new THREE.TorusGeometry(lensRadius, 2, 8, 24);
        const frameMesh = new THREE.Mesh(frameGeom, accessoryMaterial);
        frameMesh.position.set(side * eyeSpacing, eyeLevel, shellWidth * 0.35);
        group.add(frameMesh);
      }
      
      const bridgeGeom = new THREE.CylinderGeometry(1.5, 1.5, eyeSpacing * 0.8, 8);
      const bridgeMesh = new THREE.Mesh(bridgeGeom, accessoryMaterial);
      bridgeMesh.rotation.z = Math.PI / 2;
      bridgeMesh.position.set(0, eyeLevel, shellWidth * 0.35);
      group.add(bridgeMesh);
    }

    if (settings.includeFeet) {
      // Bird/chicken-style feet - properly welded, screws INTO screw base
      const legRadius = 5;
      const legHeight = 25;
      const toeRadius = 3.5;
      const toeLength = 20;
      const toeSpread = 40 * Math.PI / 180;
      const footSpacing = 12;
      const threadRadius = 6;
      const threadHeight = 8;
      const junctionRadius = legRadius + 2;
      const junctionHeight = 6;
      
      // Position feet below screw base
      const baseY = -settings.baseHeight - threadHeight;
      
      for (let footIdx = 0; footIdx < 2; footIdx++) {
        const footOffsetX = (footIdx === 0) ? -footSpacing : footSpacing;
        
        // Junction base (where toes meet leg)
        const junctionGeom = new THREE.CylinderGeometry(legRadius, junctionRadius, junctionHeight, 16);
        const junctionMesh = new THREE.Mesh(junctionGeom, accessoryMaterial);
        junctionMesh.position.set(footOffsetX, baseY - legHeight - junctionHeight / 2, 0);
        group.add(junctionMesh);
        
        // Vertical leg
        const legGeom = new THREE.CylinderGeometry(legRadius, legRadius, legHeight - junctionHeight, 16);
        const legMesh = new THREE.Mesh(legGeom, accessoryMaterial);
        legMesh.position.set(footOffsetX, baseY - (legHeight - junctionHeight) / 2 - junctionHeight, 0);
        group.add(legMesh);
        
        // Threaded post on top (screws into screw base)
        const threadGeom = new THREE.CylinderGeometry(threadRadius, threadRadius, threadHeight, 16);
        const threadMesh = new THREE.Mesh(threadGeom, accessoryMaterial);
        threadMesh.position.set(footOffsetX, baseY - threadHeight / 2, 0);
        group.add(threadMesh);
        
        // 3 toes welded to junction
        const toeAngles = [-toeSpread, 0, toeSpread];
        for (const toeAngle of toeAngles) {
          const toeGeom = new THREE.CylinderGeometry(toeRadius * 0.35, toeRadius, toeLength, 8);
          const toeMesh = new THREE.Mesh(toeGeom, accessoryMaterial);
          
          const startX = footOffsetX + junctionRadius * 0.8 * Math.sin(toeAngle);
          const startZ = junctionRadius * 0.8 * Math.cos(toeAngle);
          const toeY = baseY - legHeight - junctionHeight + 2;
          
          toeMesh.position.set(
            startX + (toeLength / 2) * Math.sin(toeAngle),
            toeY - 1,
            startZ + (toeLength / 2) * Math.cos(toeAngle)
          );
          toeMesh.rotation.x = Math.PI / 2 - 0.1;
          toeMesh.rotation.y = -toeAngle;
          group.add(toeMesh);
        }
      }
    }

    if (settings.includeBatteryHolder) {
      const holderWidth = 50;
      const holderHeight = 25;
      const holderDepth = 25;
      
      const holderGeom = new THREE.BoxGeometry(holderWidth, holderHeight, holderDepth);
      const holderMesh = new THREE.Mesh(holderGeom, accessoryMaterial);
      holderMesh.position.set(0, -settings.baseHeight - holderHeight / 2 - 5, 0);
      group.add(holderMesh);
      
      const batteryRadius = 9;
      const batteryGeom = new THREE.CylinderGeometry(batteryRadius, batteryRadius, 45, 16);
      const batteryMesh = new THREE.Mesh(batteryGeom, new THREE.MeshStandardMaterial({ color: 0x22c55e }));
      batteryMesh.rotation.x = Math.PI / 2;
      batteryMesh.position.set(0, -settings.baseHeight - holderHeight / 2 - 5, 0);
      group.add(batteryMesh);
    }

    return group;
  }, [settings]);

  return (
    <primitive object={eggGeometry} scale={scale} />
  );
}

export function EggisonEditor() {
  const { eggisonSettings, setEggisonSettings } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setWebglSupported(checkWebGLSupport());
  }, []);

  useEffect(() => {
    const dims = getShellDimensions(eggisonSettings.shellStyle);
    setEggisonSettings({ shellHeight: dims.height, shellWidth: dims.width });
  }, [eggisonSettings.shellStyle]);

  if (webglSupported === null) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="eggison-editor-loading">
        <div className="text-muted-foreground">Loading preview...</div>
      </div>
    );
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export/eggison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eggisonSettings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `eggison_${eggisonSettings.baseType}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex" data-testid="eggison-editor">
      <div className="flex-1 relative bg-gradient-to-br from-amber-900/20 to-orange-900/30">
        {webglSupported ? (
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[0, 1, 4]} fov={50} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
            <pointLight position={[-3, 5, -3]} intensity={0.5} color="#ffa500" />
            <EggisonPreview settings={eggisonSettings} />
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={10}
            />
            <gridHelper args={[10, 20, 0x444444, 0x222222]} rotation={[0, 0, 0]} position={[0, -2, 0]} />
          </Canvas>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <Egg className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <p className="text-muted-foreground">WebGL not supported. Preview unavailable.</p>
            </div>
          </div>
        )}
        
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border">
          <div className="flex items-center gap-2">
            <Egg className="w-5 h-5 text-amber-500" />
            <span className="font-semibold">Eggison Bulbs</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Egg-shaped Edison bulb shells</p>
        </div>
      </div>

      <div className="w-80 border-l bg-background p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Egg className="w-5 h-5 text-amber-500" />
              Eggison Settings
            </h2>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Egg className="w-4 h-4" />
                Egg Shell
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Shell Style</Label>
                <Select
                  value={eggisonSettings.shellStyle}
                  onValueChange={(value) => setEggisonSettings({ shellStyle: value as EggisonShellStyle })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-shell-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eggisonShellStyles.map((style) => (
                      <SelectItem key={style} value={style}>
                        {shellStyleLabels[style]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Height: {eggisonSettings.shellHeight}mm
                </Label>
                <Slider
                  value={[eggisonSettings.shellHeight]}
                  onValueChange={([value]) => setEggisonSettings({ shellHeight: value })}
                  min={40}
                  max={150}
                  step={5}
                  className="mt-2"
                  data-testid="slider-shell-height"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Width: {eggisonSettings.shellWidth}mm
                </Label>
                <Slider
                  value={[eggisonSettings.shellWidth]}
                  onValueChange={([value]) => setEggisonSettings({ shellWidth: value })}
                  min={30}
                  max={120}
                  step={5}
                  className="mt-2"
                  data-testid="slider-shell-width"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Wall Thickness: {eggisonSettings.wallThickness}mm
                </Label>
                <Slider
                  value={[eggisonSettings.wallThickness]}
                  onValueChange={([value]) => setEggisonSettings({ wallThickness: value })}
                  min={1}
                  max={4}
                  step={0.5}
                  className="mt-2"
                  data-testid="slider-wall-thickness"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cable className="w-4 h-4" />
                Screw Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Base Type</Label>
                <Select
                  value={eggisonSettings.baseType}
                  onValueChange={(value) => setEggisonSettings({ baseType: value as EggisonBaseType })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-base-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eggisonBaseTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {baseTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Base Height: {eggisonSettings.baseHeight}mm
                </Label>
                <Slider
                  value={[eggisonSettings.baseHeight]}
                  onValueChange={([value]) => setEggisonSettings({ baseHeight: value })}
                  min={15}
                  max={40}
                  step={1}
                  className="mt-2"
                  data-testid="slider-base-height"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Vase/Spiral Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Shell Mode</Label>
                <Select
                  value={eggisonSettings.shellMode || "solid"}
                  onValueChange={(value) => setEggisonSettings({ shellMode: value as EggisonShellMode })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-shell-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eggisonShellModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {shellModeLabels[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Vase mode enables single-wall "spiralize" printing
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Thread Type</Label>
                <Select
                  value={eggisonSettings.threadType || "iso"}
                  onValueChange={(value) => setEggisonSettings({ threadType: value as EggisonThreadType })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-thread-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eggisonThreadTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {threadTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Lobular threads use hex-twist ribbing (stronger, no retractions)
                </p>
              </div>

              {eggisonSettings.shellMode === "vase" && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Spiral Twist: {eggisonSettings.spiralTwist || 180}°
                    </Label>
                    <Slider
                      value={[eggisonSettings.spiralTwist || 180]}
                      onValueChange={([value]) => setEggisonSettings({ spiralTwist: value })}
                      min={0}
                      max={720}
                      step={30}
                      className="mt-2"
                      data-testid="slider-spiral-twist"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Spiral Ribs: {eggisonSettings.spiralRibCount || 6}
                    </Label>
                    <Slider
                      value={[eggisonSettings.spiralRibCount || 6]}
                      onValueChange={([value]) => setEggisonSettings({ spiralRibCount: value })}
                      min={0}
                      max={12}
                      step={1}
                      className="mt-2"
                      data-testid="slider-spiral-ribs"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Phi Ribs</Label>
                  <p className="text-xs text-muted-foreground">Golden angle (137.5°) decorative ribs</p>
                </div>
                <Switch
                  checked={eggisonSettings.phiRibsEnabled || false}
                  onCheckedChange={(checked) => setEggisonSettings({ phiRibsEnabled: checked })}
                  data-testid="switch-phi-ribs"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Light Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Light Type</Label>
                <Select
                  value={eggisonSettings.lightType}
                  onValueChange={(value) => setEggisonSettings({ lightType: value as EggisonLightType })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-light-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eggisonLightTypes.map((type) => {
                      const Icon = lightTypeIcons[type];
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {lightTypeLabels[type]}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Filament Channel</Label>
                  <p className="text-xs text-muted-foreground">Internal channel for LED wire/filament</p>
                </div>
                <Switch
                  checked={eggisonSettings.includeFilamentChannel}
                  onCheckedChange={(checked) => setEggisonSettings({ includeFilamentChannel: checked })}
                  data-testid="switch-filament-channel"
                />
              </div>

              {eggisonSettings.includeFilamentChannel && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Channel Diameter: {eggisonSettings.filamentChannelDiameter}mm
                  </Label>
                  <Slider
                    value={[eggisonSettings.filamentChannelDiameter]}
                    onValueChange={([value]) => setEggisonSettings({ filamentChannelDiameter: value })}
                    min={2}
                    max={8}
                    step={0.5}
                    className="mt-2"
                    data-testid="slider-channel-diameter"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Accessories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Glasses className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">Glasses</Label>
                </div>
                <Switch
                  checked={eggisonSettings.includeGlasses}
                  onCheckedChange={(checked) => setEggisonSettings({ includeGlasses: checked })}
                  data-testid="switch-glasses"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">Feet</Label>
                </div>
                <Switch
                  checked={eggisonSettings.includeFeet}
                  onCheckedChange={(checked) => setEggisonSettings({ includeFeet: checked })}
                  data-testid="switch-feet"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">Battery Holder</Label>
                </div>
                <Switch
                  checked={eggisonSettings.includeBatteryHolder}
                  onCheckedChange={(checked) => setEggisonSettings({ includeBatteryHolder: checked })}
                  data-testid="switch-battery-holder"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Diffusion Pattern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Pattern Type</Label>
                <Select
                  value={eggisonSettings.diffusionPattern || "none"}
                  onValueChange={(value) => setEggisonSettings({ diffusionPattern: value as EggisonDiffusionPattern })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-diffusion-pattern">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eggisonDiffusionPatterns.map((pattern) => (
                      <SelectItem key={pattern} value={pattern}>
                        {diffusionPatternLabels[pattern]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {eggisonSettings.diffusionPattern && eggisonSettings.diffusionPattern !== "none" && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Pattern Scale: {(eggisonSettings.diffusionPatternScale || 1).toFixed(1)}x
                    </Label>
                    <Slider
                      value={[eggisonSettings.diffusionPatternScale || 1]}
                      onValueChange={([value]) => setEggisonSettings({ diffusionPatternScale: value })}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="mt-2"
                      data-testid="slider-pattern-scale"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Pattern Depth: {(eggisonSettings.diffusionPatternDepth || 0.3).toFixed(2)}mm
                    </Label>
                    <Slider
                      value={[eggisonSettings.diffusionPatternDepth || 0.3]}
                      onValueChange={([value]) => setEggisonSettings({ diffusionPatternDepth: value })}
                      min={0.1}
                      max={0.8}
                      step={0.05}
                      className="mt-2"
                      data-testid="slider-pattern-depth"
                    />
                  </div>
                </>
              )}

              <p className="text-xs text-muted-foreground">
                Surface patterns create unique light diffusion effects when backlit. Printed shell will have embossed texture matching selected pattern.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="w-4 h-4" />
                Internal Lithophane
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Enable Lithophane</Label>
                  <p className="text-xs text-muted-foreground">Image shows through shell when backlit</p>
                </div>
                <Switch
                  checked={eggisonSettings.lithophaneEnabled || false}
                  onCheckedChange={(checked) => setEggisonSettings({ lithophaneEnabled: checked })}
                  data-testid="switch-lithophane"
                />
              </div>

              {eggisonSettings.lithophaneEnabled && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Upload Image</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover-elevate cursor-pointer"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const imageData = event.target?.result as string;
                              setEggisonSettings({ lithophaneImageData: imageData });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      data-testid="button-upload-lithophane"
                    >
                      {eggisonSettings.lithophaneImageData ? (
                        <div className="space-y-2">
                          <img 
                            src={eggisonSettings.lithophaneImageData} 
                            alt="Lithophane preview" 
                            className="max-h-24 mx-auto rounded"
                          />
                          <p className="text-xs text-muted-foreground">Click to change image</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Click to upload image</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Min Thickness: {(eggisonSettings.lithophaneMinThickness || 0.6).toFixed(1)}mm
                    </Label>
                    <Slider
                      value={[eggisonSettings.lithophaneMinThickness || 0.6]}
                      onValueChange={([value]) => setEggisonSettings({ lithophaneMinThickness: value })}
                      min={0.4}
                      max={1.5}
                      step={0.1}
                      className="mt-2"
                      data-testid="slider-litho-min"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Thinnest (brightest) areas</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Max Thickness: {(eggisonSettings.lithophaneMaxThickness || 3).toFixed(1)}mm
                    </Label>
                    <Slider
                      value={[eggisonSettings.lithophaneMaxThickness || 3]}
                      onValueChange={([value]) => setEggisonSettings({ lithophaneMaxThickness: value })}
                      min={2}
                      max={4}
                      step={0.1}
                      className="mt-2"
                      data-testid="slider-litho-max"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Thickest (darkest) areas</p>
                  </div>
                </>
              )}

              <p className="text-xs text-muted-foreground bg-amber-500/10 p-2 rounded border border-amber-500/20">
                Creates variable wall thickness so images appear when lit from inside. Export includes thickness data for slicer processing.
              </p>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            onClick={handleExport}
            disabled={isExporting}
            data-testid="button-export-eggison"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Eggison Bulb"}
          </Button>

          <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
            <p className="font-medium mb-1">Print Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Print shell in clear/translucent PLA for diffusion</li>
              <li>Use copper tape on screw threads for conductivity</li>
              <li>Thread LED filament through the internal channel</li>
              <li>Glue base to shell after wiring</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
