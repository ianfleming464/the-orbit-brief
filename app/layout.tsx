import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Orbit Brief",
  description: "A source-grounded briefing of recently indexed NASA news.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
