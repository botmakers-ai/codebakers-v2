/**
 * codebakers_scan_security
 *
 * Security Vulnerability Scanner
 *
 * Scans for:
 * - Dependency vulnerabilities (npm audit)
 * - XSS vulnerabilities
 * - SQL injection risks
 * - Exposed secrets
 * - Insecure authentication patterns
 * - Missing security headers
 */
interface SecurityArgs {
    block_on_critical?: boolean;
}
export declare function scanSecurity(args?: SecurityArgs): Promise<string>;
export {};
//# sourceMappingURL=scan-security.d.ts.map