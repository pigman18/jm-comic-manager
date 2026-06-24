import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FETCH_GET_SETTINGS_THUNK } from "./actions/settingAction";
import { useDispatch } from "react-redux";
import { AppDispatch } from "./store";
import { FETCH_ALL_ADS_THUNK, FETCH_COVER_ADS_THUNK } from "./actions/mainAction";
import DarkModeToggle from "./components/Common/DarkModeToggle";
import { FETCH_LOGIN_THUNK } from "./actions/memberAction";
import GlobalStore from "./config/GlobalStore";

interface GlobalConfig {
  hostReady: boolean;
  host: string;
  setting: Record<string, any>;
  memberInfo: Record<string, any>;
  app_img_shunt: string;
  express: string;
  darkMode: boolean;
  lang: string;
  logined: boolean;
  error: string;
  ads: Record<string, any>;
  version: string;
}

const defaultConfig: GlobalConfig = {
  hostReady: false,
  host: "",
  setting: {},
  memberInfo: {},
  app_img_shunt: "1",
  express: "",
  lang: "0",
  darkMode: false,
  logined: false,
  error: "",
  ads: {},
  version: "0.0.0",
};

const GlobalConfigContext = createContext<{
  config: GlobalConfig;
  setConfig: React.Dispatch<React.SetStateAction<GlobalConfig>>;
}>({
  config: defaultConfig,
  setConfig: () => {},
});

export const useGlobalConfig = () => useContext(GlobalConfigContext);

export const GlobalConfigProvider = ({ children }: any) => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [config, setConfig] = useState<GlobalConfig>(() => {
    const imgSource = localStorage.getItem("imageSource") || "1";
    const memberInfo = JSON.parse(localStorage.getItem("memberInfo") as string) || defaultConfig.memberInfo;
    const logined = localStorage.getItem("jwttoken") !== null;
    const host = localStorage.getItem("apiUrl") || "";
    const darkMode = localStorage.getItem("darkMode") === "true" || false;
    const ads = JSON.parse(localStorage.getItem("adsList") as string) || {};
    return { ...defaultConfig, ads, host, imgSource, memberInfo, logined, darkMode };
  });

  const savedDarkMode = localStorage.getItem("darkMode");
  const langStorage = localStorage.getItem("lang");
  const lang = langStorage === "0" || config.setting?.is_cn === 0 ? "zh-TW" : "zh-CN";

  const [memberAccount, setMemberAccount] = useState(() => {
    const item = localStorage.getItem("memberAccount");
    return item ? JSON.parse(item) : null;
  });

  // // ✅ 自動登入
  const login = useCallback(async () => {
    if (!memberAccount) return;
    try {
      const result = await dispatch(
        FETCH_LOGIN_THUNK({
          username: memberAccount.username,
          password: memberAccount.password,
        })
      ).unwrap();

      if (result.code === 200) {
        setConfig((prev) => ({ ...prev, logined: true, memberInfo: result.data }));
      }
    } catch (err) {
      setConfig((prev) => ({ ...prev, logined: false }));
    }
  }, [dispatch, memberAccount]);

  // // ✅ 自動判斷登入狀態
  useEffect(() => {
    if (!config.logined && memberAccount && Object.keys(memberAccount).length > 0) {
      login();
    }
  }, [config.logined, memberAccount]);

  useEffect(() => {
    const handleStorage = () => {
      const item = localStorage.getItem("memberAccount");
      setMemberAccount(item ? JSON.parse(item) : null);
    };

    const handleAuthUpdated = (e: Event) => {
      const { logined, memberInfo } = (e as CustomEvent).detail;
      setConfig((prev) => ({ ...prev, logined, memberInfo }));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("authUpdated", handleAuthUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("authUpdated", handleAuthUpdated);
    };
  }, []);

  useEffect(() => {
    if (savedDarkMode) {
      setConfig({ ...config, darkMode: savedDarkMode === "true" });
    } else {
      localStorage.setItem("darkMode", "false");
    }
    if (langStorage) {
      setConfig({ ...config, lang: langStorage });
      i18n.changeLanguage(lang);
    } else {
      localStorage.setItem("lang", "0");
    }
  }, [savedDarkMode]);

  useEffect(() => {
    const { hostReady, host, setting, ads } = config;
    const oldAdsCache = localStorage.getItem("oldAdsCache") || "";
    if (
      (!hostReady && host === "" && Object.keys(setting).length === 0) ||
      (Object.keys(ads)?.length !== 0 && setting.ad_cache_version === Number(oldAdsCache))
    ) {
      return;
    }
    const getAds = async () => {
      if (hostReady && setting.ipcountry) {
        const ipcountry = setting.ipcountry;
        const adsLang = config.setting?.is_cn === 0 ? "TW" : "CN";

        const data = await dispatch(
          FETCH_ALL_ADS_THUNK({ lang: adsLang, ipcountry, v: setting.ad_cache_version })
        ).unwrap();
        if (data) {
          setConfig((prev) => ({ ...prev, ads: data }));
          localStorage.setItem("adsList", JSON.stringify(data));
        }
      }
    };
    getAds();
  }, [config.hostReady, config.setting]);

  useEffect(() => {
    if (!config.hostReady) return;

    const fetchSettingImgSource = async () => {
      try {
        const { host, setting, app_img_shunt, express } = config;
        let info = setting;
        if (Object.keys(setting).length === 0 || app_img_shunt) {
          info = await dispatch(FETCH_GET_SETTINGS_THUNK({ app_img_shunt, express })).unwrap();
          setConfig((prevConfig) => ({
            ...prevConfig,
            setting: info || prevConfig.setting,
            imgSource: app_img_shunt || prevConfig.app_img_shunt,
          }));
        }
      } catch (error) {
        console.error("setting error", error);
      }
    };
    fetchSettingImgSource();
  }, [config.hostReady, config.app_img_shunt]);

  return (
    <GlobalConfigContext.Provider value={{ config, setConfig }}>
      {children}
      <DarkModeToggle />
    </GlobalConfigContext.Provider>
  );
};
