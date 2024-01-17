import { UserButton } from '@clerk/nextjs';

export default function AdminLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <main>
      {/* Include shared UI here e.g. a header or sidebar */}

      {children}
      <UserButton afterSignOutUrl="/" />
    </main>
  );
}
