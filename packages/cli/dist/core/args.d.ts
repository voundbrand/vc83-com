export type ParsedOptionValue = string | boolean | string[];
export interface ParsedArgs {
    positionals: string[];
    options: Record<string, ParsedOptionValue>;
}
export declare function parseArgv(argv: string[]): ParsedArgs;
export declare function getOptionString(parsed: ParsedArgs, key: string): string | undefined;
export declare function getOptionBoolean(parsed: ParsedArgs, key: string): boolean;
export declare function hasOption(parsed: ParsedArgs, key: string): boolean;
export declare function getOptionStringArray(parsed: ParsedArgs, key: string): string[];
//# sourceMappingURL=args.d.ts.map