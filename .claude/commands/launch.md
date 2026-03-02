# Launch - Run Pre-Launch Checklist

Run the pre-launch checklist to verify app is ready for production.

Check:
□ All env vars documented in .env.example
□ Error boundaries at route level
□ 404 and 500 pages exist
□ Mobile tested and works correctly
□ Auth flows tested (login, logout, password reset)
□ Rate limiting on all public routes
□ No console.log in production code
□ Lighthouse score > 90
□ All tests passing (pnpm test:e2e)
□ DEPENDENCY-MAP.md current (pnpm dep:map)
□ tsc --noEmit clean
□ All FLOWS.md flows verified by real user

Load agents/meta/pre-launch-checklist.md if it exists, otherwise run inline checks above.

Report:
- ✓ Passed items
- ✗ Failed items → add to FIX-QUEUE.md as P0
- Total score: [N/12] checks passed

If all pass: "🍞 CodeBakers: Pre-launch complete. App is production-ready."
