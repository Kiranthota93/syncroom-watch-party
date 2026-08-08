// getUserMedia() is unconditionally blocked by the browser on any origin
// that isn't HTTPS or localhost — no amount of app code can work around
// that boundary. Checking this upfront lets the UI show an accurate reason
// instead of the misleading "permission denied" (which implies the user
// clicked "Block", when really the browser never even prompted).
export const isSecureContext = () =>
  typeof window === 'undefined' || window.isSecureContext;

export const INSECURE_CONTEXT_ERROR = {
  code: 'insecure_context',
  message: "Mic/camera need a secure connection (HTTPS or localhost) — this won't work over a plain http:// address.",
};
