/**
 * codebakers_generate_schema
 *
 * Phase 2B: Schema Generation
 * Generates complete database schema from mockup analysis
 *
 * Based on CodeBakers Method Phase 2B requirements:
 * - All tables with full column definitions (name, type, nullable, default, constraints)
 * - All foreign key relationships and join tables
 * - All indexes required for the query patterns revealed by mockups
 * - All enum types and value sets
 * - Row-level security policies where applicable
 * - Seed data requirements for development
 */
import * as fs from 'fs/promises';
import * as path from 'path';
export async function generateSchema(args) {
    const cwd = process.cwd();
    const analysisFile = args.analysis_file || '.codebakers/MOCK-ANALYSIS.md';
    const analysisPath = path.join(cwd, analysisFile);
    console.error('🍞 CodeBakers: Phase 2B — Schema Generation');
    console.error(`Reading analysis from: ${analysisPath}`);
    try {
        // 1. CHECK IF ANALYSIS FILE EXISTS
        const exists = await fs.access(analysisPath).then(() => true).catch(() => false);
        if (!exists) {
            return `🍞 CodeBakers: Phase 2B - Schema Generation

❌ BLOCKER: Mock analysis file not found

Expected location: ${analysisPath}

Phase 2B cannot proceed without Phase 2A analysis.

Next step: Run Phase 2A first (use tool: codebakers_analyze_mockups_deep)`;
        }
        // 2. READ MOCK-ANALYSIS.md
        const analysisContent = await fs.readFile(analysisPath, 'utf-8');
        // 3. PARSE ANALYSIS FILE TO EXTRACT SCHEMA REQUIREMENTS
        const { tables, enums } = parseAnalysisForSchema(analysisContent);
        if (tables.length === 0) {
            return `🍞 CodeBakers: Phase 2B - Schema Generation

⚠️ WARNING: No entities found in analysis file

The mock analysis appears incomplete or empty.

Please verify Phase 2A analysis contains data fields and entities.`;
        }
        console.error(`Extracted ${tables.length} tables and ${enums.length} enum types`);
        // 4. GENERATE SQL SCHEMA
        const schema = generateSQLSchema(tables, enums);
        // 5. WRITE SCHEMA.sql
        const schemaPath = path.join(cwd, '.codebakers', 'SCHEMA.sql');
        await fs.writeFile(schemaPath, schema, 'utf-8');
        console.error(`✓ Schema generated: ${schemaPath}`);
        // 6. GENERATE SUMMARY
        const summary = generateSchemaSummary(tables, enums);
        return `🍞 CodeBakers: Phase 2B - Schema Generation Complete

${summary}

📄 Schema written to: .codebakers/SCHEMA.sql

Next steps:
1. Review SCHEMA.sql to verify all tables and relationships
2. Proceed to Phase 2C: Dependency Mapping (use tool: codebakers_map_dependencies)
3. Run verification gate before Phase 3

Verification gate requirement:
→ Every data field in mockups has corresponding database column
→ All entity relationships captured in foreign keys
→ No unresolved dependencies`;
    }
    catch (error) {
        console.error('Error during schema generation:', error);
        return `🍞 CodeBakers: Phase 2B - Schema Generation Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please check:
- Mock analysis file exists and is readable
- Analysis file contains entity and field data
- File permissions allow writing

If issue persists, log to ERROR-LOG.md and request human assistance.`;
    }
}
/**
 * Parse MOCK-ANALYSIS.md to extract schema requirements
 */
