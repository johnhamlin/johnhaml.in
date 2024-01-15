import Link from 'next/link';

type TrackedLinkProps = {
  href: string;
  className?: string;
  trackingId: string;
  children: React.ReactNode;
};

function TrackedLink({
  href,
  className = '',
  children,
  trackingId,
}: TrackedLinkProps) {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => console.log('Clicked!')}
    >
      {children}
    </Link>
  );
}
export default TrackedLink;
