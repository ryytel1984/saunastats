import { useState, useEffect } from "react";

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  const [showChromeIOS, setShowChromeIOS] = useState(false);

  useEffect(() => {
    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    const isChromeIOS = isIOS && /crios/i.test(navigator.userAgent);

    if (isChromeIOS) {
      const dismissed = localStorage.getItem("pwa-chromeios-dismissed");
      if (!dismissed) setShowChromeIOS(true);
      return;
    }

    if (isIOS && isSafari) {
      const dismissed = localStorage.getItem("pwa-ios-dismissed");
      if (!dismissed) setShowIOS(true);
      return;
    }

    // Android/Chrome — wait for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa-android-dismissed");
      if (!dismissed) setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowAndroid(false);
    setDeferredPrompt(null);
  };

  const dismissAndroid = () => {
    localStorage.setItem("pwa-android-dismissed", "1");
    setShowAndroid(false);
  };

  const dismissIOS = () => {
    localStorage.setItem("pwa-ios-dismissed", "1");
    setShowIOS(false);
  };

  if (showAndroid) return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-stone-900 border border-orange-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
      <img src="/08_saunastats-app-icon-gold.svg" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm">Install SaunaStats</div>
        <div className="text-stone-400 text-xs">Add to home screen for quick access</div>
      </div>
      <button onClick={dismissAndroid} className="text-stone-500 hover:text-stone-300 text-lg px-1">✕</button>
      <button onClick={handleAndroidInstall}
        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 transition">
        Install
      </button>
    </div>
  );

  if (showIOS) return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-stone-900 border border-orange-500/30 rounded-2xl px-4 py-3 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <img src="/08_saunastats-app-icon-gold.svg" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1">
          <div className="text-white font-semibold text-sm">Install SaunaStats</div>
          <div className="text-stone-400 text-xs">Add to home screen for quick access</div>
        </div>
        <button onClick={dismissIOS} className="text-stone-500 hover:text-stone-300 text-lg px-1">✕</button>
      </div>
      <div className="text-stone-300 text-xs flex items-center gap-1.5 pl-1">
        Tap <span className="bg-stone-700 text-white text-xs px-1.5 py-0.5 rounded">⬆ Share</span> then
        <span className="bg-stone-700 text-white text-xs px-1.5 py-0.5 rounded">Add to Home Screen</span>
      </div>
    </div>
  );

  if (showChromeIOS) return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-stone-900 border border-orange-500/30 rounded-2xl px-4 py-3 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <img src="/08_saunastats-app-icon-gold.svg" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1">
          <div className="text-white font-semibold text-sm">Install SaunaStats</div>
          <div className="text-stone-400 text-xs">Open in Safari to add to home screen</div>
        </div>
        <button onClick={() => { localStorage.setItem("pwa-chromeios-dismissed", "1"); setShowChromeIOS(false); }}
          className="text-stone-500 hover:text-stone-300 text-lg px-1">✕</button>
      </div>
      <div className="text-stone-300 text-xs pl-1">
        Chrome doesn't support home screen install on iOS. Open <span className="text-orange-400">saunastats.eu</span> in Safari instead.
      </div>
    </div>
  );

  return null;
}
