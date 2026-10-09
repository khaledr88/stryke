import { Container } from "@/components/home/SectionHeading";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="border-b border-line py-12">
        <Container>
          <div className="skeleton h-4 w-40" />
          <div className="skeleton mt-5 h-14 w-72 max-w-full" />
        </Container>
      </div>
      <Container className="grid grid-cols-2 gap-x-3 gap-y-10 pt-10 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5]" />
            <div className="skeleton mt-3 h-3 w-1/3" />
            <div className="skeleton mt-2 h-4 w-3/4" />
            <div className="skeleton mt-3 h-5 w-1/4" />
          </div>
        ))}
      </Container>
    </div>
  );
}
