import { type ParsedArgs } from "../../core/args";
import { runConvexFunction, type ConvexRunResult } from "./runner";
export type AgentRunner = (input: Parameters<typeof runConvexFunction>[0]) => Promise<ConvexRunResult>;
export declare function handleAgentPermissions(parsed: ParsedArgs, runner?: AgentRunner): Promise<number>;
//# sourceMappingURL=permissions.d.ts.map