/**
 * codebakers_generate_docs
 *
 * Documentation Generator - Beautiful HTML Docs
 *
 * Generates complete documentation:
 * - Quick start guide
 * - API reference
 * - Component documentation
 * - Architecture overview
 * - Setup instructions
 * - Beautiful HTML output with navigation
 */
interface DocsArgs {
    include_api?: boolean;
    include_components?: boolean;
    output_dir?: string;
}
export declare function generateDocs(args?: DocsArgs): Promise<string>;
export {};
//# sourceMappingURL=generate-docs.d.ts.map