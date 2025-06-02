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
import BackgroundLoader from '@/components/BackgroundLoader';
import { Metadata } from 'next/types';

const inter = Inter({ subsets: ['latin'] });
const GOOGLE_ANALYTICS_ID = process.env.GOOGLE_ANALYTICS_ID;
const baseUrl = 'https://johnhaml.in';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'John Hamlin - Senior Software Engineer',
    template: '%s | John Hamlin',
  },
  description: 'I build full-stack web apps in TypeScript, React, Next.js and Node and cross-platform mobile apps in React Native and Expo. I live in Raleigh, North Carolina.',
  keywords: ['John Hamlin', 'Software Engineer', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Full Stack Developer', 'Raleigh'],
  authors: [{ name: 'John Hamlin' }],
  creator: 'John Hamlin',

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'John Hamlin',
    title: 'John Hamlin - Senior Software Engineer',
    description: 'I build full-stack web apps in TypeScript, React, Next.js and Node and cross-platform mobile apps in React Native and Expo.',
    images: [
      {
        url: `${baseUrl}/opengraph-image.png`, // Using absolute URL for better compatibility
        width: 1200,
        height: 630,
        alt: 'John Hamlin - Senior Software Engineer',
        type: 'image/png',
      }
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@johnhamlin', // Your Twitter handle
    creator: '@johnhamlin', // Your Twitter handle
    title: 'John Hamlin - Senior Software Engineer',
    description: 'I build full-stack web apps in TypeScript, React, Next.js and Node and cross-platform mobile apps in React Native and Expo.',
    images: {
      url: `${baseUrl}/twitter-image.png`, // Using absolute URL
      alt: 'John Hamlin - Senior Software Engineer',
    },
  },

  alternates: {
    canonical: baseUrl,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="!scroll-smooth">
      <meta property="og:image" content="<generated>" />
      <meta property="og:image:type" content="<generated>" />
      <meta property="og:image:width" content="<generated>" />
      <meta property="og:image:height" content="<generated>" />
      <meta name="twitter:image" content="<generated>" />
      <meta name="twitter:image:type" content="<generated>" />
      <meta name="twitter:image:width" content="<generated>" />
      <meta name="twitter:image:height" content="<generated>" />
      <body
        className={`${inter.className} sm:pt-38 relative bg-gray-50 pt-28 text-gray-950 dark:bg-gray-900 dark:text-gray-50 dark:text-opacity-90`}
      >
        {/*<div className="absolute right-[5rem] top-[-6rem] -z-10 h-[31.25rem] w-[31.25rem] transform-gpu rounded-full bg-[#fbe2e3] blur-[10rem] will-change-transform dark:bg-[#946263] sm:w-[68.75rem]"></div>*/}
        {/*<div className="absolute left-[-35rem] top-[-1rem] -z-10 h-[31.25rem] w-[50rem] transform-gpu rounded-full bg-[#dbd7fb] blur-[10rem] will-change-transform dark:bg-[#676394] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem]"></div>*/}
        <ClerkProvider>
          <ThemeContextProvider>
            <BackgroundLoader />
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
