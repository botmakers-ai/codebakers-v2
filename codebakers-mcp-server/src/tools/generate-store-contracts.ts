/**
 * codebakers_generate_store_contracts
 *
 * Phase 2D: Store Contract Generation
 * Generates TypeScript interfaces for all stores
 *
 * Purpose:
 * - Type-safe store definitions before building
 * - Contract for what each store must implement
 * - Maps from schema + dependency map to TypeScript interfaces
 * - Ensures consistency between database and client state
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface StoreContract {
  name: string;
  entity: string;
  state_shape: {[key: string]: string};
  methods: {
    name: string;
    params: {name: string; type: string}[];
    return_type: string;
    updates: string[];
  }[];
  dependencies: string[];
}

export async function generateStoreContracts(args: { schema_file?: string; dependency_map_file?: string }): Promise<string> {
  const cwd = process.cwd();
  const schemaFile = args.schema_file || '.codebakers/SCHEMA.sql';
  const depMapFile = args.dependency_map_file || '.codebakers/DEPENDENCY-MAP.md';
  const schemaPath = path.join(cwd, schemaFile);
  const depMapPath = path.join(cwd, depMapFile);

  console.error('🍞 CodeBakers: Phase 2D — Store Contract Generation');

  try {
    // 1. CHECK IF REQUIRED FILES EXIST
    const schemaExists = await fs.access(schemaPath).then(() => true).catch(() => false);
    const depMapExists = await fs.access(depMapPath).then(() => true).catch(() => false);

    if (!schemaExists) {
      return `🍞 CodeBakers: Phase 2D - Store Contract Generation

❌ BLOCKER: Schema file not found

Expected location: ${schemaPath}

Phase 2D requires Phase 2B schema to generate store contracts.

Next step: Run Phase 2B first (use tool: codebakers_generate_schema)`;
    }

    if (!depMapExists) {
      return `🍞 CodeBakers: Phase 2D - Store Contract Generation

❌ BLOCKER: Dependency map not found

Expected location: ${depMapPath}

Phase 2D requires Phase 2C dependency map to generate store contracts.

Next step: Run Phase 2C first (use tool: codebakers_map_dependencies)`;
    }

    // 2. READ SCHEMA AND DEPENDENCY MAP
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    const depMapContent = await fs.readFile(depMapPath, 'utf-8');

    console.error('Files loaded. Generating store contracts...');

    // 3. GENERATE STORE CONTRACTS
    const contracts = generateContracts(schemaContent, depMapContent);

    console.error(`Generated ${contracts.length} store contracts`);

    // 4. GENERATE STORE-CONTRACTS.md
    const contractsDoc = generateContractsDocument(contracts);
    const contractsPath = path.join(cwd, '.codebakers', 'STORE-CONTRACTS.md');

    await fs.writeFile(contractsPath, contractsDoc, 'utf-8');

    // 5. GENERATE TYPESCRIPT INTERFACES
    const typescriptInterfaces = generateTypeScriptInterfaces(contracts);
    const interfacesPath = path.join(cwd, '.codebakers', 'store-contracts.ts');

    await fs.writeFile(interfacesPath, typescriptInterfaces, 'utf-8');

    console.error(`✓ Store contracts written: ${contractsPath}`);
    console.error(`✓ TypeScript interfaces written: ${interfacesPath}`);

    // 6. GENERATE SUMMARY
    const summary = generateContractsSummary(contracts);

    return `🍞 CodeBakers: Phase 2D - Store Contract Generation Complete

${summary}

📄 Documentation: .codebakers/STORE-CONTRACTS.md
📄 TypeScript interfaces: .codebakers/store-contracts.ts

These contracts define:
✓ State shape for each store
✓ Required methods (create, update, delete, query)
✓ Method signatures with types
✓ Dependencies (which stores this store depends on)

Next steps:
1. Review store contracts to verify completeness
2. Phase 2 is now COMPLETE
3. Ready for Phase 3: Foundation Build
4. When implementing stores, use store-contracts.ts as the interface`;
  } catch (error) {
    console.error('Error during store contract generation:', error);
    return `🍞 CodeBakers: Phase 2D - Store Contract Generation Failed

Error: ${error instanceof Error ? error.message : String(error)}

Please check:
- Schema file and dependency map exist and are readable
- Files contain valid content
- File permissions allow writing

If issue persists, log to ERROR-LOG.md and request human assistance.`;
  }
}

/**
 * Generate store contracts from schema and dependency map
 */
