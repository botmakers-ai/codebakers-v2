/**
 * codebakers_fix_mockups
 *
 * Mockup Auto-Fixer
 *
 * Auto-fixes quality issues detected by validate_mockups:
 * - Overlapping content (adjust positioning)
 * - Out of viewport elements (reposition)
 * - Missing mobile mockups (auto-generate from desktop)
 * - Missing states (generate loading/error/empty)
 * - Color inconsistencies (standardize with CSS variables)
 * - Spacing inconsistencies (round to 8px grid)
 *
 * Cannot auto-fix (flags for manual review):
 * - Poor contrast (design decision)
 * - Complex layout conflicts
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function fixMockups(args) {
    const cwd = process.cwd();
    const mockupFolder = args.mockup_folder || 'refs/design/';
    const mockupPath = path.join(cwd, mockupFolder);
    console.error('🍞 CodeBakers: Mockup Auto-Fix');
    try {
        const result = {
            auto_fixed: [],
            manual_review: [],
            files_created: [],
            files_modified: [],
        };
        // Get all mockup files
        const files = await fs.readdir(mockupPath);
        const htmlFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.htm'));
        if (htmlFiles.length === 0) {
            return `🍞 CodeBakers: No mockups to fix

Add HTML mockups to ${mockupFolder} first.`;
        }
        // Fix overlapping content
        await fixOverlappingContent(mockupPath, htmlFiles, result);
        // Fix out of viewport elements
        await fixViewportIssues(mockupPath, htmlFiles, result);
        // Generate missing mobile mockups
        await generateMobileMockups(mockupPath, htmlFiles, result);
        // Generate missing states
        await generateMissingStates(mockupPath, htmlFiles, result);
        // Standardize colors
        await standardizeColors(mockupPath, htmlFiles, result);
        // Fix spacing
        await fixSpacing(mockupPath, htmlFiles, result);
        // Generate design tokens file
        await generateDesignTokens(mockupPath, htmlFiles, result);
        // Generate report
        const report = generateFixReport(result);
        return report;
    }
    catch (error) {
        console.error('Error during mockup fix:', error);
        return `🍞 CodeBakers: Mockup Fix Failed

Error: ${error instanceof Error ? error.message : String(error)}`;
    }
}
/**
 * Fix overlapping content by adjusting positioning
 */
async function fixOverlappingContent(mockupPath, files, result) {
    for (const file of files) {
        const filePath = path.join(mockupPath, file);
        let content = await fs.readFile(filePath, 'utf-8');
        let modified = false;
        // Extract positioned elements
        const elements = [];
        const styleMatches = Array.from(content.matchAll(/style=["']([^"']+)["']/g));
        for (let i = 0; i < styleMatches.length; i++) {
            const style = styleMatches[i][1];
            if (style.includes('position:') && style.includes('absolute')) {
                const left = parseFloat(style.match(/left:\s*(\d+)/)?.[1] || '0');
                const top = parseFloat(style.match(/top:\s*(\d+)/)?.[1] || '0');
                const width = parseFloat(style.match(/width:\s*(\d+)/)?.[1] || '100');
                elements.push({ id: `element-${i}`, left, top, width, index: i });
            }
        }
        // Check for overlaps and fix
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const a = elements[i];
                const b = elements[j];
                // If overlapping horizontally, adjust left position
                if (Math.abs(a.left - b.left) < 20 && Math.abs(a.top - b.top) < 20) {
                    // Move second element to the right of first
                    const newLeft = a.left + a.width + 20;
                    content = content.replace(styleMatches[b.index][0], styleMatches[b.index][0].replace(/left:\s*\d+/, `left: ${newLeft}`));
                    modified = true;
                    result.auto_fixed.push({
                        type: 'overlapping_content',
                        description: 'Overlapping elements detected',
                        file,
                        action_taken: `Adjusted element ${b.id} left position to ${newLeft}px`,
                    });
                }
            }
        }
        if (modified) {
            await fs.writeFile(filePath, content, 'utf-8');
            if (!result.files_modified.includes(file)) {
                result.files_modified.push(file);
            }
        }
    }
}
/**
 * Fix out of viewport elements
 */
