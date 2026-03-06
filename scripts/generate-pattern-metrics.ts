#!/usr/bin/env ts-node
/**
 * CodeBakers Pattern Metrics Generator
 *
 * Analyzes BUILD-LOG.md to track pattern usage and effectiveness.
 * Helps identify:
 * - Which patterns are used most often
 * - Which patterns have high override rates (false positives)
 * - Which patterns are never used (candidates for deprecation)
 *
 * Usage:
 *   ts-node scripts/generate-pattern-metrics.ts
 *
 * Output:
 *   .codebakers/PATTERN-METRICS.md
 */

import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

interface PatternMetric {
  name: string;
  uses: number;
  overrides: number;
  lastUsed: string;
  successRate: number;
}

function readBuildLog(): string {
  const buildLogPath = '.codebakers/BUILD-LOG.md';

  if (!fs.existsSync(buildLogPath)) {
    console.log(`${colors.yellow}⚠ BUILD-LOG.md not found${colors.reset}`);
    console.log(`${colors.gray}Create .codebakers/BUILD-LOG.md to track pattern usage${colors.reset}`);
    return '';
  }

  return fs.readFileSync(buildLogPath, 'utf-8');
}

function parsePatternUsage(buildLog: string): Map<string, PatternMetric> {
  const metrics = new Map<string, PatternMetric>();

  // Pattern format in BUILD-LOG.md:
  // Patterns applied: [pattern-name] (HIGH confidence)
  // Patterns applied: N/A
  // Patterns applied: [pattern-name] (user override)

  const lines = buildLog.split('\n');

  lines.forEach((line, index) => {
    if (line.includes('Patterns applied:')) {
      // Extract pattern name
      const match = line.match(/Patterns applied:\s*(.+)/);
      if (!match) return;

      const patternText = match[1].trim();

      // Skip N/A entries
      if (patternText === 'N/A') return;

      // Extract pattern name (before parentheses)
      const patternMatch = patternText.match(/^([^(]+)/);
      if (!patternMatch) return;

      const patternName = patternMatch[1].trim();

      // Check if override
      const isOverride = patternText.includes('(user override)') || patternText.includes('(override)');

      // Get timestamp from previous lines (find [timestamp] format)
      let timestamp = 'Unknown';
      for (let i = index - 1; i >= Math.max(0, index - 5); i--) {
        const timestampMatch = lines[i].match(/\[(\d{4}-\d{2}-\d{2})/);
        if (timestampMatch) {
          timestamp = timestampMatch[1];
          break;
        }
      }

      // Update or create metric
      if (!metrics.has(patternName)) {
        metrics.set(patternName, {
          name: patternName,
          uses: 0,
          overrides: 0,
          lastUsed: timestamp,
          successRate: 100,
        });
      }

      const metric = metrics.get(patternName)!;
      metric.uses++;
      if (isOverride) {
        metric.overrides++;
      }

      // Update last used if more recent
      if (timestamp > metric.lastUsed) {
        metric.lastUsed = timestamp;
      }

      // Calculate success rate
      metric.successRate = metric.uses > 0
        ? Math.round(((metric.uses - metric.overrides) / metric.uses) * 100)
        : 100;

      metrics.set(patternName, metric);
    }
  });

  return metrics;
}

function getAvailablePatterns(): string[] {
  const patternsDir = 'agents/patterns';

  if (!fs.existsSync(patternsDir)) {
    return [];
  }

  const files = fs.readdirSync(patternsDir);
  return files
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map(f => f.replace('.md', ''));
}

function generateMetricsReport(metrics: Map<string, PatternMetric>, availablePatterns: string[]): string {
  const now = new Date().toISOString().split('T')[0];

  let report = `# Pattern Metrics\n\n`;
  report += `**Generated:** ${now}\n`;
  report += `**Total Patterns Tracked:** ${metrics.size}\n`;
  report += `**Available Patterns:** ${availablePatterns.length}\n\n`;

  report += `---\n\n`;

  // Active Patterns (used in last 30 days)
  report += `## Active Patterns (Last 30 Days)\n\n`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

  const activePatterns = Array.from(metrics.values())
    .filter(m => m.lastUsed >= cutoffDate)
    .sort((a, b) => b.uses - a.uses);

  if (activePatterns.length === 0) {
    report += `*No patterns used in last 30 days*\n\n`;
  } else {
    activePatterns.forEach(metric => {
      report += `### ${metric.name}\n\n`;
      report += `- **Uses:** ${metric.uses}\n`;
      report += `- **Overrides:** ${metric.overrides}\n`;
      report += `- **Success Rate:** ${metric.successRate}%\n`;
      report += `- **Last Used:** ${metric.lastUsed}\n`;

      // Status indicator
      if (metric.successRate >= 90) {
        report += `- **Status:** ✅ Excellent (high accuracy)\n`;
      } else if (metric.successRate >= 70) {
        report += `- **Status:** ⚠️ Good (some false positives)\n`;
      } else {
        report += `- **Status:** ❌ Review needed (high override rate)\n`;
      }

      report += `\n`;
    });
  }

  // Stable Patterns (used >20 times, >90% success rate)
  report += `---\n\n`;
  report += `## Stable Patterns (Proven Accuracy)\n\n`;
  report += `*Patterns used 20+ times with 90%+ success rate*\n\n`;

  const stablePatterns = Array.from(metrics.values())
    .filter(m => m.uses >= 20 && m.successRate >= 90)
    .sort((a, b) => b.successRate - a.successRate);

  if (stablePatterns.length === 0) {
    report += `*No patterns meet stability criteria yet*\n\n`;
  } else {
    stablePatterns.forEach(metric => {
      report += `- **${metric.name}:** ${metric.uses} uses, ${metric.successRate}% success\n`;
    });
    report += `\n`;
  }

  // Unused Patterns (available but never used)
  report += `---\n\n`;
  report += `## Unused Patterns (Candidates for Deprecation)\n\n`;
  report += `*Available pattern files that have never been applied*\n\n`;

  const usedPatternNames = new Set(metrics.keys());
  const unusedPatterns = availablePatterns.filter(p => !usedPatternNames.has(p));

  if (unusedPatterns.length === 0) {
    report += `*All available patterns have been used*\n\n`;
  } else {
    unusedPatterns.forEach(pattern => {
      report += `- \`${pattern}.md\` — 0 uses, consider moving to agents/patterns/archive/\n`;
    });
    report += `\n`;
  }

  // High Override Patterns (need review)
  report += `---\n\n`;
  report += `## High Override Rate (Needs Review)\n\n`;
  report += `*Patterns with >30% override rate (possible false positives)*\n\n`;

  const highOverridePatterns = Array.from(metrics.values())
    .filter(m => m.uses >= 5 && m.successRate < 70)
    .sort((a, b) => a.successRate - b.successRate);

  if (highOverridePatterns.length === 0) {
    report += `*No patterns with high override rates*\n\n`;
  } else {
    highOverridePatterns.forEach(metric => {
      report += `- **${metric.name}:** ${metric.uses} uses, ${metric.overrides} overrides (${metric.successRate}% success)\n`;
      report += `  → **Action:** Review pattern logic, add context filters, or deprecate\n\n`;
    });
  }

  // Summary Stats
  report += `---\n\n`;
  report += `## Summary\n\n`;

  const totalUses = Array.from(metrics.values()).reduce((sum, m) => sum + m.uses, 0);
  const totalOverrides = Array.from(metrics.values()).reduce((sum, m) => sum + m.overrides, 0);
  const avgSuccessRate = metrics.size > 0
    ? Math.round(Array.from(metrics.values()).reduce((sum, m) => sum + m.successRate, 0) / metrics.size)
    : 0;

  report += `- **Total Pattern Applications:** ${totalUses}\n`;
  report += `- **Total Overrides:** ${totalOverrides}\n`;
  report += `- **Average Success Rate:** ${avgSuccessRate}%\n`;
  report += `- **Active Patterns:** ${activePatterns.length}\n`;
  report += `- **Stable Patterns:** ${stablePatterns.length}\n`;
  report += `- **Unused Patterns:** ${unusedPatterns.length}\n`;

  report += `\n---\n\n`;
  report += `*Generated by scripts/generate-pattern-metrics.ts*\n`;

  return report;
}

function writeMetricsFile(content: string): void {
  const outputPath = '.codebakers/PATTERN-METRICS.md';

  // Ensure .codebakers/ exists
  if (!fs.existsSync('.codebakers')) {
    fs.mkdirSync('.codebakers', { recursive: true });
  }

  fs.writeFileSync(outputPath, content);
  console.log(`${colors.green}✓ Pattern metrics generated${colors.reset}`);
  console.log(`${colors.gray}  → ${outputPath}${colors.reset}`);
}

function displaySummary(metrics: Map<string, PatternMetric>): void {
  const totalUses = Array.from(metrics.values()).reduce((sum, m) => sum + m.uses, 0);
  const totalPatterns = metrics.size;

  console.log(`\n${colors.cyan}📊 Pattern Usage Summary${colors.reset}`);
  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Total Patterns Used: ${totalPatterns}`);
  console.log(`Total Applications: ${totalUses}`);

  if (totalPatterns > 0) {
    const topPattern = Array.from(metrics.values()).sort((a, b) => b.uses - a.uses)[0];
    console.log(`Most Used: ${topPattern.name} (${topPattern.uses} uses)`);
  }

  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

// ============================================================================
// Main
// ============================================================================
function main(): void {
  console.log(`${colors.cyan}🍞 CodeBakers: Generating Pattern Metrics${colors.reset}\n`);

  // Read BUILD-LOG.md
  const buildLog = readBuildLog();
  if (!buildLog) {
    process.exit(1);
  }

  // Parse pattern usage
  const metrics = parsePatternUsage(buildLog);

  // Get available patterns
  const availablePatterns = getAvailablePatterns();

  // Generate report
  const report = generateMetricsReport(metrics, availablePatterns);

  // Write to file
  writeMetricsFile(report);

  // Display summary
  displaySummary(metrics);
}

main();
