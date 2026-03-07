/**
 * codebakers_generate_spec
 *
 * Phase 0: Generate PROJECT-SPEC.md with Gates 0-5
 */
export async function generateSpec(args) {
    const { description } = args;
    if (!description) {
        return `🍞 CodeBakers: Phase 0 - Spec Generation

Please provide a description of what you want to build.

Example: "Email client for Microsoft 365 with inbox, compose, and search"

Then I'll research and generate a complete PROJECT-SPEC.md with Gates 0-5.`;
    }
    // TODO: Implement full spec generation
    // For now, return a template
    return `🍞 CodeBakers: Generating PROJECT-SPEC.md...

Description: ${description}

[Phase 0 implementation needed]
This will:
1. Research competitive products
2. Identify core features
3. Generate Gates 0-5 specification
4. Save to .codebakers/PROJECT-SPEC.md

Full implementation coming in next iteration.`;
}
//# sourceMappingURL=generate-spec.js.map