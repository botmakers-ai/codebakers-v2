/**
 * codebakers_map_dependencies
 *
 * Phase 2C: Comprehensive Dependency Mapping
 * Maps ALL dependencies BEFORE any code is written
 *
 * USER'S CRITICAL ENHANCEMENT:
 * "Best possible dependency mapping from moment 1"
 * "Make sure all connections are there from moment 1"
 *
 * This prevents the #1 cause of bugs:
 * Mutations that update the database but leave UI stale
 *
 * Maps:
 * 1. Read dependencies (component → stores → database queries)
 * 2. Write dependencies (mutation → store updates → cascade effects)
 * 3. Store-to-store connections (when X changes, Y must also update)
 * 4. Cascade effects (database triggers, computed values, related entities)
 * 5. Query patterns (filters, sorts, search - what indexes needed)
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function mapDependencies(args) {
    const cwd = process.cwd();
    const schemaFile = args.schema_file || '.codebakers/SCHEMA.sql';
    const analysisFile = args.analysis_file || '.codebakers/MOCK-ANALYSIS.md';
    const schemaPath = path.join(cwd, schemaFile);
    const analysisPath = path.join(cwd, analysisFile);
    console.error('🍞 CodeBakers: Phase 2C — Comprehensive Dependency Mapping');
    console.error('This is YOUR enhancement - mapping ALL dependencies BEFORE building');
    try {
        // 1. CHECK IF REQUIRED FILES EXIST
        const schemaExists = await fs.access(schemaPath).then(() => true).catch(() => false);
        const analysisExists = await fs.access(analysisPath).then(() => true).catch(() => false);
        if (!schemaExists) {
            return `🍞 CodeBakers: Phase 2C - Comprehensive Dependency Mapping

❌ BLOCKER: Schema file not found

Expected location: ${schemaPath}

Phase 2C requires Phase 2B schema to map dependencies.

Next step: Run Phase 2B first (use tool: codebakers_generate_schema)`;
        }
        if (!analysisExists) {
            return `🍞 CodeBakers: Phase 2C - Comprehensive Dependency Mapping

❌ BLOCKER: Mock analysis file not found

Expected location: ${analysisPath}

Phase 2C requires Phase 2A analysis to map dependencies.

Next step: Run Phase 2A first (use tool: codebakers_analyze_mockups_deep)`;
        }
        // 2. READ SCHEMA AND ANALYSIS
        const schemaContent = await fs.readFile(schemaPath, 'utf-8');
        const analysisContent = await fs.readFile(analysisPath, 'utf-8');
        console.error('Files loaded. Analyzing dependencies...');
        // 3. PARSE AND MAP ALL DEPENDENCIES
        const dependencyMap = buildComprehensiveDependencyMap(schemaContent, analysisContent);
        console.error(`Mapped ${dependencyMap.read_dependencies.length} read paths`);
        console.error(`Mapped ${dependencyMap.write_dependencies.length} write paths`);
        console.error(`Mapped ${dependencyMap.cascade_effects.length} cascade effects`);
        // 4. GENERATE DEPENDENCY-MAP.md
        const mapDocument = generateDependencyMapDocument(dependencyMap);
        const mapPath = path.join(cwd, '.codebakers', 'DEPENDENCY-MAP.md');
        await fs.writeFile(mapPath, mapDocument, 'utf-8');
        console.error(`✓ Dependency map written: ${mapPath}`);
        // 5. GENERATE SUMMARY
        const summary = generateDependencyMapSummary(dependencyMap);
        return `🍞 CodeBakers: Phase 2C - Comprehensive Dependency Mapping Complete

${summary}

📄 Dependency map written to: .codebakers/DEPENDENCY-MAP.md

This map includes:
✓ Every read dependency (component → store → query)
✓ Every write dependency (mutation → updates → cascades)
✓ Every store-to-store connection
✓ Every cascade effect
✓ Every critical path (mutations that affect multiple stores)

CRITICAL: Use this map BEFORE implementing ANY mutation
→ Check DEPENDENCY-MAP.md to see ALL stores that must be updated
→ This prevents stale UI bugs from moment 1

Next steps:
1. Review DEPENDENCY-MAP.md to verify all connections mapped
2. Ready for Phase 3: Foundation Build
3. REMEMBER: Check dependency map before implementing ANY mutation`;
    }
    catch (error) {
        console.error('Error during dependency mapping:', error);
        return `🍞 CodeBakers: Phase 2C - Comprehensive Dependency Mapping Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please check:
- Schema file and analysis file exist and are readable
- Files contain valid content
- File permissions allow writing

If issue persists, log to ERROR-LOG.md and request human assistance.`;
    }
}
/**
 * Build comprehensive dependency map from schema and analysis
 */
