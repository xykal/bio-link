export const ICON_KEYS = [
  "link",
  "website",
  "instagram",
  "youtube",
  "github",
  "tiktok",
  "linkedin",
  "twitter",
  "x",
  "spotify",
  "whatsapp",
  "telegram",
  "email",
  "discord",
  "twitch",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

const paths: Record<IconKey, React.ReactNode> = {
  link: <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />,
  website: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  instagram: <><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
  youtube: <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></>,
  github: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>,
  tiktok: <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />,
  linkedin: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V8h4v2a6 6 0 0 1 2-2z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></>,
  twitter: <path d="M4 4l7.1 9.3L4.4 20h2.2l5.4-5.4L16 20h4l-7.4-9.7L19.5 4h-2.2l-4.7 4.7L8 4z"/>,
  x: <path d="M4 4l7.1 9.3L4.4 20h2.2l5.4-5.4L16 20h4l-7.4-9.7L19.5 4h-2.2l-4.7 4.7L8 4z"/>,
  spotify: <><circle cx="12" cy="12" r="10"/><path d="M7.5 9.5c4.5-1 8-.7 11 1.5M7.5 12.5c3.5-.8 6.5-.5 9 1M7.8 15.3c2.8-.6 5-.4 7 .8"/></>,
  whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9l-3.7.9.9-3.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5zM8.5 9c.5 2.5 2.5 4.5 5 5"/>,
  telegram: <path d="M21.5 4L2 11.5l5.5 2 2 6 3-3.5 5 3.5 4-15z"/>,
  email: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></>,
  discord: <path d="M15 5c3 0 6 2 6 4v8c0 2-3 4-6 4M9 5c-3 0-6 2-6 4v8c0 2 3 4 5 4M9 5v3M15 5v3M3 17V9h4M21 17V9h-4"/>,
  twitch: <path d="M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7M16 11V7"/>,
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const key = (ICON_KEYS.includes(name as IconKey) ? name : "link") as IconKey;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[key]}
    </svg>
  );
}
