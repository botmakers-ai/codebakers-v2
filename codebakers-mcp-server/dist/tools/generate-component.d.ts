/**
 * codebakers_generate_component
 *
 * React Component Generator
 *
 * Generates components with all required states:
 * - Loading, Error, Empty, Success
 * - Mobile responsive
 * - Accessibility
 */
interface ComponentArgs {
    name: string;
    entity: string;
    type: 'list' | 'detail' | 'form';
}
export declare function generateComponent(args: ComponentArgs): Promise<string>;
export {};
//# sourceMappingURL=generate-component.d.ts.map