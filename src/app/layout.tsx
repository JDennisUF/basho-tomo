import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Basho Tomo",
  description: "Grand Sumo tracker focused on current basho and favorite rikishi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
