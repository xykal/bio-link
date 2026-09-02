// Generator nama anonim acak (dipakai server & client agar konsisten).
const INDO_NAMES = [
  "Asep", "Budi", "Citra", "Dewi", "Eko", "Fitri", "Gilang", "Hana",
  "Intan", "Joko", "Kirana", "Lia", "Maya", "Nanda", "Putri", "Raka",
  "Sari", "Tono", "Vina", "Wati", "Yoga", "Zahra", "Agus", "Bella",
  "Dimas", "Eka", "Fajar", "Gita", "Hendra", "Indah",
];

export function randomAnonName(): string {
  const name = INDO_NAMES[Math.floor(Math.random() * INDO_NAMES.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${name}${num}`;
}