function buildComprehensiveDependencyMap(schema, analysis) {
    const map = {
        read_dependencies: [],
        write_dependencies: [],
        store_connections: [],
        cascade_effects: [],
        critical_paths: [],
    };
    // Extract entities from schema
    const entities = extractEntitiesFromSchema(schema);
    // Extract screens and their data requirements from analysis
    const screens = extractScreensFromAnalysis(analysis);
    console.error(`Found ${entities.length} entities and ${screens.length} screens`);
    // 1. MAP READ DEPENDENCIES
    // For each screen, determine what stores it needs to read from
    for (const screen of screens) {
        const readDep = {
            component: screen.name,
            reads_from_stores: [],
            queries_entities: [],
            filters_applied: [],
        };
        // Map data fields to entities and stores
        for (const field of screen.data_fields) {
            const entity = field.source_entity;
            if (entity && entity !== 'unknown') {
                const storeName = `${entity}Store`;
                if (!readDep.reads_from_stores.includes(storeName)) {
                    readDep.reads_from_stores.push(storeName);
                }
                if (!readDep.queries_entities.includes(entity)) {
                    readDep.queries_entities.push(entity);
                }
            }
        }
        // Map filters to query patterns
        for (const filter of screen.filters) {
            readDep.filters_applied.push(`${filter.filter_type}: ${filter.filter_name}`);
        }
        if (readDep.reads_from_stores.length > 0) {
            map.read_dependencies.push(readDep);
        }
    }
    // 2. MAP WRITE DEPENDENCIES
    // For each form input, determine what must be updated
    for (const screen of screens) {
        if (screen.form_inputs.length > 0) {
            const entity = screen.form_inputs[0].target_entity;
            if (entity && entity !== 'unknown') {
                const writeDep = {
                    mutation: `create${capitalize(entity)}`,
                    updates_entity: entity,
                    must_update_stores: [],
                    cascade_updates: [],
                    affected_components: [],
                };
                // Direct store update
                writeDep.must_update_stores.push(`${entity}Store`);
                // Find cascade effects
                const cascades = findCascadeEffects(entity, entities, screens);
                writeDep.cascade_updates.push(...cascades.affected_stores);
                writeDep.affected_components.push(...cascades.affected_components);
                // Add update mutation
                map.write_dependencies.push({
                    mutation: `update${capitalize(entity)}`,
                    updates_entity: entity,
                    must_update_stores: writeDep.must_update_stores,
                    cascade_updates: writeDep.cascade_updates,
                    affected_components: writeDep.affected_components,
                });
                // Add delete mutation
                map.write_dependencies.push({
                    mutation: `delete${capitalize(entity)}`,
                    updates_entity: entity,
                    must_update_stores: writeDep.must_update_stores,
                    cascade_updates: [...writeDep.cascade_updates, 'Remove from all caches'],
                    affected_components: writeDep.affected_components,
                });
                map.write_dependencies.push(writeDep);
            }
        }
    }
    // 3. MAP STORE CONNECTIONS
    for (const entity of entities) {
        const storeConn = {
            store_name: `${entity.name}Store`,
            sourced_from_entities: [entity.name],
            connected_to_stores: [],
            update_triggers: [],
        };
        // Find related entities through foreign keys
        for (const fk of entity.foreign_keys) {
            const relatedStore = `${fk.references_table.replace(/s$/, '')}Store`;
            if (!storeConn.connected_to_stores.includes(relatedStore)) {
                storeConn.connected_to_stores.push(relatedStore);
            }
        }
        // Determine when this store must update
        storeConn.update_triggers.push(`On create${capitalize(entity.name)}`);
        storeConn.update_triggers.push(`On update${capitalize(entity.name)}`);
        storeConn.update_triggers.push(`On delete${capitalize(entity.name)}`);
        map.store_connections.push(storeConn);
    }
    // 4. MAP CASCADE EFFECTS
    for (const entity of entities) {
        // Foreign key cascades
        for (const fk of entity.foreign_keys) {
            map.cascade_effects.push({
                trigger: `Delete ${fk.references_table.replace(/s$/, '')}`,
                cascades_to: [`Delete all ${entity.name} records (ON DELETE CASCADE)`],
                reason: `Foreign key constraint: ${entity.name}.${fk.column_name} → ${fk.references_table}`,
            });
        }
        // Computed value cascades
        if (entity.name.includes('total') || entity.name.includes('count')) {
            map.cascade_effects.push({
                trigger: `Update ${entity.name}`,
                cascades_to: ['Recalculate aggregated values'],
                reason: 'Computed/aggregated field',
            });
        }
    }
    // 5. IDENTIFY CRITICAL PATHS
    // Critical paths are mutations that affect 3+ stores
    for (const writeDep of map.write_dependencies) {
        const totalStores = writeDep.must_update_stores.length + writeDep.cascade_updates.length;
        if (totalStores >= 3) {
            map.critical_paths.push(`${writeDep.mutation} affects ${totalStores} stores: ${[...writeDep.must_update_stores, ...writeDep.cascade_updates].join(', ')}`);
        }
    }
    return map;
}
/**
 * Extract entities from schema
 */
