import { useState, useRef, useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addListener, removeListener, launch } from "devtools-detector";

export const usePWAProtection = () => {
  const { t } = useTranslation();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const skipHosts = ["localhost", "devapp"];

    if (skipHosts.some((host) => window.location.hostname.includes(host))) return;

    const isInStandaloneMode = () => {
      const isStandaloneDisplay = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone =
        typeof navigator !== "undefined" && "standalone" in navigator && navigator.standalone === true;

      return isStandaloneDisplay || isIOSStandalone;
    };

    const isNativeApp = (window as any).__IS_NATIVE_APP__ === true || Capacitor.getPlatform() === "android";

    // 非 PWA + 非 Native 才擋
    if (!isNativeApp && !isInStandaloneMode()) {
      alert(t("modal.exit_app"));
      window.location.href = "https://comicloveu.com/";
    }
  }, []);
};

export const useDevtoolsBlocker = () => {
  const { t } = useTranslation();
  const hasBlockedRef = useRef(false);

  useEffect(() => {
    const skipHosts = ["localhost", "devapp"];

    if (skipHosts.some((host) => window.location.hostname.includes(host))) return;

    const threshold = 120;
    let checkInterval: NodeJS.Timeout;

    const triggerBlock = () => {
      if (hasBlockedRef.current) return;

      hasBlockedRef.current = true;
      alert(t("modal.devtools_blocked"));
      window.location.replace("https://comicloveu.com/");
    };

    const detectDebuggerDelay = () => {
      const start = performance.now();
      debugger;
      const duration = performance.now() - start;

      if (duration > threshold) {
        triggerBlock();
      }
    };

    const detectConsoleOpen = () => {
      const start = performance.now();

      console.log("%c", {
        get value() {
          const duration = performance.now() - start;
          if (duration > 100) {
            triggerBlock();
          }
          return "";
        },
      });
    };

    // 初始檢查
    detectDebuggerDelay();
    detectConsoleOpen();

    checkInterval = setInterval(() => {
      detectDebuggerDelay();
      detectConsoleOpen();
    }, 5000);

    return () => {
      clearInterval(checkInterval);
    };
  }, []);
};
interface ExitState {
  alert: boolean;
  message: string;
  confirm: boolean;
  id: string;
}

export const useBackButtonExit = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [exit, setExit] = useState<ExitState>({
    alert: false,
    message: "",
    confirm: false,
    id: "",
  });

  const handleConfirmExit = () => {
    setExit((prev) => ({ ...prev, alert: false }));
    CapacitorApp.exitApp();
  };

  useEffect(() => {
    let backHandler: any;

    const setupBackHandler = async () => {
      backHandler = await CapacitorApp.addListener("backButton", () => {
        if (location.pathname !== "/") {
          navigate(-1);
        } else {
          setExit((prev) => ({
            ...prev,
            alert: true,
            message: t("modal.confirm_exit_app"),
          }));
        }
      });
    };

    setupBackHandler();

    return () => {
      if (backHandler) backHandler.remove();
    };
  }, [location, navigate]);

  return {
    exit,
    setExit,
    confirmExit: handleConfirmExit,
  };
};
