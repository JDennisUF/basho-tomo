type VerticalNameProps = {
  primary: string;
  secondary?: string;
  emphasized?: boolean;
};

export function VerticalName({
  primary,
  secondary,
  emphasized = false,
}: VerticalNameProps) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-2">
      <span
        className={`block truncate text-lg leading-none sm:text-xl ${
          emphasized ? "font-semibold text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]"
        }`}
        title={secondary}
      >
        {primary || "読込中"}
      </span>
      {secondary ? (
        <span
          className="fine-label data-sans block truncate text-[10px] uppercase text-[color:var(--ink-soft)]"
          title={secondary}
        >
          {secondary}
        </span>
      ) : null}
      </div>
    </div>
  );
}
