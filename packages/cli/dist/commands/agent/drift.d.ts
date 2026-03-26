import { type ParsedArgs } from "../../core/args";
import { runConvexFunction, type ConvexRunResult } from "./runner";
export type AgentRunner = (input: Parameters<typeof runConvexFunction>[0]) => Promise<ConvexRunResult>;
export declare function handleAgentDrift(parsed: ParsedArgs, runner?: AgentRunner): Promise<number>;
//# sourceMappingURL=drift.d.ts.map