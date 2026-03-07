/**
 * codebakers_check_scope
 *
 * Scope Verification
 *
 * Verifies that a feature request is defined in PROJECT-SPEC.md.
 * Prevents scope creep by enforcing spec boundaries.
 *
 * Rules:
 * - Feature must be in Gate 1 (Entities) or Gate 2 (State Changes)
 * - If not found, must either:
 *   1. Add to spec (formal amendment)
 *   2. Descope (remove from request)
 *   3. Flag for future iteration
 * - Never silently expand scope
 *
 * Based on CodeBakers Method Principle #7: Fixed Appetite, Not Open Scope
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function checkScope(args) {
    const description = args.feature_description || 'unknown';
    const cwd = process.cwd();
    console.error('🍞 CodeBakers: Scope Verification');
    console.error(`Checking: ${description}`);
    try {
        // 1. Load PROJECT-SPEC.md
        const specPath = path.join(cwd, '.codebakers', 'PROJECT-SPEC.md');
        const specExists = await fs.access(specPath).then(() => true).catch(() => false);
        if (!specExists) {
            return `🍞 CodeBakers: Scope Check BLOCKED

❌ PROJECT-SPEC.md not found

Cannot verify scope without specification.

Next step: Run Phase 0 first (codebakers_generate_spec)`;
        }
        const specContent = await fs.readFile(specPath, 'utf-8');
        // 2. Extract entities and state changes from spec
        const entities = extractEntities(specContent);
        const stateChanges = extractStateChanges(specContent);
        console.error(`Spec contains ${entities.length} entities and ${stateChanges.length} state changes`);
        // 3. Check if feature matches spec
        const result = checkFeatureAgainstSpec(description, entities, stateChanges);
        console.error(`Match confidence: ${result.confidence}`);
        console.error(`In scope: ${result.in_scope}`);
        // 4. Generate report
        const report = generateScopeReport(description, result, entities, stateChanges);
        return report;
    }
    catch (error) {
        console.error('Error during scope check:', error);
        return `🍞 CodeBakers: Scope Check Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please verify PROJECT-SPEC.md exists and is readable.`;
    }
}
/**
 * Extract entities from spec
 */
