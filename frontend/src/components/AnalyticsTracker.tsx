import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Send pageview with a custom path
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
    });
  }, [location]);

  return null;
};

export default AnalyticsTracker;
