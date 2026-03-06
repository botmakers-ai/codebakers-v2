#!/usr/bin/env ts-node
/**
 * CodeBakers Build Metrics Generator
 *
 * Analyzes project to generate comprehensive build metrics.
 * Tracks: features built, time spent, patterns used, errors caught, quality metrics.
 *
 * Usage:
 *   ts-node scripts/generate-build-metrics.ts
 *
 * Output:
 *   .codebakers/BUILD-METRICS.md
 */

import * as fs from 'fs';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

interface BuildMetrics {
  projectName: string;
  domain: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  featuresBuilt: number;
  atomicUnits: number;
  gatePassRate: number;
  errorSnifferWarnings: number;
  warningsApplied: number;
  warningsOverridden: number;
  crashRecoveries: number;
  patternsUsed: string[];
  buildVsFixRatio: string;
  typescriptErrorsCommitted: number;
  productionBugs: number;
}

function getProjectName(): string {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    return packageJson.name || 'Unknown Project';
  } catch {
    return 'Unknown Project';
  }
}

function getDomain(): string {
  try {
    const profilePath = 'project-profile.md';
    if (!fs.existsSync(profilePath)) return 'Unknown';

    const content = fs.readFileSync(profilePath, 'utf-8');
    const match = content.match(/domain:\s*(.+)/);
    return match ? match[1].trim() : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function getProjectDates(): { start: string; end: string; days: number } {
  try {
    const firstCommit = execSync('git log --reverse --format=%ci | head -1', {
      encoding: 'utf8',
    }).trim().split(' ')[0];

    const lastCommit = execSync('git log -1 --format=%ci', {
      encoding: 'utf8',
    }).trim().split(' ')[0];

    const start = new Date(firstCommit);
    const end = new Date(lastCommit);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return {
      start: firstCommit,
      end: lastCommit,
      days: days > 0 ? days : 1,
    };
  } catch {
    return { start: 'Unknown', end: 'Unknown', days: 0 };
  }
}

function countAtomicUnits(): { total: number; passRate: number } {
  try {
    const commits = execSync('git log --oneline', { encoding: 'utf8' });
    const atomicCommits = commits.split('\n').filter(c => c.includes('feat(atomic):'));
    const total = atomicCommits.length;

    const passedCommits = atomicCommits.filter(c => c.includes('gate passed'));
    const passRate = total > 0 ? Math.round((passedCommits.length / total) * 100) : 0;

    return { total, passRate };
  } catch {
    return { total: 0, passRate: 0 };
  }
}

function analyzeErrorSniffer(): {
  warnings: number;
  applied: number;
  overridden: number;
} {
  try {
    const buildLog = fs.readFileSync('.codebakers/BUILD-LOG.md', 'utf-8');

    const warningMatches = buildLog.match(/\[Sniffer\]/g) || [];
    const appliedMatches = buildLog.match(/\[Sniffer\] Applied/g) || [];
    const overriddenMatches = buildLog.match(/\(user override\)/g) || [];

    return {
      warnings: warningMatches.length,
      applied: appliedMatches.length,
      overridden: overriddenMatches.length,
    };
  } catch {
    return { warnings: 0, applied: 0, overridden: 0 };
  }
}

function countCrashRecoveries(): number {
  try {
    const buildLog = fs.readFileSync('.codebakers/BUILD-LOG.md', 'utf-8');
    const recoveries = buildLog.match(/Resuming from crash/g) || [];
    return recoveries.length;
  } catch {
    return 0;
  }
}

function getUniquePatterns(): string[] {
  try {
    const buildLog = fs.readFileSync('.codebakers/BUILD-LOG.md', 'utf-8');
    const patterns = new Set<string>();

    const matches = buildLog.matchAll(/Patterns applied:\s*([^(\n]+)/g);
    for (const match of matches) {
      const pattern = match[1].trim();
      if (pattern !== 'N/A') {
        patterns.add(pattern);
      }
    }

    return Array.from(patterns);
  } catch {
    return [];
  }
}

function calculateBuildVsFixRatio(): string {
  try {
    const commits = execSync('git log --oneline', { encoding: 'utf8' });
    const lines = commits.split('\n').filter(Boolean);

    const buildCommits = lines.filter(c => c.includes('feat(') || c.includes('wip(')).length;
    const fixCommits = lines.filter(c => c.includes('fix(')).length;

    const total = buildCommits + fixCommits;
    if (total === 0) return '0% build / 0% fix';

    const buildPct = Math.round((buildCommits / total) * 100);
    const fixPct = 100 - buildPct;

    return `${buildPct}% build / ${fixPct}% fix`;
  } catch {
    return 'Unknown';
  }
}

function countTypeScriptErrorsCommitted(): number {
  try {
    const errorLog = fs.readFileSync('.codebakers/ERROR-LOG.md', 'utf-8');
    const tsErrors = errorLog.match(/TypeScript error/g) || [];
    return tsErrors.length;
  } catch {
    return 0;
  }
}

function generateMetricsReport(metrics: BuildMetrics): string {
  const now = new Date().toISOString().split('T')[0];

  let report = `# Build Metrics\n\n`;
  report += `**Generated:** ${now}\n`;
  report += `**Project:** ${metrics.projectName}\n`;
  report += `**Domain:** ${metrics.domain}\n\n`;

  report += `---\n\n`;

  // Project Timeline
  report += `## Project Timeline\n\n`;
  report += `- **Start Date:** ${metrics.startDate}\n`;
  report += `- **End Date:** ${metrics.endDate}\n`;
  report += `- **Duration:** ${metrics.durationDays} days\n\n`;

  // Build Statistics
  report += `## Build Statistics\n\n`;
  report += `- **Features Built:** ${metrics.featuresBuilt}\n`;
  report += `- **Atomic Units:** ${metrics.atomicUnits}\n`;
  report += `- **Gate Pass Rate:** ${metrics.gatePassRate}%\n`;
  report += `- **Build vs. Fix Ratio:** ${metrics.buildVsFixRatio}\n\n`;

  // Error Sniffer Performance
  report += `## Error Sniffer Performance\n\n`;
  report += `- **Total Warnings:** ${metrics.errorSnifferWarnings}\n`;
  report += `- **Applied Automatically:** ${metrics.warningsApplied} (${metrics.errorSnifferWarnings > 0 ? Math.round((metrics.warningsApplied / metrics.errorSnifferWarnings) * 100) : 0}%)\n`;
  report += `- **User Overrides:** ${metrics.warningsOverridden} (${metrics.errorSnifferWarnings > 0 ? Math.round((metrics.warningsOverridden / metrics.errorSnifferWarnings) * 100) : 0}%)\n`;
  report += `- **Accuracy:** ${metrics.errorSnifferWarnings > 0 ? Math.round(((metrics.warningsApplied) / metrics.errorSnifferWarnings) * 100) : 0}%\n\n`;

  // Patterns Used
  report += `## Patterns Used\n\n`;
  if (metrics.patternsUsed.length === 0) {
    report += `*No patterns used yet*\n\n`;
  } else {
    metrics.patternsUsed.forEach(pattern => {
      report += `- ${pattern}\n`;
    });
    report += `\n**Total Unique Patterns:** ${metrics.patternsUsed.length}\n\n`;
  }

  // Quality Metrics
  report += `## Quality Metrics\n\n`;
  report += `- **Crash Recoveries:** ${metrics.crashRecoveries}\n`;
  report += `- **TypeScript Errors Committed:** ${metrics.typescriptErrorsCommitted}\n`;
  report += `- **Production Bugs:** ${metrics.productionBugs} (manual tracking)\n\n`;

  // Performance Summary
  report += `## Performance Summary\n\n`;
  const avgDaysPerFeature = metrics.featuresBuilt > 0
    ? (metrics.durationDays / metrics.featuresBuilt).toFixed(1)
    : 'N/A';

  report += `- **Avg. Days per Feature:** ${avgDaysPerFeature}\n`;
  report += `- **Features per Week:** ${metrics.durationDays > 0 ? ((metrics.featuresBuilt / metrics.durationDays) * 7).toFixed(1) : 'N/A'}\n\n`;

  report += `---\n\n`;
  report += `*Generated by scripts/generate-build-metrics.ts*\n`;

  return report;
}

function main(): void {
  console.log(`${colors.cyan}🍞 CodeBakers: Generating Build Metrics${colors.reset}\n`);

  const projectDates = getProjectDates();
  const atomicStats = countAtomicUnits();
  const snifferStats = analyzeErrorSniffer();

  const metrics: BuildMetrics = {
    projectName: getProjectName(),
    domain: getDomain(),
    startDate: projectDates.start,
    endDate: projectDates.end,
    durationDays: projectDates.days,
    featuresBuilt: atomicStats.total,
    atomicUnits: atomicStats.total,
    gatePassRate: atomicStats.passRate,
    errorSnifferWarnings: snifferStats.warnings,
    warningsApplied: snifferStats.applied,
    warningsOverridden: snifferStats.overridden,
    crashRecoveries: countCrashRecoveries(),
    patternsUsed: getUniquePatterns(),
    buildVsFixRatio: calculateBuildVsFixRatio(),
    typescriptErrorsCommitted: countTypeScriptErrorsCommitted(),
    productionBugs: 0, // Manual tracking
  };

  const report = generateMetricsReport(metrics);

  // Ensure .codebakers/ exists
  if (!fs.existsSync('.codebakers')) {
    fs.mkdirSync('.codebakers', { recursive: true });
  }

  fs.writeFileSync('.codebakers/BUILD-METRICS.md', report);

  console.log(`${colors.green}✓ Build metrics generated${colors.reset}`);
  console.log(`${colors.gray}  → .codebakers/BUILD-METRICS.md${colors.reset}\n`);

  // Display summary
  console.log(`${colors.cyan}📊 Summary${colors.reset}`);
  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Features Built: ${metrics.featuresBuilt}`);
  console.log(`Duration: ${metrics.durationDays} days`);
  console.log(`Error Sniffer Accuracy: ${metrics.errorSnifferWarnings > 0 ? Math.round((metrics.warningsApplied / metrics.errorSnifferWarnings) * 100) : 0}%`);
  console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

main();