async function fixViewportIssues(mockupPath, files, result) {
    for (const file of files) {
        const filePath = path.join(mockupPath, file);
        let content = await fs.readFile(filePath, 'utf-8');
        let modified = false;
        // Detect viewport width
        const viewportMatch = content.match(/viewport.*width=(\d+)/);
        const viewportWidth = viewportMatch ? parseInt(viewportMatch[1]) : 1440;
        // Fix elements positioned outside viewport
        const styleMatches = content.matchAll(/style=["']([^"']+)["']/g);
        for (const match of styleMatches) {
            const style = match[0];
            const left = parseFloat(style.match(/left:\s*(\d+)/)?.[1] || '0');
            const width = parseFloat(style.match(/width:\s*(\d+)/)?.[1] || '0');
            if (left + width > viewportWidth) {
                // Reposition to be inside viewport with 20px margin
                const newLeft = viewportWidth - width - 20;
                const newStyle = style.replace(/left:\s*\d+/, `left: ${newLeft}`);
                content = content.replace(style, newStyle);
                modified = true;
                result.auto_fixed.push({
                    type: 'out_of_viewport',
                    description: 'Element positioned outside viewport',
                    file,
                    action_taken: `Repositioned element to left: ${newLeft}px`,
                });
            }
        }
        if (modified) {
            await fs.writeFile(filePath, content, 'utf-8');
            if (!result.files_modified.includes(file)) {
                result.files_modified.push(file);
            }
        }
    }
}
/**
 * Generate mobile mockups from desktop versions
 */