function parseAnalysisForSchema(analysisContent) {
    const tables = [];
    const enums = [];
    const entityFields = new Map();
    const entityTypes = new Map();
    const stateValues = new Map();
    const relationships = [];
    // PARSE DATA FIELDS FROM ANALYSIS
    // Look for markdown tables with field information
    const fieldTableRegex = /\| Field Name \| Data Type \| Source Entity[^\n]*\n\|[-\s|]+\n((?:\|[^\n]+\n)+)/g;
    let match;
    while ((match = fieldTableRegex.exec(analysisContent)) !== null) {
        const tableContent = match[1];
        const rows = tableContent.trim().split('\n');
        for (const row of rows) {
            const cols = row.split('|').map(c => c.trim()).filter(c => c);
            if (cols.length >= 3) {
                const fieldName = cols[0];
                const dataType = cols[1];
                const sourceEntity = cols[2];
                if (!entityFields.has(sourceEntity)) {
                    entityFields.set(sourceEntity, new Set());
                    entityTypes.set(sourceEntity, new Map());
                }
                entityFields.get(sourceEntity).add(fieldName);
                entityTypes.get(sourceEntity).set(fieldName, dataType);
            }
        }
    }
    // PARSE FORM INPUTS
    const inputTableRegex = /\| Input Name \| Type \| Target Entity[^\n]*\n\|[-\s|]+\n((?:\|[^\n]+\n)+)/g;
    while ((match = inputTableRegex.exec(analysisContent)) !== null) {
        const tableContent = match[1];
        const rows = tableContent.trim().split('\n');
        for (const row of rows) {
            const cols = row.split('|').map(c => c.trim()).filter(c => c);
            if (cols.length >= 3) {
                const inputName = cols[0];
                const inputType = cols[1];
                const targetEntity = cols[2];
                if (!entityFields.has(targetEntity)) {
                    entityFields.set(targetEntity, new Set());
                    entityTypes.set(targetEntity, new Map());
                }
                entityFields.get(targetEntity).add(inputName);
                entityTypes.get(targetEntity).set(inputName, mapInputTypeToSQLType(inputType));
            }
        }
    }
    // PARSE RELATIONSHIPS
    const relTableRegex = /\| From Entity \| To Entity \| Type[^\n]*\n\|[-\s|]+\n((?:\|[^\n]+\n)+)/g;
    while ((match = relTableRegex.exec(analysisContent)) !== null) {
        const tableContent = match[1];
        const rows = tableContent.trim().split('\n');
        for (const row of rows) {
            const cols = row.split('|').map(c => c.trim()).filter(c => c);
            if (cols.length >= 3) {
                relationships.push({
                    from: cols[0],
                    to: cols[1],
                    type: cols[2],
                });
            }
        }
    }
    // PARSE STATE VALUES (for enums)
    const stateTableRegex = /\| Entity \| State Field \| Possible Values[^\n]*\n\|[-\s|]+\n((?:\|[^\n]+\n)+)/g;
    while ((match = stateTableRegex.exec(analysisContent)) !== null) {
        const tableContent = match[1];
        const rows = tableContent.trim().split('\n');
        for (const row of rows) {
            const cols = row.split('|').map(c => c.trim()).filter(c => c);
            if (cols.length >= 3) {
                const entity = cols[0];
                const stateField = cols[1];
                const values = cols[2].split(',').map(v => v.trim());
                const enumName = `${entity}_${stateField}`;
                stateValues.set(enumName, values);
            }
        }
    }
    // GENERATE TABLES FROM ENTITIES
    for (const [entityName, fields] of entityFields.entries()) {
        if (entityName === 'unknown')
            continue;
        const table = {
            name: pluralize(entityName),
            columns: [],
            indexes: [],
            relationships: [],
            row_level_security: true,
        };
        // Add standard columns
        table.columns.push({
            name: 'id',
            type: 'uuid',
            nullable: false,
            default_value: 'gen_random_uuid()',
            is_primary_key: true,
            is_foreign_key: false,
            unique: true,
        });
        // Add extracted fields
        const types = entityTypes.get(entityName);
        for (const field of Array.from(fields).sort()) {
            if (field === 'id')
                continue; // Already added
            const dataType = types.get(field) || 'text';
            table.columns.push({
                name: field,
                type: mapToPostgreSQLType(dataType),
                nullable: !isRequiredField(field),
                is_primary_key: false,
                is_foreign_key: field.endsWith('_id'),
                unique: field.includes('email') || field.includes('username'),
            });
        }
        // Add foreign key relationships
        for (const rel of relationships) {
            if (rel.from === entityName) {
                const fkColumn = `${rel.to}_id`;
                if (!fields.has(fkColumn)) {
                    table.columns.push({
                        name: fkColumn,
                        type: 'uuid',
                        nullable: true,
                        is_primary_key: false,
                        is_foreign_key: true,
                        references: { table: pluralize(rel.to), column: 'id' },
                        unique: false,
                    });
                }
                table.relationships.push(`${rel.type} relationship to ${pluralize(rel.to)}`);
            }
        }
        // Add user_id for multi-tenant RLS
        if (!fields.has('user_id')) {
            table.columns.push({
                name: 'user_id',
                type: 'uuid',
                nullable: false,
                is_primary_key: false,
                is_foreign_key: true,
                references: { table: 'users', column: 'id' },
                unique: false,
            });
        }
        // Add timestamps
        table.columns.push({
            name: 'created_at',
            type: 'timestamptz',
            nullable: false,
            default_value: 'now()',
            is_primary_key: false,
            is_foreign_key: false,
            unique: false,
        });
        table.columns.push({
            name: 'updated_at',
            type: 'timestamptz',
            nullable: false,
            default_value: 'now()',
            is_primary_key: false,
            is_foreign_key: false,
            unique: false,
        });
        // Add indexes
        table.indexes.push(`CREATE INDEX idx_${table.name}_user_id ON ${table.name}(user_id);`);
        table.indexes.push(`CREATE INDEX idx_${table.name}_created_at ON ${table.name}(created_at);`);
        // Add index for foreign keys
        for (const col of table.columns) {
            if (col.is_foreign_key && col.name !== 'user_id') {
                table.indexes.push(`CREATE INDEX idx_${table.name}_${col.name} ON ${table.name}(${col.name});`);
            }
        }
        tables.push(table);
    }
    // GENERATE ENUMS
    for (const [enumName, values] of stateValues.entries()) {
        enums.push({ name: enumName, values });
    }
    return { tables, enums };
}
/**
 * Generate complete SQL schema
 */
