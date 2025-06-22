import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show the install prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 1000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Error during install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Check if dismissed in this session
  if (sessionStorage.getItem('installPromptDismissed')) {
    return null;
  }

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Show manual prompt if PWA features are available but no automatic prompt
  const showManualPrompt = !deferredPrompt && !isInstalled;

  // Always show the install prompt for now
  if (!showPrompt && !showManualPrompt) {
    setTimeout(() => setShowPrompt(true), 2000);
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-xs">
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white p-3 rounded-lg shadow-lg border border-white/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1">Add to Home Screen</p>
            
            <div className="flex gap-2">
              <button
                onClick={deferredPrompt ? handleInstallClick : () => alert('Use browser menu: Share → Add to Home Screen')}
                className="bg-white text-emerald-600 px-2 py-1 rounded text-xs font-medium hover:bg-white/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="text-white/70 hover:text-white text-xs"
              >
                Later
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white p-0.5 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}