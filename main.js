require("dotenv").config({ path: __dirname + "/.env" });
const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require(path.join(__dirname, "models/User"));
const { app, BrowserWindow, Menu, ipcMain, remote, dialog, session } = require("electron");
const fs = require("fs");
const parseSync = require("csv-parse/lib/sync");
const WindowsToaster = require("node-notifier").WindowsToaster;
const myFunc = require(path.join(__dirname, "./src/windowRenderer"));
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const getmac = require("getmac");
const publicIp = require("public-ip");
const logger = require("./helpers/logger");
const common = require("./helpers/common");
const { info } = require("electron-log");
const axios = require("axios");
const stringify = require("csv-stringify");

puppeteer.use(
  RecaptchaPlugin({
    provider: { id: "2captcha", token: process.env.CAPTCHA_KEY },
    visualFeedback: true,
  })
);
puppeteer.use(AdblockerPlugin());
puppeteer.use(StealthPlugin());

let mainWindow, homeWindow, uploadWindow, importWindow, updateWindow, adminWindow, editUserWindow;

let publicIPObj = {},
  loggerObj = {};

const dbConnectionStr =
  process.env.NODE_ENV !== "development" ? process.env.PRODUCTION_DB : process.env.PRODUCTION_DB;

//--------------------------------------------------------------------
// AUTO UPDATE
//--------------------------------------------------------------------
autoUpdater.on("checking-for-update", () => {
  updateWindow.webContents.send("msg-update", "Checking for update...");
});
autoUpdater.on("update-available", (info) => {
  updateWindow.webContents.send("msg-update", "Update available");
});
autoUpdater.on("update-not-available", (info) => {
  updateWindow.webContents.send("msg-update", "You are using the latest version");
  setTimeout(() => {
    createWindow();
    updateWindow.close();
  }, 1000);
});
autoUpdater.on("error", (err) => {
  updateWindow.webContents.send("msg-update", "Error in auto-updater. " + err);
});
autoUpdater.on("download-progress", (progressObj) => {
  updateWindow.webContents.send("msg-update", "Downloading update...");
  updateWindow.webContents.send("download-progress", Math.round(progressObj.percent));
});
autoUpdater.on("update-downloaded", (info) => {
  updateWindow.webContents.send("msg-update", "Update downloaded...Install in 3s");
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 3000);
});

//--------------------------------------------------------------------
// CREATE WINDOWS
//--------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadURL(path.join(__dirname, `./views/login.html#v${app.getVersion()}`));
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
  // Connect to MongoDB
  setTimeout(() => {
    connectDB(dbConnectionStr);
  }, 2000);
  const ip_adds = (async () => {
    publicIPObj.ip = await publicIp.v4();
    let mac = getmac.default().toUpperCase();
    loggerObj = {
      ip_address: publicIPObj.ip,
      MAC: mac,
      app_name: "Pixiv",
    };
  })();
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
  Menu.setApplicationMenu(mainMenu);
}

function createHomeWindow() {
  homeWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    resizable: false,
    darkTheme: true,
    title: "Pixiv Crawl Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });
  homeWindow.removeMenu();
  homeWindow.loadFile("./views/home.html");
  homeWindow.on("close", function () {
    homeWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
  Menu.setApplicationMenu(mainMenu);
}

function createAdminWindow() {
  adminWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: false,
    darkTheme: true,
    title: "Pixiv Tools - Admin Panel",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });
  // adminWindow.webContents.openDevTools();
  adminWindow.removeMenu();
  adminWindow.loadFile("./views/admin.html");
  adminWindow.on("close", function () {
    adminWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
  Menu.setApplicationMenu(mainMenu);
}

function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 400,
    height: 150,
    resizable: false,
    darkTheme: true,
    title: "Pixiv Crawl Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });
  updateWindow.removeMenu();
  updateWindow.loadFile("./views/checkupdate.html");
  updateWindow.on("close", function () {
    updateWindow = null;
  });
}

function createImportWindow() {
  importWindow = new BrowserWindow({
    width: 600,
    height: 600,
    resizable: false,
    darkTheme: true,
    title: "Pixiv Crawl Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
    parent: homeWindow,
  });
  //   importWindow.removeMenu();
  importWindow.loadFile("./views/import.html");
  importWindow.on("close", function () {
    importWindow = null;
  });
  const mainMenu = Menu.buildFromTemplate(myFunc.mainMenuTemplate(app));
}

function createEditUserWindow() {
  editUserWindow = new BrowserWindow({
    width: 500,
    height: 580,
    resizable: false,
    darkTheme: true,
    title: "Pixiv Crawl Tool",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
    parent: adminWindow,
  });
  editUserWindow.removeMenu();
  editUserWindow.loadFile("./views/edituser.html");
  editUserWindow.on("close", function () {
    editUserWindow = null;
  });
}

function connectDB(dbConnectionStr) {
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
}

//--------------------------------------------------------------------
// On ready
//--------------------------------------------------------------------
if (process.env.NODE_ENV === "development") {
  // app.on("ready", createWindow);
  app.on("ready", createHomeWindow);
  // app.on("ready", createAdminWindow);
} else {
  app.on("ready", createUpdateWindow);
}
app.on("ready", function () {
  autoUpdater.checkForUpdatesAndNotify();
});
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});

