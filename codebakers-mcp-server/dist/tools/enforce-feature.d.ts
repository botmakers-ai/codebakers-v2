/**
 * codebakers_enforce_feature
 *
 * Feature Build Enforcement
 *
 * Enforces FULL atomic unit protocol (no shortcuts allowed).
 * Use when: @feature [description] or // [description]
 *
 * MANDATORY steps (cannot be skipped):
 * 1. Context loading (BRAIN.md, DEPENDENCY-MAP.md, ERROR-LOG.md)
 * 2. Error Sniffer scan (all patterns checked)
 * 3. Atomic unit declaration (in FIX-QUEUE.md BEFORE code)
 * 4. UNIT-PROGRESS.md creation (crash recovery)
 * 5. All 8 steps (schema → API → store → UI → states → tests → gate)
 * 6. BUILD-LOG.md update after every step
 * 7. Gate check (all items must pass)
 * 8. Atomic commit format: feat(atomic): [name] — gate passed [N/N checks]
 *
 * Result: Feature guaranteed complete, tested, and atomic.
 */
export declare function enforceFeature(args: {
    feature_name?: string;
    description?: string;
}): Promise<string>;
//# sourceMappingURL=enforce-feature.d.ts.map