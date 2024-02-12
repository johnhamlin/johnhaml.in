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
        <meta property="og:url" content="https://johnhaml.in" key={'og:url'} />
        <meta property="og:type" content="website" key={'og:type'} />
        <meta
          property="og:title"
          content="John Hamlin's Portfolio"
          key={'og:title'}
        />
        <meta
          property="og:description"
          content="John Hamlin is a full-stack engineer in Raleigh, N.C."
          key={'og:description'}
        />
        <meta
          property="og:image"
          content="https://johnhaml.in/opengraph-image.jpg"
          key={'og:image'}
        />
        {/* Twitter */}
        <meta
          name="twitter:card"
          content="summary_large_image"
          key={'twitter:card'}
        />
        <meta
          property="twitter:domain"
          content="johnhaml.in"
          key={'twitter:domain'}
        />
        <meta
          property="twitter:url"
          content="https://johnhaml.in"
          key={'twitter:url'}
        />
        <meta
          name="twitter:title"
          content="John Hamlin's Portfolio"
          key={'twitter:title'}
        />
        <meta
          name="twitter:description"
          content="John Hamlin is a full-stack engineer in Raleigh, N.C."
          key={'twitter:description'}
        />
        <meta
          name="twitter:image"
          content="https://johnhaml.in/opengraph-image.jpg"
          key={'twitter:image'}
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