function extractEntities(spec) {
    const entities = [];
    // Extract from Gate 1 section
    const gate1Match = spec.match(/## Gate 1: Entities([\s\S]*?)(?=---|\n## Gate|$)/);
    if (!gate1Match)
        return entities;
    const gate1Content = gate1Match[1];
    // Extract entity names (markdown headers like ### User, ### Message, etc.)
    const entityMatches = gate1Content.matchAll(/### (\w+)/g);
    for (const match of entityMatches) {
        entities.push(match[1].toLowerCase());
    }
    return entities;
}
/**
 * Extract state changes from spec
 */
function extractStateChanges(spec) {
    const stateChanges = [];
    // Extract from Gate 2 section
    const gate2Match = spec.match(/## Gate 2: State Changes([\s\S]*?)(?=---|\n## Gate|$)/);
    if (!gate2Match)
        return stateChanges;
    const gate2Content = gate2Match[1];
    // Extract from table format: | createUser | User | create | ... |
    const stateMatches = gate2Content.matchAll(/\|\s*(\w+)\s*\|/g);
    for (const match of stateMatches) {
        const action = match[1];
        // Skip table headers
        if (action !== 'Action' && action !== 'Affects' && action !== 'Type' && action !== 'Description') {
            stateChanges.push(action.toLowerCase());
        }
    }
    return stateChanges;
}
/**
 * Check feature against spec
 */
function checkFeatureAgainstSpec(description, entities, stateChanges) {
    const lowerDesc = description.toLowerCase();
    const words = lowerDesc.split(/\s+/);
    const matchedEntities = [];
    const matchedStateChanges = [];
    // Check entity matches
    for (const entity of entities) {
        if (lowerDesc.includes(entity)) {
            matchedEntities.push(entity);
        }
    }
    // Check state change matches
    for (const stateChange of stateChanges) {
        if (lowerDesc.includes(stateChange.replace(/^(create|update|delete)/, '')) ||
            words.some(w => stateChange.includes(w))) {
            matchedStateChanges.push(stateChange);
        }
    }
    // Check for CRUD verbs
    const crudVerbs = ['create', 'add', 'new', 'update', 'edit', 'modify', 'delete', 'remove'];
    const hasCrudVerb = crudVerbs.some(verb => lowerDesc.includes(verb));
    // Determine confidence
    let confidence;
    let inScope;
    let recommendation;
    let specAmendmentRequired;
    if (matchedEntities.length > 0 && matchedStateChanges.length > 0) {
        // Strong match
        confidence = 'high';
        inScope = true;
        recommendation = `✅ Feature matches spec. Entity: ${matchedEntities.join(', ')}. State change: ${matchedStateChanges.join(', ')}.`;
        specAmendmentRequired = false;
    }
    else if (matchedEntities.length > 0 && hasCrudVerb) {
        // Moderate match - entity found, CRUD verb present
        confidence = 'medium';
        inScope = true;
        recommendation = `⚠️ Entity found in spec (${matchedEntities.join(', ')}), but specific state change not defined. May need spec amendment.`;
        specAmendmentRequired = false; // Lenient - allow if entity exists
    }
    else if (matchedEntities.length > 0) {
        // Entity found but no clear action
        confidence = 'low';
        inScope = false;
        recommendation = `⚠️ Entity exists (${matchedEntities.join(', ')}), but action unclear. Clarify or add state change to spec.`;
        specAmendmentRequired = true;
    }
    else {
        // No matches
        confidence = 'none';
        inScope = false;
        recommendation = `❌ Feature not found in spec. This appears to be scope creep.`;
        specAmendmentRequired = true;
    }
    return {
        in_scope: inScope,
        matched_entities: matchedEntities,
        matched_state_changes: matchedStateChanges,
        confidence: confidence,
        recommendation: recommendation,
        spec_amendment_required: specAmendmentRequired,
    };
}
/**
 * Generate scope report
 */
function generateScopeReport(description, result, entities, stateChanges) {
    let report = `🍞 CodeBakers: Scope Verification\n\n`;
    report += `**Feature:** ${description}\n`;
    report += `**Confidence:** ${result.confidence.toUpperCase()}\n`;
    report += `**In Scope:** ${result.in_scope ? 'YES' : 'NO'}\n\n`;
    report += `---\n\n`;
    // Matches
    report += `## Analysis\n\n`;
    if (result.matched_entities.length > 0) {
        report += `**Matched Entities:**\n`;
        for (const entity of result.matched_entities) {
            report += `- ${entity}\n`;
        }
        report += `\n`;
    }
    else {
        report += `**Matched Entities:** None\n\n`;
    }
    if (result.matched_state_changes.length > 0) {
        report += `**Matched State Changes:**\n`;
        for (const change of result.matched_state_changes) {
            report += `- ${change}\n`;
        }
        report += `\n`;
    }
    else {
        report += `**Matched State Changes:** None\n\n`;
    }
    report += `---\n\n`;
    // Recommendation
    report += `## Recommendation\n\n`;
    report += `${result.recommendation}\n\n`;
    // Next steps
    report += `---\n\n`;
    report += `## Next Steps\n\n`;
    if (result.in_scope && !result.spec_amendment_required) {
        report += `✅ **APPROVED** - Feature is in scope\n\n`;
        report += `Proceed with build:\n`;
        report += `1. Use: codebakers_enforce_feature\n`;
        report += `2. Follow atomic unit protocol\n`;
        report += `3. Build feature\n\n`;
    }
    else if (result.in_scope && result.spec_amendment_required) {
        report += `⚠️ **CONDITIONAL APPROVAL** - Clarification needed\n\n`;
        report += `Options:\n`;
        report += `1. Add specific state change to spec (amendment)\n`;
        report += `2. Clarify feature description to match existing spec\n`;
        report += `3. Proceed with caution if action is implied\n\n`;
    }
    else {
        report += `❌ **SCOPE CREEP DETECTED** - Feature not in spec\n\n`;
        report += `You MUST choose one:\n\n`;
        report += `**Option 1: Spec Amendment (Recommended)**\n`;
        report += `1. Review PROJECT-SPEC.md\n`;
        report += `2. Add this feature to Gate 1 (Entities) or Gate 2 (State Changes)\n`;
        report += `3. Get human approval for spec change\n`;
        report += `4. Then proceed with build\n\n`;
        report += `**Option 2: Descope**\n`;
        report += `Remove this feature from request\n\n`;
        report += `**Option 3: Future Iteration**\n`;
        report += `Flag for next phase/version\n\n`;
        report += `**NOT ALLOWED:**\n`;
        report += `❌ Silently building features not in spec\n`;
        report += `❌ Expanding scope without formal amendment\n\n`;
    }
    // Spec reference
    report += `---\n\n`;
    report += `## Spec Reference\n\n`;
    report += `**Entities in spec (${entities.length}):**\n`;
    for (const entity of entities) {
        report += `- ${entity}\n`;
    }
    report += `\n`;
    report += `**State changes in spec (${stateChanges.length}):**\n`;
    for (const change of stateChanges.slice(0, 10)) {
        report += `- ${change}\n`;
    }
    if (stateChanges.length > 10) {
        report += `- ... and ${stateChanges.length - 10} more\n`;
    }
    report += `\n`;
    return report;
}
//# sourceMappingURL=check-scope.js.map