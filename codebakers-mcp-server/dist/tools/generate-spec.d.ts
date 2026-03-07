/**
 * codebakers_generate_spec
 *
 * Phase 0: Generate PROJECT-SPEC.md with Gates 0-5
 *
 * Gates:
 * - Gate 0: Identity (Product name, mission, target user, value proposition)
 * - Gate 1: Entities (All data objects the system must track)
 * - Gate 2: State Changes (Every action that mutates data)
 * - Gate 3: Permissions (Who can do what, role matrix)
 * - Gate 4: Dependencies (External services, APIs, automation flows)
 * - Gate 5: Integrations (Third-party connections, webhooks, data sync)
 */
export declare function generateSpec(args: {
    description?: string;
    project_name?: string;
}): Promise<string>;
//# sourceMappingURL=generate-spec.d.ts.map