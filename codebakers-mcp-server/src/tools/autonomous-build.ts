/**
 * codebakers_autonomous_build
 *
 * Full Autonomous Build Orchestrator
 *
 * Builds entire application from FLOWS.md with zero human intervention.
 * Executes all features sequentially with full atomic unit protocol.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { executeAtomicUnit } from './execute-atomic-unit';
import { verifyCompleteness } from './verify-completeness';

interface BuildArgs {
  mode: 'full' | 'remaining';
  stop_on_error?: boolean;
}

export async function autonomousBuild(args: BuildArgs): Promise<string> {
  const cwd = process.cwd();
  const { mode, stop_on_error = false } = args;

  console.error('🍞 CodeBakers: Autonomous Build Starting');

  try {
    // Load FLOWS.md
    const flowsPath = path.join(cwd, 'FLOWS.md');
    const flowsExist = await fs.access(flowsPath).then(() => true).catch(() => false);

    if (!flowsExist) {
      return `🍞 CodeBakers: Autonomous Build BLOCKED

❌ FLOWS.md not found

Run codebakers_run_interview first to generate flows.`;
    }

    const flowsContent = await fs.readFile(flowsPath, 'utf-8');

    // Extract features (simple parsing)
    const features = extractFeatures(flowsContent, mode);

    if (features.length === 0) {
      return `🍞 CodeBakers: No features to build

${mode === 'full' ? 'All features already complete' : 'No pending features found'}

Check FLOWS.md for status.`;
    }

    console.error(`Found ${features.length} features to build`);

    const results: { feature: string; status: 'success' | 'failed'; error?: string }[] = [];

    // Build each feature sequentially
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      console.error(`\n[${i + 1}/${features.length}] Building: ${feature.name}`);

      try {
        // Execute atomic unit
        const result = await executeAtomicUnit({
          feature_name: feature.name,
          entity: feature.entity || 'Item',
          operations: feature.operations || ['list', 'create', 'update', 'delete'],
        });

        console.error(result);

        // Verify completeness
        const verification = await verifyCompleteness({ feature_name: feature.name });
        console.error(verification);

        results.push({ feature: feature.name, status: 'success' });

        // Update FLOWS.md to mark complete
        await markFlowComplete(cwd, feature.name);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed: ${errorMsg}`);
        results.push({ feature: feature.name, status: 'failed', error: errorMsg });

        if (stop_on_error) {
          break;
        }
      }
    }

    // Generate final report
    const report = generateBuildReport(results, features.length);

    return report;
  } catch (error) {
    return `🍞 CodeBakers: Autonomous Build Failed

Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function extractFeatures(flowsContent: string, mode: string): any[] {
  const features: any[] = [];

  // Simple extraction: look for flow headings
  const flowMatches = flowsContent.matchAll(/## (\d+)\. (.+?) \((.+?)\)/g);

  for (const match of flowMatches) {
    const name = match[2];
    const priority = match[3];
    const status = flowsContent.includes(`${name}`) && flowsContent.includes('complete') ? 'complete' : 'pending';

    if (mode === 'full' || (mode === 'remaining' && status === 'pending')) {
      // Infer entity from flow name
      let entity = 'Item';
      if (name.toLowerCase().includes('message')) entity = 'Message';
      if (name.toLowerCase().includes('user')) entity = 'User';
      if (name.toLowerCase().includes('inbox')) entity = 'Message';

      features.push({
        name,
        entity,
        priority,
        operations: ['list', 'create', 'update', 'delete'],
      });
    }
  }

  return features;
}

async function markFlowComplete(cwd: string, featureName: string): Promise<void> {
  const flowsPath = path.join(cwd, 'FLOWS.md');
  let content = await fs.readFile(flowsPath, 'utf-8');

  // Find the flow section and mark as complete
  const regex = new RegExp(`(## \\d+\\. ${featureName}.+?\\*\\*Status:\\*\\*) pending`, 'g');
  content = content.replace(regex, '$1 complete');

  await fs.writeFile(flowsPath, content, 'utf-8');
}

function generateBuildReport(results: any[], total: number): string {
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  let report = `🍞 CodeBakers: Autonomous Build Complete\n\n`;
  report += `## Summary\n\n`;
  report += `**Features requested:** ${total}\n`;
  report += `**Features completed:** ${successful} ✅\n`;
  report += `**Features failed:** ${failed} ${failed > 0 ? '❌' : ''}\n\n`;

  if (successful > 0) {
    report += `## ✅ Successful Builds\n\n`;
    for (const result of results.filter(r => r.status === 'success')) {
      report += `- ${result.feature}\n`;
    }
    report += `\n`;
  }

  if (failed > 0) {
    report += `## ❌ Failed Builds\n\n`;
    for (const result of results.filter(r => r.status === 'failed')) {
      report += `- ${result.feature}\n`;
      if (result.error) {
        report += `  Error: ${result.error}\n`;
      }
    }
    report += `\n`;
  }

  report += `---\n\n`;

  if (failed === 0) {
    report += `## 🎉 All Features Complete!\n\n`;
    report += `**Next steps:**\n`;
    report += `1. Run tests: codebakers_run_tests { test_type: "all" }\n`;
    report += `2. Review BUILD-LOG.md\n`;
    report += `3. Deploy to Vercel\n`;
  } else {
    report += `## ⚠️ Some Features Failed\n\n`;
    report += `**Next steps:**\n`;
    report += `1. Review error messages above\n`;
    report += `2. Fix issues manually\n`;
    report += `3. Re-run: codebakers_autonomous_build { mode: "remaining" }\n`;
  }

  return report;
}
