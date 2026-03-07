/**
 * codebakers_analyze_mockups_deep
 *
 * Phase 2A: Deep mockup analysis
 * Extracts ALL data fields, relationships, and interactions from UI mockups
 *
 * Based on CodeBakers Method Phase 2 requirements:
 * - All data fields displayed and their data types
 * - All form inputs and the entity they mutate
 * - All filters, sorts, and search parameters
 * - All computed or aggregated values
 * - All relationships between entities implied by the UI
 * - All status values and state machines
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function analyzeMockupsDeep(args) {
    const cwd = process.cwd();
    const mockupFolder = args.mockup_folder || 'refs/design/';
    const mockupPath = path.join(cwd, mockupFolder);
    console.error('🍞 CodeBakers: Phase 2A — Deep Mockup Analysis');
    console.error(`Analyzing mockups in: ${mockupPath}`);
    try {
        // 1. CHECK IF MOCKUP FOLDER EXISTS
        const exists = await fs.access(mockupPath).then(() => true).catch(() => false);
        if (!exists) {
            return `🍞 CodeBakers: Phase 2A - Deep Mockup Analysis

❌ BLOCKER: Mockup folder not found

Expected location: ${mockupPath}

Phase 2 cannot proceed without mockups. You must complete Phase 1 first.

Next step: Run Phase 1 to create UI mockups, then return to Phase 2.`;
        }
        // 2. READ ALL MOCKUP FILES
        const files = await fs.readdir(mockupPath);
        const mockupFiles = files.filter(f => f.endsWith('.html') ||
            f.endsWith('.jsx') ||
            f.endsWith('.tsx') ||
            f.endsWith('.md'));
        if (mockupFiles.length === 0) {
            return `🍞 CodeBakers: Phase 2A - Deep Mockup Analysis

⚠️ WARNING: No mockup files found in ${mockupPath}

Supported formats: .html, .jsx, .tsx, .md

Phase 1 may be incomplete. Verify mockups exist before proceeding to Phase 2.`;
        }
        console.error(`Found ${mockupFiles.length} mockup files`);
        // 3. ANALYZE EACH MOCKUP
        const analyses = [];
        for (const file of mockupFiles) {
            const filePath = path.join(mockupPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            console.error(`Analyzing: ${file}`);
            const analysis = await analyzeSingleMockup(file, content);
            analyses.push(analysis);
        }
        // 4. GENERATE MOCK-ANALYSIS.md
        const analysisContent = generateMockAnalysisDocument(analyses);
        const outputPath = path.join(cwd, '.codebakers', 'MOCK-ANALYSIS.md');
        // Ensure .codebakers folder exists
        await fs.mkdir(path.join(cwd, '.codebakers'), { recursive: true });
        await fs.writeFile(outputPath, analysisContent, 'utf-8');
        console.error(`✓ Analysis complete: ${outputPath}`);
        // 5. GENERATE SUMMARY FOR USER
        const summary = generateAnalysisSummary(analyses);
        return `🍞 CodeBakers: Phase 2A - Deep Mockup Analysis Complete

${summary}

📄 Full analysis written to: .codebakers/MOCK-ANALYSIS.md

Next steps:
1. Review MOCK-ANALYSIS.md to verify all data captured
2. Proceed to Phase 2B: Schema Generation (use tool: codebakers_generate_schema)
3. Then Phase 2C: Dependency Mapping (use tool: codebakers_map_dependencies)

Verification gate requirement:
→ Every data field in every mockup must have a corresponding database column
→ All entity relationships must be captured
→ No unresolved dependencies`;
    }
    catch (error) {
        console.error('Error during mockup analysis:', error);
        return `🍞 CodeBakers: Phase 2A - Deep Mockup Analysis Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please check:
- Mockup folder exists and is readable
- Mockup files are valid format (.html, .jsx, .tsx, .md)
- File permissions allow reading

If issue persists, log to ERROR-LOG.md and request human assistance.`;
    }
}
/**
 * Analyzes a single mockup file to extract data elements
 */