function generateContracts(schema: string, depMap: string): StoreContract[] {
  const contracts: StoreContract[] = [];

  // Extract tables from schema
  const tables = extractTablesFromSchema(schema);

  // Extract write dependencies from dep map
  const writeDeps = extractWriteDependencies(depMap);

  console.error(`Found ${tables.length} tables`);

  for (const table of tables) {
    const entityName = singularize(table.name);
    const storeName = `${entityName}Store`;

    const contract: StoreContract = {
      name: storeName,
      entity: entityName,
      state_shape: {},
      methods: [],
      dependencies: [],
    };

    // 1. STATE SHAPE
    // Map SQL columns to TypeScript types
    for (const column of table.columns) {
      contract.state_shape[column.name] = mapSQLTypeToTypeScript(column.type);
    }

    // 2. STANDARD CRUD METHODS
    // Create
    contract.methods.push({
      name: `create${capitalize(entityName)}`,
      params: [{name: 'data', type: `Omit<${capitalize(entityName)}, 'id' | 'created_at' | 'updated_at'>`}],
      return_type: `Promise<${capitalize(entityName)}>`,
      updates: [storeName],
    });

    // Update
    contract.methods.push({
      name: `update${capitalize(entityName)}`,
      params: [
        {name: 'id', type: 'string'},
        {name: 'data', type: `Partial<${capitalize(entityName)}>`},
      ],
      return_type: `Promise<${capitalize(entityName)}>`,
      updates: [storeName],
    });

    // Delete
    contract.methods.push({
      name: `delete${capitalize(entityName)}`,
      params: [{name: 'id', type: 'string'}],
      return_type: 'Promise<void>',
      updates: [storeName],
    });

    // Get one
    contract.methods.push({
      name: `get${capitalize(entityName)}`,
      params: [{name: 'id', type: 'string'}],
      return_type: `Promise<${capitalize(entityName)} | null>`,
      updates: [],
    });

    // Get many
    contract.methods.push({
      name: `get${capitalize(entityName)}s`,
      params: [{name: 'filters', type: `Partial<${capitalize(entityName)}>`}],
      return_type: `Promise<${capitalize(entityName)}[]>`,
      updates: [],
    });

    // 3. EXTRACT CASCADE UPDATES FROM DEPENDENCY MAP
    const cascades = writeDeps.filter(dep => dep.entity === entityName);
    for (const cascade of cascades) {
      if (cascade.cascade_stores.length > 0) {
        contract.dependencies.push(...cascade.cascade_stores);
      }
    }

    contracts.push(contract);
  }

  return contracts;
}

/**
 * Extract tables from schema
 */
function extractTablesFromSchema(schema: string): Array<{name: string; columns: Array<{name: string; type: string}>}> {
  const tables: Array<{name: string; columns: Array<{name: string; type: string}>}> = [];

  const tableRegex = /CREATE TABLE (\w+) \(([\s\S]*?)\);/g;
  let match;

  while ((match = tableRegex.exec(schema)) !== null) {
    const tableName = match[1];
    const tableBody = match[2];

    const columns: Array<{name: string; type: string}> = [];
    const columnRegex = /(\w+)\s+(\w+)/g;
    let colMatch;

    while ((colMatch = columnRegex.exec(tableBody)) !== null) {
      const columnName = colMatch[1];
      const columnType = colMatch[2];

      // Skip constraint keywords
      if (['PRIMARY', 'FOREIGN', 'UNIQUE', 'NOT', 'DEFAULT', 'REFERENCES', 'KEY', 'CHECK'].includes(columnName.toUpperCase())) {
        continue;
      }

      columns.push({
        name: columnName,
        type: columnType,
      });
    }

    tables.push({name: tableName, columns});
  }

  return tables;
}

/**
 * Extract write dependencies from dependency map
 */
function extractWriteDependencies(depMap: string): Array<{entity: string; cascade_stores: string[]}> {
  const deps: Array<{entity: string; cascade_stores: string[]}> = [];

  // Extract from "Write Dependencies" section
  const writeDepsRegex = /### (create|update|delete)(\w+)\n[\s\S]*?- \*\*Cascade Updates:\*\* ([\w\s,]+)/g;
  let match;

  while ((match = writeDepsRegex.exec(depMap)) !== null) {
    const entity = match[2];
    const cascades = match[3].split(',').map(s => s.trim()).filter(s => s.endsWith('Store'));

    deps.push({
      entity: entity.toLowerCase(),
      cascade_stores: cascades,
    });
  }

  return deps;
}

/**
 * Generate STORE-CONTRACTS.md document
 */
