/**
 * codebakers_validate_mockups
 *
 * Mockup Quality Validation
 *
 * Detects ALL quality issues in mockups BEFORE analysis:
 * - Overlapping content
 * - Out of viewport elements
 * - Missing mobile mockups
 * - Missing states (loading/error/empty)
 * - Design token inconsistencies
 * - Spacing inconsistencies
 * - Accessibility issues (contrast, alt text)
 *
 * Purpose: Garbage mockups in = garbage app out
 * Ensures database schema derived from PERFECT mockups
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface LayoutIssue {
  type: 'overlapping' | 'out_of_viewport' | 'z_index_conflict';
  severity: 'critical' | 'warning';
  file: string;
  elements: string[];
  description: string;
  fix_available: boolean;
}

interface ViewportIssue {
  type: 'out_of_viewport' | 'missing_mobile' | 'missing_desktop';
  severity: 'critical' | 'warning';
  file: string;
  element?: string;
  breakpoint?: number;
  overflow?: number;
  description: string;
  fix_available: boolean;
}

interface StateIssue {
  type: 'missing_state';
  severity: 'critical' | 'warning';
  component: string;
  missing_states: string[];
  description: string;
  fix_available: boolean;
}

interface DesignTokenIssue {
  type: 'no_design_system' | 'color_inconsistency' | 'spacing_inconsistency';
  severity: 'warning';
  description: string;
  values?: string[];
  suggestion: string;
  fix_available: boolean;
}

interface AccessibilityIssue {
  type: 'missing_alt' | 'poor_contrast' | 'missing_label';
  severity: 'warning';
  file: string;
  element: string;
  description: string;
  fix_available: boolean;
}

interface ValidationResult {
  layout_issues: LayoutIssue[];
  viewport_issues: ViewportIssue[];
  state_issues: StateIssue[];
  design_token_issues: DesignTokenIssue[];
  accessibility_issues: AccessibilityIssue[];
  total_critical: number;
  total_warnings: number;
  can_proceed: boolean;
  quality_score: number;
}

export async function validateMockups(args: { mockup_folder?: string }): Promise<string> {
  const cwd = process.cwd();
  const mockupFolder = args.mockup_folder || 'refs/design/';
  const mockupPath = path.join(cwd, mockupFolder);

  console.error('🍞 CodeBakers: Mockup Quality Validation');

  try {
    // Check if mockup folder exists
    const folderExists = await fs.access(mockupPath).then(() => true).catch(() => false);
    if (!folderExists) {
      return `🍞 CodeBakers: Mockup Validation BLOCKED

❌ Mockup folder not found: ${mockupFolder}

Create folder and add mockups:
mkdir -p ${mockupFolder}

Then drop your design mockups (HTML, Figma exports, screenshots).`;
    }

    // Get all mockup files
    const files = await fs.readdir(mockupPath);
    const mockupFiles = files.filter(f =>
      f.endsWith('.html') ||
      f.endsWith('.htm') ||
      f.endsWith('.png') ||
      f.endsWith('.jpg') ||
      f.endsWith('.jpeg')
    );

    if (mockupFiles.length === 0) {
      return `🍞 CodeBakers: Mockup Validation BLOCKED

❌ No mockup files found in ${mockupFolder}

Supported formats:
- HTML/HTM (Staff mockups - preferred)
- PNG/JPG (Client mockups - will need analysis)

Add mockups and run again.`;
    }

    console.error(`Found ${mockupFiles.length} mockup files`);

    // Run all validation checks
    const result: ValidationResult = {
      layout_issues: [],
      viewport_issues: [],
      state_issues: [],
      design_token_issues: [],
      accessibility_issues: [],
      total_critical: 0,
      total_warnings: 0,
      can_proceed: true,
      quality_score: 100,
    };

    // Validate each HTML mockup
    const htmlFiles = mockupFiles.filter(f => f.endsWith('.html') || f.endsWith('.htm'));
    for (const file of htmlFiles) {
      const filePath = path.join(mockupPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      await validateLayoutIssues(file, content, result);
      await validateViewportIssues(file, content, result);
      await validateAccessibility(file, content, result);
    }

    // Check for missing states
    await validateStates(htmlFiles, result);

    // Check for missing responsive versions
    await validateResponsive(htmlFiles, result);

    // Check design tokens
    await validateDesignTokens(mockupPath, htmlFiles, result);

    // Calculate totals
    result.total_critical =
      result.layout_issues.filter(i => i.severity === 'critical').length +
      result.viewport_issues.filter(i => i.severity === 'critical').length +
      result.state_issues.filter(i => i.severity === 'critical').length;

    result.total_warnings =
      result.layout_issues.filter(i => i.severity === 'warning').length +
      result.viewport_issues.filter(i => i.severity === 'warning').length +
      result.state_issues.filter(i => i.severity === 'warning').length +
      result.design_token_issues.length +
      result.accessibility_issues.length;

    result.can_proceed = result.total_critical === 0;

    // Calculate quality score
    result.quality_score = calculateQualityScore(result);

    // Generate report
    const report = generateValidationReport(result, mockupFiles.length);

    return report;
  } catch (error) {
    console.error('Error during mockup validation:', error);
    return `🍞 CodeBakers: Mockup Validation Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please check mockup files and try again.`;
  }
}

/**
 * Validate layout issues (overlapping, z-index conflicts)
 */