function extractEntitiesFromSchema(schema) {
    const entities = [];
    const tableRegex = /CREATE TABLE (\w+) \(/g;
    let match;
    while ((match = tableRegex.exec(schema)) !== null) {
        const tableName = match[1];
        const entityName = tableName.replace(/s$/, ''); // Singularize
        // Extract foreign keys
        const foreign_keys = [];
        const fkRegex = /FOREIGN KEY \((\w+)\) REFERENCES (\w+)\(/g;
        let fkMatch;
        while ((fkMatch = fkRegex.exec(schema)) !== null) {
            foreign_keys.push({
                column_name: fkMatch[1],
                references_table: fkMatch[2],
            });
        }
        entities.push({ name: entityName, foreign_keys });
    }
    return entities;
}
/**
 * Extract screens from analysis
 */
function extractScreensFromAnalysis(analysis) {
    const screens = [];
    const screenRegex = /## Screen: ([\w-]+)/g;
    let match;
    while ((match = screenRegex.exec(analysis)) !== null) {
        const screenName = match[1];
        screens.push({
            name: screenName,
            data_fields: extractDataFieldsForScreen(analysis, screenName),
            form_inputs: extractFormInputsForScreen(analysis, screenName),
            filters: extractFiltersForScreen(analysis, screenName),
        });
    }
    return screens;
}
function extractDataFieldsForScreen(analysis, screenName) {
    const fields = [];
    // Find the screen section
    const screenSection = extractScreenSection(analysis, screenName);
    if (!screenSection)
        return fields;
    // Extract from data fields table
    const fieldTableRegex = /\| ([\w_]+) \| \w+ \| ([\w_]+) \|/g;
    let match;
    while ((match = fieldTableRegex.exec(screenSection)) !== null) {
        fields.push({
            field_name: match[1],
            source_entity: match[2],
        });
    }
    return fields;
}
function extractFormInputsForScreen(analysis, screenName) {
    const inputs = [];
    const screenSection = extractScreenSection(analysis, screenName);
    if (!screenSection)
        return inputs;
    const inputTableRegex = /\| ([\w_]+) \| \w+ \| ([\w_]+) \|/g;
    let match;
    while ((match = inputTableRegex.exec(screenSection)) !== null) {
        inputs.push({
            input_name: match[1],
            target_entity: match[2],
        });
    }
    return inputs;
}
function extractFiltersForScreen(analysis, screenName) {
    const filters = [];
    const screenSection = extractScreenSection(analysis, screenName);
    if (!screenSection)
        return filters;
    const filterTableRegex = /\| ([\w_]+) \| (search|sort|filter) \|/g;
    let match;
    while ((match = filterTableRegex.exec(screenSection)) !== null) {
        filters.push({
            filter_name: match[1],
            filter_type: match[2],
        });
    }
    return filters;
}
function extractScreenSection(analysis, screenName) {
    const regex = new RegExp(`## Screen: ${screenName}[\\s\\S]*?(?=## Screen:|$)`, 'i');
    const match = analysis.match(regex);
    return match ? match[0] : null;
}
/**
 * Find cascade effects when an entity is modified
 */
function findCascadeEffects(entity, allEntities, allScreens) {
    const affected_stores = [];
    const affected_components = [];
    // Find entities that reference this entity
    for (const otherEntity of allEntities) {
        for (const fk of otherEntity.foreign_keys) {
            if (fk.references_table === `${entity}s` || fk.references_table === entity) {
                const storeName = `${otherEntity.name}Store`;
                if (!affected_stores.includes(storeName)) {
                    affected_stores.push(storeName);
                }
            }
        }
    }
    // Find screens that display this entity
    for (const screen of allScreens) {
        for (const field of screen.data_fields) {
            if (field.source_entity === entity) {
                if (!affected_components.includes(screen.name)) {
                    affected_components.push(screen.name);
                }
            }
        }
    }
    return { affected_stores, affected_components };
}
/**
 * Generate DEPENDENCY-MAP.md document
 */
function generateDependencyMapDocument(map) {
    let doc = `# Comprehensive Dependency Map\n\n`;
    doc += `**Generated:** ${new Date().toISOString()}\n`;
    doc += `**Phase:** 2C - Comprehensive Dependency Mapping\n`;
    doc += `**Purpose:** Map ALL dependencies BEFORE building to prevent stale UI bugs\n\n`;
    doc += `---\n\n`;
    doc += `## WHY THIS MAP EXISTS\n\n`;
    doc += `The #1 cause of bugs in applications is:\n`;
    doc += `**Mutations that update the database but leave UI stores stale**\n\n`;
    doc += `This map solves that by mapping EVERY dependency BEFORE any code is written.\n\n`;
    doc += `CRITICAL RULE: Before implementing ANY mutation, check this map to see ALL stores that must be updated.\n\n`;
    doc += `---\n\n`;
    // Read Dependencies
    doc += `## Read Dependencies\n\n`;
    doc += `Maps: Component → Stores → Database Queries\n\n`;
    doc += `| Component | Reads From Stores | Queries Entities | Filters Applied |\n`;
    doc += `|-----------|-------------------|------------------|------------------|\n`;
    for (const dep of map.read_dependencies) {
        doc += `| ${dep.component} | ${dep.reads_from_stores.join(', ') || 'None'} | ${dep.queries_entities.join(', ') || 'None'} | ${dep.filters_applied.join(', ') || 'None'} |\n`;
    }
    doc += `\n---\n\n`;
    // Write Dependencies
    doc += `## Write Dependencies\n\n`;
    doc += `Maps: Mutation → Store Updates → Cascade Effects\n\n`;
    doc += `**CRITICAL:** Check this table BEFORE implementing ANY mutation\n\n`;
    for (const dep of map.write_dependencies) {
        doc += `### ${dep.mutation}\n\n`;
        doc += `- **Updates Entity:** ${dep.updates_entity}\n`;
        doc += `- **MUST Update Stores:** ${dep.must_update_stores.join(', ')}\n`;
        if (dep.cascade_updates.length > 0) {
            doc += `- **Cascade Updates:** ${dep.cascade_updates.join(', ')}\n`;
        }
        if (dep.affected_components.length > 0) {
            doc += `- **Affected Components:** ${dep.affected_components.join(', ')}\n`;
        }
        doc += `\n`;
    }
    doc += `---\n\n`;
    // Store Connections
    doc += `## Store Connections\n\n`;
    doc += `Maps: Store → Data Sources → Connected Stores → Update Triggers\n\n`;
    for (const conn of map.store_connections) {
        doc += `### ${conn.store_name}\n\n`;
        doc += `- **Sourced From:** ${conn.sourced_from_entities.join(', ')}\n`;
        doc += `- **Connected To:** ${conn.connected_to_stores.join(', ') || 'None (standalone)'}\n`;
        doc += `- **Must Update On:**\n`;
        for (const trigger of conn.update_triggers) {
            doc += `  - ${trigger}\n`;
        }
        doc += `\n`;
    }
    doc += `---\n\n`;
    // Cascade Effects
    doc += `## Cascade Effects\n\n`;
    doc += `Maps: Trigger → Cascades → Reason\n\n`;
    doc += `| Trigger | Cascades To | Reason |\n`;
    doc += `|---------|-------------|--------|\n`;
    for (const cascade of map.cascade_effects) {
        doc += `| ${cascade.trigger} | ${cascade.cascades_to.join(', ')} | ${cascade.reason} |\n`;
    }
    doc += `\n---\n\n`;
    // Critical Paths
    if (map.critical_paths.length > 0) {
        doc += `## Critical Paths\n\n`;
        doc += `Mutations that affect 3+ stores (requires extra care):\n\n`;
        for (const path of map.critical_paths) {
            doc += `- ⚠️ ${path}\n`;
        }
        doc += `\n---\n\n`;
    }
    doc += `## How To Use This Map\n\n`;
    doc += `**Before implementing ANY mutation:**\n\n`;
    doc += `1. Find the mutation in "Write Dependencies" section\n`;
    doc += `2. Check "MUST Update Stores" list\n`;
    doc += `3. Check "Cascade Updates" list\n`;
    doc += `4. Update ALL listed stores in your mutation handler\n`;
    doc += `5. Verify all "Affected Components" will refresh\n\n`;
    doc += `**Example:**\n`;
    doc += `\`\`\`typescript\n`;
    doc += `async function createPost(data: PostInput) {\n`;
    doc += `  // 1. Database mutation\n`;
    doc += `  const post = await db.posts.create(data);\n\n`;
    doc += `  // 2. Check DEPENDENCY-MAP.md for this mutation\n`;
    doc += `  // - MUST update: postStore\n`;
    doc += `  // - Cascade: userStore (user.post_count)\n\n`;
    doc += `  // 3. Update ALL stores from the map\n`;
    doc += `  postStore.add(post);\n`;
    doc += `  userStore.incrementPostCount(post.user_id);\n\n`;
    doc += `  return post;\n`;
    doc += `}\n`;
    doc += `\`\`\`\n\n`;
    doc += `This ensures: **No stale UI, ever.**\n\n`;
    return doc;
}
/**
 * Generate summary for tool response
 */
function generateDependencyMapSummary(map) {
    let summary = `✓ Mapped ${map.read_dependencies.length} read dependency paths\n`;
    summary += `✓ Mapped ${map.write_dependencies.length} write dependency paths\n`;
    summary += `✓ Mapped ${map.store_connections.length} store connections\n`;
    summary += `✓ Identified ${map.cascade_effects.length} cascade effects\n`;
    if (map.critical_paths.length > 0) {
        summary += `⚠️ Found ${map.critical_paths.length} critical paths (mutations affecting 3+ stores)\n`;
    }
    return summary;
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
//# sourceMappingURL=map-dependencies.js.map