function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mb-10 to-gray-500 px-4 text-center">
      <small className="mb-2 block text-xs">
        &copy; {currentYear} John Hamlin. All rights reserved.
      </small>
      <p className="text-xs">
        Built with{' '}
        <a
          href="https://nextjs.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Next.js 14
        </a>
        {', '}
        <a
          href="https://tailwindcss.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Tailwind CSS
        </a>
        {' and '}
        <a
          href="https://www.typescriptlang.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          TypeScript
        </a>
        .
      </p>
    </footer>
  );
}
export default Footer;
