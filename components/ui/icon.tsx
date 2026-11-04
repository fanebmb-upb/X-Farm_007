import type { ReactNode } from "react";

type IconName = "home" | "leaf" | "chart" | "sparkles" | "settings" | "cloud" | "sliders" | "plus" | "chevron" | "bell" | "droplet" | "thermometer" | "sun" | "clock" | "play" | "pause" | "close" | "check" | "alert" | "sprout" | "coins" | "clipboard";

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  leaf: <><path d="M20.5 3.5C11 3 5 6.7 5 13a6 6 0 0 0 6 6c6.3 0 9.9-6 9.5-15.5Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
  chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></>,
  sparkles: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16ZM5 2l.5 1.5L7 4l-1.5.5L5 6l-.5-1.5L3 4l1.5-.5L5 2Z" /></>,
  settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4L17 17.4a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2A1.7 1.7 0 0 0 5.4 7l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a1.7 1.7 0 1 1 3.4 0v.2A1.7 1.7 0 0 0 17 4.6l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.3 1.7Z" /></>,
  cloud: <path d="M20 16.5a4 4 0 0 0-1-7.9A6 6 0 0 0 7.4 7a4.5 4.5 0 0 0-.9 9h13.5Z" />,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M2 14h4M10 8h4M18 16h4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  droplet: <path d="M12 22a8 8 0 0 0 8-8c0-4.5-8-12-8-12S4 9.5 4 14a8 8 0 0 0 8 8Z" />,
  thermometer: <><path d="M14 14.8V5a3 3 0 0 0-6 0v9.8a5 5 0 1 0 6 0Z" /><path d="M11 11v7" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  play: <path d="m8 5 12 7-12 7V5Z" />,
  pause: <><path d="M8 5h3v14H8zM15 5h3v14h-3z" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  alert: <><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V4ZM9 11h6M9 15h6" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3M15 7v2" /><ellipse cx="15" cy="14" rx="6" ry="3" /><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-3" /></>,
  sprout: <><path d="M12 22v-9" /><path d="M12 13C4 13 3 8 3 4c6 0 9 2 9 9ZM12 17c8 0 9-5 9-9-6 0-9 2-9 9Z" /></>,
};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export type { IconName };
