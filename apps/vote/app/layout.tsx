import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Roboto_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const title = "ottervote";
const description = "Pick the better generation. Votes train the next pet LoRA.";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title,
  description,
  applicationName: title,
  openGraph: { title, description, siteName: title, type: "website" },
};

const themeScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("eve-theme");
    const theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch {
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
})();
`;

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html
      className={`${plusJakartaSans.variable} ${robotoMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} id="theme-init" />
      </head>
      <body className={`${plusJakartaSans.className} antialiased`}>{children}</body>
    </html>
  );
}
