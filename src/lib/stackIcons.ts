// Logo tech-stack ASLI (path SVG resmi dari simple-icons). Diimpor statis &
// terpilih supaya tree-shakeable. File ini diimpor oleh ADMIN (client) dan
// server (data.ts / settings route) — BUKAN oleh BioPage publik, supaya bundle
// halaman publik tetap ringan (publik cukup render path yang tersimpan di store).
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
  // tambahan
  siHtml5,
  siSass,
  siBootstrap,
  siVuedotjs,
  siAngular,
  siExpress,
  siRedis,
  siPrisma,
  siElectron,
  siJquery,
  siGoogle,
  siApple,
  siStripe,
  siPostman,
  siJest,
  siWebpack,
  siBabel,
  siNpm,
  siYarn,
  siBun,
  siDeno,
  siAstro,
  siGatsby,
  siRemix,
  siTrpc,
  siSocketdotio,
  siSqlite,
  siMariadb,
  siDrizzle,
  siSequelize,
  siVitest,
  siEslint,
  siPrettier,
  siGitlab,
  siNotion,
  siUbuntu,
  siDebian,
  siMacos,
  siTensorflow,
  siPytorch,
  siPandas,
  siNumpy,
  siUnity,
  siUnrealengine,
  siBlender,
  siKubernetes,
  siTerraform,
  siNetlify,
  siShopify,
} from "simple-icons";

export type TechIcon = { slug: string; title: string; hex: string; path: string };

const RAW = [
  siFlutter, siDart, siKotlin, siAndroid, siNextdotjs, siReact, siTypescript,
  siJavascript, siVite, siTailwindcss, siNodedotjs, siPython, siGit, siGithub,
  siDocker, siFirebase, siSupabase, siFigma, siSvelte, siRust, siGo, siLinux,
  siVercel, siCloudflare, siPostgresql, siMongodb, siMysql, siCplusplus, siSwift,
  siPhp, siLaravel, siRedux, siGraphql, siNginx,
  siHtml5, siSass, siBootstrap, siVuedotjs, siAngular, siExpress, siRedis,
  siPrisma, siElectron, siJquery, siGoogle, siApple, siStripe, siPostman, siJest,
  siWebpack, siBabel, siNpm, siYarn, siBun, siDeno, siAstro, siGatsby, siRemix,
  siTrpc, siSocketdotio, siSqlite, siMariadb, siDrizzle, siSequelize, siVitest,
  siEslint, siPrettier, siGitlab, siNotion, siUbuntu, siDebian, siMacos,
  siTensorflow, siPytorch, siPandas, siNumpy, siUnity, siUnrealengine, siBlender,
  siKubernetes, siTerraform, siNetlify, siShopify,
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
