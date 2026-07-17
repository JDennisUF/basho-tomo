type VerticalNameProps = {
  primary: string;
  secondary?: string;
  emphasized?: boolean;
  reverse?: boolean;
};

export function VerticalName({
  primary,
  secondary,
  emphasized = false,
  reverse = false,
}: VerticalNameProps) {
  return (
    <div className="min-w-0">
      <div
        className={`flex min-w-0 items-baseline gap-2 ${
          reverse ? "flex-row-reverse justify-start" : ""
        }`}
      >
        <span
          className={`block truncate pb-1 text-[26px] leading-[1.18] sm:text-[32px] ${
            emphasized ? "text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]"
          }`}
          title={secondary}
        >
          {primary || "読込中"}
        </span>
      </div>
    </div>
  );
}
