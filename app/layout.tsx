import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";

const lora = Lora({
  weight: ["400", "600"],
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Logan Gallagher - Software Developer & Trainer",
  description: "Personal website and blog of Logan Gallagher, software developer and trainer based in Portland, OR",
  metadataBase: new URL("https://logangallagher.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={lora.className}>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
