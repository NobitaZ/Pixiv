exports.mainMenuTemplate = function mainMenuTempalte(app) {
  // Create menu template
  var mainMenuTemplate = [
    // Each object is a dropdown
    {
      label: "File",
      submenu: [
        {
          label: "Quit",
          accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
          click() {
            app.quit();
          },
        },
      ],
    },
  ];
  // If OSX, add empty object to menu
  if (process.platform == "darwin") {
    mainMenuTemplate.unshift({});
  }

  // Add developer tools option if in dev
  if (process.env.NODE_ENV !== "production") {
    mainMenuTemplate.push({
      label: "Developer Tools",
      submenu: [
        {
          role: "reload",
        },
        {
          label: "Toggle DevTools",
          accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
          click(item, focusedWindow) {
            focusedWindow.toggleDevTools();
          },
        },
      ],
    });
  }
  return mainMenuTemplate;
};

exports.timeOutFunc = function PromiseTimeout(delayms) {
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, delayms);
  });
};

exports.checkBtnEnable = function checkBtnEnable(arrClassName) {
  //var arrClassName = btn.className;
  var result = false;
  arrClassName.forEach(function (entry) {
    if (!entry.includes("Disabled")) {
      result = true;
    }
  });
  return result;
};
