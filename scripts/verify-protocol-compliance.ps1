# CodeBakers Protocol Compliance Verification (PowerShell)
# Run this to check if CodeBakers protocol is being followed correctly

Write-Host "🍞 CodeBakers: Protocol Compliance Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$Violations = 0
$Warnings = 0

# Check 1: Git repository exists
Write-Host "✓ Checking git repository... " -NoNewline
try {
    git rev-parse --git-dir 2>$null | Out-Null
    Write-Host "PASS" -ForegroundColor Green
} catch {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "  └─ Git repository required (see: CLAUDE.md session start)"
    $Violations++
}

# Check 2: .codebakers/ directory exists
Write-Host "✓ Checking .codebakers/ memory system... " -NoNewline
if (Test-Path ".codebakers") {
    Write-Host "PASS" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "  └─ .codebakers/ directory missing (protocol not initialized)"
    $Violations++
}

# Check 3: BRAIN.md exists and is recent
Write-Host "✓ Checking BRAIN.md... " -NoNewline
if (Test-Path ".codebakers/BRAIN.md") {
    $brainAge = (Get-Date) - (Get-Item ".codebakers/BRAIN.md").LastWriteTime
    if ($brainAge.Days -le 7) {
        Write-Host "PASS" -ForegroundColor Green
    } else {
        Write-Host "WARNING" -ForegroundColor Yellow
        Write-Host "  └─ BRAIN.md not updated in 7+ days (may be stale)"
        $Warnings++
    }
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "  └─ BRAIN.md missing (project context not tracked)"
    $Violations++
}

# Check 4: DEPENDENCY-MAP.md exists and is recent
Write-Host "✓ Checking DEPENDENCY-MAP.md... " -NoNewline
if (Test-Path ".codebakers/DEPENDENCY-MAP.md") {
    $depMapAge = (Get-Date) - (Get-Item ".codebakers/DEPENDENCY-MAP.md").LastWriteTime
    if ($depMapAge.Days -le 3) {
        Write-Host "PASS" -ForegroundColor Green
    } else {
        Write-Host "WARNING" -ForegroundColor Yellow
        Write-Host "  └─ DEPENDENCY-MAP.md not updated in 3+ days (may be stale)"
        Write-Host "  └─ Run: pnpm dep:map"
        $Warnings++
    }
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "  └─ DEPENDENCY-MAP.md missing (dependencies not tracked)"
    $Violations++
}

# Check 5: BUILD-LOG.md exists
Write-Host "✓ Checking BUILD-LOG.md... " -NoNewline
if (Test-Path ".codebakers/BUILD-LOG.md") {
    Write-Host "PASS" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "  └─ BUILD-LOG.md missing (actions not logged)"
    $Violations++
}

# Check 6: ERROR-LOG.md exists (or empty project)
Write-Host "✓ Checking ERROR-LOG.md... " -NoNewline
if (Test-Path ".codebakers/ERROR-LOG.md") {
    Write-Host "PASS" -ForegroundColor Green
} elseif (!(Test-Path "src") -and !(Test-Path "app")) {
    Write-Host "PASS (new project)" -ForegroundColor Green
} else {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "  └─ ERROR-LOG.md missing (no error learning tracked)"
    $Warnings++
}

# Check 7: FIX-QUEUE.md exists
Write-Host "✓ Checking FIX-QUEUE.md... " -NoNewline
if (Test-Path ".codebakers/FIX-QUEUE.md") {
    Write-Host "PASS" -ForegroundColor Green
} else {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "  └─ FIX-QUEUE.md missing (no task queue)"
    $Warnings++
}

# Check 8: TypeScript compiles (if TypeScript project)
if (Test-Path "tsconfig.json") {
    Write-Host "✓ Checking TypeScript compilation... " -NoNewline
    $tscResult = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PASS" -ForegroundColor Green
    } else {
        Write-Host "FAIL" -ForegroundColor Red
        Write-Host "  └─ TypeScript errors present (code should not be committed with errors)"
        $Violations++
    }
}

# Check 9: Recent commits follow atomic pattern
Write-Host "✓ Checking recent commits follow atomic pattern... " -NoNewline
$recentAtomic = (git log --oneline --grep="feat(atomic):" -5 2>$null | Measure-Object -Line).Lines
$totalRecent = (git log --oneline -5 2>$null | Measure-Object -Line).Lines

if ($totalRecent -eq 0) {
    Write-Host "PASS (no commits yet)" -ForegroundColor Green
} elseif ($recentAtomic -gt 0) {
    Write-Host "PASS" -ForegroundColor Green
} else {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "  └─ No 'feat(atomic):' commits in last 5 (atomic units not being committed)"
    $Warnings++
}

# Check 10: .codebakers/ committed to git
Write-Host "✓ Checking .codebakers/ in git history... " -NoNewline
$codebakersInGit = git ls-files .codebakers/ 2>$null
if ($codebakersInGit) {
    Write-Host "PASS" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "  └─ .codebakers/ not committed (memory not persisted)"
    $Violations++
}

# Summary
Write-Host ""
Write-Host "========================================"
if ($Violations -eq 0 -and $Warnings -eq 0) {
    Write-Host "✓ Protocol Compliance: EXCELLENT" -ForegroundColor Green
    Write-Host "All checks passed. CodeBakers protocol is being followed correctly."
    exit 0
} elseif ($Violations -eq 0) {
    Write-Host "⚠ Protocol Compliance: GOOD (with warnings)" -ForegroundColor Yellow
    Write-Host "Warnings: $Warnings"
    Write-Host "No critical violations, but some improvements recommended."
    exit 0
} else {
    Write-Host "✗ Protocol Compliance: VIOLATIONS DETECTED" -ForegroundColor Red
    Write-Host "Violations: $Violations"
    Write-Host "Warnings: $Warnings"
    Write-Host ""
    Write-Host "CRITICAL: CodeBakers protocol is NOT being followed." -ForegroundColor Red
    Write-Host "This project may have bugs due to missing dependency tracking,"
    Write-Host "no error learning, or incomplete memory system."
    Write-Host ""
    Write-Host "To fix: Run @rebuild or start following protocol from now on."
    exit 1
}
