//GNU GPL v3
//Please visit our github page: https://github.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension

'use strict';
/*
//activate on this site
chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
       // pageUrl: { urlMatches: '.*?hana\.ondemand\.com\/itspaces\/.*?' },
         pageUrl: { urlMatches: '.*?google\.com\/.*?' },
      })],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

*/
console.log('background running');

// Add a listener for the browser action
chrome.browserAction.onClicked.addListener(buttonClicked);



  // The user clicked the button!
  // 'tab' is an object with information about the current open tab
function buttonClicked(tab) {

console.log('button clicked');
console.log(tab);

  var msg = {
    message: "user clicked!"
  }
  chrome.tabs.sendMessage(tab.id, msg);
}









//scan Headers for X-CSRF Token
chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {

    for (var i = 0; i < details.requestHeaders.length; ++i) {
      if (details.requestHeaders[i].name == "X-CSRF-Token") {
        var xcsrftoken = details.requestHeaders[i].value;
        var tenant = details.url.split("/")[2].split(".")[0];

        //xcsrf token will be saved in a local object with name xcsrf_<tenant>
        var name = 'xcsrf_' + tenant;
        var obj = {};
        obj[name] = xcsrftoken;

        chrome.storage.local.set(obj, function () {
          console.log("xcsrf token saved");
        });
        break;
      }
    }
    return { requestHeaders: details.requestHeaders };

  },

   { urls: ["https://*.google.com/"] },
    ["requestHeaders"]);

