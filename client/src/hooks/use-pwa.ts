import { useState, useEffect } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Register service worker - DISABLED IN DEVELOPMENT
    // Uncomment this in production only
    /*
    if ('serviceWorker' in navigator) {
      // Unregister all service workers in development
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('Service Worker unregistered for development');
        }
      });
      
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
    */
    
    // In development, always unregister service workers
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log('✅ Service Worker unregistered for development');
          });
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
  };

  return { isInstallable, install };
}
