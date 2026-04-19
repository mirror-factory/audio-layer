/**
 * Stub module for dev-kit dashboard API routes.
 *
 * The ai-dev-kit templates expect Supabase tables for evals, sessions,
 * deployments, etc. We don't have those tables yet — this stub returns
 * empty data so the routes compile and the dashboards render gracefully.
 *
 * Replace with real queries when the tables are created.
 */

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */

export async function getToolRegistry(_supabase: any): Promise<Array<{ id: string; name: string; category: string; test_status: string; last_eval_score: number | null }>> { return []; }
export async function getConnectorStatuses(_supabase: any) { return []; }
export async function getEvalSuites(_supabase: any) { return []; }
export async function getEvalRuns(_supabase: any, _params?: any) { return []; }
export async function getEvalRunById(_supabase: any, _id: string) { return null; }
export async function getCostSummary(_supabase: any, _params?: any) { return { spent: 0, budget: 100, overTime: [], perModel: [] }; }
export async function getCostByModel(_supabase: any, _params?: any) { return []; }
export async function getTraces(_supabase: any, _params?: any) { return []; }
export async function getTraceWithSpans(_supabase: any, _id: string) { return null; }
export async function getRegressionTests(_supabase: any): Promise<Array<{ tool_name: string }>> { return []; }
export async function getOverviewStats(_supabase: any) { return { totalTraces: 0, totalCost: 0, avgLatency: 0, errorRate: 0, topModels: [], recentActivity: [] }; }
export async function getToolCoverage(_supabase: any) { return { tools: [] as Array<{ name: string; test_status: string; last_eval_score: number | null }>, totalTools: 0, testedTools: 0, coveragePercent: 0 }; }
export async function getEvalCoverage(_supabase: any) { return { suites: [] as Array<{ name: string; status: string }>, totalSuites: 0, passingSuites: 0 }; }
export async function getDeployments(_supabase: any) { return []; }

// Insert functions used by telemetry-persistence.ts
export async function insertTrace(_supabase: any, _data: any) { return { id: `trace_${Date.now()}` }; }
export async function insertSpan(_supabase: any, _data: any) { return; }
export async function insertCostLog(_supabase: any, _data: any) { return; }
export async function insertRegressionTest(_supabase: any, _data: any) { return; }
