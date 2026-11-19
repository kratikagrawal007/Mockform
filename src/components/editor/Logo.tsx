/* eslint-disable @next/next/no-img-element -- static brand SVGs; nothing to optimise */

/**
 * Mockform's logo: the light app icon beside the outlined wordmark from the
 * brand kit (never retyped as text). The wordmark switches to its white
 * version in the dark theme, as the brand guidelines specify.
 */
export function Logo() {
  return (
    <div className="flex items-center gap-2" role="img" aria-label="Mockform">
      <img
        src="/brand/mockform-app-icon-light.svg"
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0"
      />
      {/* The wordmark artwork has built-in padding; its letters sit slightly above centre. */}
      <img
        src="/brand/mockform-wordmark-dark.svg"
        alt=""
        width={108}
        height={30}
        className="mt-1 hidden h-[30px] w-auto dark:block"
      />
      <img
        src="/brand/mockform-wordmark-light.svg"
        alt=""
        width={108}
        height={30}
        className="mt-1 h-[30px] w-auto dark:hidden"
      />
    </div>
  );
}