//Auth user
ipcMain.on("auth-form", function (e, item) {
  username = item["username"];
  password = item["password"];

  User.findOne({
    username: username,
  }).then((user) => {
    if (!user) {
      mainWindow.webContents.send("msg-login", "user-failed");
      return;
    }
    // Match password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) log.error(err);
      if (isMatch) {
        if (user.roles == "ADMIN") {
          loggerObj.user_name = user.username;
          createAdminWindow();
          mainWindow.close();
        } else {
          if (typeof user.mac != "undefined") {
            let userMac = user.mac.toUpperCase().replaceAll("-", ":");
            if (getmac.default().toUpperCase() == userMac) {
              if (typeof user.ip1 != "undefined" || typeof user.ip2 != "undefined") {
                if (publicIPObj.ip == user.ip1 || publicIPObj.ip == user.ip2) {
                  session.defaultSession.cookies.set({
                    url: "http://localhost",
                    name: user.name,
                  });
                  loggerObj.user_name = user.username;
                  createHomeWindow();
                  mainWindow.close();
                } else {
                  mainWindow.webContents.send("msg-login", "wrong-ip");
                  return;
                }
              }
            } else {
              mainWindow.webContents.send("msg-login", "wrong-mac");
              return;
            }
          } else {
            mainWindow.webContents.send("msg-login", "wrong-mac");
            return;
          }
        }
      } else {
        mainWindow.webContents.send("msg-login", "pass-failed");
        return;
      }
    });
  });
});

var arrAcc = {};

ipcMain.on("import-clicked", function (e, item) {
  createImportWindow();
});

ipcMain.on("import-success", function (e, item) {
  importWindow.hide();
  homeWindow.webContents.send("reload-acc-info", "reload");
});

// Handle crawl button click
ipcMain.on("crawl-clicked", function (e, arrItems) {
  try {
    // console.log(arrItems);
    mainProcess(arrItems);
  } catch (err) {
    log.error(err);
    logger.error(err.stack, loggerObj);
  }
});

ipcMain.on("edit-user", function (e, userInfo) {
  createEditUserWindow();
  setTimeout(() => {
    editUserWindow.webContents.send("data", userInfo);
  }, 1000);
});

ipcMain.on("delete-user", function (e, username) {
  User.findOneAndDelete({
    username: username,
  }).then((user) => {
    if (!user) {
      return;
    }
    adminWindow.webContents.send("user-modified", "true");
  });
});

ipcMain.on("data-modified", function (e, data) {
  User.findOneAndUpdate(
    {
      username: data.username,
    },
    { $set: data },
    {
      useFindAndModify: false,
    }
  ).then((user) => {
    if (!user) {
      return;
    }
    adminWindow.webContents.send("user-modified", "true");
  });
});

ipcMain.on("logout", function (e, item) {
  createWindow();
  if (item == "logoutAdmin") {
    adminWindow.close();
  } else if (item == "logout") {
    homeWindow.close();
  }
});

ipcMain.on("open-account", function (e, data) {
  try {
    openAccount(data);
  } catch (err) {
    log.error(err);
    logger.error(err.stack, loggerObj);
  }
});

ipcMain.on("open-dir-dialog", function (e) {
  dialog
    .showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    })
    .then((result) => {
      e.sender.send("selected-dir", result.filePaths);
    })
    .catch((err) => {
      console.log(err);
    });
});

