"use client";

export function NextjsLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none">
      <mask height="180" id="mask0" maskUnits="userSpaceOnUse" width="180" x="0" y="0" style={{ maskType: "alpha" }}>
        <circle cx="90" cy="90" fill="#000" r="90" />
      </mask>
      <g mask="url(#mask0)">
        <circle cx="90" cy="90" fill="#000" r="90" />
        <path
          d="M149.508 157.438L69.1478 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.137 149.508 157.438Z"
          fill="url(#paint0_linear)"
        />
        <rect fill="url(#paint1_linear)" height="72" width="12" x="115" y="54" />
      </g>
      <defs>
        <linearGradient id="paint0_linear" x1="109" x2="144.5" y1="116.5" y2="160.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="paint1_linear" x1="121" x2="120.799" y1="54" y2="106.875" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function FastApiLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#05998b" />
      <path
        d="M13.2 5L7 13.2H12L10.8 19L17 10.8H12L13.2 5Z"
        fill="white"
        stroke="white"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PostgresLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C7.58 2 4 5.58 4 10C4 13.85 6.72 17.06 10.36 17.82V14.65C9.72 14.52 9.21 14.13 8.92 13.59C8.61 13.01 8.65 12.33 9.02 11.79L10.36 9.87V7.5C10.36 6.67 11.03 6 11.86 6H12.14C12.97 6 13.64 6.67 13.64 7.5V9.87L14.98 11.79C15.35 12.33 15.39 13.01 15.08 13.59C14.79 14.13 14.28 14.52 13.64 14.65V17.82C17.28 17.06 20 13.85 20 10C20 5.58 16.42 2 12 2Z"
        fill="#336791"
      />
      <circle cx="12" cy="12" r="9" stroke="#336791" strokeWidth="1.5" />
      <path d="M9 13.5C9.8 14.2 10.8 14.5 12 14.5C13.2 14.5 14.2 14.2 15 13.5" stroke="#336791" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function TerraformLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fill="#5c4ee5" d="M1.5 2.5L8.5 6.5V14.5L1.5 10.5V2.5Z" />
      <path fill="#844fba" d="M9.5 7.1L16.5 11.1V19.1L9.5 15.1V7.1Z" />
      <path fill="#6d53e8" d="M17.5 11.7L22.5 14.5V21.5L17.5 18.7V11.7Z" />
      <path fill="#844fba" d="M9.5 16.1L16.5 20.1V22.5L9.5 18.5V16.1Z" opacity="0.8" />
    </svg>
  );
}

export function GitHubActionsLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#181717" stroke="rgba(255,255,255,0.15)" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 4C7.58 4 4 7.58 4 12C4 15.54 6.29 18.53 9.47 19.59C9.87 19.66 10.02 19.42 10.02 19.21C10.02 19.02 10.01 18.39 10.01 17.72C7.79 18.21 7.32 16.65 7.32 16.65C6.96 15.74 6.44 15.5 6.44 15.5C5.72 15 6.5 15.01 6.5 15.01C7.3 15.07 7.72 15.83 7.72 15.83C8.43 17.04 9.58 16.7 10.04 16.49C10.11 15.97 10.32 15.62 10.55 15.42C8.77 15.22 6.91 14.53 6.91 11.47C6.91 10.6 7.22 9.88 7.73 9.32C7.65 9.12 7.37 8.3 7.81 7.2C7.81 7.2 8.48 6.99 10.01 8.02C10.65 7.84 11.33 7.75 12.01 7.75C12.69 7.75 13.37 7.84 14.01 8.02C15.54 6.99 16.21 7.2 16.21 7.2C16.65 8.3 16.37 9.12 16.29 9.32C16.8 9.88 17.11 10.6 17.11 11.47C17.11 14.54 15.24 15.22 13.46 15.41C13.75 15.66 14 16.14 14 16.89C14 17.96 13.99 18.82 13.99 19.09C13.99 19.3 14.13 19.55 14.54 19.47C17.71 18.41 20 15.42 20 11.88C20 7.58 16.42 4 12 4Z"
        fill="#2088ff"
      />
    </svg>
  );
}

export function VercelLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L24 22H0L12 2Z" fill="white" />
    </svg>
  );
}

export function RailwayLogo({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M2.5 12C2.5 6.75329 6.75329 2.5 12 2.5C17.2467 2.5 21.5 6.75329 21.5 12C21.5 17.2467 17.2467 21.5 12 21.5C6.75329 21.5 2.5 17.2467 2.5 12Z"
        fill="#13111C"
        stroke="rgba(255,255,255,0.12)"
      />
      <path
        d="M6.5 17.5V11.5C6.5 8.73858 8.73858 6.5 11.5 6.5C14.2614 6.5 16.5 8.73858 16.5 11.5V17.5H13.8V11.5C13.8 10.2298 12.7702 9.2 11.5 9.2C10.2298 9.2 9.2 10.2298 9.2 11.5V17.5H6.5Z"
        fill="#F43F5E"
      />
      <circle cx="11.5" cy="14" r="1.5" fill="#8B5CF6" />
    </svg>
  );
}

export function RedisLogo({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M21.5 7.5L12 2.5L2.5 7.5L12 12.5L21.5 7.5Z"
        fill="#dc382d"
      />
      <path
        d="M2.5 7.5V16.5L12 21.5V12.5L2.5 7.5Z"
        fill="#a3241b"
      />
      <path
        d="M21.5 7.5V16.5L12 21.5V12.5L21.5 7.5Z"
        fill="#c22e24"
      />
      <circle cx="12" cy="7.5" r="1.5" fill="white" opacity="0.9" />
    </svg>
  );
}

export function S3Logo({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z"
        fill="#e25345"
        opacity="0.9"
      />
      <path d="M4 7.5L12 12L20 7.5" stroke="white" strokeWidth="1.2" />
      <path d="M12 12V21" stroke="white" strokeWidth="1.2" />
      <path d="M12 6.5L6.5 9.5L12 12.5L17.5 9.5L12 6.5Z" fill="white" opacity="0.8" />
    </svg>
  );
}

export function SlackLogo({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A" />
      <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0" />
      <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D" />
      <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E" />
      <path d="M15.165 17.688a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.52-2.521h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
    </svg>
  );
}

export function SecurityOidcLogo({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L3 6V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V6L12 2Z"
        fill="#10b981"
        opacity="0.2"
        stroke="#10b981"
        strokeWidth="1.5"
      />
      <path d="M9 12L11 14L15 10" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
