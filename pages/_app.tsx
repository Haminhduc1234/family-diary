import type { AppProps } from "next/app";
import { useEffect } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
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
    <div className={`${jakarta.variable} font-sans min-h-screen bg-black text-white antialiased selection:bg-blue-600 selection:text-white`}>
      <Component {...pageProps} />
    </div>
  );
}
