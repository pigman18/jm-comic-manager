import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface DarkModeToggleProps {
  isButtonVisible?: boolean;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ isButtonVisible }) => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const { t } = useTranslation();

  // 初始化，檢查 localStorage 或系統設置
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      setDarkMode(savedMode === "true");
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      // const root = document.getElementById("root") as HTMLElement;
      // root.style.background = "#000000";
    }
  }, []);

  // 切換暗模式
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("darkMode", (!darkMode).toString());
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  if (!isButtonVisible) {
    return null;
  }

  return (
    <button onClick={toggleDarkMode} className="text-og">
      {darkMode ? t("comic.close") : t("comic.open")}
    </button>
  );
};

export default DarkModeToggle;
