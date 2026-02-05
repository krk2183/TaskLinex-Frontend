import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TaskLinex | Workflow Orchestration",
  description: "Advanced dependency tracking and workflow intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} bg-[#F4F4F5] text-[#18181B] antialiased selection:bg-[#18181B] selection:text-white [overscroll-behavior-y:contain]`}>
        {children}
      </body>
    </html>
  );
}