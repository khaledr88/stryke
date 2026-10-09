import { Container } from "@/components/home/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <Container className="relative flex min-h-[70vh] flex-col items-start justify-center overflow-hidden py-20">
      <LogoMark className="pointer-events-none absolute -right-20 top-1/2 h-auto w-[480px] -translate-y-1/2 opacity-[0.06]" sizes="480px" />
      <p className="label mb-4 flex items-center gap-3 text-steel">
        <span className="strike-line" /> Error 404
      </p>
      <h1 className="display text-hero font-black text-white">Off target</h1>
      <p className="mt-6 max-w-md text-lg text-silver">This page doesn’t exist or was moved. The product may have sold out and been removed.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/shop">Shop all</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back home
        </ButtonLink>
      </div>
    </Container>
  );
}
