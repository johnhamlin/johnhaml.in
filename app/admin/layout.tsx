import { OrganizationSwitcher, Protect, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';

export default function AdminLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  const { has } = auth();

  const isAdmin = has({ role: 'org:admin' });
  console.log(isAdmin);

  return (
    <main>
      <Protect condition={(has) => has({ role: 'org:admin' })}>
        {children}
      </Protect>
      <OrganizationSwitcher />
    </main>
  );
}
