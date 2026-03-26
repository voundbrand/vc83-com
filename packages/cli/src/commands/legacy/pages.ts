import { type ParsedArgs } from "../../core/args";
import { handleAppPages } from "../app/pages";

export async function handleLegacyPages(parsed: ParsedArgs): Promise<number> {
  const subcommand =
    parsed.positionals[1] === "list" || parsed.positionals[1] === "sync"
      ? parsed.positionals[1]
      : "sync";

  return handleAppPages(
    {
      ...parsed,
      positionals: ["app", "pages", subcommand]
    },
    {
      legacySource: "pages"
    }
  );
}
