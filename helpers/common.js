const puppeteer = require("puppeteer-extra");
const path = require("path");
const mongoose = require("mongoose");
//--------------------------------------------------------------------
// BROWSER
//--------------------------------------------------------------------
exports.openBrowser = async (proxy) => {
  let browserArgs;
  if (proxy != "") {
    let ip = proxy.split(":")[0];
    let port = "";
    typeof proxy.split(":")[1] == "undefined" ? (port = "4444") : (port = proxy.split(":")[1]);
    browserArgs = [
      `--proxy-server=http://${ip}:${port}`,
      "--window-size=1366,768",
      "--disable-web-security",
    ];
  } else {
    browserArgs = ["--window-size=1366,768", "--disable-web-security"];
  }

  const chromePath =
    process.env.NODE_ENV === "development"
      ? puppeteer.executablePath()
      : path.join(
          process.resourcesPath,
          "app.asar.unpacked/node_modules/puppeteer/.local-chromium/win64-901912/chrome-win/chrome.exe"
        );
  const browser = await puppeteer.launch({
    userDataDir: "./user_data",
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    slowMo: 30,
    args: browserArgs,
    // args: [
    //   `--proxy-server=http://${ip}:${port}`,
    //   "--window-size=1366,768",
    //   "--disable-web-security",
    // ],
    //--disable-web-security "--window-size=1500,900"
  });
  console.log("Browser opened");
  const page = await browser.newPage();
  let item = { browser: browser, page: page };
  return item;
};

exports.closeBrowser = async (browser) => {
  await browser.close();
  console.log(`Browser closed!`);
};

exports.connectDB = (dbConnectionStr, mainWindow) => {
  mongoose
    .connect(dbConnectionStr, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      mainWindow.webContents.send("db", "connected");
      console.log("MongoDB Connected");
    })
    .catch((err) => {
      log.error(err);
      mainWindow.webContents.send("db", "failed");
    });
};