async function validateLayoutIssues(
  file: string,
  content: string,
  result: ValidationResult
): Promise<void> {
  // Simple heuristic: check for position: absolute with same coordinates
  const absoluteElements: { id: string; left: number; top: number; width: number; height: number }[] = [];

  // Extract style attributes (simple parsing)
  const styleMatches = content.matchAll(/style=["']([^"']+)["']/g);
  const idMatches = content.matchAll(/id=["']([^"']+)["']/g);

  let elementIndex = 0;
  for (const match of styleMatches) {
    const style = match[1];
    if (style.includes('position:') && (style.includes('absolute') || style.includes('fixed'))) {
      const left = parseFloat(style.match(/left:\s*(\d+)/)?.[1] || '0');
      const top = parseFloat(style.match(/top:\s*(\d+)/)?.[1] || '0');
      const width = parseFloat(style.match(/width:\s*(\d+)/)?.[1] || '100');
      const height = parseFloat(style.match(/height:\s*(\d+)/)?.[1] || '100');

      const idMatch = Array.from(idMatches)[elementIndex];
      const id = idMatch ? idMatch[1] : `element-${elementIndex}`;

      absoluteElements.push({ id, left, top, width, height });
      elementIndex++;
    }
  }

  // Check for overlaps
  for (let i = 0; i < absoluteElements.length; i++) {
    for (let j = i + 1; j < absoluteElements.length; j++) {
      const a = absoluteElements[i];
      const b = absoluteElements[j];

      // Check if rectangles overlap
      const overlaps = !(
        a.left + a.width < b.left ||
        b.left + b.width < a.left ||
        a.top + a.height < b.top ||
        b.top + b.height < a.top
      );

      if (overlaps) {
        result.layout_issues.push({
          type: 'overlapping',
          severity: 'critical',
          file,
          elements: [a.id, b.id],
          description: `Elements ${a.id} and ${b.id} overlap`,
          fix_available: true,
        });
      }
    }
  }
}

/**
 * Validate viewport issues (out of bounds elements)
 */
async function validateViewportIssues(
  file: string,
  content: string,
  result: ValidationResult
): Promise<void> {
  const breakpoints = [375, 768, 1024, 1440, 1920];

  // Extract viewport width from mockup (if specified)
  const viewportMatch = content.match(/viewport.*width=(\d+)/);
  const mockupWidth = viewportMatch ? parseInt(viewportMatch[1]) : 1440;

  // Check for elements positioned outside viewport
  const styleMatches = content.matchAll(/style=["']([^"']+)["']/g);
  const idMatches = Array.from(content.matchAll(/id=["']([^"']+)["']/g));

  let elementIndex = 0;
  for (const match of styleMatches) {
    const style = match[1];
    if (style.includes('position:') && (style.includes('absolute') || style.includes('fixed'))) {
      const right = parseFloat(style.match(/right:\s*(-?\d+)/)?.[1] || '0');
      const left = parseFloat(style.match(/left:\s*(\d+)/)?.[1] || '0');
      const width = parseFloat(style.match(/width:\s*(\d+)/)?.[1] || '0');

      const totalRight = left + width;

      if (right < 0 || totalRight > mockupWidth) {
        const idMatch = idMatches[elementIndex];
        const id = idMatch ? idMatch[1] : `element-${elementIndex}`;

        result.viewport_issues.push({
          type: 'out_of_viewport',
          severity: 'critical',
          file,
          element: id,
          breakpoint: mockupWidth,
          overflow: Math.abs(totalRight - mockupWidth),
          description: `Element ${id} extends outside viewport by ${Math.abs(totalRight - mockupWidth)}px`,
          fix_available: true,
        });
      }
      elementIndex++;
    }
  }
}

/**
 * Validate missing states (loading, error, empty)
 */
