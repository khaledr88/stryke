"use client";

import { useEffect } from "react";
import { Container } from "@/components/home/SectionHeading";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <h1 className="display text-6xl text-white">Something went wrong</h1>
      <p className="mt-4 max-w-md text-silver">We couldn’t load this page. Check your connection and try again.</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back home
        </ButtonLink>
      </div>
    </Container>
  );
}
