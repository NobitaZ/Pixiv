const electron = require("electron");
const { ipcRenderer } = electron;
const app = electron.remote;
const fs = require("fs");
const path = require("path");
const getmac = require("getmac");
let username = document.querySelector("#username");
let password = document.querySelector("#password");
let version = window.location.hash.substring(1);
const userData =
  process.env.NODE_ENV === "development"
    ? "./data/user.csv"
    : path.join(process.resourcesPath, "data/user.csv");
username.focus();
document.getElementById("version").innerText = version;
document.querySelector("form").addEventListener("submit", submitForm);
document.querySelector(".mac-address").innerHTML = `MAC: ${getmac.default().toUpperCase()}`;
function submitForm(e) {
  e.preventDefault();
  const items = {
    username: username.value,
    password: password.value,
  };
  fs.writeFile(userData, username.value, (err) => {
    if (err) {
      throw err;
    }
  });
  ipcRenderer.send("auth-form", items);
}
function loadUsername() {
  let userName = fs.readFileSync(userData, "utf-8");
  console.log(userName);
  if (userName != "") {
    username.value = userName;
    password.focus();
  }
}
loadUsername();
const msgDiv = document.querySelector("#msg-cus");
msgDiv.innerHTML = "\n";
ipcRenderer.on("msg-login", function (e, item) {
  if (item == "user-failed") {
    msgDiv.className = "";
    username.value = "";
    password.value = "";
    username.focus();
    msgDiv.className += "alert alert-danger alert-dismissible show";
    msgDiv.innerHTML = "Incorrect Username";
  } else if (item == "pass-failed") {
    msgDiv.className = "";
    username.value = "";
    password.value = "";
    username.focus();
    msgDiv.className += "alert alert-danger alert-dismissible show";
    msgDiv.innerHTML = "Incorrect Password";
    loadUsername();
  } else if (item == "wrong-mac") {
    msgDiv.className = "";
    username.value = "";
    password.value = "";
    username.focus();
    msgDiv.className += "alert alert-danger alert-dismissible show";
    msgDiv.innerHTML = "Wrong MAC, please contact your Admin";
    loadUsername();
  } else if (item == "wrong-ip") {
    msgDiv.className = "";
    username.value = "";
    password.value = "";
    username.focus();
    msgDiv.className += "alert alert-danger alert-dismissible show";
    msgDiv.innerHTML = "Wrong IP Address, please contact Admin";
    loadUsername();
  }
});
ipcRenderer.on("db", function (e, item) {
  const version = document.querySelector(".version");
  const dbstatus = document.querySelector(".db-status");
  if (item == "connected") {
    dbstatus.innerHTML = "DB Connected";
  } else {
    dbstatus.innerHTML = "DB Error";
  }
});