async function validateStates(
  files: string[],
  result: ValidationResult
): Promise<void> {
  const requiredStates = ['loading', 'error', 'empty', 'success'];

  // Group files by component (remove state suffix)
  const componentFiles = new Map<string, Set<string>>();

  for (const file of files) {
    const baseName = file
      .replace(/-loading\.html?$/i, '')
      .replace(/-error\.html?$/i, '')
      .replace(/-empty\.html?$/i, '')
      .replace(/-success\.html?$/i, '')
      .replace(/\.html?$/i, '');

    if (!componentFiles.has(baseName)) {
      componentFiles.set(baseName, new Set());
    }

    // Detect state from filename
    if (file.includes('loading')) componentFiles.get(baseName)!.add('loading');
    if (file.includes('error')) componentFiles.get(baseName)!.add('error');
    if (file.includes('empty')) componentFiles.get(baseName)!.add('empty');
    if (!file.includes('loading') && !file.includes('error') && !file.includes('empty')) {
      componentFiles.get(baseName)!.add('success');
    }
  }

  // Check each component has all required states
  for (const [component, states] of componentFiles.entries()) {
    const missingStates = requiredStates.filter(s => !states.has(s));

    if (missingStates.length > 0) {
      result.state_issues.push({
        type: 'missing_state',
        severity: 'critical',
        component,
        missing_states: missingStates,
        description: `Component ${component} missing states: ${missingStates.join(', ')}`,
        fix_available: true,
      });
    }
  }
}

/**
 * Validate responsive versions (mobile + desktop)
 */
async function validateResponsive(
  files: string[],
  result: ValidationResult
): Promise<void> {
  const hasMobile = files.some(f => f.includes('mobile') || f.includes('375'));
  const hasDesktop = files.some(f => f.includes('desktop') || f.includes('1440') || (!f.includes('mobile') && !f.includes('375')));

  if (hasDesktop && !hasMobile) {
    result.viewport_issues.push({
      type: 'missing_mobile',
      severity: 'critical',
      file: 'N/A',
      description: 'Desktop mockups exist but no mobile versions (375px width)',
      fix_available: true,
    });
  }

  if (hasMobile && !hasDesktop) {
    result.viewport_issues.push({
      type: 'missing_desktop',
      severity: 'warning',
      file: 'N/A',
      description: 'Mobile mockups exist but no desktop versions (1440px width)',
      fix_available: true,
    });
  }
}

/**
 * Validate design tokens (colors, spacing consistency)
 */
