import type { AppProps } from "next/app";
import { useEffect } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "../utils/useTheme";
import "../styles/index.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Tự động gỡ bỏ các Service Worker cũ (nếu có từ các project khác chạy trên localhost:3000)
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <style jsx global>{`
        :root {
          --font-jakarta: ${jakarta.style.fontFamily};
        }
        html,
        body,
        input,
        button,
        textarea,
        select {
          font-family: ${jakarta.style.fontFamily}, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
      `}</style>
      <div className={`${jakarta.variable} font-sans min-h-screen bg-slate-50/70 text-zinc-900 dark:bg-[#090a0f] dark:text-zinc-100 antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200`}>
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
