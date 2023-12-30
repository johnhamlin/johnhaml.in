type SectionHeadingProps = {
  children: React.ReactNode;
};

export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h2 className="mb-8 text-center text-3xl font-medium capitalize">
      {children}
    </h2>
  );
}

//prose-h2:capitalize prose-h2:text-center prose-h2:font-medium prose-h2:text-3xl
