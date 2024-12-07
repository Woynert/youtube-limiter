const script = {
  id: "script",
  js: ["script.js"],
  matches: ["*://*.youtube.com/*", "*://*.youtu.be/*"],
  runAt: "document_start",
  allFrames: true,
};
(async () => {
  console.log("I: Background script started");
  try {
    if (typeof browser !== "undefined") {
      // firefox
      await browser.scripting.registerContentScripts([script]);
    } else if (typeof chrome !== "undefined") {
      // chrome
      await chrome.scripting.registerContentScripts([script]);
    }
  } catch (err) {
    console.error(`E: failed to register content scripts: ${err}`);
    return;
  }
})();
