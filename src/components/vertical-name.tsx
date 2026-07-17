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
    <div className="flex items-center justify-center gap-2">
      <span
        className={`vertical-name text-lg leading-none sm:text-xl ${
          emphasized ? "font-semibold text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]"
        }`}
        title={secondary}
      >
        {primary}
      </span>
      {secondary ? (
        <span
          className="fine-label data-sans hidden text-[9px] uppercase text-[color:var(--ink-soft)] lg:block"
          title={secondary}
        >
          {secondary}
        </span>
      ) : null}
    </div>
  );
}