async function mainProcess(arrAcc) {
  const accUsername = arrAcc[0];
  const accPassword = arrAcc[1];
  const proxyIP = arrAcc[2];
  const proxyUser = arrAcc[3];
  const proxyPass = arrAcc[4];
  const tabNum = arrAcc[5];
  const pathToSave = arrAcc[6];
  if (pathToSave == "") {
    dialog.showErrorBox("Please choose folder to save images", "");
    return;
  }
  if (accUsername == "" || accPassword == "") {
    dialog.showErrorBox("Please email or password is incorrect", "");
    return;
  }
  if (tabNum < 1 || tabNum > 60) {
    dialog.showErrorBox("Number of tab is incorrect", "");
    return;
  }
  const regexCheckLink =
    /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm;
  let user_data = "./user_data";
  if (!fs.existsSync(user_data)) {
    fs.mkdirSync(user_data);
  }
  if (pathToSave == "") {
    let dir = "./Images";
    if (!fs.existsSync(dir)) {
      await homeWindow.webContents.send("logs", `Creating folder Images`);
      fs.mkdirSync(dir);
    }
  } else {
    let dir = `${pathToSave}\\Images`;
    if (!fs.existsSync(dir)) {
      await homeWindow.webContents.send("logs", `Creating folder Images`);
      fs.mkdirSync(dir);
    }
  }
  // Read links
  const linksPath =
    process.env.NODE_ENV === "development"
      ? "./data/links.csv"
      : path.join(process.resourcesPath, "data/links.csv");
  const arrLinksFromFile = fs.readFileSync(linksPath, "utf-8");
  let arrLinks = parseSync(arrLinksFromFile, {
    columns: false,
    skip_empty_lines: true,
  }); // arrLinks[0]: link, arrLinks[1]: page

  // Read folder
  const folderPath =
    process.env.NODE_ENV === "development"
      ? "./data/folders.csv"
      : path.join(process.resourcesPath, "data/folders.csv");
  const arrFolderFromFile = fs.readFileSync(folderPath, "utf-8");
  let arrFolders = parseSync(arrFolderFromFile, {
    columns: false,
    skip_empty_lines: true,
  });
  // Read id array
  const idPath =
    process.env.NODE_ENV === "development"
      ? "./data/id.csv"
      : path.join(process.resourcesPath, "data/id.csv");
  const arrId = fs.readFileSync(idPath, "utf-8");
  //Browser handlers
  const { browser, page } = await common.openBrowser(proxyIP);
  await homeWindow.webContents.send("logs", "Browser opened");
  if (proxyUser.trim() != "" && proxyPass.trim() != "") {
    await page.authenticate({
      username: proxyUser,
      password: proxyPass,
    });
  }
  await page.setDefaultNavigationTimeout(0);
  await page.goto(`https://accounts.pixiv.net/login`, {
    waitUntil: "networkidle2",
  });
  let isLoggedIn;
  try {
    isLoggedIn = await page.$eval(".gtm-work-post-button-in-header-click", (el) => el.innerText);
  } catch (e) {
    await homeWindow.webContents.send("logs", `Did not log in yet: ${accUsername}`);
  }
  if (!isLoggedIn) {
    await myFunc.timeOutFunc(1000);
    await page.waitForSelector("button.signup-form__submit");
    await page.type("input[autocomplete='username'", accUsername);
    await myFunc.timeOutFunc(1000);
    await page.type("input[autocomplete='current-password'", accPassword);
    await myFunc.timeOutFunc(1000);
    await page.keyboard.press("Enter");
    await myFunc.timeOutFunc(3000);
    try {
      await page.waitForNavigation({ timeout: 5000 });
    } catch (e) {}
    const siteCapt = await page.evaluate(() => {
      let grecaptcha = document.getElementById("g-recaptcha-response-2");
      let result = false;
      grecaptcha != null ? (result = true) : (result = false);
      return result;
    });
    if (siteCapt) {
      console.log("resolving siteCapt");
      await homeWindow.webContents.send("logs", "Resolving captcha...");
      await page.solveRecaptchas();
      await homeWindow.webContents.send("logs", "Resolved captcha");
      console.log("resolved siteCapt");
      await myFunc.timeOutFunc(1000);
      await page.keyboard.press("Enter");
      await page.waitForNavigation();
    }

    let confirmEmail;
    try {
      confirmEmail = await page.$eval(
        'button[data-gtm-action="use_current_mail_address"]',
        (el) => el.textContent
      );
    } catch (e) {
      await homeWindow.webContents.send("logs", `No need to confirm email`);
    }
    if (confirmEmail) {
      await page.click('button[data-gtm-action="use_current_mail_address"]');
      await page.waitForNavigation();
      await myFunc.timeOutFunc(3000);
    }
    try {
      await myFunc.timeOutFunc(1000);
      await page.waitForSelector(".gtm-work-post-button-in-header-click", { timeout: 5000 });
      await homeWindow.webContents.send("logs", `Login success: ${accUsername}`);
    } catch (error) {
      await homeWindow.webContents.send("logs", `Login Error: ${accUsername}`);
      await common.closeBrowser(browser).catch((err) => {
        log.error(err);
        logger.error(err.stack, loggerObj);
      });
      await homeWindow.webContents.send("logs", "Browser closed");
      return;
    }
  }
  for (let i = 0; i < arrLinks.length; i++) {
    let folderName = arrFolders[i];
    let innerDir = `${pathToSave}\\Images\\${folderName}`;
    try {
      if (!fs.existsSync(innerDir)) {
        await homeWindow.webContents.send("logs", `Creating folder ${folderName}`);
        fs.mkdirSync(innerDir, { recursive: true });
      }
    } catch (e) {
      log.error(e.message);
    }
    let objLink = arrLinks[i][0].trim();
    let objPage = arrLinks[i][1].trim().toString();
    if (!objLink.match(regexCheckLink)) {
      continue;
    }
    let firstPage, lastPage;
    if (objPage != "") {
      let pageSplit = objPage.split("-");
      firstPage = pageSplit[0];
      lastPage = pageSplit[1];
    } else {
    }
    if (!objLink.includes("artworks")) {
      if (objLink.match(/.$/g) == "/") {
        objLink = objLink.concat("artworks");
      } else {
        objLink = objLink.concat("/artworks");
      }
    }
    if (!objLink.includes("?order=popular_d")) {
      objLink = objLink.concat("?order=popular_d");
    }
    if (typeof lastPage == "undefined" && firstPage) {
      await crawlByPage(browser, page, objLink, firstPage, tabNum, innerDir, arrId, idPath).catch(
        (err) => {
          log.error(err.stack);
          logger.error(err.message, loggerObj);
          return;
        }
      );
    } else if (firstPage && lastPage) {
      for (let j = firstPage; j <= lastPage; j++) {
        await crawlByPage(browser, page, objLink, j, tabNum, innerDir, arrId, idPath).catch(
          (err) => {
            log.error(err.stack);
            logger.error(err.message, loggerObj);
            return;
          }
        );
      }
    }
  }
  await common.closeBrowser(browser);
  const notifier = new WindowsToaster({
    withFallback: false,
  });
  notifier.notify(
    {
      appName: "HaNguyen's Tools",
      title: "Pixiv Crawl Tool",
      message: "Crawl Completed!",
      icon: path.join(__dirname, "icon.jpg"),
      sound: true,
    },
    function (err, response) {
      if (err) log.error(err);
    }
  );
}

