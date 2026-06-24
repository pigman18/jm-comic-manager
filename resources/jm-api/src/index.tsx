import { BrowserRouter } from "react-router-dom";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import "./index.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "react-lazy-load-image-component/src/effects/blur.css";
import "./i18n";

import store from "./store";
import { GlobalConfigProvider } from "./GlobalContext";
import ReactGA from "react-ga4";

// ==========================
// Google Analytics
// ==========================
if (process.env.NODE_ENV === "production") {
  ReactGA.initialize("G-69VXS5Z1FV");
}

// ==========================
// Service Worker
// ==========================
const registerSW = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.log("✅ SW registered:", reg))
      .catch((err) => console.error("❌ SW failed:", err));
  });
};

// const clearDevCache = async () => {
//   if (process.env.NODE_ENV !== "production") {
//     const regs = await navigator.serviceWorker.getRegistrations();
//     regs.forEach((r) => r.unregister());

//     const keys = await caches.keys();
//     keys.forEach((k) => caches.delete(k));
//   }
// };

// init SW
if (process.env.NODE_ENV === "production") {
  registerSW();
} else {
  // clearDevCache(); // 視需求開
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <BrowserRouter>
    <Provider store={store}>
      <GlobalConfigProvider>
        <App />
      </GlobalConfigProvider>
    </Provider>
  </BrowserRouter>
);
