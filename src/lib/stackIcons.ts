// Logo tech-stack ASLI (path SVG resmi dari simple-icons). Diimpor statis &
// terpilih supaya tree-shakeable — hanya ikon di daftar ini yang ikut ke bundle.
import {
  siFlutter,
  siDart,
  siKotlin,
  siAndroid,
  siNextdotjs,
  siReact,
  siTypescript,
  siJavascript,
  siVite,
  siTailwindcss,
  siNodedotjs,
  siPython,
  siGit,
  siGithub,
  siDocker,
  siFirebase,
  siSupabase,
  siFigma,
  siSvelte,
  siRust,
  siGo,
  siLinux,
  siVercel,
  siCloudflare,
  siPostgresql,
  siMongodb,
  siMysql,
  siCplusplus,
  siSwift,
  siPhp,
  siLaravel,
  siRedux,
  siGraphql,
  siNginx,
} from "simple-icons";

export type TechIcon = { slug: string; title: string; hex: string; path: string };

const RAW = [
  siFlutter,
  siDart,
  siKotlin,
  siAndroid,
  siNextdotjs,
  siReact,
  siTypescript,
  siJavascript,
  siVite,
  siTailwindcss,
  siNodedotjs,
  siPython,
  siGit,
  siGithub,
  siDocker,
  siFirebase,
  siSupabase,
  siFigma,
  siSvelte,
  siRust,
  siGo,
  siLinux,
  siVercel,
  siCloudflare,
  siPostgresql,
  siMongodb,
  siMysql,
  siCplusplus,
  siSwift,
  siPhp,
  siLaravel,
  siRedux,
  siGraphql,
  siNginx,
];

export const TECH_ICONS: Record<string, TechIcon> = Object.fromEntries(
  RAW.map((i) => [i.slug, { slug: i.slug, title: i.title, hex: i.hex, path: i.path }])
);

// Daftar buat picker di admin (urut abjad menurut title)
export const STACK_OPTIONS: TechIcon[] = Object.values(TECH_ICONS).sort((a, b) =>
  a.title.localeCompare(b.title)
);

export function getTechIcon(slug: string): TechIcon | undefined {
  return TECH_ICONS[slug];
}
