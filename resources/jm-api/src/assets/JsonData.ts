import { t } from "i18next";
const version = process.env.REACT_APP_VERSION;

export const SearchSortData = () => {
  return [
    { title: t("cat_sort.latest"), key: "" },
    { title: t("cat_sort.mostViews"), key: "mv" },
    { title: t("cat_sort.mostImages"), key: "mp" },
    { title: t("cat_sort.mostHearts"), key: "tf" },
  ];
};

export const CatSortData = () => {
  return [
    { title: t("cat_sort.latest"), key: "" },
    { title: t("cat_sort.mostHearts"), key: "tf" },
    { title: t("cat_sort.totalRanking"), key: "mv" },
    { title: t("cat_sort.monthlyRanking"), key: "mv_m" },
    { title: t("cat_sort.weeklyRanking"), key: "mp_w" },
    // { title: t("cat_sort.dailyRanking"), key: "mp_t" },
  ];
};
