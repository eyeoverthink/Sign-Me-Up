/**
 * SIMPLE BATCH TEST - Debug version
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScottSignEngine } from './scott-engine';

async function test() {
  const assetsDir = path.join(process.cwd(), 'attached_assets');
  const files = fs.readdirSync(assetsDir).filter(f => 
    f.toLowerCase().endsWith('.png')
  );

  console.log(`Found ${files.length} PNG files`);

  // Deduplicate
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const f of files) {
    const base = f.replace(/_\d{13}\.PNG$/i, '').toLowerCase();
    if (!seen.has(base)) {
      seen.add(base);
      unique.push(f);
    }
  }

  console.log(`Unique patterns: ${unique.length}\n`);

  const engine = new ScottSignEngine();
  const results: any[] = [];

  for (let i = 0; i < Math.min(unique.length, 30); i++) {
    const filename = unique[i];
    const filePath = path.join(assetsDir, filename);
    
    console.log(`[${i+1}] Processing: ${filename.substring(0, 40)}...`);
    
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const base64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      
      const result = await engine.processImage(base64, filename, {
        tolerance: 2.0,
        lightType: 'silicone_neon_6mm',
        signHeight: 30,
        wallThickness: 2,
        baseThickness: 2
      });

      if (result.success && result.scottVariance) {
        const skelDiff = Math.abs(
          result.scottVariance.standardSignature.skeletonComplexity - 
          result.scottVariance.invertedSignature.skeletonComplexity
        );
        
        console.log(`     → ${result.scottVariance.isOrganic ? 'REAL' : 'AI  '} | Skel: ${skelDiff.toFixed(4)} | Comp: ${result.traceData?.componentCount}`);
        
        results.push({
          file: filename.replace(/_\d{13}\.PNG$/i, ''),
          prediction: result.scottVariance.isOrganic ? 'REAL' : 'AI',
          skelDiff,
          components: result.traceData?.componentCount || 0
        });
      } else {
        console.log(`     → FAILED: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.log(`     → ERROR: ${(e as Error).message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  
  const aiPred = results.filter(r => r.prediction === 'AI');
  const realPred = results.filter(r => r.prediction === 'REAL');
  
  console.log(`\nPredicted AI (${aiPred.length}):`);
  for (const r of aiPred.slice(0, 10)) {
    console.log(`  ${r.file.substring(0, 35).padEnd(35)} | Skel: ${r.skelDiff.toFixed(4)} | Comp: ${r.components}`);
  }
  
  console.log(`\nPredicted REAL (${realPred.length}):`);
  for (const r of realPred.slice(0, 10)) {
    console.log(`  ${r.file.substring(0, 35).padEnd(35)} | Skel: ${r.skelDiff.toFixed(4)} | Comp: ${r.components}`);
  }

  // Find the boundary
  console.log('\n' + '='.repeat(70));
  console.log('BOUNDARY ANALYSIS');
  console.log('='.repeat(70));
  
  const sorted = [...results].sort((a, b) => a.skelDiff - b.skelDiff);
  console.log('\nSorted by skeleton diff (lowest = most AI-like):');
  for (const r of sorted) {
    const marker = r.skelDiff < 0.10 ? '🤖' : '📷';
    console.log(`  ${marker} ${r.skelDiff.toFixed(4)} | Comp: ${r.components.toString().padStart(3)} | ${r.file.substring(0, 40)}`);
  }
}

test().catch(console.error);
