import Link from 'next/link';
import { createTracking } from '@/lib/actions';

type TrackedLinkProps = {
  href: string;
  className?: string;
  tag: string;
  children: React.ReactNode;
};

function TrackedLink({
  href,
  className = '',
  children,
  tag,
}: TrackedLinkProps) {
  return (
    <Link className={className} href={href} onClick={() => createTracking(tag)}>
      {children}
    </Link>
  );
}
export default TrackedLink;
