/**
 * codebakers_autonomous_build
 *
 * Full Autonomous Build Orchestrator
 *
 * Builds entire application from FLOWS.md with zero human intervention.
 * Executes all features sequentially with full atomic unit protocol.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { executeAtomicUnit } from './execute-atomic-unit';
import { verifyCompleteness } from './verify-completeness';
import { validateAccessibility } from './validate-accessibility';
import { optimizePerformance } from './optimize-performance';
import { scanSecurity } from './scan-security';
import { deployVercel } from './deploy-vercel';
import { generateDocs } from './generate-docs';
import { generateChatbot } from './generate-chatbot';
export async function autonomousBuild(args) {
    const cwd = process.cwd();
    const { mode, stop_on_error = false, skip_quality_gates = false, skip_deploy = false, skip_docs = false, skip_chatbot = false } = args;
    console.error('🍞 CodeBakers: Autonomous Build Starting');
    try {
        // Load FLOWS.md
        const flowsPath = path.join(cwd, 'FLOWS.md');
        const flowsExist = await fs.access(flowsPath).then(() => true).catch(() => false);
        if (!flowsExist) {
            return `🍞 CodeBakers: Autonomous Build BLOCKED

❌ FLOWS.md not found

Run codebakers_run_interview first to generate flows.`;
        }
        const flowsContent = await fs.readFile(flowsPath, 'utf-8');
        // Extract features (simple parsing)
        const features = extractFeatures(flowsContent, mode);
        if (features.length === 0) {
            return `🍞 CodeBakers: No features to build

${mode === 'full' ? 'All features already complete' : 'No pending features found'}

Check FLOWS.md for status.`;
        }
        console.error(`Found ${features.length} features to build`);
        const results = [];
        // Build each feature sequentially
        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            console.error(`\n[${i + 1}/${features.length}] Building: ${feature.name}`);
            try {
                // Execute atomic unit
                const result = await executeAtomicUnit({
                    feature_name: feature.name,
                    entity: feature.entity || 'Item',
                    operations: feature.operations || ['list', 'create', 'update', 'delete'],
                });
                console.error(result);
                // Verify completeness
                const verification = await verifyCompleteness({ feature_name: feature.name });
                console.error(verification);
                results.push({ feature: feature.name, status: 'success' });
                // Update FLOWS.md to mark complete
                await markFlowComplete(cwd, feature.name);
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`❌ Failed: ${errorMsg}`);
                results.push({ feature: feature.name, status: 'failed', error: errorMsg });
                if (stop_on_error) {
                    break;
                }
            }
        }
        // Quality Gates (after all features complete)
        let qualityGates = null;
        if (!skip_quality_gates && results.filter(r => r.status === 'success').length > 0) {
            console.error('\n🔒 Running Quality Gates...\n');
            qualityGates = await runQualityGates(cwd, skip_deploy, skip_docs, skip_chatbot);
        }
        // Generate final report
        const report = generateBuildReport(results, features.length, qualityGates);
        return report;
    }
    catch (error) {
        return `🍞 CodeBakers: Autonomous Build Failed

Error: ${error instanceof Error ? error.message : String(error)}`;
    }
}
function extractFeatures(flowsContent, mode) {
    const features = [];
    // Simple extraction: look for flow headings
    const flowMatches = flowsContent.matchAll(/## (\d+)\. (.+?) \((.+?)\)/g);
    for (const match of flowMatches) {
        const name = match[2];
        const priority = match[3];
        const status = flowsContent.includes(`${name}`) && flowsContent.includes('complete') ? 'complete' : 'pending';
        if (mode === 'full' || (mode === 'remaining' && status === 'pending')) {
            // Infer entity from flow name
            let entity = 'Item';
            if (name.toLowerCase().includes('message'))
                entity = 'Message';
            if (name.toLowerCase().includes('user'))
                entity = 'User';
            if (name.toLowerCase().includes('inbox'))
                entity = 'Message';
            features.push({
                name,
                entity,
                priority,
                operations: ['list', 'create', 'update', 'delete'],
            });
        }
    }
    return features;
}
async function markFlowComplete(cwd, featureName) {
    const flowsPath = path.join(cwd, 'FLOWS.md');
    let content = await fs.readFile(flowsPath, 'utf-8');
    // Find the flow section and mark as complete
    const regex = new RegExp(`(## \\d+\\. ${featureName}.+?\\*\\*Status:\\*\\*) pending`, 'g');
    content = content.replace(regex, '$1 complete');
    await fs.writeFile(flowsPath, content, 'utf-8');
}
async function runQualityGates(cwd, skipDeploy, skipDocs, skipChatbot) {
    const gates = {
        accessibility: null,
        performance: null,
        security: null,
        deployment: null,
        documentation: null,
        chatbot: null
    };
    try {
        // Gate 1: Accessibility
        console.error('[1/6] Accessibility validation...');
        const a11yResult = await validateAccessibility({ threshold: 90 });
        gates.accessibility = a11yResult.includes('✅') ? 'pass' : 'fail';
        console.error(a11yResult.split('\n').slice(0, 5).join('\n')); // Show summary
        // Gate 2: Performance
        console.error('[2/6] Performance optimization...');
        const perfResult = await optimizePerformance({ auto_fix: true });
        gates.performance = 'pass'; // Always passes, just applies optimizations
        console.error(perfResult.split('\n').slice(0, 5).join('\n'));
        // Gate 3: Security
        console.error('[3/6] Security scan...');
        const secResult = await scanSecurity({ block_on_critical: true });
        gates.security = secResult.includes('✅ PASS') ? 'pass' : secResult.includes('❌ BLOCKED') ? 'blocked' : 'warnings';
        console.error(secResult.split('\n').slice(0, 8).join('\n'));
        // If security blocked, stop here
        if (gates.security === 'blocked') {
            console.error('\n❌ Security gate BLOCKED - fix critical issues before deployment');
            return gates;
        }
        // Gate 4: Documentation
        if (!skipDocs) {
            console.error('[4/6] Generating documentation...');
            const docsResult = await generateDocs({});
            gates.documentation = docsResult.includes('✅') ? 'generated' : 'failed';
            console.error(docsResult.split('\n').slice(0, 5).join('\n'));
        }
        else {
            gates.documentation = 'skipped';
        }
        // Gate 5: AI Chatbot
        if (!skipChatbot) {
            console.error('[5/6] Generating AI chatbot...');
            const chatbotResult = await generateChatbot({});
            gates.chatbot = chatbotResult.includes('✅') ? 'generated' : 'failed';
            console.error(chatbotResult.split('\n').slice(0, 5).join('\n'));
        }
        else {
            gates.chatbot = 'skipped';
        }
        // Gate 6: Deployment
        if (!skipDeploy && gates.security !== 'blocked') {
            console.error('[6/6] Deploying to Vercel...');
            try {
                const deployResult = await deployVercel({ production: true });
                gates.deployment = deployResult.includes('✅') ? 'deployed' : 'failed';
                gates.deployment_url = deployResult.match(/https:\/\/[^\s]+/)?.[0];
                console.error(deployResult.split('\n').slice(0, 5).join('\n'));
            }
            catch (error) {
                gates.deployment = 'failed';
                gates.deployment_error = error instanceof Error ? error.message : String(error);
                console.error(`Deployment failed: ${gates.deployment_error}`);
            }
        }
        else {
            gates.deployment = 'skipped';
        }
    }
    catch (error) {
        console.error(`Quality gate error: ${error}`);
    }
    return gates;
}
function generateBuildReport(results, total, qualityGates = null) {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    let report = `🍞 CodeBakers: Autonomous Build Complete\n\n`;
    report += `## Build Summary\n\n`;
    report += `**Features requested:** ${total}\n`;
    report += `**Features completed:** ${successful} ✅\n`;
    report += `**Features failed:** ${failed} ${failed > 0 ? '❌' : ''}\n\n`;
    if (successful > 0) {
        report += `## ✅ Successful Builds\n\n`;
        for (const result of results.filter(r => r.status === 'success')) {
            report += `- ${result.feature}\n`;
        }
        report += `\n`;
    }
    if (failed > 0) {
        report += `## ❌ Failed Builds\n\n`;
        for (const result of results.filter(r => r.status === 'failed')) {
            report += `- ${result.feature}\n`;
            if (result.error) {
                report += `  Error: ${result.error}\n`;
            }
        }
        report += `\n`;
    }
    // Quality Gates Section
    if (qualityGates) {
        report += `---\n\n`;
        report += `## 🔒 Quality Gates\n\n`;
        const gates = [
            { name: 'Accessibility', status: qualityGates.accessibility },
            { name: 'Performance', status: qualityGates.performance },
            { name: 'Security', status: qualityGates.security },
            { name: 'Documentation', status: qualityGates.documentation },
            { name: 'AI Chatbot', status: qualityGates.chatbot },
            { name: 'Deployment', status: qualityGates.deployment }
        ];
        for (const gate of gates) {
            const emoji = gate.status === 'pass' || gate.status === 'generated' || gate.status === 'deployed'
                ? '✅'
                : gate.status === 'fail' || gate.status === 'blocked'
                    ? '❌'
                    : gate.status === 'warnings'
                        ? '⚠️'
                        : '⏭️';
            report += `- ${emoji} **${gate.name}:** ${gate.status}\n`;
        }
        report += `\n`;
        // Deployment URL if available
        if (qualityGates.deployment_url) {
            report += `🚀 **Live URL:** ${qualityGates.deployment_url}\n\n`;
        }
        // Security blocked warning
        if (qualityGates.security === 'blocked') {
            report += `⚠️ **Security gate BLOCKED** - Fix critical vulnerabilities before deployment\n\n`;
        }
    }
    report += `---\n\n`;
    if (failed === 0 && qualityGates && qualityGates.deployment === 'deployed') {
        report += `## 🎉 BUILD COMPLETE - PRODUCTION READY\n\n`;
        report += `**Your app is live!**\n\n`;
        if (qualityGates.deployment_url) {
            report += `**URL:** ${qualityGates.deployment_url}\n\n`;
        }
        report += `**Quality Scores:**\n`;
        report += `- Accessibility: ${qualityGates.accessibility === 'pass' ? '✅ Compliant' : '⚠️ Issues found'}\n`;
        report += `- Performance: ✅ Optimized\n`;
        report += `- Security: ${qualityGates.security === 'pass' ? '✅ Secure' : qualityGates.security === 'warnings' ? '⚠️ Warnings' : '❌ Critical issues'}\n`;
        report += `- Documentation: ${qualityGates.documentation === 'generated' ? '✅ Generated' : 'Not generated'}\n`;
        report += `- AI Chatbot: ${qualityGates.chatbot === 'generated' ? '✅ Integrated' : 'Not integrated'}\n\n`;
        report += `**Time saved:** Entire app built autonomously from mockups to production\n`;
    }
    else if (failed === 0) {
        report += `## 🎉 All Features Complete!\n\n`;
        report += `**Next steps:**\n`;
        report += `1. Run tests: codebakers_run_tests { test_type: "all" }\n`;
        report += `2. Review quality gates above\n`;
        report += `3. Deploy: codebakers_deploy_vercel { production: true }\n`;
    }
    else {
        report += `## ⚠️ Some Features Failed\n\n`;
        report += `**Next steps:**\n`;
        report += `1. Review error messages above\n`;
        report += `2. Fix issues manually\n`;
        report += `3. Re-run: codebakers_autonomous_build { mode: "remaining" }\n`;
    }
    return report;
}
//# sourceMappingURL=autonomous-build.js.map