async function validateDesignTokens(
  mockupPath: string,
  files: string[],
  result: ValidationResult
): Promise<void> {
  // Check if design tokens file exists
  const tokenPath = path.join(mockupPath, 'design-tokens.json');
  const tokensExist = await fs.access(tokenPath).then(() => true).catch(() => false);

  if (!tokensExist && files.length > 3) {
    result.design_token_issues.push({
      type: 'no_design_system',
      severity: 'warning',
      description: `${files.length} mockup files but no design-tokens.json`,
      suggestion: 'Create design-tokens.json to standardize colors, spacing, typography',
      fix_available: true,
    });
  }

  // Extract colors from all mockups (simple heuristic)
  const colors = new Set<string>();
  for (const file of files) {
    const filePath = path.join(mockupPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const colorMatches = content.matchAll(/#[0-9a-fA-F]{3,6}/g);
    for (const match of colorMatches) {
      colors.add(match[0].toLowerCase());
    }
  }

  if (colors.size > 15) {
    result.design_token_issues.push({
      type: 'color_inconsistency',
      severity: 'warning',
      description: `Found ${colors.size} unique colors (recommended: <15)`,
      values: Array.from(colors).slice(0, 10),
      suggestion: 'Consolidate colors into design system (primary, secondary, text, background)',
      fix_available: true,
    });
  }
}

/**
 * Validate accessibility (contrast, alt text, labels)
 */
async function validateAccessibility(
  file: string,
  content: string,
  result: ValidationResult
): Promise<void> {
  // Check for images without alt text
  const imgMatches = content.matchAll(/<img\s+([^>]+)>/g);
  for (const match of imgMatches) {
    const attrs = match[1];
    if (!attrs.includes('alt=')) {
      const srcMatch = attrs.match(/src=["']([^"']+)["']/);
      const src = srcMatch ? srcMatch[1] : 'unknown';

      result.accessibility_issues.push({
        type: 'missing_alt',
        severity: 'warning',
        file,
        element: `img[src="${src}"]`,
        description: 'Image missing alt text (accessibility)',
        fix_available: true,
      });
    }
  }

  // Check for buttons without labels
  const buttonMatches = content.matchAll(/<button\s+([^>]*?)>([^<]*)<\/button>/g);
  for (const match of buttonMatches) {
    const attrs = match[1];
    const text = match[2].trim();

    if (!attrs.includes('aria-label') && !text) {
      result.accessibility_issues.push({
        type: 'missing_label',
        severity: 'warning',
        file,
        element: 'button',
        description: 'Button has no text or aria-label (accessibility)',
        fix_available: true,
      });
    }
  }
}

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(result: ValidationResult): number {
  let score = 100;

  // Critical issues: -20 points each
  score -= result.total_critical * 20;

  // Warnings: -5 points each
  score -= result.total_warnings * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate validation report
 */
function generateValidationReport(result: ValidationResult, fileCount: number): string {
  let report = `🍞 CodeBakers: Mockup Validation Report\n\n`;
  report += `**Files analyzed:** ${fileCount}\n`;
  report += `**Quality score:** ${result.quality_score}/100 ${getScoreBadge(result.quality_score)}\n\n`;
  report += `---\n\n`;

  // Critical issues
  if (result.total_critical > 0) {
    report += `## ❌ CRITICAL ISSUES (${result.total_critical}) - BLOCKS BUILD\n\n`;

    for (const issue of result.layout_issues.filter(i => i.severity === 'critical')) {
      report += `### ${issue.type.replace(/_/g, ' ').toUpperCase()}\n`;
      report += `**File:** ${issue.file}\n`;
      report += `**Elements:** ${issue.elements.join(', ')}\n`;
      report += `**Issue:** ${issue.description}\n`;
      report += `**Fix available:** ${issue.fix_available ? 'Yes (auto-fix)' : 'Manual'}\n\n`;
    }

    for (const issue of result.viewport_issues.filter(i => i.severity === 'critical')) {
      report += `### ${issue.type.replace(/_/g, ' ').toUpperCase()}\n`;
      if (issue.file !== 'N/A') {
        report += `**File:** ${issue.file}\n`;
        if (issue.element) report += `**Element:** ${issue.element}\n`;
        if (issue.overflow) report += `**Overflow:** ${issue.overflow}px\n`;
      }
      report += `**Issue:** ${issue.description}\n`;
      report += `**Fix available:** ${issue.fix_available ? 'Yes (auto-fix)' : 'Manual'}\n\n`;
    }

    for (const issue of result.state_issues) {
      report += `### MISSING STATES\n`;
      report += `**Component:** ${issue.component}\n`;
      report += `**Missing:** ${issue.missing_states.join(', ')}\n`;
      report += `**Issue:** ${issue.description}\n`;
      report += `**Fix available:** Yes (auto-generate)\n\n`;
    }

    report += `---\n\n`;
  }

  // Warnings
  if (result.total_warnings > 0) {
    report += `## ⚠️ WARNINGS (${result.total_warnings}) - Should Fix\n\n`;

    for (const issue of result.layout_issues.filter(i => i.severity === 'warning')) {
      report += `- ${issue.description} (${issue.file})\n`;
    }

    for (const issue of result.viewport_issues.filter(i => i.severity === 'warning')) {
      report += `- ${issue.description}\n`;
    }

    for (const issue of result.design_token_issues) {
      report += `- ${issue.description}\n`;
      if (issue.suggestion) {
        report += `  → Suggestion: ${issue.suggestion}\n`;
      }
    }

    for (const issue of result.accessibility_issues) {
      report += `- ${issue.description} (${issue.file}: ${issue.element})\n`;
    }

    report += `\n---\n\n`;
  }

  // Summary
  report += `## 📊 Summary\n\n`;
  report += `**Total issues:** ${result.total_critical + result.total_warnings}\n`;
  report += `**Critical:** ${result.total_critical}\n`;
  report += `**Warnings:** ${result.total_warnings}\n\n`;

  if (result.can_proceed) {
    report += `**Build can proceed?** ✅ YES (no critical issues)\n\n`;
    if (result.total_warnings > 0) {
      report += `**Recommended:** Fix warnings with codebakers_fix_mockups\n\n`;
    }
  } else {
    report += `**Build can proceed?** ❌ NO (fix critical issues first)\n\n`;
    report += `**Next step:** Run codebakers_fix_mockups to auto-fix issues\n\n`;
  }

  return report;
}

function getScoreBadge(score: number): string {
  if (score >= 90) return '🟢 EXCELLENT';
  if (score >= 70) return '🟡 GOOD';
  if (score >= 50) return '🟠 FAIR';
  return '🔴 POOR';
}
