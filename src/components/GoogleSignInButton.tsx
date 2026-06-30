import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { googleLogin } from '../features/auth/authSlice';
import { useAuthFlow } from '../features/auth/useAuthFlow';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Minimal shape of the Google Identity Services API we use. */
interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('gsi-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * "Continue with Google" button backed by Google Identity Services. Renders nothing unless
 * VITE_GOOGLE_CLIENT_ID is configured, so it never ships as a dead button.
 */
export function GoogleSignInButton() {
  const dispatch = useAppDispatch();
  const finishAuth = useAuthFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let active = true;

    loadGsiScript()
      .then(() => {
        const google = (window as unknown as { google?: GoogleIdApi }).google;
        if (!active || !google || !containerRef.current) return;

        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response) => {
            const result = await dispatch(googleLogin(response.credential));
            if (googleLogin.fulfilled.match(result)) {
              await finishAuth((result.payload as { userId?: string }).userId);
            }
          },
        });
        google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: 320,
        });
      })
      .catch(() => {
        /* network blocked or offline — silently fall back to email auth */
      });

    return () => {
      active = false;
    };
  }, [dispatch, finishAuth]);

  if (!CLIENT_ID) return null;

  return (
    <div className="google-signin">
      <div className="auth-divider"><span>or</span></div>
      <div ref={containerRef} className="d-flex justify-content-center" />
    </div>
  );
}
