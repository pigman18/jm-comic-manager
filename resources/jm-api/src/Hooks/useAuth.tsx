import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const checkThreeDaysExpiry = () => {
  const expiry = localStorage.getItem("dontShowExpiry");
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem("dontShowExpiry");
    window.location.reload();
  }
};

export const saveAuthData = (token: any, memberData: any) => {
  const expiryTime = Date.now() + 60 * 60 * 1000;
  localStorage.setItem("jwttoken", JSON.stringify(token));
  localStorage.setItem("memberInfo", JSON.stringify(memberData));
  localStorage.setItem("authExpiry", expiryTime.toString());
  window.dispatchEvent(new CustomEvent("authUpdated", { detail: { logined: true, memberInfo: memberData } }));
};

const checkAuthExpiry = (setConfig: React.Dispatch<React.SetStateAction<any>>) => {
  const expiry = localStorage.getItem("authExpiry");
  if (!expiry) return;

  const expiryTime = parseInt(expiry, 10);

  if (Date.now() > expiryTime) {
    clearAuth(setConfig);
  }
};

export const AuthChecker = ({ setConfig }: { setConfig: React.Dispatch<React.SetStateAction<any>> }) => {
  const location = useLocation();

  useEffect(() => {
    checkAuthExpiry(setConfig);
    checkThreeDaysExpiry();
  }, [location.pathname, setConfig]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAuthExpiry(setConfig);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [setConfig]);

  return null;
};

export const clearAuth = (setConfig: React.Dispatch<React.SetStateAction<any>>, clearAll?: boolean) => {
  setConfig((prev: any) => ({ ...prev, logined: false }));
  localStorage.removeItem("jwttoken");
  localStorage.removeItem("authExpiry");
  if (clearAll) {
    localStorage.removeItem("memberInfo");
    localStorage.removeItem("memberAccount");
    window.location.reload();
  }
};
