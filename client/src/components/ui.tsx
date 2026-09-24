import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { LoaderCircle, Search, X } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "soft" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

const buttonTones = {
  primary: "bg-ink text-white shadow-[0_8px_18px_rgba(31,29,47,0.15)] hover:bg-plum",
  soft: "bg-lilac text-plum hover:bg-lilac-deep",
  ghost: "text-ink-soft hover:bg-lilac/70 hover:text-ink",
  danger: "bg-rose text-white hover:bg-rose-dark",
  outline: "border border-line bg-white text-ink-soft hover:border-plum hover:text-plum",
};

export function Button({ className = "", tone = "primary", size = "md", children, ...props }: ButtonProps) {
  const sizes = {
    sm: "h-9 rounded-xl px-3 text-xs",
    md: "h-11 rounded-xl px-4 text-sm",
    lg: "h-13 rounded-2xl px-5 text-sm",
    icon: "h-10 w-10 rounded-xl",
  };
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${buttonTones[tone]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-plum focus:ring-4 focus:ring-plum/10 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-11 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-plum focus:ring-4 focus:ring-plum/10 ${className}`}
      {...props}
    />
  );
}

export function SearchField({ value, onChange, placeholder = "Search", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <Field className="pl-10 pr-9" value={value} onChange={onChange} placeholder={placeholder} {...props} />
      {!!value && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition hover:text-ink"
          onClick={() => onChange?.({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <LoaderCircle className={`h-5 w-5 animate-spin ${className}`} />;
}

export function Surface({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl border border-line bg-white shadow-[0_14px_40px_rgba(46,40,66,0.05)] ${className}`}>{children}</section>;
}

export function StatusMessage({
  icon,
  title,
  copy,
  action,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lilac text-plum">{icon}</div>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-ink-muted">{copy}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stars({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="tracking-[-0.12em] text-amber">★★★★★</span>
      <span className="font-semibold text-ink-soft">{value.toFixed(1)}</span>
    </span>
  );
}
