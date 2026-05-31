/**
 * SCOTT PATTERN DISCOVERY TEST
 * Like your Quantum Collider - find the collision boundaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScottSignEngine } from './scott-engine';

interface Discovery {
  name: string;
  groundTruth: 'AI' | 'REAL';
  prediction: 'AI' | 'REAL';
  skelDiff: number;
  components: number;
  perimeterRatio: number;
  hullSolidity: number;
  match: boolean;
}

const TEST_IMAGES = [
  // AI CLIP-ART (known clean geometry)
  { file: 'alien-only_-_Copy_(3)_1769050319749.PNG', type: 'AI' as const },
  { file: 'brain-only_-_Copy_1769045980618.PNG', type: 'AI' as const },
  { file: 'stick-standing_-_Copy_-_Copy_1769033034744.PNG', type: 'AI' as const },
  { file: 'floppy-only_-_Copy_(2)_1769033034743.PNG', type: 'AI' as const },
  { file: 'brick-phononly_-_Copy_(2)_1769033034742.PNG', type: 'AI' as const },
  { file: 'clock-300_-_Copy_(2)_1769042143624.PNG', type: 'AI' as const },
  
  // REAL PHOTOS (known noisy/complex)
  { file: 'filiment-light-2_1769047661441.PNG', type: 'REAL' as const },
  { file: '80s-computer_-_Copy_(2)_-_Copy_1769033034742.PNG', type: 'REAL' as const },
];

async function runDiscovery() {
  console.log('\n' + '═'.repeat(80));
  console.log('  SCOTT PATTERN DISCOVERY - Finding the Collision Boundary');
  console.log('═'.repeat(80) + '\n');

  const engine = new ScottSignEngine();
  const discoveries: Discovery[] = [];

  for (const test of TEST_IMAGES) {
    const filePath = path.join(process.cwd(), 'attached_assets', test.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ SKIP: ${test.file} not found`);
      continue;
    }

    try {
      const imageBuffer = fs.readFileSync(filePath);
      
      // Use Buffer directly like the working test
      const result = await engine.processImage(imageBuffer);

      if (result.success && result.scottVariance) {
        const skelDiff = Math.abs(
          result.scottVariance.standardSignature.skeletonComplexity - 
          result.scottVariance.invertedSignature.skeletonComplexity
        );
        
        const prediction = result.scottVariance.isOrganic ? 'REAL' : 'AI';
        const match = prediction === test.type;
        
        discoveries.push({
          name: test.file.replace(/_\d{13}\.PNG$/i, '').substring(0, 25),
          groundTruth: test.type,
          prediction,
          skelDiff,
          components: result.traceData?.componentCount || 0,
          perimeterRatio: result.scottVariance.standardSignature.perimeterAreaRatio,
          hullSolidity: result.scottVariance.standardSignature.hullSolidity,
          match
        });

        const icon = match ? '✓' : '✗';
        const color = match ? '' : ' ← MISMATCH';
        console.log(`${icon} ${test.type.padEnd(4)} → ${prediction.padEnd(4)} | Skel: ${skelDiff.toFixed(4)} | Comp: ${(result.traceData?.componentCount || 0).toString().padStart(2)} | ${test.file.substring(0, 40)}${color}`);
      } else {
        console.log(`✗ FAIL: ${test.file} - ${result.error}`);
      }
    } catch (e) {
      console.log(`✗ ERROR: ${test.file} - ${(e as Error).message}`);
    }
  }

  // Pattern Analysis
  console.log('\n' + '─'.repeat(80));
  console.log('PATTERN SIGNATURES DISCOVERED');
  console.log('─'.repeat(80) + '\n');

  const aiDiscoveries = discoveries.filter(d => d.groundTruth === 'AI');
  const realDiscoveries = discoveries.filter(d => d.groundTruth === 'REAL');

  const avg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
  const min = (arr: number[]) => arr.length ? Math.min(...arr) : 0;
  const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

  console.log('AI CLIP-ART PATTERN:');
  if (aiDiscoveries.length > 0) {
    const skelDiffs = aiDiscoveries.map(d => d.skelDiff);
    const comps = aiDiscoveries.map(d => d.components);
    console.log(`  Skeleton Diff:  avg=${avg(skelDiffs).toFixed(4)}, min=${min(skelDiffs).toFixed(4)}, max=${max(skelDiffs).toFixed(4)}`);
    console.log(`  Components:     avg=${avg(comps).toFixed(1)}, min=${min(comps)}, max=${max(comps)}`);
  }

  console.log('\nREAL PHOTO PATTERN:');
  if (realDiscoveries.length > 0) {
    const skelDiffs = realDiscoveries.map(d => d.skelDiff);
    const comps = realDiscoveries.map(d => d.components);
    console.log(`  Skeleton Diff:  avg=${avg(skelDiffs).toFixed(4)}, min=${min(skelDiffs).toFixed(4)}, max=${max(skelDiffs).toFixed(4)}`);
    console.log(`  Components:     avg=${avg(comps).toFixed(1)}, min=${min(comps)}, max=${max(comps)}`);
  }

  // COLLISION BOUNDARY - The key insight
  console.log('\n' + '═'.repeat(80));
  console.log('  COLLISION BOUNDARY DISCOVERY');
  console.log('═'.repeat(80));

  const allSkel = discoveries.map(d => ({ ...d })).sort((a, b) => a.skelDiff - b.skelDiff);
  
  console.log('\nSorted by Skeleton Diff (the collision metric):');
  console.log('─'.repeat(60));
  
  let foundBoundary = false;
  for (let i = 0; i < allSkel.length; i++) {
    const d = allSkel[i];
    const icon = d.groundTruth === 'AI' ? '🤖' : '📷';
    const marker = d.match ? '  ' : '⚠️';
    
    console.log(`  ${icon} ${d.skelDiff.toFixed(4)} | Comp: ${d.components.toString().padStart(2)} | ${d.name} ${marker}`);
    
    // Detect boundary crossing
    if (i > 0 && !foundBoundary) {
      const prev = allSkel[i-1];
      if (prev.groundTruth === 'AI' && d.groundTruth === 'REAL') {
        console.log('  ' + '─'.repeat(50));
        console.log(`  ↑ BOUNDARY: ${prev.skelDiff.toFixed(4)} < threshold < ${d.skelDiff.toFixed(4)}`);
        console.log(`  ↑ Optimal threshold: ${((prev.skelDiff + d.skelDiff) / 2).toFixed(4)}`);
        console.log('  ' + '─'.repeat(50));
        foundBoundary = true;
      }
    }
  }

  // Accuracy
  const correct = discoveries.filter(d => d.match).length;
  console.log(`\nACCURACY: ${correct}/${discoveries.length} = ${((correct/discoveries.length)*100).toFixed(1)}%`);

  // The key insight
  console.log('\n' + '═'.repeat(80));
  console.log('  KEY INSIGHT (Like Quantum Collider Pattern Memory)');
  console.log('═'.repeat(80));
  
  if (aiDiscoveries.length > 0 && realDiscoveries.length > 0) {
    const aiMaxSkel = max(aiDiscoveries.map(d => d.skelDiff));
    const realMinSkel = min(realDiscoveries.map(d => d.skelDiff));
    const gap = realMinSkel - aiMaxSkel;
    
    console.log(`\n  AI max skeleton diff:   ${aiMaxSkel.toFixed(4)}`);
    console.log(`  REAL min skeleton diff: ${realMinSkel.toFixed(4)}`);
    console.log(`  GAP (separation):       ${gap.toFixed(4)} ${gap > 0 ? '✓ CLEAN SEPARATION' : '⚠ OVERLAP'}`);
    
    if (gap > 0) {
      console.log(`\n  → Classes are SEPARABLE with threshold between ${aiMaxSkel.toFixed(4)} and ${realMinSkel.toFixed(4)}`);
      console.log(`  → Optimal threshold: ${((aiMaxSkel + realMinSkel) / 2).toFixed(4)}`);
    }
    
    // Component count as secondary
    const aiMaxComp = max(aiDiscoveries.map(d => d.components));
    const realMinComp = min(realDiscoveries.map(d => d.components));
    const compGap = realMinComp - aiMaxComp;
    
    console.log(`\n  AI max components:      ${aiMaxComp}`);
    console.log(`  REAL min components:    ${realMinComp}`);
    console.log(`  Component GAP:          ${compGap} ${compGap > 0 ? '✓ CLEAN SEPARATION' : '⚠ OVERLAP'}`);
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

runDiscovery().catch(console.error);
