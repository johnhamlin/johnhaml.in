import { createTracking } from '@/lib/actions';
import Link from 'next/link';

type TrackedLinkProps = React.ComponentPropsWithoutRef<typeof Link> & {
  tag: string;
};

function TrackedLink(props: TrackedLinkProps) {
  return (
    <Link {...props} onClick={() => createTracking(props.tag)}>
      {props.children}
    </Link>
  );
}
export default TrackedLink;