function generateSQLSchema(tables, enums) {
    let sql = `-- CodeBakers Generated Schema\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- Phase: 2B - Schema Generation\n`;
    sql += `-- Stack: Supabase + PostgreSQL\n\n`;
    sql += `-- This schema is derived from UI mockup analysis\n`;
    sql += `-- Every table and column maps to actual UI requirements\n\n`;
    // Enable UUID extension
    sql += `-- Enable UUID extension\n`;
    sql += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n`;
    // Generate enums
    if (enums.length > 0) {
        sql += `-- ENUM TYPES\n\n`;
        for (const enumType of enums) {
            sql += `CREATE TYPE ${enumType.name} AS ENUM (\n`;
            sql += enumType.values.map(v => `  '${v}'`).join(',\n');
            sql += `\n);\n\n`;
        }
    }
    // Generate tables
    sql += `-- TABLES\n\n`;
    for (const table of tables) {
        sql += `CREATE TABLE ${table.name} (\n`;
        // Columns
        const columnDefs = [];
        for (const col of table.columns) {
            let def = `  ${col.name} ${col.type}`;
            if (!col.nullable)
                def += ' NOT NULL';
            if (col.default_value)
                def += ` DEFAULT ${col.default_value}`;
            if (col.unique && !col.is_primary_key)
                def += ' UNIQUE';
            columnDefs.push(def);
        }
        // Primary key
        const pkCols = table.columns.filter(c => c.is_primary_key).map(c => c.name);
        if (pkCols.length > 0) {
            columnDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
        }
        // Foreign keys
        for (const col of table.columns) {
            if (col.is_foreign_key && col.references) {
                columnDefs.push(`  FOREIGN KEY (${col.name}) REFERENCES ${col.references.table}(${col.references.column}) ON DELETE CASCADE`);
            }
        }
        sql += columnDefs.join(',\n');
        sql += `\n);\n\n`;
        // Indexes
        if (table.indexes.length > 0) {
            sql += `-- Indexes for ${table.name}\n`;
            for (const idx of table.indexes) {
                sql += `${idx}\n`;
            }
            sql += `\n`;
        }
        // Row-level security
        if (table.row_level_security) {
            sql += `-- Row-level security for ${table.name}\n`;
            sql += `ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;\n\n`;
            sql += `CREATE POLICY "Users can view their own ${table.name}"\n`;
            sql += `  ON ${table.name}\n`;
            sql += `  FOR SELECT\n`;
            sql += `  USING (auth.uid() = user_id);\n\n`;
            sql += `CREATE POLICY "Users can insert their own ${table.name}"\n`;
            sql += `  ON ${table.name}\n`;
            sql += `  FOR INSERT\n`;
            sql += `  WITH CHECK (auth.uid() = user_id);\n\n`;
            sql += `CREATE POLICY "Users can update their own ${table.name}"\n`;
            sql += `  ON ${table.name}\n`;
            sql += `  FOR UPDATE\n`;
            sql += `  USING (auth.uid() = user_id);\n\n`;
            sql += `CREATE POLICY "Users can delete their own ${table.name}"\n`;
            sql += `  ON ${table.name}\n`;
            sql += `  FOR DELETE\n`;
            sql += `  USING (auth.uid() = user_id);\n\n`;
        }
        sql += `---\n\n`;
    }
    // Seed data section
    sql += `-- SEED DATA\n`;
    sql += `-- Add development seed data below\n\n`;
    return sql;
}
/**
 * Generate summary for tool response
 */
function generateSchemaSummary(tables, enums) {
    const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
    const totalIndexes = tables.reduce((sum, t) => sum + t.indexes.length, 0);
    const totalRelationships = tables.reduce((sum, t) => sum + t.relationships.length, 0);
    let summary = `✓ Generated ${tables.length} tables\n`;
    summary += `✓ Generated ${totalColumns} columns\n`;
    summary += `✓ Generated ${enums.length} enum types\n`;
    summary += `✓ Generated ${totalIndexes} indexes\n`;
    summary += `✓ Generated ${totalRelationships} relationships\n`;
    summary += `✓ Row-level security enabled on all tables\n`;
    return summary;
}
// HELPER FUNCTIONS
function pluralize(word) {
    // Simple pluralization rules
    if (word.endsWith('y'))
        return word.slice(0, -1) + 'ies';
    if (word.endsWith('s'))
        return word + 'es';
    return word + 's';
}
function mapToPostgreSQLType(dataType) {
    const typeMap = {
        'text': 'text',
        'email': 'text',
        'phone': 'text',
        'url': 'text',
        'uuid': 'uuid',
        'number': 'integer',
        'decimal': 'numeric',
        'boolean': 'boolean',
        'timestamp': 'timestamptz',
        'date': 'date',
        'json': 'jsonb',
    };
    return typeMap[dataType.toLowerCase()] || 'text';
}
function mapInputTypeToSQLType(inputType) {
    const typeMap = {
        'text': 'text',
        'email': 'email',
        'password': 'text',
        'number': 'number',
        'tel': 'phone',
        'url': 'url',
        'date': 'date',
        'datetime-local': 'timestamp',
        'checkbox': 'boolean',
        'textarea': 'text',
        'select': 'text',
    };
    return typeMap[inputType.toLowerCase()] || 'text';
}
function isRequiredField(fieldName) {
    const requiredFields = ['id', 'user_id', 'created_at', 'updated_at', 'name', 'title'];
    return requiredFields.includes(fieldName);
}
//# sourceMappingURL=generate-schema.js.map