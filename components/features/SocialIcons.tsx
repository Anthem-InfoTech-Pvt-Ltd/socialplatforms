import type { SVGProps } from 'react';

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.94 6.5a1.44 1.44 0 1 1 0-2.88 1.44 1.44 0 0 1 0 2.88Z" />
      <path d="M4.5 9h4.88v10.5H4.5z" />
      <path d="M11.75 9h4.5v1.7c.64-1.1 1.9-1.9 3.4-1.9 2.55 0 3.85 1.68 3.85 4.55v6.15h-4.5v-5.4c0-1.3-.47-2.2-1.65-2.2-.9 0-1.43.6-1.67 1.19-.09.21-.11.5-.11.8v5.61h-4.5V9Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15.5 8.5h-2c-.83 0-1.5.67-1.5 1.5v2h3.5l-.5 3H12v7h-3v-7H7v-3h2v-2.3C9 6.9 10.6 5.5 13 5.5h2.5v3Z" />
    </svg>
  );
}