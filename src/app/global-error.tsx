"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#fafafa" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <div style={{ margin: "0 auto 1.5rem", width: "5rem", height: "5rem", borderRadius: "9999px", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#ef4444">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#18181b", marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#18181b", marginBottom: "0.5rem", direction: "rtl" }}>
              حدث خطأ غير متوقع
            </p>

            <p style={{ fontSize: "0.875rem", color: "#71717a", lineHeight: 1.7, marginBottom: "2rem" }}>
              We&apos;re sorry, an unexpected error occurred. Please try again.
              <br />
              <span style={{ direction: "rtl", display: "inline-block" }}>نعتذر، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.</span>
            </p>

            {error.digest && (
              <p style={{ fontSize: "0.75rem", color: "#a1a1aa", marginBottom: "1.5rem" }}>
                Error code: <code style={{ background: "#f4f4f5", padding: "0.125rem 0.375rem", borderRadius: "0.25rem", fontFamily: "monospace", color: "#71717a" }}>{error.digest}</code>
              </p>
            )}

            <button
              onClick={reset}
              style={{ display: "inline-flex", height: "2.75rem", alignItems: "center", borderRadius: "0.75rem", backgroundColor: "#0d9488", padding: "0 1.5rem", fontSize: "0.875rem", fontWeight: 600, color: "white", border: "none", cursor: "pointer" }}
            >
              Try Again — حاول مجدداً
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
