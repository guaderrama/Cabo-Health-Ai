import React from 'react';

export const CaboHealthLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg" {...props}>
    <text
      x="150"
      y="40"
      textAnchor="middle"
      fill="currentColor"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontWeight: 700,
        fontSize: '50px',
        letterSpacing: '2px'
      }}
    >
      CABO
    </text>
    <text
      x="150"
      y="95"
      textAnchor="middle"
      fill="currentColor"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontWeight: 700,
        fontSize: '50px',
        letterSpacing: '2px'
      }}
    >
      HEALTH
    </text>
  </svg>
);

export const BrainIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 9.5 7v0A2.5 2.5 0 0 1 7 4.5v0A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v0A2.5 2.5 0 0 1 14.5 7v0A2.5 2.5 0 0 1 12 4.5v0A2.5 2.5 0 0 1 14.5 2Z" />
    <path d="M12 12a2.5 2.5 0 0 1-2.5-2.5v0A2.5 2.5 0 0 1 12 7v0a2.5 2.5 0 0 1 2.5 2.5v0A2.5 2.5 0 0 1 12 12Z" />
    <path d="M4.5 12A2.5 2.5 0 0 0 7 9.5v0A2.5 2.5 0 0 0 4.5 7v0A2.5 2.5 0 0 0 2 9.5v0A2.5 2.5 0 0 0 4.5 12Z" />
    <path d="M19.5 12a2.5 2.5 0 0 0 2.5-2.5v0A2.5 2.5 0 0 0 19.5 7v0a2.5 2.5 0 0 0-2.5 2.5v0A2.5 2.5 0 0 0 19.5 12Z" />
    <path d="M9.5 22a2.5 2.5 0 0 0-2.5-2.5v0A2.5 2.5 0 0 0 4.5 17v0a2.5 2.5 0 0 0-2.5 2.5v0A2.5 2.5 0 0 0 4.5 22Z" />
    <path d="M14.5 22a2.5 2.5 0 0 0 2.5-2.5v0a2.5 2.5 0 0 0-2.5-2.5v0a2.5 2.5 0 0 0-2.5 2.5v0a2.5 2.5 0 0 0 2.5 2.5Z" />
    <path d="M12 12a2.5 2.5 0 0 0 2.5 2.5v0a2.5 2.5 0 0 0-2.5 2.5v0a2.5 2.5 0 0 0-2.5-2.5v0A2.5 2.5 0 0 0 12 12Z" />
  </svg>
);

export const MicrophoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

export const StopIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

export const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

export const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

export const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);
