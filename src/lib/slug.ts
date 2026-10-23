/**
 * Slug URL untuk project: huruf kecil, tanpa diakritik, pemisah "-".
 * Dipakai di /project/<slug> supaya URL-nya enak dibaca & diindeks Google
 * (bukan /project/8f3a-uuid).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // buang diakritik
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Pastikan unik: kalau dua project punya judul mirip, yang kedua jadi
 * "<slug>-2", "-3", dst. `taken` diisi slug yang sudah dipakai.
 */
export function uniqueSlug(base: string, taken: Set<string>, fallback = "project"): string {
  const root = slugify(base) || fallback;
  if (!taken.has(root)) {
    taken.add(root);
    return root;
  }
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  const next = `${root}-${n}`;
  taken.add(next);
  return next;
}
