// Hand-rolled inline SVG icons, matching the stroke conventions already used
// across the app (RoomHeader.jsx, SourceSelector.jsx) — no icon library
// dependency (no lucide-react).

import PropTypes from 'prop-types';

const sizeProp = { size: PropTypes.number };

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const IconMic = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

export const IconMicOff = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M9 9v3a3 3 0 0 0 4.6 2.55M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M5 10v1a7 7 0 0 0 10.6 5.98M19 10v1a7 7 0 0 1-.34 2.13" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);

export const IconCamera = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M23 7l-7 5 7 5V7z" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);

export const IconCameraOff = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M9 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 1.41-.59" />
    <path d="M23 7l-7 5v3.5M16 8.5V7a2 2 0 0 0-2-2h-1.5" />
  </svg>
);

export const IconHeadphones = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

export const IconHeadphonesOff = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M3 15v-3a9 9 0 0 1 15.5-6.2M21 15v-3a9 9 0 0 0-.6-3.2" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

export const IconPhoneOff = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a1 1 0 0 1 1.05-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V19a1 1 0 0 1-1 1A17 17 0 0 1 4 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1z" />
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const IconPin = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M12 17v5" />
    <path d="M9 3h6l1 6 3 3v2H5v-2l3-3z" />
  </svg>
);

export const IconMaximize = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
  </svg>
);

export const IconUsers = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconUpload = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

IconMic.propTypes = sizeProp;
IconMicOff.propTypes = sizeProp;
IconCamera.propTypes = sizeProp;
IconCameraOff.propTypes = sizeProp;
IconHeadphones.propTypes = sizeProp;
IconHeadphonesOff.propTypes = sizeProp;
IconPhoneOff.propTypes = sizeProp;
IconPin.propTypes = sizeProp;
IconMaximize.propTypes = sizeProp;
IconUsers.propTypes = sizeProp;
IconUpload.propTypes = sizeProp;
