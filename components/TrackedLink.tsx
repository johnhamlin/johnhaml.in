import { createTracking } from '@/lib/actions';
import Link from 'next/link';
import type React from 'react';

type TrackedLinkProps = React.ComponentPropsWithoutRef<typeof Link> & {
  tag: string;
};

function TrackedLink({ tag, onClick, ...rest }: TrackedLinkProps) {
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    void createTracking(tag);
    if (typeof onClick === 'function') {
      onClick(e);
    }
  };

  return (
    <Link {...rest} onClick={handleClick}>
      {rest.children}
    </Link>
  );
}
export default TrackedLink;
