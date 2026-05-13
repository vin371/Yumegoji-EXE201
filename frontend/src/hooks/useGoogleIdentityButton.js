/* eslint-env browser */
import { useEffect, useRef } from 'react';

/**
 * Gắn nút Google Identity Services vào mountRef (div rỗng).
 * @param {(credential: string) => void} onCredential
 * @param {{ text?: 'signin_with' | 'signup_with' | 'continue_with' }} [options]
 */
export function useGoogleIdentityButton(onCredential, options = {}) {
  const { text = 'signin_with' } = options;
  const mountRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return undefined;
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    let cancelled = false;
    let intervalId;

    const tryMount = () => {
      const g = globalThis.google;
      if (cancelled || !g?.accounts?.id) return false;
      mountEl.replaceChildren();
      g.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => {
          void onCredential(res?.credential);
        },
      });
      const wrap = mountEl.closest('.auth-google-pill-wrap');
      const w = Math.min(280, wrap?.clientWidth || mountEl.parentElement?.clientWidth || 280);
      g.accounts.id.renderButton(mountEl, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text,
        width: w,
        locale: 'vi',
      });
      return true;
    };

    if (!tryMount()) {
      intervalId = globalThis.setInterval(() => {
        if (tryMount() && intervalId != null) globalThis.clearInterval(intervalId);
      }, 120);
    }

    return () => {
      cancelled = true;
      if (intervalId != null) globalThis.clearInterval(intervalId);
      mountEl.replaceChildren();
    };
  }, [onCredential, clientId, text]);

  return { mountRef, clientIdConfigured: !!clientId };
}