function generateContractsDocument(contracts: StoreContract[]): string {
  let doc = `# Store Contracts\n\n`;
  doc += `**Generated:** ${new Date().toISOString()}\n`;
  doc += `**Phase:** 2D - Store Contract Generation\n`;
  doc += `**Purpose:** Define type-safe contracts for all stores before implementation\n\n`;
  doc += `---\n\n`;

  doc += `## Purpose\n\n`;
  doc += `This document defines the contract for EVERY store in the application.\n\n`;
  doc += `Before implementing a store, check this contract to ensure:\n`;
  doc += `- State shape matches expectations\n`;
  doc += `- All required methods are implemented\n`;
  doc += `- All cascade updates are handled\n\n`;
  doc += `---\n\n`;

  for (const contract of contracts) {
    doc += `## ${contract.name}\n\n`;
    doc += `**Entity:** ${contract.entity}\n\n`;

    // State shape
    doc += `### State Shape\n\n`;
    doc += `\`\`\`typescript\n`;
    doc += `interface ${capitalize(contract.entity)} {\n`;
    for (const [field, type] of Object.entries(contract.state_shape)) {
      doc += `  ${field}: ${type};\n`;
    }
    doc += `}\n`;
    doc += `\`\`\`\n\n`;

    // Methods
    doc += `### Required Methods\n\n`;
    for (const method of contract.methods) {
      doc += `#### ${method.name}\n\n`;
      doc += `\`\`\`typescript\n`;
      const params = method.params.map(p => `${p.name}: ${p.type}`).join(', ');
      doc += `${method.name}(${params}): ${method.return_type}\n`;
      doc += `\`\`\`\n\n`;
      if (method.updates.length > 0) {
        doc += `**Updates:** ${method.updates.join(', ')}\n\n`;
      }
    }

    // Dependencies
    if (contract.dependencies.length > 0) {
      doc += `### Dependencies\n\n`;
      doc += `This store depends on:\n`;
      for (const dep of contract.dependencies) {
        doc += `- ${dep}\n`;
      }
      doc += `\n`;
    }

    doc += `---\n\n`;
  }

  return doc;
}

/**
 * Generate TypeScript interfaces
 */
function generateTypeScriptInterfaces(contracts: StoreContract[]): string {
  let ts = `/**\n`;
  ts += ` * Store Contracts\n`;
  ts += ` * Generated: ${new Date().toISOString()}\n`;
  ts += ` * \n`;
  ts += ` * DO NOT EDIT MANUALLY\n`;
  ts += ` * This file is auto-generated from schema and dependency map\n`;
  ts += ` */\n\n`;

  // Generate entity interfaces
  for (const contract of contracts) {
    ts += `export interface ${capitalize(contract.entity)} {\n`;
    for (const [field, type] of Object.entries(contract.state_shape)) {
      ts += `  ${field}: ${type};\n`;
    }
    ts += `}\n\n`;
  }

  // Generate store interfaces
  for (const contract of contracts) {
    ts += `export interface ${contract.name} {\n`;
    for (const method of contract.methods) {
      const params = method.params.map(p => `${p.name}: ${p.type}`).join(', ');
      ts += `  ${method.name}(${params}): ${method.return_type};\n`;
    }
    ts += `}\n\n`;
  }

  return ts;
}

/**
 * Generate summary
 */
function generateContractsSummary(contracts: StoreContract[]): string {
  const totalMethods = contracts.reduce((sum, c) => sum + c.methods.length, 0);
  const totalDeps = contracts.reduce((sum, c) => sum + c.dependencies.length, 0);

  let summary = `✓ Generated ${contracts.length} store contracts\n`;
  summary += `✓ Defined ${totalMethods} methods across all stores\n`;
  summary += `✓ Mapped ${totalDeps} store dependencies\n`;
  summary += `✓ All contracts type-safe with TypeScript interfaces\n`;

  return summary;
}

// HELPER FUNCTIONS

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses')) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapSQLTypeToTypeScript(sqlType: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'varchar': 'string',
    'char': 'string',
    'integer': 'number',
    'int': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'numeric': 'number',
    'decimal': 'number',
    'real': 'number',
    'double': 'number',
    'boolean': 'boolean',
    'bool': 'boolean',
    'timestamp': 'string',
    'timestamptz': 'string',
    'date': 'string',
    'time': 'string',
    'json': 'any',
    'jsonb': 'any',
  };

  const lowerType = sqlType.toLowerCase();
  return typeMap[lowerType] || 'any';
}
