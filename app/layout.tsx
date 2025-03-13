import Footer from '@/components/Footer';
import ThemeSwitch from '@/components/ThemeSwitch';
import ActiveSectionContextProvider from '@/context/ActiveSectionContextProvider';
import ThemeContextProvider from '@/context/ThemeContextProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Head from 'next/head';

const inter = Inter({ subsets: ['latin'] });
const GOOGLE_ANALYTICS_ID = process.env.GOOGLE_ANALYTICS_ID;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export const metadata: Metadata = {
  title: "John Hamlin's Portfolio",
  description: 'John Hamlin is a full-stack developer.',
  creator: 'John Hamlin',
  publisher: 'John Hamlin',
  keywords: [
    'John Hamlin',
    'Full-stack Developer',
    'Software Engineer',
    'Raleigh, NC',
    'North Carolina',
    'React',
    'Next.js',
    'Tailwind CSS',
    'TypeScript',
    'Node.js',
    'Express',
    'MongoDB',
    'GraphQL',
    'Apollo',
    'Clerk',
    'Vercel',
    'Netlify',
    'AWS',
    'Google Cloud',
    'Firebase',
    'Docker',
    'Kubernetes',
    'Jenkins',
    'GitHub',
    'GitLab',
    'Bitbucket',
    'Jira',
    'Confluence',
    'Slack',
    'Microsoft Teams',
    'Zoom',
    'Google Meet',
    'Microsoft Teams',
    'Discord',
    'Trello',
    'Asana',
    'Monday.com',
    'Notion',
    'Airtable',
    'Figma',
    'Adobe XD',
    'Sketch',
    'InVision',
    'Zeplin',
    'Abstract',
    'Miro',
    'Mural',
    'Jamboard',
    'Microsoft Whiteboard',
    'Google Workspace',
    'Microsoft 365',
    'G Suite',
    'Office 365',
    'Google Cloud Platform',
    'Amazon Web Services',
    'Microsoft Azure',
    'Firebase',
    'Netlify',
    'Vercel',
    'Heroku',
    'Docker',
    'Kubernetes',
    'Jenkins',
    'GitHub Actions',
    'GitLab CI/CD',
    'Bitbucket Pipelines',
    'CircleCI',
    'Travis CI',
    'AWS CodePipeline',
    'Azure DevOps',
    'Google Cloud Build',
    'Firebase Hosting',
    'Netlify',
    'Vercel',
    'Heroku',
    'AWS Amplify',
    'Google Cloud Run',
    'Azure App Service',
    'Firebase Cloud Functions',
    'Netlify Functions',
    'Vercel Serverless Functions',
    'Heroku',
    'AWS Lambda',
    'Google Cloud Functions',
    'Azure Functions',
    'Firebase Cloud Firestore',
    'MongoDB Atlas',
    'Amazon DocumentDB',
    'Google Cloud Firestore',
    'Azure Cosmos DB',
    'Firebase Realtime Database',
    'MongoDB Atlas',
    'Amazon DynamoDB',
    'Google Cloud Datastore',
    'Azure Table Storage',
    'Firebase Cloud Storage',
    'Amazon S3',
    'Google Cloud Storage',
    'Azure Blob Storage',
    'Firebase Authentication',
    'Auth0',
    'Okta',
    'AWS Cognito',
    'Google Cloud Identity Platform',
    'Azure Active Directory B2C',
    'Firebase Cloud Messaging',
    'Amazon SNS',
    'Google Cloud Pub/Sub',
    'Azure Service Bus',
    'Firebase Cloud Functions',
    'Amazon Lambda',
    'Google Cloud Functions',
    'Azure Functions',
    'Firebase Cloud Firestore',
    'MongoDB Atlas',
    'Amazon',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "John Hamlin's Portfolio",
  },
  // metadataBase: new URL('https://johnhaml.in'),

  // openGraph: {
  //   title: "John Hamlin's Portfolio",
  //   description: 'John Hamlin is a full-stack developer in Raleigh, N.C.',
  //   // images: 'opengraph-image.jpg',
  //   url: 'https://www.johnhaml.in',
  //   type: 'website',
  // },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="!scroll-smooth">
      <head>
        <style>{`
          /* iOS safe area handling */
          :root {
            --sat: env(safe-area-inset-top);
            --sar: env(safe-area-inset-right);
            --sab: env(safe-area-inset-bottom);
            --sal: env(safe-area-inset-left);
          }
          
          /* Makes sure body content doesn't go under the status bar */
          body {
            padding-top: max(28px, calc(28px + var(--sat, 0px)));
          }
          
          @media (min-width: 640px) {
            body {
              padding-top: max(38px, calc(38px + var(--sat, 0px)));
            }
          }
        `}</style>
      </head>
      <body
        className={`${inter.className} relative bg-gray-50 text-gray-950 dark:bg-gray-900 dark:text-gray-50 dark:text-opacity-90`}
      >
        {/* Display two subtle pops of color to the top of the page to add some visual interest */}
        <div className="absolute right-[11rem] top-[-6rem] -z-10 h-[31.25rem] w-[31.25rem] rounded-full bg-[#fbe2e3] blur-[10rem] dark:bg-[#946263] sm:w-[68.75rem]"></div>
        <div className="xl:left=[-15rem] absolute left-[-35rem] top-[-1rem] -z-10 h-[31.25rem] w-[50rem] rounded-full bg-[#dbd7fb] blur-[10rem] dark:bg-[#676394] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] 2xl:left-[-5rem] "></div>
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
