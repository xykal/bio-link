import type { ReactNode } from "react";

/**
 * Renderer markdown ringan (tanpa dependensi, tanpa dangerouslySetInnerHTML).
 * Mendukung: paragraf, "## judul", "- poin" (bullet), **tebal**, `kode`,
 * dan [teks](https://…). Semua teks di-escape otomatis karena dirender
 * sebagai elemen React, bukan string HTML — jadi aman dari XSS.
 *
 * Cukup untuk deskripsi project yang ditulis dari panel admin.
 */

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = (src || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: [...list] });
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushPara();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

/** Inline: **tebal**, `kode`, [teks](url). */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("**")) {
      out.push(
        <strong key={key} className="font-semibold text-white/90">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.92em] text-white/85"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const label = token.slice(1, token.indexOf("]"));
      const href = m[2];
      out.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer nofollow"
          className="text-violet-300 underline decoration-violet-300/40 underline-offset-2 transition hover:text-violet-200"
        >
          {label}
        </a>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Prose({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;

  return (
    <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-white/70">
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <h3
              key={i}
              className="pt-2 text-[13px] font-bold uppercase tracking-[0.14em] text-white/50"
            >
              {renderInline(b.text, `h${i}`)}
            </h3>
          );
        }
        if (b.type === "list") {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/70" />
                  <span>{renderInline(item, `l${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(b.text, `p${i}`)}</p>;
      })}
    </div>
  );
}
