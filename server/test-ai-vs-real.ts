/**
 * TEST: AI-Generated vs Real Photo Image Processing
 * Compare geometric signatures, confidence, and trace quality
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { ScottSignEngine } from './scott-engine';
import {
  extractGeometricSignature,
  Point2D,
} from './scott-algorithm';

interface ImageAnalysis {
  filename: string;
  imageType: 'AI' | 'REAL' | 'UNKNOWN';
  componentCount: number;
  totalBoundaryPoints: number;
  totalSimplifiedPoints: number;
  reductionPercent: number;
  signatures: {
    componentId: number;
    vertexCount: number;
    perimeter: number;
    area: number;
    aspectRatio: number;
    avgAngle: number;
    angleVariance: number;
    avgCurvature: number;
    curvatureVariance: number;
  }[];
  qualityMetrics: {
    avgVertexCount: number;
    angleRegularity: number;  // Lower = more regular (AI-like)
    curvatureRegularity: number;  // Lower = more regular (AI-like)
    overallConfidence: number;
  };
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
}

async function analyzeImage(imagePath: string, imageType: 'AI' | 'REAL' | 'UNKNOWN'): Promise<ImageAnalysis> {
  const filename = path.basename(imagePath);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${filename} (${imageType})`);
  console.log('='.repeat(60));

  const imageBuffer = fs.readFileSync(imagePath);
  const engine = new ScottSignEngine({ tolerance: 2.0 });
  
  const result = await engine.processImage(imageBuffer);
  
  if (!result.success || !result.traceData) {
    console.log('FAILED to process image');
    return {
      filename,
      imageType,
      componentCount: 0,
      totalBoundaryPoints: 0,
      totalSimplifiedPoints: 0,
      reductionPercent: 0,
      signatures: [],
      qualityMetrics: {
        avgVertexCount: 0,
        angleRegularity: Infinity,
        curvatureRegularity: Infinity,
        overallConfidence: 0,
      },
    };
  }

  const traceData = result.traceData;
  console.log(`Components found: ${traceData.componentCount}`);
  console.log(`Total boundary points: ${traceData.totalPixels}`);

  const signatures: ImageAnalysis['signatures'] = [];
  let totalAngleVariance = 0;
  let totalCurvatureVariance = 0;
  let totalVertexCount = 0;

  for (const comp of traceData.components) {
    // Convert to Point2D format
    const points: Point2D[] = comp.simplified.map(p => ({ x: p[0], y: p[1] }));
    
    if (points.length < 3) continue;

    const sig = extractGeometricSignature(points);
    
    const avgAngle = sig.angles.reduce((a, b) => a + b, 0) / sig.angles.length;
    const angleVar = variance(sig.angles);
    const avgCurvature = sig.curvatures.reduce((a, b) => a + b, 0) / sig.curvatures.length;
    const curvatureVar = variance(sig.curvatures);

    signatures.push({
      componentId: comp.id,
      vertexCount: sig.vertexCount,
      perimeter: sig.perimeter,
      area: sig.area,
      aspectRatio: sig.aspectRatio,
      avgAngle,
      angleVariance: angleVar,
      avgCurvature,
      curvatureVariance: curvatureVar,
    });

    totalAngleVariance += angleVar;
    totalCurvatureVariance += curvatureVar;
    totalVertexCount += sig.vertexCount;

    console.log(`  Component ${comp.id}: ${sig.vertexCount} vertices, angle_var=${angleVar.toFixed(2)}, curv_var=${curvatureVar.toFixed(6)}`);
  }

  const avgAngleVar = signatures.length > 0 ? totalAngleVariance / signatures.length : 0;
  const avgCurvatureVar = signatures.length > 0 ? totalCurvatureVariance / signatures.length : 0;
  const avgVertexCount = signatures.length > 0 ? totalVertexCount / signatures.length : 0;

  // Confidence: higher for lower variance (more regular shapes)
  // AI images should have lower variance = higher confidence
  const angleRegularity = Math.sqrt(avgAngleVar);
  const curvatureRegularity = Math.sqrt(avgCurvatureVar);
  
  // Normalize confidence (0-1 scale, higher = more AI-like)
  const overallConfidence = 1 / (1 + angleRegularity / 100 + curvatureRegularity * 1000);

  const analysis: ImageAnalysis = {
    filename,
    imageType,
    componentCount: traceData.componentCount,
    totalBoundaryPoints: result.originalPoints || 0,
    totalSimplifiedPoints: result.simplifiedPoints || 0,
    reductionPercent: result.originalPoints ? 
      ((result.originalPoints - (result.simplifiedPoints || 0)) / result.originalPoints * 100) : 0,
    signatures,
    qualityMetrics: {
      avgVertexCount,
      angleRegularity,
      curvatureRegularity,
      overallConfidence,
    },
  };

  console.log(`\nQuality Metrics:`);
  console.log(`  Avg Vertex Count: ${avgVertexCount.toFixed(1)}`);
  console.log(`  Angle Regularity: ${angleRegularity.toFixed(2)} (lower = more regular)`);
  console.log(`  Curvature Regularity: ${curvatureRegularity.toFixed(6)} (lower = more regular)`);
  console.log(`  Overall Confidence: ${(overallConfidence * 100).toFixed(1)}%`);

  return analysis;
}

async function runComparison() {
  console.log('\n' + '='.repeat(80));
  console.log('SCOTT ENGINE: AI vs REAL IMAGE COMPARISON TEST');
  console.log('='.repeat(80));

  const testImages = [
    // AI-generated / clip art (expected: high confidence, low variance)
    { path: 'attached_assets/alien-only_-_Copy_(3)_1769050319749.PNG', type: 'AI' as const },
    { path: 'attached_assets/stick-standing_-_Copy_-_Copy_1769033034744.PNG', type: 'AI' as const },
    { path: 'attached_assets/brain-only_-_Copy_1769045980618.PNG', type: 'AI' as const },
    
    // Real photos (expected: low confidence, high variance)
    { path: 'attached_assets/filiment-light-2_1769047661441.PNG', type: 'REAL' as const },
    { path: 'attached_assets/80s-computer_-_Copy_(2)_-_Copy_1769033034742.PNG', type: 'REAL' as const },
  ];

  const results: ImageAnalysis[] = [];

  for (const img of testImages) {
    if (fs.existsSync(img.path)) {
      try {
        const analysis = await analyzeImage(img.path, img.type);
        results.push(analysis);
      } catch (err) {
        console.log(`Error processing ${img.path}:`, err);
      }
    } else {
      console.log(`File not found: ${img.path}`);
    }
  }

  // Summary comparison
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY COMPARISON');
  console.log('='.repeat(80));

  const aiResults = results.filter(r => r.imageType === 'AI');
  const realResults = results.filter(r => r.imageType === 'REAL');

  if (aiResults.length > 0) {
    const avgAiConfidence = aiResults.reduce((sum, r) => sum + r.qualityMetrics.overallConfidence, 0) / aiResults.length;
    const avgAiAngleReg = aiResults.reduce((sum, r) => sum + r.qualityMetrics.angleRegularity, 0) / aiResults.length;
    console.log(`\nAI/CLIP-ART IMAGES (${aiResults.length}):`);
    console.log(`  Avg Confidence: ${(avgAiConfidence * 100).toFixed(1)}%`);
    console.log(`  Avg Angle Regularity: ${avgAiAngleReg.toFixed(2)}`);
  }

  if (realResults.length > 0) {
    const avgRealConfidence = realResults.reduce((sum, r) => sum + r.qualityMetrics.overallConfidence, 0) / realResults.length;
    const avgRealAngleReg = realResults.reduce((sum, r) => sum + r.qualityMetrics.angleRegularity, 0) / realResults.length;
    console.log(`\nREAL PHOTO IMAGES (${realResults.length}):`);
    console.log(`  Avg Confidence: ${(avgRealConfidence * 100).toFixed(1)}%`);
    console.log(`  Avg Angle Regularity: ${avgRealAngleReg.toFixed(2)}`);
  }

  if (aiResults.length > 0 && realResults.length > 0) {
    const aiConf = aiResults.reduce((sum, r) => sum + r.qualityMetrics.overallConfidence, 0) / aiResults.length;
    const realConf = realResults.reduce((sum, r) => sum + r.qualityMetrics.overallConfidence, 0) / realResults.length;
    console.log(`\nDIFFERENCE:`);
    console.log(`  AI confidence is ${((aiConf / realConf) * 100 - 100).toFixed(1)}% higher than REAL`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

runComparison().catch(console.error);
