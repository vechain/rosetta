/**
 * Declares a test for a confirmed, not yet fixed bug. It passes while the
 * test fails and fails once the bug is fixed, so the marker gets removed.
 * Run with E2E_KNOWN_BUGS=run to execute these as normal tests and see the
 * actual failure reasons.
 */
export const knownBug: typeof it.failing = process.env.E2E_KNOWN_BUGS === 'run' ? it : it.failing;