//----------------------------------
// CRAWL BY PAGE
//----------------------------------
async function crawlByPage(browser, page, link, pageNum, tabNum, folder, arrId, idPath) {
  tabNum = parseInt(tabNum);
  await homeWindow.webContents.send("logs", `Loading page ${pageNum}`);
  await page
    .goto(link + "&p=" + pageNum, { timeout: 60000 })
    .then(() => {
      log.info(`load page success`);
    })
    .catch((err) => {
      log.error(`load page error: ${err}`);
      logger.error(`load page error: ${err.message}`, loggerObj);
      return;
    });
  await scrollToBottom(page);
  await myFunc.timeOutFunc(500);
  let arrImgLinkList = await page.evaluate(() => {
    let arrImg = document.querySelectorAll('img[src*="250x250"]');
    arrImg = [...arrImg];
    let arrImgLink = arrImg.map((v) => v.parentElement.parentElement.href);
    return arrImgLink;
  });
  if (arrImgLinkList.length == 0) {
    await homeWindow.webContents.send("logs", `Can not found product links`);
    return;
  }
  let newArrImgLink = [];
  let arrNewId = [];
  for (let i = 0; i < arrImgLinkList.length; i++) {
    const imgId = arrImgLinkList[i].split("/").pop();
    if (arrId.includes(imgId)) {
      continue;
    }
    newArrImgLink.push(arrImgLinkList[i]);
    arrNewId.push(imgId);
  }
  let inputArr = [];
  for (let i = 0; i < arrNewId.length; i++) {
    const row = arrNewId[i].split(",");
    if (row != "") {
      inputArr.push(row);
    }
  }
  if (inputArr.length > 0) {
    stringify(inputArr, function (err, output) {
      fs.writeFile(idPath, output, { flag: "a" }, function (err) {
        if (err) {
          console.log("id arr save failed");
          throw err;
        }
        console.log("id arr save succedd");
      });
    });
  }

  if (newArrImgLink.length != 0) {
    await homeWindow.webContents.send("logs", `Found ${newArrImgLink.length} images`);
    await homeWindow.webContents.send("logs", `Downloading images from page ${pageNum}`);
    let arrBlock6Links = array_chunks(newArrImgLink, tabNum);
    for (let i = 0; i < arrBlock6Links.length; i++) {
      await Promise.all(
        arrBlock6Links[i].map((url) => {
          page.setDefaultNavigationTimeout(60000);
          return browser.newPage().then(async (page) => {
            await processDownloadImg(page, url, folder).catch((err) => {
              log.error(err);
              logger.error(err.message, loggerObj);
            });
          });
        })
      );
    }
    await homeWindow.webContents.send(
      "logs",
      `Successfully downloaded images from page ${pageNum}!`
    );
  } else {
    await homeWindow.webContents.send(
      "logs",
      `Can not found images or images have been downloaded already`
    );
  }
}

