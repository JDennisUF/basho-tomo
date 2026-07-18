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
  const isLatinName = /[A-Za-z]/.test(primary);

  return (
    <div className={`min-w-0 w-full ${reverse ? "text-right" : "text-left"}`}>
      <span
        className={`block truncate whitespace-nowrap pb-0.5 leading-[1.12] ${
          isLatinName ? "text-[19px] sm:text-[22px]" : "text-[20px] sm:text-[24px]"
        } ${
          emphasized ? "text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]"
        } ${reverse ? "text-right" : "text-left"}`}
        title={secondary}
      >
        {primary || "読込中"}
      </span>
    </div>
  );
}
