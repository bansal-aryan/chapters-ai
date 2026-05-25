import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "chapters.ai",
  description: "Everything you need for school in one place."
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
