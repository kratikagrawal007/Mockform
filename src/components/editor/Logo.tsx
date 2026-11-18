export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-accent" />
        <rect
          x="7.5"
          y="5.5"
          width="17"
          height="21"
          rx="4"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
        />
        <path
          d="M11.5 20.5v-9l4.5 5 4.5-5v9"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">
        Mockform
      </span>
    </div>
  );
}
