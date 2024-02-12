import Intro from '@/components/Intro';
import About from '@/components/About';
import SectionDivider from '@/components/SectionDivider';
import Projects from '@/components/Projects';
import Skills from '@/components/Skills';
import Experience from '@/components/Experience';
import Header from '@/components/Header';

export default function Home() {
  return (
    <main className="flex flex-col items-center px-4 ">
      <Header />
      <Intro />
      <SectionDivider />
      <About />
      <Projects />
      <Skills />
      <Experience />
    </main>
  );
}
