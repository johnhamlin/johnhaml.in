import Intro from '@/components/Intro';
import About from '@/components/About';
import SectionDivider from '@/components/SectionDivider';
import Projects from '@/components/Projects';
import Skills from '@/components/Skills';
import Experience from '@/components/Experience';
import Header from '@/components/Header';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      {/* Doing this manually because generating it with Next.js is not working */}
      <Head>
        {/* Facebook */}
        <meta property="og:url" content="https://johnhaml.in" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="John Hamlin's Portfolio" />
        <meta
          property="og:description"
          content="John Hamlin is a full-stack engineer in Raleigh, N.C."
        />
        <meta
          property="og:image"
          content="https://johnhaml.in/opengraph-image.jpg"
        />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="johnhaml.in" />
        <meta property="twitter:url" content="https://johnhaml.in" />
        <meta name="twitter:title" content="John Hamlin's Portfolio" />
        <meta
          name="twitter:description"
          content="John Hamlin is a full-stack engineer in Raleigh, N.C."
        />
        <meta
          name="twitter:image"
          content="https://johnhaml.in/opengraph-image.jpg"
        />
      </Head>
      <main className="flex flex-col items-center px-4 ">
        <Header />
        <Intro />
        <SectionDivider />
        <About />
        <Projects />
        <Skills />
        <Experience />
      </main>
    </>
  );
}
