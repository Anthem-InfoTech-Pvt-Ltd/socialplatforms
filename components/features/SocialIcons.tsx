import type { SVGProps } from 'react';

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="#ffffff" stroke="none" {...props}>
      <circle cx="4.75" cy="4.75" r="2.1" />
      <rect x="3" y="9" width="3.5" height="11.5" rx="0.6" />
      <path d="M9.75 9h3.35v1.73c.63-1.13 1.98-2.03 3.87-2.03 3.1 0 4.53 1.95 4.53 5.3v6.5h-3.5v-5.86c0-1.62-.58-2.72-2.02-2.72-1.1 0-1.75.74-2.04 1.45-.1.26-.13.61-.13.97v6.16h-3.5V9Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="#ffffff" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="#ffffff" stroke="none" {...props}>
      <path d="M15.5 8.5h-2c-.83 0-1.5.67-1.5 1.5v2h3.5l-.5 3H12v7h-3v-7H7v-3h2v-2.3C9 6.9 10.6 5.5 13 5.5h2.5v3Z" />
    </svg>
  );
}