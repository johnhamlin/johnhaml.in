import Footer from '@/components/Footer';
import ThemeSwitch from '@/components/ThemeSwitch';
import ActiveSectionContextProvider from '@/context/ActiveSectionContextProvider';
import ThemeContextProvider from '@/context/ThemeContextProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from 'next/font/google';
import './globals.css';
import './safe-area.css';

const inter = Inter({ subsets: ['latin'] });
const GOOGLE_ANALYTICS_ID = process.env.GOOGLE_ANALYTICS_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="!scroll-smooth">
      <body
        className={`${inter.className} sm:pt-38 relative bg-gray-50 pt-28 text-gray-950 dark:bg-gray-900 dark:text-gray-50 dark:text-opacity-90`}
      >
        <div className="absolute right-[5rem] top-[-6rem] -z-10 h-[31.25rem] w-[31.25rem] transform-gpu rounded-full bg-[#fbe2e3] blur-[10rem] will-change-transform dark:bg-[#946263] sm:w-[68.75rem]"></div>
        <div className="absolute left-[-35rem] top-[-1rem] -z-10 h-[31.25rem] w-[50rem] transform-gpu rounded-full bg-[#dbd7fb] blur-[10rem] will-change-transform dark:bg-[#676394] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem]"></div>
        <ClerkProvider>
          <ThemeContextProvider>
            <ActiveSectionContextProvider>
              {children}
              <Footer />
            </ActiveSectionContextProvider>
            <ThemeSwitch />
          </ThemeContextProvider>
        </ClerkProvider>
        <Analytics />
        <SpeedInsights />
        {GOOGLE_ANALYTICS_ID ? (
          <GoogleAnalytics gaId={GOOGLE_ANALYTICS_ID} />
        ) : null}
      </body>
    </html>
  );
}
