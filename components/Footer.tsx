import Link from 'next/link';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mb-10 px-4 text-center text-gray-500">
      <small className="mb-2 block text-xs">
        &copy; {currentYear} John Hamlin. All rights reserved.
      </small>
      <p className="text-xs">
        Built with{' '}
        <Link
          href="https://nextjs.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Next.js 14
        </Link>
        {', '}
        <Link
          href="https://tailwindcss.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Tailwind CSS
        </Link>
        {' and '}
        <Link
          href="https://www.typescriptlang.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          TypeScript
        </Link>
        .
      </p>
    </footer>
  );
}
export default Footer;
