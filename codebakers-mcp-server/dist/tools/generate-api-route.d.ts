/**
 * codebakers_generate_api_route
 *
 * API Route Generator
 *
 * Generates Next.js API routes with:
 * - Supabase integration
 * - Security filters (user_id)
 * - Error handling
 * - TypeScript types
 */
interface RouteArgs {
    entity: string;
    operation: 'list' | 'get' | 'create' | 'update' | 'delete';
}
export declare function generateApiRoute(args: RouteArgs): Promise<string>;
export {};
//# sourceMappingURL=generate-api-route.d.ts.map