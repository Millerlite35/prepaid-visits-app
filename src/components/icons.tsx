// Small line icons for navigation (inline SVG, no icon library). 20 x 20, currentColor.

const paths: Record<string, string> = {
  overview: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z",
  scan: "M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M13 3h2.5A1.5 1.5 0 0 1 17 4.5V7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13M7 17H4.5A1.5 1.5 0 0 1 3 15.5V13M3 10h14",
  kiosk: "M3.5 4h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM7 17.5h6M10 14v3.5",
  clients: "M7.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5M13.5 3.2a3 3 0 0 1 0 5.6M15 12.2c1.8.6 3 2.4 3 4.8",
  packages: "M10 2.5 17 6v8l-7 3.5L3 14V6zM3 6l7 3.5L17 6M10 9.5v8",
  flyers: "M3 8.5v3l2 .5 1 4h2l-.6-3.5L16 15V5L5 8zM16 7.5a2.5 2.5 0 0 1 0 5",
  cards: "M3.5 5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM11.5 8h3.5v3.5h-3.5zM5 9h4M5 11.5h3",
  staff: "M10 9.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM3.5 17.5c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5",
  settings:
    "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16.2 11.6l1.3.9-1.5 2.6-1.5-.5a6 6 0 0 1-1.6.9L12.6 17H9.4l-.3-1.5a6 6 0 0 1-1.6-.9l-1.5.5-1.5-2.6 1.3-.9a6 6 0 0 1 0-1.8l-1.3-.9 1.5-2.6 1.5.5a6 6 0 0 1 1.6-.9L9.4 3h3.2l.3 1.5a6 6 0 0 1 1.6.9l1.5-.5 1.5 2.6-1.3.9a6 6 0 0 1 0 1.8Z",
  help: "M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM7.8 7.6a2.3 2.3 0 0 1 4.4.9c0 1.5-2.2 2-2.2 3.3M10 14.2v.1",
  security: "M10 2.5 16 5v4.5c0 3.8-2.6 6.6-6 8-3.4-1.4-6-4.2-6-8V5zM7.5 10l1.8 1.8L12.8 8",
  back: "M12.5 4.5 7 10l5.5 5.5",
  external: "M11 3.5h5.5V9M16.5 3.5 9 11M14 12v3.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H8",
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
