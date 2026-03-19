export const trackEvent = (event, data = {}) => {
  if (window.fbq) {
    window.fbq("track", event, data);
  }
};