async function analyzeSingleMockup(filename, content) {
    const analysis = {
        screen_name: filename.replace(/\.(html|jsx|tsx|md)$/, ''),
        screen_path: filename,
        data_fields: [],
        form_inputs: [],
        filters: [],
        relationships: [],
        state_machines: [],
        computed_values: [],
        notes: [],
    };
    // PATTERN DETECTION RULES
    // These patterns identify data elements in mockup code/markup
    // 1. DETECT DATA FIELDS
    // Look for: {user.name}, {email}, data-field="...", etc.
    const dataFieldPatterns = [
        /\{(\w+)\.(\w+)\}/g, // {user.name}
        /\{(\w+)\}/g, // {email}
        /data-field=["'](\w+)["']/g, // data-field="name"
        /<td[^>]*>(\w+)<\/td>/g, // <td>name</td>
        /<span[^>]*>(\w+):<\/span>/g, // <span>Name:</span>
    ];
    for (const pattern of dataFieldPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const fieldName = match[2] || match[1];
            if (fieldName && !isIgnoredField(fieldName)) {
                analysis.data_fields.push({
                    field_name: fieldName,
                    data_type: inferDataType(fieldName, content),
                    source_entity: inferEntity(fieldName, content),
                    is_required: content.includes(`required`) && content.includes(fieldName),
                    is_computed: isComputedField(fieldName),
                    computation_rule: isComputedField(fieldName) ? inferComputationRule(fieldName) : undefined,
                });
            }
        }
    }
    // 2. DETECT FORM INPUTS
    const inputPatterns = [
        /<input[^>]*name=["'](\w+)["'][^>]*type=["'](\w+)["'][^>]*>/g,
        /<input[^>]*type=["'](\w+)["'][^>]*name=["'](\w+)["'][^>]*>/g,
        /<textarea[^>]*name=["'](\w+)["'][^>]*>/g,
        /<select[^>]*name=["'](\w+)["'][^>]*>/g,
    ];
    for (const pattern of inputPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const inputName = match[1] || match[2];
            const inputType = match[2] || match[1] || 'text';
            if (inputName && !isIgnoredField(inputName)) {
                analysis.form_inputs.push({
                    input_name: inputName,
                    input_type: inputType,
                    target_entity: inferEntity(inputName, content),
                    validation_rules: extractValidationRules(inputName, content),
                    is_required: content.includes(`required`) && content.includes(inputName),
                });
            }
        }
    }
    // 3. DETECT FILTERS, SORTS, SEARCH
    const filterPatterns = [
        /filter[^>]*by[^>]*(\w+)/gi,
        /sort[^>]*by[^>]*(\w+)/gi,
        /search[^>]*(\w+)/gi,
        /placeholder=["']Search (\w+)["']/gi,
    ];
    for (const pattern of filterPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const filterName = match[1];
            if (filterName && !isIgnoredField(filterName)) {
                analysis.filters.push({
                    filter_name: filterName,
                    applies_to_entity: inferEntity(filterName, content),
                    filter_type: inferFilterType(match[0]),
                    values: extractFilterValues(filterName, content),
                });
            }
        }
    }
    // 4. DETECT RELATIONSHIPS
    // Look for nested data structures: user.posts, order.items, etc.
    const relationshipPattern = /\{(\w+)\.(\w+)\.(\w+)\}/g;
    let match;
    while ((match = relationshipPattern.exec(content)) !== null) {
        const fromEntity = match[1];
        const throughEntity = match[2];
        if (!isIgnoredField(fromEntity) && !isIgnoredField(throughEntity)) {
            analysis.relationships.push({
                from_entity: fromEntity,
                to_entity: throughEntity,
                relationship_type: '1:many', // Default assumption
                implied_by: `Data reference: ${match[0]}`,
            });
        }
    }
    // 5. DETECT STATE MACHINES
    // Look for status indicators, badges, state values
    const statePatterns = [
        /status[^>]*:?\s*["']?(\w+)["']?/gi,
        /state[^>]*:?\s*["']?(\w+)["']?/gi,
        /badge[^>]*>(\w+)</gi,
    ];
    for (const pattern of statePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const stateValue = match[1];
            if (stateValue && !isIgnoredField(stateValue)) {
                // Try to find all possible values for this state
                const possibleValues = extractStateValues(content);
                analysis.state_machines.push({
                    entity: inferEntity(stateValue, content),
                    state_field: 'status', // Default field name
                    possible_values: possibleValues.length > 0 ? possibleValues : [stateValue],
                    transitions: [], // Would need more complex analysis
                });
            }
        }
    }
    // 6. DETECT COMPUTED VALUES
    // Look for aggregations: total, count, sum, average, etc.
    const computedPatterns = [
        /total[^>]*:?\s*\{?(\w+)\}?/gi,
        /count[^>]*:?\s*\{?(\w+)\}?/gi,
        /sum[^>]*:?\s*\{?(\w+)\}?/gi,
        /average[^>]*:?\s*\{?(\w+)\}?/gi,
        /\{(\w+\.length)\}/g,
        /\{(\w+\.count)\}/g,
    ];
    for (const pattern of computedPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const computedField = match[1];
            if (computedField && !isIgnoredField(computedField)) {
                analysis.computed_values.push({
                    field_name: computedField,
                    data_type: 'number',
                    source_entity: inferEntity(computedField, content),
                    is_required: false,
                    is_computed: true,
                    computation_rule: inferComputationRule(computedField),
                });
            }
        }
    }
    // 7. ADD ANALYSIS NOTES
    if (analysis.data_fields.length === 0 && analysis.form_inputs.length === 0) {
        analysis.notes.push('⚠️ No data fields or form inputs detected - verify mockup contains data');
    }
    return analysis;
}
/**
 * Generate the complete MOCK-ANALYSIS.md document
 */
function generateMockAnalysisDocument(analyses) {
    let doc = `# Mock Analysis\n`;
    doc += `**Generated:** ${new Date().toISOString()}\n`;
    doc += `**Phase:** 2A - Mock Analysis\n`;
    doc += `**Purpose:** Extract all data fields, relationships, and interactions from UI mockups\n\n`;
    doc += `---\n\n`;
    // Summary statistics
    const totalFields = analyses.reduce((sum, a) => sum + a.data_fields.length, 0);
    const totalInputs = analyses.reduce((sum, a) => sum + a.form_inputs.length, 0);
    const totalFilters = analyses.reduce((sum, a) => sum + a.filters.length, 0);
    const totalRelationships = analyses.reduce((sum, a) => sum + a.relationships.length, 0);
    doc += `## Summary\n\n`;
    doc += `- **Mockups analyzed:** ${analyses.length}\n`;
    doc += `- **Data fields extracted:** ${totalFields}\n`;
    doc += `- **Form inputs extracted:** ${totalInputs}\n`;
    doc += `- **Filters/sorts extracted:** ${totalFilters}\n`;
    doc += `- **Relationships identified:** ${totalRelationships}\n\n`;
    doc += `---\n\n`;
    // Per-screen analysis
    for (const analysis of analyses) {
        doc += `## Screen: ${analysis.screen_name}\n\n`;
        doc += `**File:** \`${analysis.screen_path}\`\n\n`;
        // Data fields
        if (analysis.data_fields.length > 0) {
            doc += `### Data Fields Displayed\n\n`;
            doc += `| Field Name | Data Type | Source Entity | Required | Computed |\n`;
            doc += `|------------|-----------|---------------|----------|----------|\n`;
            for (const field of analysis.data_fields) {
                doc += `| ${field.field_name} | ${field.data_type} | ${field.source_entity} | ${field.is_required ? 'Yes' : 'No'} | ${field.is_computed ? 'Yes' : 'No'} |\n`;
            }
            doc += `\n`;
        }
        // Form inputs
        if (analysis.form_inputs.length > 0) {
            doc += `### Form Inputs\n\n`;
            doc += `| Input Name | Type | Target Entity | Required | Validation Rules |\n`;
            doc += `|------------|------|---------------|----------|------------------|\n`;
            for (const input of analysis.form_inputs) {
                doc += `| ${input.input_name} | ${input.input_type} | ${input.target_entity} | ${input.is_required ? 'Yes' : 'No'} | ${input.validation_rules.join(', ') || 'None'} |\n`;
            }
            doc += `\n`;
        }
        // Filters
        if (analysis.filters.length > 0) {
            doc += `### Filters & Sorts\n\n`;
            doc += `| Filter Name | Type | Applies To | Values |\n`;
            doc += `|-------------|------|------------|--------|\n`;
            for (const filter of analysis.filters) {
                doc += `| ${filter.filter_name} | ${filter.filter_type} | ${filter.applies_to_entity} | ${filter.values?.join(', ') || 'Dynamic'} |\n`;
            }
            doc += `\n`;
        }
        // Relationships
        if (analysis.relationships.length > 0) {
            doc += `### Entity Relationships\n\n`;
            doc += `| From Entity | To Entity | Type | Implied By |\n`;
            doc += `|-------------|-----------|------|------------|\n`;
            for (const rel of analysis.relationships) {
                doc += `| ${rel.from_entity} | ${rel.to_entity} | ${rel.relationship_type} | ${rel.implied_by} |\n`;
            }
            doc += `\n`;
        }
        // State machines
        if (analysis.state_machines.length > 0) {
            doc += `### State Values\n\n`;
            doc += `| Entity | State Field | Possible Values |\n`;
            doc += `|--------|-------------|----------------|\n`;
            for (const state of analysis.state_machines) {
                doc += `| ${state.entity} | ${state.state_field} | ${state.possible_values.join(', ')} |\n`;
            }
            doc += `\n`;
        }
        // Computed values
        if (analysis.computed_values.length > 0) {
            doc += `### Computed/Aggregated Values\n\n`;
            doc += `| Field Name | Computation Rule | Source Entity |\n`;
            doc += `|------------|------------------|---------------|\n`;
            for (const computed of analysis.computed_values) {
                doc += `| ${computed.field_name} | ${computed.computation_rule || 'Derived'} | ${computed.source_entity} |\n`;
            }
            doc += `\n`;
        }
        // Notes
        if (analysis.notes.length > 0) {
            doc += `### Analysis Notes\n\n`;
            for (const note of analysis.notes) {
                doc += `- ${note}\n`;
            }
            doc += `\n`;
        }
        doc += `---\n\n`;
    }
    // Entity extraction summary
    doc += `## Extracted Entities\n\n`;
    doc += `Based on mockup analysis, the following entities were identified:\n\n`;
    const entities = new Set();
    for (const analysis of analyses) {
        for (const field of analysis.data_fields) {
            entities.add(field.source_entity);
        }
        for (const input of analysis.form_inputs) {
            entities.add(input.target_entity);
        }
    }
    for (const entity of Array.from(entities).sort()) {
        doc += `- **${entity}**\n`;
    }
    doc += `\n`;
    doc += `---\n\n`;
    doc += `## Next Steps\n\n`;
    doc += `1. **Review this analysis** - Verify all data elements captured\n`;
    doc += `2. **Phase 2B** - Generate database schema from this analysis\n`;
    doc += `3. **Phase 2C** - Map all dependencies\n`;
    doc += `4. **Verification Gate** - Confirm every field has a corresponding schema column\n\n`;
    return doc;
}
/**
 * Generate summary for tool response
 */
function generateAnalysisSummary(analyses) {
    const totalFields = analyses.reduce((sum, a) => sum + a.data_fields.length, 0);
    const totalInputs = analyses.reduce((sum, a) => sum + a.form_inputs.length, 0);
    const totalRelationships = analyses.reduce((sum, a) => sum + a.relationships.length, 0);
    const entities = new Set();
    for (const analysis of analyses) {
        for (const field of analysis.data_fields) {
            entities.add(field.source_entity);
        }
    }
    let summary = `✓ Analyzed ${analyses.length} mockup screens\n`;
    summary += `✓ Extracted ${totalFields} data fields\n`;
    summary += `✓ Extracted ${totalInputs} form inputs\n`;
    summary += `✓ Identified ${totalRelationships} entity relationships\n`;
    summary += `✓ Identified ${entities.size} distinct entities\n`;
    return summary;
}
// HELPER FUNCTIONS
function isIgnoredField(field) {
    const ignored = ['div', 'span', 'button', 'true', 'false', 'null', 'undefined', 'className', 'onClick'];
    return ignored.includes(field.toLowerCase());
}
function inferDataType(fieldName, context) {
    const lowerField = fieldName.toLowerCase();
    if (lowerField.includes('date') || lowerField.includes('created') || lowerField.includes('updated'))
        return 'timestamp';
    if (lowerField.includes('email'))
        return 'email';
    if (lowerField.includes('phone'))
        return 'phone';
    if (lowerField.includes('url') || lowerField.includes('link'))
        return 'url';
    if (lowerField.includes('id') || lowerField.endsWith('_id'))
        return 'uuid';
    if (lowerField.includes('count') || lowerField.includes('total') || lowerField.includes('amount'))
        return 'number';
    if (lowerField.includes('is_') || lowerField.includes('has_'))
        return 'boolean';
    if (lowerField.includes('price') || lowerField.includes('cost'))
        return 'decimal';
    return 'text';
}
function inferEntity(fieldName, context) {
    // Try to extract entity from field name patterns
    const parts = fieldName.split('_');
    if (parts.length > 1) {
        return parts[0]; // e.g., user_name → user
    }
    // Check context for entity clues
    if (context.includes('user.'))
        return 'user';
    if (context.includes('post.'))
        return 'post';
    if (context.includes('order.'))
        return 'order';
    if (context.includes('product.'))
        return 'product';
    return 'unknown';
}
function isComputedField(fieldName) {
    const computedKeywords = ['total', 'count', 'sum', 'average', 'length', 'size'];
    return computedKeywords.some(kw => fieldName.toLowerCase().includes(kw));
}
function inferComputationRule(fieldName) {
    const lower = fieldName.toLowerCase();
    if (lower.includes('total'))
        return 'SUM of related values';
    if (lower.includes('count'))
        return 'COUNT of related items';
    if (lower.includes('average'))
        return 'AVERAGE of related values';
    if (lower.includes('length'))
        return 'COUNT of array items';
    return 'Derived value';
}
function extractValidationRules(inputName, context) {
    const rules = [];
    if (context.includes(`required`) && context.includes(inputName))
        rules.push('required');
    if (context.includes(`minLength`) && context.includes(inputName))
        rules.push('minLength');
    if (context.includes(`maxLength`) && context.includes(inputName))
        rules.push('maxLength');
    if (context.includes(`pattern`) && context.includes(inputName))
        rules.push('pattern');
    if (context.includes(`email`) && context.includes(inputName))
        rules.push('email format');
    return rules;
}
function inferFilterType(matchText) {
    if (matchText.toLowerCase().includes('search'))
        return 'search';
    if (matchText.toLowerCase().includes('sort'))
        return 'sort';
    return 'filter';
}
function extractFilterValues(filterName, context) {
    // This would require more sophisticated parsing
    // For now, return undefined to indicate dynamic values
    return undefined;
}
function extractStateValues(content) {
    const stateValues = [];
    const patterns = [
        /["'](pending|active|completed|cancelled|draft|published)["']/gi,
        /["'](open|closed|in_progress)["']/gi,
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            if (!stateValues.includes(match[1])) {
                stateValues.push(match[1]);
            }
        }
    }
    return stateValues;
}
//# sourceMappingURL=analyze-mockups.js.map