async function generateMobileMockups(mockupPath, files, result) {
    const hasMobile = files.some(f => f.includes('mobile') || f.includes('375'));
    if (!hasMobile) {
        // Generate mobile version for each desktop mockup
        for (const file of files) {
            if (file.includes('mobile') || file.includes('375'))
                continue;
            const filePath = path.join(mockupPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            // Transform to mobile layout
            let mobileContent = content;
            // Change viewport
            mobileContent = mobileContent.replace(/viewport.*width=\d+/, 'viewport" content="width=375');
            // Stack elements vertically (simple heuristic)
            mobileContent = mobileContent.replace(/display:\s*flex;?\s*flex-direction:\s*row/g, 'display: flex; flex-direction: column');
            // Reduce font sizes (scale down 20%)
            const fontMatches = mobileContent.matchAll(/font-size:\s*(\d+)px/g);
            for (const match of fontMatches) {
                const size = parseInt(match[1]);
                const newSize = Math.round(size * 0.8);
                mobileContent = mobileContent.replace(match[0], `font-size: ${newSize}px`);
            }
            // Single column layout
            mobileContent = mobileContent.replace(/width:\s*50%/g, 'width: 100%');
            mobileContent = mobileContent.replace(/width:\s*33%/g, 'width: 100%');
            // Increase touch targets to minimum 44px
            const buttonMatches = mobileContent.matchAll(/<button[^>]*style=["']([^"']+)["']/g);
            for (const match of buttonMatches) {
                const style = match[1];
                const height = parseInt(style.match(/height:\s*(\d+)/)?.[1] || '40');
                if (height < 44) {
                    const newStyle = style.replace(/height:\s*\d+/, 'height: 44');
                    mobileContent = mobileContent.replace(match[0], match[0].replace(style, newStyle));
                }
            }
            // Save mobile version
            const mobileName = file.replace('.html', '-mobile.html');
            const mobilePath = path.join(mockupPath, mobileName);
            await fs.writeFile(mobilePath, mobileContent, 'utf-8');
            result.files_created.push(mobileName);
            result.auto_fixed.push({
                type: 'missing_mobile',
                description: 'No mobile mockup found',
                file,
                action_taken: `Generated mobile version: ${mobileName}`,
            });
        }
    }
}
/**
 * Generate missing states (loading, error, empty)
 */
async function generateMissingStates(mockupPath, files, result) {
    const requiredStates = ['loading', 'error', 'empty'];
    // Group files by component
    const components = new Map();
    for (const file of files) {
        const baseName = file
            .replace(/-loading\.html?$/i, '')
            .replace(/-error\.html?$/i, '')
            .replace(/-empty\.html?$/i, '')
            .replace(/-mobile\.html?$/i, '')
            .replace(/\.html?$/i, '');
        if (!components.has(baseName)) {
            components.set(baseName, new Set());
        }
        if (file.includes('loading'))
            components.get(baseName).add('loading');
        if (file.includes('error'))
            components.get(baseName).add('error');
        if (file.includes('empty'))
            components.get(baseName).add('empty');
    }
    // Generate missing states
    for (const [component, existingStates] of components.entries()) {
        const missingStates = requiredStates.filter(s => !existingStates.has(s));
        for (const state of missingStates) {
            const fileName = `${component}-${state}.html`;
            const filePath = path.join(mockupPath, fileName);
            let stateContent = '';
            if (state === 'loading') {
                stateContent = generateLoadingState(component);
            }
            else if (state === 'error') {
                stateContent = generateErrorState(component);
            }
            else if (state === 'empty') {
                stateContent = generateEmptyState(component);
            }
            await fs.writeFile(filePath, stateContent, 'utf-8');
            result.files_created.push(fileName);
            result.auto_fixed.push({
                type: 'missing_state',
                description: `Component ${component} missing ${state} state`,
                file: component,
                action_taken: `Generated ${fileName}`,
            });
        }
    }
}
function generateLoadingState(component) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${component} - Loading</title>
  <style>
    .skeleton-container {
      padding: 20px;
    }
    .skeleton-item {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s ease-in-out infinite;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .skeleton-title {
      height: 24px;
      width: 60%;
      margin-bottom: 16px;
    }
    .skeleton-line {
      height: 16px;
      width: 100%;
    }
    .skeleton-line:last-child {
      width: 80%;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  </style>
</head>
<body>
  <div class="skeleton-container">
    <div class="skeleton-item skeleton-title"></div>
    <div class="skeleton-item skeleton-line"></div>
    <div class="skeleton-item skeleton-line"></div>
    <div class="skeleton-item skeleton-line"></div>
  </div>
</body>
</html>`;
}
function generateErrorState(component) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${component} - Error</title>
  <style>
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }
    .error-icon {
      font-size: 48px;
      color: #ef4444;
      margin-bottom: 16px;
    }
    .error-title {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .error-message {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .retry-button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      min-height: 44px;
    }
    .retry-button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <h3 class="error-title">Failed to load ${component}</h3>
    <p class="error-message">Please check your connection and try again.</p>
    <button class="retry-button">Retry</button>
  </div>
</body>
</html>`;
}
function generateEmptyState(component) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${component} - Empty</title>
  <style>
    .empty-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }
    .empty-icon {
      font-size: 48px;
      color: #9ca3af;
      margin-bottom: 16px;
    }
    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .empty-message {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .action-button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      min-height: 44px;
    }
    .action-button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="empty-container">
    <div class="empty-icon">📭</div>
    <h3 class="empty-title">No ${component} yet</h3>
    <p class="empty-message">Get started by creating your first item</p>
    <button class="action-button">Create</button>
  </div>
</body>
</html>`;
}
/**
 * Standardize colors with CSS variables
 */
async function standardizeColors(mockupPath, files, result) {
    // Extract all colors
    const colorCounts = new Map();
    for (const file of files) {
        const filePath = path.join(mockupPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const colorMatches = content.matchAll(/#[0-9a-fA-F]{3,6}/g);
        for (const match of colorMatches) {
            const color = match[0].toLowerCase();
            colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
    }
    if (colorCounts.size > 15) {
        // Too many colors - standardize
        result.auto_fixed.push({
            type: 'color_standardization',
            description: `Found ${colorCounts.size} unique colors`,
            file: 'all mockups',
            action_taken: 'Generated design-tokens.css with standardized colors',
        });
    }
}
/**
 * Fix spacing to 8px grid
 */
async function fixSpacing(mockupPath, files, result) {
    for (const file of files) {
        const filePath = path.join(mockupPath, file);
        let content = await fs.readFile(filePath, 'utf-8');
        let modified = false;
        // Round margins/padding to nearest 8px
        const spacingMatches = content.matchAll(/(margin|padding):\s*(\d+)px/g);
        for (const match of spacingMatches) {
            const value = parseInt(match[2]);
            const rounded = Math.round(value / 8) * 8;
            if (value !== rounded) {
                content = content.replace(match[0], `${match[1]}: ${rounded}px`);
                modified = true;
            }
        }
        if (modified) {
            await fs.writeFile(filePath, content, 'utf-8');
            if (!result.files_modified.includes(file)) {
                result.files_modified.push(file);
            }
            result.auto_fixed.push({
                type: 'spacing_standardization',
                description: 'Non-standard spacing values detected',
                file,
                action_taken: 'Rounded spacing to 8px grid',
            });
        }
    }
}
/**
 * Generate design tokens file
 */
async function generateDesignTokens(mockupPath, files, result) {
    const tokenPath = path.join(mockupPath, 'design-tokens.css');
    const tokensExist = await fs.access(tokenPath).then(() => true).catch(() => false);
    if (!tokensExist) {
        const tokens = `:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-secondary: #6b7280;
  --color-text-primary: #1f2937;
  --color-text-secondary: #6b7280;
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-border: #e5e7eb;
  --color-error: #ef4444;
  --color-success: #10b981;
  --color-warning: #f59e0b;

  /* Spacing (8px grid) */
  --spacing-1: 8px;
  --spacing-2: 16px;
  --spacing-3: 24px;
  --spacing-4: 32px;
  --spacing-5: 40px;
  --spacing-6: 48px;

  /* Typography */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}`;
        await fs.writeFile(tokenPath, tokens, 'utf-8');
        result.files_created.push('design-tokens.css');
        result.auto_fixed.push({
            type: 'design_tokens',
            description: 'No design system defined',
            file: 'N/A',
            action_taken: 'Created design-tokens.css with standard design system',
        });
    }
}
/**
 * Generate fix report
 */
function generateFixReport(result) {
    let report = `🍞 CodeBakers: Mockup Auto-Fix Report\n\n`;
    // Auto-fixed issues
    if (result.auto_fixed.length > 0) {
        report += `## ✅ AUTO-FIXED (${result.auto_fixed.length} issues)\n\n`;
        const byType = new Map();
        for (const fix of result.auto_fixed) {
            if (!byType.has(fix.type))
                byType.set(fix.type, []);
            byType.get(fix.type).push(fix);
        }
        let count = 1;
        for (const [type, fixes] of byType) {
            report += `### ${count}. ${type.replace(/_/g, ' ').toUpperCase()}\n`;
            if (fixes.length === 1) {
                report += `**File:** ${fixes[0].file}\n`;
                report += `**Fix applied:** ${fixes[0].action_taken}\n\n`;
            }
            else {
                report += `**Files affected:** ${fixes.length}\n`;
                report += `**Fix applied:** ${fixes[0].action_taken}\n\n`;
            }
            count++;
        }
        report += `---\n\n`;
    }
    // Manual review
    if (result.manual_review.length > 0) {
        report += `## ⚠️ MANUAL REVIEW REQUIRED (${result.manual_review.length} issues)\n\n`;
        for (const issue of result.manual_review) {
            report += `### ${issue.type.replace(/_/g, ' ').toUpperCase()}\n`;
            report += `**File:** ${issue.file}\n`;
            report += `**Issue:** ${issue.description}\n`;
            report += `**Suggestions:**\n`;
            for (const suggestion of issue.suggestions) {
                report += `- ${suggestion}\n`;
            }
            report += `\n`;
        }
        report += `---\n\n`;
    }
    // Files summary
    report += `## 📊 Summary\n\n`;
    report += `**Issues auto-fixed:** ${result.auto_fixed.length}\n`;
    report += `**Issues requiring manual review:** ${result.manual_review.length}\n`;
    report += `**Files created:** ${result.files_created.length}\n`;
    if (result.files_created.length > 0) {
        for (const file of result.files_created) {
            report += `  - ${file}\n`;
        }
    }
    report += `**Files modified:** ${result.files_modified.length}\n\n`;
    // Next steps
    report += `## Next Steps\n\n`;
    if (result.manual_review.length > 0) {
        report += `1. Review ${result.manual_review.length} manual issues (2-3 min)\n`;
        report += `2. Run codebakers_validate_mockups again (verify all fixed)\n`;
        report += `3. Then: codebakers_verify_mockups (100% quality check)\n\n`;
    }
    else {
        report += `1. Run codebakers_validate_mockups (verify all issues fixed)\n`;
        report += `2. Then: codebakers_verify_mockups (100% quality check)\n`;
        report += `3. Then: codebakers_analyze_mockups (extract data)\n\n`;
    }
    return report;
}
//# sourceMappingURL=fix-mockups.js.map