import { useTranslation } from "react-i18next";

export default function Loading() {
  const { t } = useTranslation();
  return (
    <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-gy z-40">
      <img src="/images/loading.gif" alt="loading" width="80px" />
      <p>{t("comic.loading")}</p>
    </div>
  );
}

export const LoadingCover = () => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 transition-opacity duration-300 ease-out opacity-10">
      <div className="absolute inset-0 bg-gy opacity-10 z-0"></div>
      <div className="relative z-10 text-center">
        <img src="/images/loading.gif" alt="loading" width="80px" />
        <p>{t("comic.loading")}</p>
      </div>
    </div>
  );
};
