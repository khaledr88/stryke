import type { ReactNode } from "react";
import { LogoMark } from "./Logo";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <LogoMark className="mb-6 h-auto w-16 opacity-25" sizes="64px" />
      <h2 className="display text-3xl text-white sm:text-4xl">{title}</h2>
      {body ? <p className="mt-3 max-w-md text-steel">{body}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
