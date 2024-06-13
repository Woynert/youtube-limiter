const script = {
  id: "script",
  js: ["script.js"],
  matches: ["*://*.youtube.com/*", "*://*.youtu.be/*"],
  runAt: "document_start",
};
(async () => {
  console.log("I: Background script started");
  try {
    await browser.scripting.registerContentScripts([script]);
  } catch (err) {
    console.error(`E: failed to register content scripts: ${err}`);
    return;
  }
})();
