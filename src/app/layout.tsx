import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/layouts/ClientLayout";

export const metadata: Metadata = {
  title: "Kuaför Randevu Sistemi",
  description: "Size en yakın kuaförlerden kolayca randevu alın",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="font-sans">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
} 