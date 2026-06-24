import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";

const READ_VIEWPORT = "width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes, viewport-fit=cover";

const DEFAULT_VIEWPORT = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

const ViewportMeta = () => {
  const { pathname } = useLocation();

  const isReadPage = pathname.endsWith("/read");

  const viewportContent = isReadPage ? READ_VIEWPORT : DEFAULT_VIEWPORT;

  return (
    <Helmet>
      <meta name="viewport" content={viewportContent} />
    </Helmet>
  );
};

export default ViewportMeta;
