import type { Metadata } from "next";
import "./globals.css";
import "./portfolio.css";
import "./theme.css";
import {ThemeProvider} from './theme';

export const metadata: Metadata = {
  title: "Нейрон — новости мира ИИ",
  description: "Главное о нейросетях, технологиях и людях, которые меняют будущее.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('neuron-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}"}}/></head>
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
