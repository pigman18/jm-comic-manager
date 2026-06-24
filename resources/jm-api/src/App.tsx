import React, { Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthChecker, clearAuth } from "./Hooks/useAuth";
import Loading from "./components/Common/Loading";
import useScrollRestoration from "./Hooks/useScrollRestoration";
import usePageTracking from "./Hooks/usePageTrack";
import { ConfirmAlert } from "./components/Alert/Alert";
import { getLocalVersion, initHotUpdate } from "./utils/hotModule";
import { useAppDispatch } from "./store/hooks";
import { useGlobalConfig } from "./GlobalContext";
import { FETCH_HOST } from "./api/ApiEndpointUtil";
import { usePWAProtection, useDevtoolsBlocker, useBackButtonExit } from "./Hooks/useAppGuards";
import GlobalStore from "./config/GlobalStore";
import { getRandomItems } from "./utils/Function";
import ViewportMeta from "./components/Common/ViewportMeta";
import Clarity from "@microsoft/clarity";

const Main = React.lazy(() => import("./pages/Main/Main"));
const Week = React.lazy(() => import("./pages/Main/Week"));
const Blog = React.lazy(() => import("./pages/Blogs/Blogs"));
const BlogsDetail = React.lazy(() => import("./pages/Blogs/BlogsDetail"));
const Search = React.lazy(() => import("./pages/Search/Search"));
const Detail = React.lazy(() => import("./pages/Comic/Detail"));
const Read = React.lazy(() => import("./pages/Comic/Read"));
const Download = React.lazy(() => import("./pages/Comic/Download"));
const Comic = React.lazy(() => import("./pages/Comic/Comic"));
const Library = React.lazy(() => import("./pages/Library/Library"));
const LibraryList = React.lazy(() => import("./pages/Library/LibraryList"));
const LibraryDetail = React.lazy(() => import("./pages/Library/LibraryDetail"));
const Movies = React.lazy(() => import("./pages/Movies/Movies"));
const MoviesPlayer = React.lazy(() => import("./pages/Movies/MoviesPlayer"));
const Daily = React.lazy(() => import("./pages/Member/Daily"));
const Games = React.lazy(() => import("./pages/Categories/Games"));
const Categories = React.lazy(() => import("./pages/Categories/Categories"));
const Member = React.lazy(() => import("./pages/Member/Member"));
const Forum = React.lazy(() => import("./pages/Forum/Forum"));
const Novels = React.lazy(() => import("./pages/Novel/Novels"));
const NovelDetail = React.lazy(() => import("./pages/Novel/NovelDetail"));
const NovelRead = React.lazy(() => import("./pages/Novel/NovelRead"));
const ErrorPage = React.lazy(() => import("./pages/Main/ErrorPage"));
const TestComponent = React.lazy(() => import("./pages/TestComponent"));

const fetchHostData = async () => {
  const apiUrl = await FETCH_HOST();
  return apiUrl;
};

const App = () => {
  const { config, setConfig } = useGlobalConfig();
  const { exit, setExit, confirmExit } = useBackButtonExit(); // 離開 App 提示框
  const dispatch = useAppDispatch();
  const location = useLocation();

  // 紀錄滾動位置
  useScrollRestoration();
  //ga
  usePageTracking();
  // 禁用瀏覽器
  usePWAProtection();
  // 禁用F12
  useDevtoolsBlocker();

  useEffect(() => {
    if (process.env.REACT_APP_ENV === "production") {
      console.log("Running in Production Mode!");
    } else if (process.env.REACT_APP_ENV === "development") {
      console.log("Running in Development Mode!");
    }
    // 攔截同步 JS 錯誤
    window.onerror = function (message, source, lineno, colno, error) {
      console.warn("JS 錯誤:", { message, source, lineno, colno, error });
      // showErrorModal(`\n${defaultErrorMsg}`);
      // setTimeout(() => {
      //   window.location.href = "/";
      // }, 60000);
    };
  }, []);

  // host init
  useEffect(() => {
    fetchHostData().then((apiUrl) => {
      if (apiUrl) {
        const filteredServers = apiUrl.jm3_Server.filter(([_, name]: [string, string]) => name !== "線路5");

        const { items } = getRandomItems(filteredServers);
        const newUrl = `https://${items}/`;
        setConfig((prev) => ({ ...prev, hostReady: true, host: newUrl }));
      }
    });
  }, []);

  // hot update
  useEffect(() => {
    if (config.hostReady) {
      initHotUpdate(dispatch);

      const getVersion = async () => {
        const v = await getLocalVersion();
        setConfig((prev: any) => ({ ...prev, version: v }));
      };

      getVersion();
    }
  }, [config.hostReady]);

  return (
    <>
      <ViewportMeta />
      <AuthChecker setConfig={setConfig} />
      <div className="safe-area">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Main />} />
            <Route path="/blogs" element={<Blog />} />
            <Route path="/blogs/detail" element={<BlogsDetail />} />
            <Route path="/week" element={<Week />} />
            <Route path="/search" element={<Search />} />
            <Route path="/comic" element={<Comic />} />
            <Route path="/comic/detail" element={<Detail />} />
            <Route path="/comic/detail/download" element={<Download />} />
            <Route path="/comic/detail/read" element={<Read />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/list" element={<LibraryList />} />
            <Route path="/library/list/detail" element={<LibraryDetail />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/movies/:id" element={<MoviesPlayer />} />
            <Route path="/games" element={<Games />} />
            <Route path="/member" element={<Member />} />
            <Route path="/daily" element={<Daily />} />
            <Route path="/novels" element={<Novels />} />
            <Route path="/novels/detail" element={<NovelDetail />} />
            <Route path="/novels/detail/read" element={<NovelRead />} />
            <Route path="*" element={<ErrorPage />} />
            <Route path="/test" element={<TestComponent />} />
          </Routes>
        </Suspense>
      </div>
      {exit.alert && <ConfirmAlert edit={exit} setEdit={setExit} handleAction={confirmExit} />}
    </>
  );
};

export default App;
