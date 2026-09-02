"use client";

// Fallback terakhir kalau error terjadi di level root layout.
// Wajib render <html><body> sendiri.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0, background: "#08080d" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#08080d",
            color: "#f4f4f6",
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 360 }}>
            <svg
              viewBox="0 0 24 24"
              width="44"
              height="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              style={{ margin: "0 auto 16px", display: "block", opacity: 0.9 }}
            >
              <path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" />
              <path d="M12 9.5v5" strokeLinecap="round" />
              <circle cx="12" cy="17.2" r="0.4" fill="currentColor" stroke="none" />
            </svg>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
              Ada gangguan sebentar
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "rgba(244,244,246,0.65)",
                margin: "0 0 20px",
              }}
            >
              Halaman belum bisa ditampilkan. Muat ulang untuk mencoba lagi.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Muat ulang
            </button>
            <p style={{ fontSize: 11, color: "rgba(244,244,246,0.35)", marginTop: 18 }}>
              {error.digest ? `REF ${error.digest}` : ""}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
