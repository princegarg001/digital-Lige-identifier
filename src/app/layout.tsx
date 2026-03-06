import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Digital Persona | AI Substrate",
  description:
    "A real-time 3D Digital Persona powered by Gemini Live API — Interactive AI Video Call Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} bg-black text-white antialiased overflow-hidden`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