//----------------------------------
// DOWNLOAD IMG
//----------------------------------
async function processDownloadImg(page, url, folder) {
  const imgLocation = folder;
  await page
    .goto(url, {
      timeout: 90000,
    })
    .then(() => {
      log.info(`load page success`);
    })
    .catch((err) => {
      log.error(`load page error: ${err}`);
      logger.error(`load page error: ${err.message}`, loggerObj);
      return;
    });
  // let isMultiImg;
  // try {
  //   isMultiImg = await page.$eval('div[aria-label="Preview"]', (el) => el.textContent);
  // } catch (e) {
  //   log.info("1 img found");
  // }
  // if (isMultiImg) {
  //   log.info("multiple img found");
  //   await page.click('a[href*="img-original"]');
  //   await myFunc.timeOutFunc(2200);
  // }
  // const arrImgLink = await page.$$eval('a[href*="img-original"]', (el) => el.map((v) => v.href)); //for multiple download
  let imgLink;
  try {
    imgLink = await page.$eval('a[href*="img-original"]', (el) => el.href);
  } catch (e) {
    await homeWindow.webContents.send("logs", `Can not found image: ${url}`);
    await page.close();
    return;
  }
  downloadFile(imgLink, imgLocation);
  // if (arrImgLink.length == 0) {
  //   return;
  // }
  // for (let i = 0; i < arrImgLink.length; i++) {
  //   downloadFile(arrImgLink[i], imgLocation);
  // }
  await page.close();
}

//------------------------------
// Download function
//------------------------------
const downloadFile = async (fileUrl, downloadFolder) => {
  // Get the file name
  const fileName = path.basename(fileUrl);

  // The path of the downloaded file on our machine
  const localFilePath = path.resolve(__dirname, downloadFolder, fileName);
  try {
    const response = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "stream",
      headers: {
        referer: "https://www.pixiv.net/",
      },
    });

    const w = response.data.pipe(fs.createWriteStream(localFilePath));
    w.on("finish", () => {
      console.log("Successfully downloaded file!");
    });
  } catch (err) {
    throw new Error(err);
  }
};
async function scrollToBottom(page) {
  const distance = 100; // should be less than or equal to window.innerHeight
  const delay = 100;
  while (
    await page.evaluate(
      () =>
        document.scrollingElement.scrollTop + window.innerHeight <
        document.scrollingElement.scrollHeight
    )
  ) {
    await page.evaluate((y) => {
      document.scrollingElement.scrollBy(0, y);
    }, distance);
    await myFunc.timeOutFunc(delay);
  }
}
const array_chunks = (array, chunk_size) =>
  Array(Math.ceil(array.length / chunk_size))
    .fill()
    .map((_, index) => index * chunk_size)
    .map((begin) => array.slice(begin, begin + chunk_size));

//----------------------------------
// OPEN ACCOUNT PROCESS
//----------------------------------
async function openAccount(userInfo) {
  let dir = "./Images";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  await downloadFile(
    "https://i.pximg.net/img-original/img/2013/12/04/22/12/54/40099644_p0.jpg",
    `${process.cwd()}\\Images`
  );
}
