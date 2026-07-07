import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapa da Fertilidade",
  description: "Um diagnóstico acolhedor para você entender seu corpo e seus próximos passos na fertilidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
