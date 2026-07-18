import type { Metadata } from "next";
import "./globals.css";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";

export const metadata: Metadata = {
  title: "Basho Tomo",
  description: "Grand Sumo tracker focused on current basho and favorite rikishi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootstrap = `
    (() => {
      const key = "basho-tomo:pref:theme";
      const fallback = "${DEFAULT_THEME}";
      const allowed = new Set(${JSON.stringify(THEMES.map((theme) => theme.id))});
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : fallback;
        const theme = typeof parsed === "string" && allowed.has(parsed) ? parsed : fallback;
        document.documentElement.dataset.theme = theme;
      } catch {
        document.documentElement.dataset.theme = fallback;
      }
    })();
  `;

  return (
    <html lang="ja" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
