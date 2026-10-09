import { Fragment } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Renders the admin's plain-text content safely: blank lines make paragraphs,
 * "## " starts a heading and "- " lines become a list. No HTML is interpreted.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className={cn("prose-stryke", className)}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-•]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        if (/^#{1,3}\s+/.test(lines[0])) {
          return (
            <Fragment key={i}>
              <h2>{lines[0].replace(/^#{1,3}\s+/, "")}</h2>
              {lines.length > 1 && <p>{lines.slice(1).join(" ")}</p>}
            </Fragment>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {l}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
