import { type ParsedArgs } from "../../core/args";
import { runConvexFunction, type ConvexRunResult } from "./runner";
export type AgentRunner = (input: Parameters<typeof runConvexFunction>[0]) => Promise<ConvexRunResult>;
export declare function handleAgentInit(parsed: ParsedArgs, runner?: AgentRunner): Promise<number>;
//# sourceMappingURL=init.d.ts.map