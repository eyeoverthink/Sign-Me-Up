/**
 * COMPREHENSIVE SCOTT VARIANCE TEST
 * Like the Quantum Collider - smash everything, find patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScottSignEngine } from './scott-engine';

interface TestResult {
  filename: string;
  category: string;  // Inferred from filename
  prediction: 'AI' | 'REAL';
  skelDiff: number;
  components: number;
  perimeterRatio: number;
  hullSolidity: number;
  fileSize: number;
}

// Pattern memory - like the Quantum Collider
interface PatternMemory {
  ai_patterns: {
    avgSkelDiff: number;
    avgComponents: number;
    avgPerimeterRatio: number;
    samples: string[];
  };
  real_patterns: {
    avgSkelDiff: number;
    avgComponents: number;
    avgPerimeterRatio: number;
    samples: string[];
  };
  edge_cases: TestResult[];
  confidence_distribution: { [key: string]: number };
}

async function runComprehensiveTest() {
  const assetsDir = path.join(process.cwd(), 'attached_assets');
  const files = fs.readdirSync(assetsDir).filter(f => 
    f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg')
  );

  // Deduplicate by base name (remove timestamps)
  const uniqueFiles = new Map<string, string>();
  for (const file of files) {
    // Extract base name without timestamp
    const baseName = file.replace(/_\d{13}\.(png|PNG|jpg|JPG)$/i, '');
    if (!uniqueFiles.has(baseName)) {
      uniqueFiles.set(baseName, file);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`COMPREHENSIVE SCOTT VARIANCE TEST`);
  console.log(`Total files: ${files.length} | Unique patterns: ${uniqueFiles.size}`);
  console.log(`${'='.repeat(80)}\n`);

  const results: TestResult[] = [];
  const engine = new ScottSignEngine();

  let processed = 0;
  for (const [baseName, filename] of uniqueFiles) {
    processed++;
    const filePath = path.join(assetsDir, filename);
    
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const base64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      const stats = fs.statSync(filePath);
      
      const result = await engine.processImage(base64, filename, {
        tolerance: 2.0,
        lightType: 'silicone_neon_6mm',
        signHeight: 30,
        wallThickness: 2,
        baseThickness: 2
      });

      if (result.success && result.scottVariance) {
        // Infer category from filename
        let category = 'UNKNOWN';
        const lowerName = baseName.toLowerCase();
        
        // AI indicators: clean names like alien, brain, stick, floppy, clock, brick
        if (lowerName.includes('alien') || lowerName.includes('brain') || 
            lowerName.includes('stick') || lowerName.includes('floppy') ||
            lowerName.includes('clock') || lowerName.includes('brick') ||
            lowerName.includes('phone') || lowerName.includes('only')) {
          category = 'AI_CLIPART';
        }
        // Real photo indicators: filament, computer, photo, real, dyi, eggison
        else if (lowerName.includes('filiment') || lowerName.includes('filament') ||
                 lowerName.includes('computer') || lowerName.includes('80s') ||
                 lowerName.includes('photo') || lowerName.includes('real') ||
                 lowerName.includes('dyi') || lowerName.includes('eggison') ||
                 lowerName.includes('assembly') || lowerName.includes('egg-gear')) {
          category = 'REAL_PHOTO';
        }
        // Mixed/unknown
        else if (lowerName.includes('neon') || lowerName.includes('sign') ||
                 lowerName.includes('chips')) {
          category = 'MIXED';
        }

        const testResult: TestResult = {
          filename: baseName,
          category,
          prediction: result.scottVariance.isOrganic ? 'REAL' : 'AI',
          skelDiff: result.scottVariance.standardSignature.skeletonComplexity - 
                    result.scottVariance.invertedSignature.skeletonComplexity,
          components: result.traceData?.componentCount || 0,
          perimeterRatio: result.scottVariance.standardSignature.perimeterAreaRatio,
          hullSolidity: result.scottVariance.standardSignature.hullSolidity,
          fileSize: stats.size
        };

        results.push(testResult);

        // Progress indicator
        const match = category !== 'UNKNOWN' && category !== 'MIXED' && 
          ((category === 'AI_CLIPART' && testResult.prediction === 'AI') ||
           (category === 'REAL_PHOTO' && testResult.prediction === 'REAL'));
        
        const status = category === 'UNKNOWN' || category === 'MIXED' ? '?' : (match ? '✓' : '✗');
        
        if (processed % 5 === 0 || !match) {
          console.log(`[${processed}/${uniqueFiles.size}] ${status} ${baseName.substring(0,30).padEnd(30)} | ` +
            `Pred: ${testResult.prediction.padEnd(4)} | Skel: ${Math.abs(testResult.skelDiff).toFixed(4)} | Comp: ${testResult.components}`);
        }
      }
    } catch (e) {
      console.log(`[${processed}] SKIP ${baseName}: ${(e as Error).message?.substring(0,50)}`);
    }
  }

  // ANALYSIS - Pattern Recognition
  console.log(`\n${'='.repeat(80)}`);
  console.log('PATTERN ANALYSIS (Like Quantum Collider Memory)');
  console.log(`${'='.repeat(80)}\n`);

  // Split by category
  const aiResults = results.filter(r => r.category === 'AI_CLIPART');
  const realResults = results.filter(r => r.category === 'REAL_PHOTO');
  const unknownResults = results.filter(r => r.category === 'UNKNOWN' || r.category === 'MIXED');

  // Calculate accuracy on labeled data
  const aiCorrect = aiResults.filter(r => r.prediction === 'AI').length;
  const realCorrect = realResults.filter(r => r.prediction === 'REAL').length;
  
  console.log('ACCURACY ON LABELED DATA:');
  console.log(`  AI Clip-Art:   ${aiCorrect}/${aiResults.length} (${((aiCorrect/aiResults.length)*100).toFixed(1)}%)`);
  console.log(`  Real Photos:   ${realCorrect}/${realResults.length} (${((realCorrect/realResults.length)*100).toFixed(1)}%)`);
  console.log(`  Overall:       ${aiCorrect + realCorrect}/${aiResults.length + realResults.length} ` +
    `(${(((aiCorrect + realCorrect)/(aiResults.length + realResults.length))*100).toFixed(1)}%)`);

  // Pattern statistics
  const avg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0;
  const std = (arr: number[]) => {
    const mean = avg(arr);
    return Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length);
  };

  console.log('\nPATTERN SIGNATURES:');
  console.log('┌────────────────┬─────────────────┬─────────────────┬─────────────────┐');
  console.log('│ Category       │ Skel Diff (σ)   │ Components (σ)  │ P/A Ratio (σ)   │');
  console.log('├────────────────┼─────────────────┼─────────────────┼─────────────────┤');
  
  if (aiResults.length > 0) {
    const aiSkel = aiResults.map(r => Math.abs(r.skelDiff));
    const aiComp = aiResults.map(r => r.components);
    const aiPA = aiResults.map(r => r.perimeterRatio);
    console.log(`│ AI Clip-Art    │ ${avg(aiSkel).toFixed(4)} (${std(aiSkel).toFixed(3)})  │ ${avg(aiComp).toFixed(1).padStart(5)} (${std(aiComp).toFixed(1)})    │ ${avg(aiPA).toFixed(4)} (${std(aiPA).toFixed(3)})  │`);
  }
  
  if (realResults.length > 0) {
    const realSkel = realResults.map(r => Math.abs(r.skelDiff));
    const realComp = realResults.map(r => r.components);
    const realPA = realResults.map(r => r.perimeterRatio);
    console.log(`│ Real Photos    │ ${avg(realSkel).toFixed(4)} (${std(realSkel).toFixed(3)})  │ ${avg(realComp).toFixed(1).padStart(5)} (${std(realComp).toFixed(1)})    │ ${avg(realPA).toFixed(4)} (${std(realPA).toFixed(3)})  │`);
  }
  
  console.log('└────────────────┴─────────────────┴─────────────────┴─────────────────┘');

  // Edge cases - misclassifications
  const misclassified = results.filter(r => 
    (r.category === 'AI_CLIPART' && r.prediction === 'REAL') ||
    (r.category === 'REAL_PHOTO' && r.prediction === 'AI')
  );

  if (misclassified.length > 0) {
    console.log('\nEDGE CASES (Misclassified):');
    console.log('─'.repeat(80));
    for (const m of misclassified) {
      console.log(`  ${m.filename.substring(0,40).padEnd(40)} | Expected: ${m.category.padEnd(12)} | Got: ${m.prediction} | Skel: ${Math.abs(m.skelDiff).toFixed(4)} | Comp: ${m.components}`);
    }
  }

  // Threshold analysis
  console.log('\nTHRESHOLD ANALYSIS (Finding optimal boundary):');
  console.log('─'.repeat(80));
  
  const allSkelDiffs = results.filter(r => r.category !== 'UNKNOWN' && r.category !== 'MIXED')
    .map(r => ({ ...r, skelDiff: Math.abs(r.skelDiff) }));
  
  // Test different thresholds
  const thresholds = [0.05, 0.08, 0.10, 0.12, 0.15, 0.20];
  for (const thresh of thresholds) {
    let correct = 0;
    let total = 0;
    for (const r of allSkelDiffs) {
      total++;
      const pred = r.skelDiff < thresh ? 'AI' : 'REAL';
      if ((r.category === 'AI_CLIPART' && pred === 'AI') ||
          (r.category === 'REAL_PHOTO' && pred === 'REAL')) {
        correct++;
      }
    }
    console.log(`  Threshold ${thresh.toFixed(2)}: ${correct}/${total} = ${((correct/total)*100).toFixed(1)}% accuracy`);
  }

  // Component count analysis
  console.log('\nCOMPONENT COUNT ANALYSIS:');
  console.log('─'.repeat(80));
  const compThresholds = [2, 3, 5, 8, 10, 15];
  for (const thresh of compThresholds) {
    let correct = 0;
    let total = 0;
    for (const r of allSkelDiffs) {
      total++;
      const pred = r.components <= thresh ? 'AI' : 'REAL';
      if ((r.category === 'AI_CLIPART' && pred === 'AI') ||
          (r.category === 'REAL_PHOTO' && pred === 'REAL')) {
        correct++;
      }
    }
    console.log(`  Components <= ${thresh.toString().padStart(2)}: ${correct}/${total} = ${((correct/total)*100).toFixed(1)}% accuracy`);
  }

  // Save results for later analysis
  fs.writeFileSync(
    path.join(process.cwd(), 'scott-test-results.json'),
    JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2)
  );

  console.log(`\nResults saved to scott-test-results.json`);
  console.log(`${'='.repeat(80)}\n`);
}

runComprehensiveTest().catch(console.error);
