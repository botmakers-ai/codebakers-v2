export async function checkScope(args: { feature_description?: string }): Promise<string> {
  const description = args.feature_description || 'unknown';
  return `🍞 CodeBakers: Scope Check - ${description}\n\n[Implementation needed]\nChecks if feature is in PROJECT-SPEC.md`;
}
