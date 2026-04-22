import type { Metadata } from "next";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import MuiProvider from "@/components/MuiProvider";

export const metadata: Metadata = {
  title: "MachinistHub",
  description: "MachinistHub App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <MuiProvider>{children}</MuiProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
