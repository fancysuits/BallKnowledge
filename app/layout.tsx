import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Sports Analytics Chatbot",
  description:
    "Text-based AI sports analytics chat for basketball and soccer predictions."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
