chrome.runtime.onMessage.addListener(receiver);
 console.log('Successful in Page');
// Callback for when a message is received
function receiver(request, sender, sendResponse) {
  if (request.message === "user clicked!") {
    // Do something!
    console.log('Successful');

    showBigPopup();
          }
          }


    async function showBigPopup() {
      //create traceInfo div element
      var x = document.getElementById("cpiHelperPopup");
      if (!x) {
       x = document.createElement('div');
        x.id = "cpiHelper_bigPopup";
        x.classList.add("cpiHelper");
        document.body.appendChild(x);
      }
      x.style.display = "block";
        x.innerHTML = "Hellooooooooooooooooooooooooooooooooooooooooooooooooooooooo";

      }




//GNU GPL v3
//Please visit our github page: https://github.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension

//cpiData stores data for this extension
var cpiData = {};

//initialize used elements
cpiData.lastMessageHashList = [];
cpiData.integrationFlowId = "";

var callCache = new Map();
function makeCallPromise(method, url, useCache, accept, payload, includeXcsrf, contentType) {
  return new Promise(async function (resolve, reject) {
    var cache;
    if (useCache) {
      cache = callCache.get(method + url);
    }
    if (cache) {
      resolve(cache);
    } else {

      var xhr = new XMLHttpRequest();
      xhr.withCredentials = true;

      xhr.open(method, url);
      if (accept) {
        //Example for accept: 'application/json'
        xhr.setRequestHeader('Accept', accept);
      }

      if (contentType) {
        xhr.setRequestHeader('Content-type', contentType);
      }

      if (includeXcsrf) {
        var tenant = document.location.href.split("/")[2].split(".")[0];
        var name = 'xcsrf_' + tenant;
        var xcsrf = await storageGetPromise(name)
        xhr.setRequestHeader("X-CSRF-Token", xcsrf);
      }

      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          if (useCache) {
            callCache.set(method + url, xhr.responseText);
          }
          resolve(xhr.responseText);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send(payload);

    }
  }
  );

}

//function to make http calls
async function makeCall(type, url, includeXcsrf, payload, callback, contentType) {

  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.open(type, url, true);

  if (contentType) {
    xhr.setRequestHeader('Content-type', contentType);
  }

  if (includeXcsrf) {
    var tenant = document.location.href.split("/")[2].split(".")[0];
    var name = 'xcsrf_' + tenant;
    var xcsrf = await storageGetPromise(name)
    xhr.setRequestHeader("X-CSRF-Token", xcsrf);
  }

  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      callback(xhr);
    }
  }

  xhr.send(payload);
}

//opens a new window with the Trace for a MessageGuid
function openTrace(MessageGuid) {

  //we have to get the RunID first
  makeCall("GET", "/itspaces/odata/api/v1/MessageProcessingLogs('" + MessageGuid + "')/Runs?$format=json", false, "", (xhr) => {
    if (xhr.readyState == 4) {
      var resp = JSON.parse(xhr.responseText);
      var runId = resp.d.results[0].Id;

      let url = '/itspaces/shell/monitoring/MessageProcessingRun/%7B"parentContext":%7B"MessageMonitor":%7B"artifactKey":"__ALL__MESSAGE_PROVIDER","artifactName":"All%20Artifacts"%7D%7D,"messageProcessingLog":"' + MessageGuid + '","RunId":"' + runId + '"%7D';
      window.open(url, '_blank');
    }
  })
}

//open new window for infos
function openInfo(url) {
  window.open(url, '_blank');
}

//refresh the logs in message window
var getLogsTimer;
var activeInlineItem;
async function getLogs() {

  var createRow = function (elements) {
    var tr = document.createElement("tr");
    elements.forEach(element => {
      let td = document.createElement("td");
      elements.length == 1 ? td.colSpan = 3 : null;
      typeof (element) == "object" ? td.appendChild(element) : td.innerHTML = element;
      tr.appendChild(td);
    });
    return tr;
  }

  //check if iflowid exists
  iflowId = cpiData.integrationFlowId;
  if (!iflowId) {
    return;
  }

  //get the messagelogs for current iflow
  makeCall("GET", "/itspaces/odata/api/v1/MessageProcessingLogs?$filter=IntegrationFlowName eq '" + iflowId + "'&$top=10&$format=json&$orderby=LogStart desc", false, "", (xhr) => {

    if (xhr.readyState == 4 && sidebar.active) {

      var resp = JSON.parse(xhr.responseText);
      resp = resp.d.results;

      //    document.getElementById('iflowName').innerText = cpiData.integrationFlowId;

      let updatedText = document.getElementById('updatedText');

      updatedText.innerHTML = "<span>Last update:<br>" + new Date().toLocaleString("de-DE") + "</span>";

      let thisMessageHash = "";
      if (resp.length != 0) {
        thisMessageHash = resp[0].MessageGuid + resp[0].LogStart + resp[0].LogEnd + resp[0].Status;

        if (thisMessageHash != cpiData.lastMessageHashList[0]) {

          let thisMessageHashList = [];

          let messageList = document.getElementById('messageList');
          messageList.innerHTML = "";
          var lastDay;

          for (var i = 0; i < resp.length; i++) {
            thisMessageHashList.push(resp[i].MessageGuid + resp[i].LogStart + resp[i].LogEnd + resp[i].Status);

            //write date if necessary
            let date = new Date(parseInt(resp[i].LogEnd.match(/\d+/)[0]));
            //add offset to utc time. The offset is not correct anymore but isostring can be used to show local time
            date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
            date = date.toISOString();

            if (date.substr(0, 10) != lastDay) {
              messageList.appendChild(createRow([date.substr(0, 10)]));
              lastDay = date.substr(0, 10);
            }

            //flash animation for new elements
            let flash = "";
            if (cpiData.lastMessageHashList.length != 0 && !cpiData.lastMessageHashList.includes(thisMessageHashList[i])) {
              flash = " flash";
            }
            let loglevel = resp[i].LogLevel.toLowerCase();
            // logLevel[0] = logLevel[0].toUpperCase();

            let traceButton = createElementFromHTML("<button id='trace--" + i + "' class='" + resp[i].MessageGuid + flash + "'>" + loglevel + "</button>");
            let infoButton = createElementFromHTML("<button id='info--" + i + "' class='" + resp[i].AlternateWebLink + flash + "'><span data-sap-ui-icon-content='' class='sapUiIcon sapUiIconMirrorInRTL' style='font-family: SAP-icons; font-size: 0.9rem;'></span></button>");

            //let listItem = document.createElement("div");
            //listItem.classList.add("cpiHelper_messageListItem")
            let statusColor = "#008000";
            let statusIcon = "";
            if (resp[i].Status == "PROCESSING") {
              statusColor = "#FFC300";
              statusIcon = "";
            }
            if (resp[i].Status == "FAILED") {
              statusColor = "#C70039";
              statusIcon = "";
            }
            //listItem.style["color"] = statusColor;

            let inlineTraceButton = createElementFromHTML("<button class='" + resp[i].MessageGuid + flash + " cpiHelper_inlineInfo-button' style='cursor: pointer;'>" + date.substr(11, 8) + "</button>");
            activeInlineItem == inlineTraceButton.classList[0] && inlineTraceButton.classList.add("cpiHelper_inlineInfo-active");


            let statusicon = createElementFromHTML("<button class='" + resp[i].MessageGuid + " cpiHelper_sidebar_iconbutton'><span data-sap-ui-icon-content='" + statusIcon + "' class='" + resp[i].MessageGuid + " sapUiIcon sapUiIconMirrorInRTL' style='font-family: SAP-icons; font-size: 0.9rem; color:" + statusColor + ";'> </span></button>");

            statusicon.onmouseover = (e) => {

              infoPopupOpen(e.currentTarget.classList[0]);
              infoPopupSetTimeout(null);
            };
            statusicon.onmouseout = (e) => {
              infoPopupSetTimeout(2000);
            };

            inlineTraceButton.onmouseup = async (e) => {
              if (activeInlineItem == e.target.classList[0]) {

                hideInlineTrace();
                showSnackbar("Inline Debugging Deactivated");

              } else {
                hideInlineTrace();
                var inlineTrace = await showInlineTrace(e.currentTarget.classList[0]);
                if (inlineTrace) {
                  showSnackbar("Inline Debugging Activated");
                  e.target.classList.add("cpiHelper_inlineInfo-active");

                  activeInlineItem = e.target.classList[0];
                } else {
                  activeInlineItem = null;
                  showSnackbar("Inline debugging not possible. No data found.");
                }

              }


              //   e.target.style.backgroundColor = 'red';

            };

            //      listItem.appendChild(statusicon);
            //      listItem.appendChild(inlineTraceButton);
            //      listItem.appendChild(infoButton);
            //      listItem.appendChild(traceButton);

            messageList.appendChild(createRow([statusicon, inlineTraceButton, infoButton, traceButton]));

            infoButton.addEventListener("click", (a) => {
              openInfo(a.currentTarget.classList[0]);
            });


            traceButton.addEventListener("click", (a) => {

              openTrace(a.currentTarget.classList[0]);

            });

          }
          cpiData.lastMessageHashList = thisMessageHashList;
        }

      }
      //new update in 3 seconds
      if (sidebar.active) {
        var getLogsTimer = setTimeout(getLogs, 3000);
      }
    }
  });
}

async function showBigPopup(content, header) {
  //create traceInfo div element
  var x = document.getElementById("cpiHelper_bigPopup");
  if (!x) {
    x = document.createElement('div');
    x.id = "cpiHelper_bigPopup";
    x.classList.add("cpiHelper");
    document.body.appendChild(x);
  }
  x.style.display = "block";
  x.innerHTML = "";

  if (header) {
    header = "- " + header;
  } else {
    header = "";
  }

  var textElement = `
   <div id="cpiHelper_bigPopup_outerFrame">
   <div id="cpiHelper_bigPopup_contentheader">ConVista CPI Helper ${header}<span id="cpiHelper_bigPopup_close" class="cpiHelper_closeButton">X</div>
     <div id="cpiHelper_bigPopup_content">
     Please Wait...
   </div>
   </div>
   `;



  x.appendChild(createElementFromHTML(textElement));
  var span = document.getElementById("cpiHelper_bigPopup_close");
  span.onclick = (element) => {
    var x = document.getElementById("cpiHelper_bigPopup");
    x.remove();
  };

  var infocontent = document.getElementById("cpiHelper_bigPopup_content");
  if (typeof (content) == "string") {
    infocontent.innerHTML = content;
  }

  if (typeof (content) == "object") {
    infocontent.innerHTML = "";
    infocontent.appendChild(content);
  }
}

async function clickTrace(e) {

  var formatHeadersAndPropertiesToTable = function (inputList) {
    if (inputList == null || inputList.length == 0) {
      return "<div>No elements found</div>";
    }

    result = "<table><tr><th>Name</th><th>Value</th></tr>"
    var even = "";
    inputList.forEach(item => {
      result += "<tr class=\"" + even + "\"><td>" + item.Name + "</td><td style=\"word-break: break-all;\">" + item.Value + "</td></tr>"
      if (even == "even") {
        even = "";
      } else {
        even = "even";
      }
    });
    result += "</table>";
    return result;
  }
  var formatTrace = function (input, id) {

    var encodeHTML = function (str) {

      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#010;').replace(/'/g, "&#039;");
    }

    var formatXml = function (sourceXml) {
      var xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
      var xsltDoc = new DOMParser().parseFromString([
        // describes how we want to modify the XML - indent everything
        '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
        '  <xsl:strip-space elements="*"/>',
        '  <xsl:template match="para[content-style][not(text())]">', // change to just text() to strip space in text nodes
        '    <xsl:value-of select="normalize-space(.)"/>',
        '  </xsl:template>',
        '  <xsl:template match="node()|@*">',
        '    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
        '  </xsl:template>',
        '  <xsl:output indent="yes"/>',
        '</xsl:stylesheet>',
      ].join('\n'), 'application/xml');

      var xsltProcessor = new XSLTProcessor();
      xsltProcessor.importStylesheet(xsltDoc);
      var resultDoc = xsltProcessor.transformToDocument(xmlDoc);
      var resultXml = new XMLSerializer().serializeToString(resultDoc);
      return resultXml;
    };

    var prettify = function (input) {
      var stringToFormat;
      var type;


      try {
        stringToFormat = JSON.stringify(JSON.parse(input), null, 4);
        type = "json";
      } catch (error) {

      }

      if (stringToFormat == null) {
        if (input.trim()[0] == "<") {
          stringToFormat = formatXml(input);
          stringToFormat = encodeHTML(stringToFormat);
          type = "xml";
        }
      }

      if (stringToFormat == null) {
        type = "unknown";
        stringToFormat = input;
      }

      PR.prettyPrint();
      showSnackbar("Autodetect content: " + type);
      return PR.prettyPrintOne(stringToFormat, null, 1);

    }




    var copyButton = document.createElement("button");
    copyButton.innerText = "Copy";
    copyButton.onclick = (input) => {

      var text;
      //check who is active
      var unformatted = document.getElementById("cpiHelper_traceText_unformatted_" + id);
      var formatted = document.getElementById("cpiHelper_traceText_formatted_" + id);

      if (unformatted.classList.contains("cpiHelper_traceText_active")) {
        text = unformatted.innerText;
      } else {
        text = formatted.innerText;
      }


      navigator.clipboard.writeText(text).then(function () {
        showSnackbar("Copied!")
        console.log('Async: Copying to clipboard was successful!');
      }, function (err) {
        console.error('Async: Could not copy text: ', err);
      })
    };

    var beautifyButton = document.createElement("button");
    beautifyButton.innerText = "Try to Beautify";
    beautifyButton.onclick = (event) => {

      //check who is active
      var unformatted = document.getElementById("cpiHelper_traceText_unformatted_" + id);
      var formatted = document.getElementById("cpiHelper_traceText_formatted_" + id);

      if (unformatted.classList.contains("cpiHelper_traceText_active")) {
        unformatted.classList.remove("cpiHelper_traceText_active");
        formatted.classList.add("cpiHelper_traceText_active");
        this.innerText = "Uglify";
      } else {
        formatted.classList.remove("cpiHelper_traceText_active");
        unformatted.classList.add("cpiHelper_traceText_active");
        this.innerText = "Try to Beautify";
      }

      if (formatted.innerHTML == "") {
        var pre = document.createElement("pre");
        pre.classList.add("prettyprint");
        pre.classList.add("linenums");
        pre.style.border = "none";
        pre.style.whiteSpace = "pre-wrap";
        pre.style.margin = "0px";
        pre.innerHTML = prettify(unformatted.innerText);
        formatted.appendChild(pre);
      }

    }

    var result = document.createElement("div");
    result.appendChild(beautifyButton);
    result.appendChild(copyButton);

    var unformattedTrace = document.createElement("div");
    var formattedTrace = document.createElement("div");
    formattedTrace.id = "cpiHelper_traceText_formatted_" + id;
    formattedTrace.classList.add("cpiHelper_traceText");



    unformattedTrace.classList.add("cpiHelper_traceText");
    unformattedTrace.classList.add("cpiHelper_traceText_active");
    unformattedTrace.id = "cpiHelper_traceText_unformatted_" + id;
    unformattedTrace.innerText = input;
    result.appendChild(unformattedTrace);
    result.appendChild(formattedTrace);
    return result;
  }

  var formatLogContent = function (inputList) {
    result = "<table><tr><th>Name</th><th>Value</th></tr>"
    var even = "";
    inputList.forEach(item => {
      result += "<tr class=\"" + even + "\"><td>" + item.Name + "</td><td style=\"word-break: break-all;\">" + item.Value + "</td></tr>"
      if (even == "even") {
        even = "";
      } else {
        even = "even";
      }
    });
    result += "</table>";
    return result;
  }
  var getTraceTabContent = async function (object) {
    var traceId = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogRunSteps(RunId='" + object.runId + "',ChildCount=" + object.childCount + ")/TraceMessages?$format=json", true)).d.results[0].TraceId;

    let html = "";
    if (object.traceType == "properties") {
      let elements = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/TraceMessages(" + traceId + ")/ExchangeProperties?$format=json", true)).d.results;
      html = formatHeadersAndPropertiesToTable(elements);
    }
    if (object.traceType == "headers") {
      let elements = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/TraceMessages(" + traceId + ")/Properties?$format=json", true)).d.results;
      html = formatHeadersAndPropertiesToTable(elements);
    }

    if (object.traceType == "trace") {
      let elements = await makeCallPromise("GET", "/itspaces/odata/api/v1/TraceMessages(" + traceId + ")/$value", true);
      html = formatTrace(elements, object.runId + "_" + object.childCount);
    }

    if (object.traceType == "logContent") {
      let elements = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogRunSteps(RunId='" + object.runId + "',ChildCount=" + object.childCount + ")/?$expand=RunStepProperties&$format=json", true)).d.RunStepProperties.results;
      html = formatLogContent(elements);
    }

    return html;
  }

  var id = this.id.replace(/BPMN[a-zA-Z-]+_/, "");

  var targetElements = inlineTraceElements.filter((element) => {
    return element.StepId == id || element.ModelStepId == id;
  })

  var runs = [];

  for (var n = targetElements.length - 1; n >= 0; n--) {
    var childCount = targetElements[n].ChildCount;
    var runId = targetElements[n].RunId;
    var branch = targetElements[n].BranchId
    try {

      var traceId = JSON.parse(await makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogRunSteps(RunId='" + runId + "',ChildCount=" + childCount + ")/TraceMessages?$format=json", true)).d.results[0].TraceId;

      var objects = [{
        label: "Properties",
        content: getTraceTabContent,
        active: true,
        childCount: childCount,
        runId: runId,
        traceType: "properties"
      }, {
        label: "Headers",
        content: getTraceTabContent,
        active: false,
        childCount: childCount,
        runId: runId,
        traceType: "headers"
      }, {
        label: "Body",
        content: getTraceTabContent,
        active: false,
        childCount: childCount,
        runId: runId,
        traceType: "trace"
      }, {
        label: "Log",
        content: getTraceTabContent,
        active: false,
        childCount: childCount,
        runId: runId,
        traceType: "logContent"
      }
      ]

      if (targetElements[n].Error) {
        let innerContent = document.createElement("div");
        innerContent.classList.add("cpiHelper_traceText");
        innerContent.innerText = targetElements[n].Error;
        innerContent.style.display = "block";

        objects.push({
          label: "Error",
          content: innerContent,
          active: false
        }
        );
      }


      runs.push({
        label: "Branch " + branch,
        content: await createTabHTML(objects, "tracetab-" + childCount),
      });

    } catch (error) {
      console.log("error catching trace");

    }



  }

  //Trace
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/TraceMessages(7875L)/$value

  //Properties
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/TraceMessages(7875L)/ExchangeProperties?$format=json

  //Headers
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/TraceMessages(7875L)/Properties?$format=json

  //TraceID
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/odata/api/v1/MessageProcessingLogRunSteps(RunId='AF57ga2G45vKDTfn7zqO0zwJ9n93',ChildCount=17)/TraceMessages?$format=json

  if (runs.length == 0) {
    showSnackbar("No Trace Found.");
    return;
  }

  if (runs.length == 1) {
    showBigPopup(runs[0].content, "Content Before Step");
  } else {
    showBigPopup(await createTabHTML(runs, "runstab", 0), "Content Before Step");
  }

}

async function hideInlineTrace() {

  activeInlineItem = null;

  var classesToBedeleted = ["cpiHelper_inlineInfo", "cpiHelper_inlineInfo_error", "cpiHelper_inlineInfo-active"]

  onClicKElements.forEach((element) => {
    if (element.onclick) {
      element.onclick = null;
    }
  });

  onClicKElements = [];

  classesToBedeleted.forEach((element) => {
    let elements = document.getElementsByClassName(element);
    for (let i = (elements.length - 1); i >= 0; i--) {
      if (elements[i].onclick) {
        elements[i].onclick = null;
        //elements[i].removeEventListener('onclick', clickTrace);
      }
      elements[i].classList.remove(element)

    }
  });
}

async function createTabHTML(objects, idPart, overwriteActivePosition) {
  return new Promise(async (resolve, reject) => {
    /*
      {label:"Hallo",
       content: "",
       active}
    }

    */

    html = document.createElement("div");
    html.classList.add("cpiHelper_tabs");

    let checked = 'checked=""';
    for (let i = 0; i < objects.length; i++) {

      checked = "";
      if ((overwriteActivePosition != null && overwriteActivePosition == i) || (overwriteActivePosition != null && overwriteActivePosition == objects[i].label) || (overwriteActivePosition == null && objects[i].active)) {
        checked = 'checked="checked"';
      }

      //input button
      let input = createElementFromHTML(`<input name="tabs-${idPart}" type="radio" id="tab-${idPart}-${i}" ${checked} class="cpiHelper_tabs_input"/>`);

      if (typeof (objects[i].content) == "function") {
        input.onclick = async (event) => {

          let contentElement = document.getElementById(idPart + "-" + i + "-content");
          if (contentElement.innerHTML == "Please Wait...") {
            let contentResponse = await objects[i].content(objects[i]);
            if (typeof (contentResponse) == "object") {
              contentElement.innerHTML = "";
              contentElement.appendChild(contentResponse);
            }
            if (typeof (contentResponse) == "string") {
              contentElement.innerHTML = contentResponse;
            }
            if (typeof (contentResponse) == "function") {
              contentElement.innerHTML = contentResponse(objects[i]);
            }
          }
        }
      }


      let label = createElementFromHTML(`<label for="tab-${idPart}-${i}" class="cpiHelper_tabs_label">${objects[i].label}</label>`);

      //content of tab
      let content = createElementFromHTML(` <div id="${idPart}-${i}-content" class="cpiHelper_tabs_panel"></div>`);

      if (typeof (objects[i].content) == "string") {
        content.innerHTML = objects[i].content;
      }

      if (typeof (objects[i].content) == "object") {
        content.appendChild(objects[i].content);
      }

      if (typeof (objects[i].content) == "function") {
        content.innerHTML = "Please Wait...";
        if (objects[i].active) {
          content.innerHTML = await objects[i].content(objects[i]);
        }
      }

      html.appendChild(input);
      html.appendChild(label);
      html.appendChild(content);
    }

    return resolve(html);
  });

}

var inlineTraceElements;
async function createInlineTraceElements(MessageGuid) {
  return new Promise(async (resolve, reject) => {
    inlineTraceElements = [];

    var logRuns = await getMessageProcessingLogRuns(MessageGuid);

    if (logRuns == null || logRuns.length == 0) {
      return resolve(0);
    }

    logRuns.forEach((run) => {
      inlineTraceElements.push({
        StepId: run.StepId,
        ModelStepId: run.ModelStepId,
        ChildCount: run.ChildCount,
        RunId: run.RunId,
        BranchId: run.BranchId,
        Error: run.Error
      });
    });

    return resolve(logRuns.length);
  });
}


var onClicKElements = [];
async function showInlineTrace(MessageGuid) {
  return new Promise(async (resolve, reject) => {
    var observerInstalled = false;
    var logRuns = await createInlineTraceElements(MessageGuid);

    if (logRuns == null || logRuns == 0) {
      return resolve(null);
    }

    inlineTraceElements.forEach((run) => {
      try {
        let target;
        let element;
        //    let target = element.children[getChild(element, ["g"])];
        //    target = target.children[getChild(target, ["rect", "circle", "path"])];



        if (/EndEvent/.test(run.StepId)) {
          element = document.getElementById("BPMNShape_" + run.StepId);
          target = element.children[0].children[0];
        }

        if (/CallActivity/.test(run.StepId)) {
          element = document.getElementById("BPMNShape_" + run.StepId);
          target = element.children[getChild(element, ["g"])].children[0];
        }

        if (/MessageFlow_\d+/.test(run.ModelStepId) && /#/.test(run.ModelStepId) != true) {
          element = document.getElementById("BPMNEdge_" + run.ModelStepId);
          target = element.children[getChild(element, ["path"])];
        }

        if (/ExclusiveGateway/.test(run.ModelStepId)) {
          element = document.getElementById("BPMNShape_" + run.ModelStepId);
          target = element.children[getChild(element, ["g"])].children[0];
        }

        if (/ParallelGateway/.test(run.ModelStepId)) {
          element = document.getElementById("BPMNShape_" + run.ModelStepId);
          target = element.children[getChild(element, ["g"])].children[0];
        }

        target.classList.add("cpiHelper_inlineInfo");
        //     target.addEventListener("onclick", function abc(event) { clickTrace(event); });
        element.classList.add("cpiHelper_onclick");
        element.onclick = clickTrace;
        onClicKElements.push(element);

        if (run.Error) {
          target.classList.add("cpiHelper_inlineInfo_error");
        }

        if (!observerInstalled) {

          observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              const el = mutation.target;
              if (!mutation.target.classList.contains('cpiHelper_onclick')) {
                hideInlineTrace();
                observer.disconnect();
              }
            });
          });

          observer.observe(document.getElementById(element.id), {
            attributes: true,
            attributeFilter: ['class']
          });
          observerInstalled = true;
        }

      } catch (e) {
        console.log("no element found for " + run.StepId);
        console.log(run);
      }

      return resolve(true);

    })
  })
}



function getChild(node, childNames) {
  let index;
  for (var i = 0; i < node.children.length; i++) {
    if (childNames.indexOf(node.children[i].localName) > -1) {
      return i;
    }

  }
  return null;
}

//makes a http call to set the log level to trace
function setLogLevel(logLevel, iflowId) {
  makeCall("POST", "/itspaces/Operations/com.sap.it.op.tmn.commands.dashboard.webui.IntegrationComponentSetMplLogLevelCommand", true, '{"artifactSymbolicName":"' + iflowId + '","mplLogLevel":"' + logLevel.toUpperCase() + '","nodeType":"IFLMAP"}', (xhr) => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      showSnackbar("Trace activated");
    }
    else {
      showSnackbar("Error activating Trace");
    }
  }, 'application/json');
}

//makes a http call to set the log level to trace
function undeploy(tenant, artifactId) {
  makeCall("POST", "/itspaces/Operations/com.sap.it.nm.commands.deploy.DeleteContentCommand", true, 'artifactIds=' + artifactId + '&tenantId=' + tenant, (xhr) => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      showSnackbar("Undeploy triggered");
    }
    else {
      showSnackbar("Error triggering undeploy");
    }
  }, "application/x-www-form-urlencoded; charset=UTF-8");
}

function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

function buildButtonBar() {
  if (!document.getElementById("__buttonxx")) {
    whatsNewCheck();
    //create Trace Button
    var tracebutton = createElementFromHTML('<button id="__buttonxx" data-sap-ui="__buttonxx" title="Enable traces" class="sapMBtn sapMBtnBase spcHeaderActionButton" style="display: inline-block; margin-left: 0px;"><span id="__buttonxx-inner" class="sapMBtnHoverable sapMBtnInner sapMBtnText sapMBtnTransparent sapMFocusable"><span class="sapMBtnContent" id="__button12-content"><bdi id="__button12-BDI-content">Trace</bdi></span></span></button>');
    //Create Toggle Message Bar Button
    var messagebutton = createElementFromHTML(' <button id="__buttonxy" data-sap-ui="__buttonxy" title="Messages" class="sapMBtn sapMBtnBase spcHeaderActionButton" style="display: inline-block;"><span id="__buttonxy-inner" class="sapMBtnHoverable sapMBtnInner sapMBtnText sapMBtnTransparent sapMFocusable"><span class="sapMBtnContent" id="__button13-content"><bdi id="__button13-BDI-content">Messages</bdi></span></span></button>');
    var infobutton = createElementFromHTML(' <button id="__buttoninfo" data-sap-ui="__buttoninfo" title="Info" class="sapMBtn sapMBtnBase spcHeaderActionButton" style="display: inline-block;"><span id="__buttonxy-inner" class="sapMBtnHoverable sapMBtnInner sapMBtnText sapMBtnTransparent sapMFocusable"><span class="sapMBtnContent" id="__button13-content"><bdi id="__button13-BDI-content">Info</bdi></span></span></button>');
    //append buttons
    area = document.querySelector("[id*='--iflowObjectPageHeader-actions']");
    area.appendChild(createElementFromHTML("<br />"));
    area.appendChild(tracebutton);
    area.appendChild(messagebutton);
    area.appendChild(infobutton);
    tracebutton.addEventListener("click", (btn) => {
      setLogLevel("TRACE", cpiData.integrationFlowId);
    });
    messagebutton.addEventListener("click", (btn) => {
      if (sidebar.active) {
        sidebar.deactivate();
      }
      else {
        sidebar.init();
      }
    });
    infobutton.addEventListener("click", (btn) => {
      getIflowInfo(openIflowInfoPopup);
    });
  }
}



//opens the popup that is triggered bei the info button
async function openIflowInfoPopup() {

  var x = document.createElement('div');
  x.id = "cpiHelper_infoPopUp_content";
  x.innerHTML = "";

  var deployedOn = cpiData?.flowData?.artifactInformation?.deployedOn;
  if (deployedOn) {
    let date = new Date(deployedOn);
    //handle time zone differences
    date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    deployedOn = date.toLocaleString();
  }

  var textElement = `<div class="cpiHelper_infoPopUp_items">
  <div>Name: ${cpiData?.flowData?.artifactInformation?.name}</div>
  <div>SymbolicName: ${cpiData?.flowData?.artifactInformation?.symbolicName}</div>
  <div>Trace: ${cpiData?.flowData?.logConfiguration?.traceActive}</div>
  <div>DeployedOn: ${deployedOn}</div>
  <div>DeploymentState: ${cpiData?.flowData?.artifactInformation?.deployState}</div>
  <div>SemanticState: ${cpiData?.flowData?.artifactInformation?.semanticState}</div>
  <div>DeployedBy: ${cpiData?.flowData?.artifactInformation?.deployedBy}</div>
  </div>`;

  x.appendChild(createElementFromHTML(textElement));

  if (cpiData.flowData.endpointInformation && cpiData.flowData.endpointInformation.length > 0) {
    cpiData.flowData.endpointInformation.forEach(element => {
      if (element.endpointInstances && element.endpointInstances.length > 0) {
        var e = document.createElement('div');
        e.classList.add("cpiHelper_infoPopUp_items");
        e.innerHTML = `<div>${element?.protocol}:</div>`;
        x.appendChild(e);
        for (var i = 0; i < element.endpointInstances.length; i++) {
          let f = document.createElement('div');
          f.className = "contentText";
          f.innerText = `${element.endpointInstances[i]?.endpointCategory}: ${element.endpointInstances[i]?.endpointUrl}`;
          e.appendChild(f);
        }
      }
    });
  }
  //JSON?

  // List Variables
  // GET https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.ListDataStoreEntriesCommand?storeName=sap_global_store&allStores=true&maxNum=100000


  async function createTableForVariables() {
    var variableList =
      await makeCallPromise(
        "GET",
        "/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.ListDataStoreEntriesCommand?storeName=sap_global_store&allStores=true&maxNum=100000",
        false,
        "application/json", null, false

      )

    variableList = JSON.parse(variableList).entries;

    //check if variables exist
    if (variableList == null || variableList.length == 0) { return document.createElement("div"); }

    //filter only global variables or variables from this flow
    variableList = variableList.filter(element => !element.qualifier || element.qualifier == cpiData?.flowData?.artifactInformation?.symbolicName);

    //check if array is now empty
    if (variableList == null || variableList.length == 0) { return document.createElement("div"); }

    //if not, build table
    var result = document.createElement("table");
    result.classList.add("cpiHelper_infoPopUp_Table")

    tr0 = document.createElement("tr");
    tr0th1 = document.createElement("th");
    tr0th1.innerText = "Store";
    tr0th2 = document.createElement("th");
    tr0th2.innerText = "Name";
    tr0th2.style.width = "100%";

    tr0.appendChild(document.createElement("td"));
    tr0.appendChild(tr0th1);

    tr0.appendChild(tr0th2);



    result.appendChild(tr0);

    var even = "";
    variableList.forEach(item => {
      let tr = document.createElement("tr");
      tr.id = item.id + item.storeName;
      tr.className = even;

      let tdfunctions = document.createElement("td");
      tdfunctions.style.whiteSpace = "nowrap";

      let showButton = createElementFromHTML("<button><span data-sap-ui-icon-content='' class='sapUiIcon sapUiIconMirrorInRTL' style='font-family: SAP-icons; font-size: 0.9rem;'></span></button>");

      tdfunctions.appendChild(showButton);

      let downloadButton = createElementFromHTML("<button><span data-sap-ui-icon-content='' class='sapUiIcon sapUiIconMirrorInRTL' style='font-family: SAP-icons; font-size: 0.9rem;'></span></button>");
      tdfunctions.appendChild(downloadButton);

      let deleteButton = createElementFromHTML("<button><span data-sap-ui-icon-content='' class='sapUiIcon sapUiIconMirrorInRTL' style='font-family: SAP-icons; font-size: 0.9rem;'></span></button>");
      tdfunctions.appendChild(deleteButton);

      tr.appendChild(tdfunctions);

      let td1 = document.createElement("td");
      td1.innerText = (item.qualifier == null ? "global" : "local");
      tr.appendChild((td1));

      let td2 = document.createElement("td");
      td2.innerText = item.id;
      tr.appendChild((td2));

      downloadButton.onclick = async (element) => {
        let payload = { "storeName": item.storeName, "id": item.id };
        if (item.qualifier) {
          payload.qualifier = item.qualifier;
        }
        var response = await makeCallPromise("POST", "/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.GetDataStorePayloadCommand", false, "", JSON.stringify(payload), true, "application/json;charset=UTF-8");
        var value = response.match(/<payload>(.*)<\/payload>/sg)[0];
        value = value.substring(9, value.length - 10)

        window.open("data:application/zip;base64," + value);
      }


      showButton.onclick = async (element) => {
        text = document.getElementById(item.id + item.storeName + "_value");

        if (text.classList.contains("cpiHelper_infoPopUp_TR_hide")) {

          try {

            let payload = { "storeName": item.storeName, "id": item.id };
            if (item.qualifier) {
              payload.qualifier = item.qualifier;
            }


            var response = await makeCallPromise("POST", "/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.GetDataStoreVariableCommand", false, "", JSON.stringify(payload), true, "application/json;charset=UTF-8");



            var value = response.match(/<value>(.*)<\/value>/sg)[0];

            //aggressive mode means we look into the zip file from variable
            var agressiveMode = false;
            if (!value) {
              aggressiveMode = true;
              function base64ToBuffer(str) {
                str = window.atob(str); // creates a ASCII string
                var buffer = new ArrayBuffer(str.length),
                  view = new Uint8Array(buffer);
                for (var i = 0; i < str.length; i++) {
                  view[i] = str.charCodeAt(i);
                }
                return buffer;
              }

              var response = await makeCallPromise("POST", "/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.GetDataStorePayloadCommand", false, "", JSON.stringify(payload), true, "application/json;charset=UTF-8");
              var base = response.match(/<payload>(.*)<\/payload>/sg)[0];
              base = base.substring(9, base.length - 10)

              var new_zip = new JSZip();
              await new_zip.loadAsync(base64ToBuffer(base));

              value = await new_zip.files[Object.keys(new_zip.files)[0]].async("string");

            } else {
              //when no aggressive mode, data has still to be transformed from base64
              value = atob(value.substring(7, value.length - 8));
            }


            let valueTd = document.createElement("td");
            valueTd.colSpan = 4;

            valueTd.innerText = value;
            text.innerHTML = "";
            text.appendChild(valueTd);
            if (agressiveMode) {
              showSnackbar("Aggressive mode was used to show variable");
            }

            text.classList.remove("cpiHelper_infoPopUp_TR_hide");
          } catch (error) {
            showSnackbar("It was not possible to extract the data. Please download and try manually.");
          }
        } else {
          text.classList.add("cpiHelper_infoPopUp_TR_hide");
          text.innerHTML = "<td colspan=4>Please wait...</td>";
        }
      }

      deleteButton.onclick = async (element) => {
        var doDelete = getConfirmation(`Do you really want to delete variable \"${item.id}\"? You can not undo this later.`);
        if (doDelete) {
          //delete Variable
          try {
            let payload = { "storeName": item.storeName, "ids": [item.id] };
            if (item.qualifier) {
              payload.qualifier = item.qualifier;
            }
            var response = await makeCallPromise("POST", "/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.DeleteDataStoreEntryCommand", false, "", JSON.stringify(payload), true, "application/json;charset=UTF-8");
            showSnackbar("Variable deleted.");
            let cpiHelper_infoPopUp_Variables = document.getElementById("cpiHelper_infoPopUp_Variables")

            cpiHelper_infoPopUp_Variables.appendChild(await createTableForVariables());
            cpiHelper_infoPopUp_Variables.children[0].remove();

          } catch (err) {
            showSnackbar("Can not delete variable. Do you have sufficient rights?");
          }

        }

      }





      let trShowButton = document.createElement("tr");
      trShowButton.className = even;
      trShowButton.classList.add("cpiHelper_infoPopUp_TR_hide")
      trShowButton.id = item.id + item.storeName + "_value";
      trShowButton.innerHTML = "<td colspan=4>Please wait...</td>";

      result.appendChild(tr);
      result.appendChild(trShowButton);

      even = even == "even" ? "" : "even";
    });


    return result;

  }

  var variablesDiv = document.createElement("div");
  variablesDiv.id = "cpiHelper_infoPopUp_Variables";
  variablesDiv.classList.add("cpiHelper_infoPopUp_items");
  variablesDiv.appendChild(await createTableForVariables());
  x.appendChild(variablesDiv);

  //Get Variable XCSRF
  //https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.GetDataStoreVariableCommand
  // {"storeName":"sap_global_store","id":"keywordsSinceIds","qualifier":"Sentiment_Engagement_-_Twitter_Keywords_Search_Integration_Flow"}

  //delete variables XCSRF
  // POST https://p0349-tmn.hci.eu1.hana.ondemand.com/itspaces/Operations/com.sap.esb.monitoring.datastore.access.command.DeleteDataStoreEntryCommand
  // {"storeName":"sap_global_store","ids":["dateglobal"]}


  //undeploy button
  if (deployedOn) {
    var undeploybutton = document.createElement('button');
    undeploybutton.innerText = "Undeploy";
    undeploybutton.id = "undeploybutton";
    undeploybutton.addEventListener("click", (a) => {
      undeploy(cpiData?.flowData?.artifactInformation?.tenantId, cpiData?.flowData?.artifactInformation?.id);
    });
    x.appendChild(undeploybutton);
  }

  showBigPopup(x, "General Information");
}

function getConfirmation(message) {
  var retVal = confirm(message);
  if (retVal == true) {
    return true;
  } else {
    return false;
  }
}

//snackbar for messages (e.g. trace is on)
function showSnackbar(message) {
  //css for snackbar is already there. see initIflowPage()

  //create snackbar div element
  var x = document.getElementById("cpiHelper_snackbar");
  if (!x) {
    x = document.createElement('div');
    x.id = "cpiHelper_snackbar";
    document.body.appendChild(x);
  }
  x.innerHTML = message;
  x.className = "cpiHelper_snackbar_show";
  setTimeout(function () { x.className = x.className.replace("cpiHelper_snackbar_show", ""); }, 3000);
}

//the sidebar that shows messages
var sidebar = {

  //indicator if active or not
  active: false,

  //function to deactivate the sidebar
  deactivate: function () {
    this.active = false;
    clearTimeout(getLogsTimer);
    document.getElementById("cpiHelper_content").remove();
  },

  //function to create and initialise the message sidebar
  init: function () {
    this.active = true;

    //create sidebar div
    var elem = document.createElement('div');
    elem.innerHTML = `
    <div id="cpiHelper_contentheader">ConVista CPI Helper<span id='sidebar_modal_close' class='cpiHelper_closeButton'>X</span></div>
    <div id="outerFrame">
    <div id="updatedText" class="contentText"></div>

    <div><table id="messageList" class="contentText"></table></div>


    </div>
    `;
    elem.id = "cpiHelper_content";
    elem.classList.add("cpiHelper");
    document.body.appendChild(elem);

    //add close button
    var span = document.getElementById("sidebar_modal_close");
    span.onclick = (element) => {
      sidebar.deactivate();
    };

    //activate dragging for message bar
    dragElement(document.getElementById("cpiHelper_content"));

    //lastMessageHashList must be empty when message sidebar is created
    cpiData.lastMessageHashList = [];

    //refresh messages
    getLogs();
  }
};



function injectCss(cssStyle, id, className) {
  var style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(cssStyle));
  id && (style.id = id);
  className && style.classList.add(className);
  document.getElementsByTagName('head')[0].appendChild(style);
}

function removeElementsWithId(name) {
  document.getElementById(name).remove();
  return true;
}

function removeElementsWithClass(classToDelete) {
  let elements = document.getElementsByClassName(classToDelete);
  for (let i = (elements.length - 1); i >= 0; i--) {
    elements[i].remove(element)
  }
  return true;
}

async function infoPopupOpen(MessageGuid) {
  var x = document.getElementById("cpiHelper_sidebar_popup");
  if (!x) {
    x = document.createElement('div');
    x.id = "cpiHelper_sidebar_popup";
    x.onmouseover = (e) => {
      infoPopupSetTimeout(null);
    };
    x.onmouseout = (e) => {
      infoPopupSetTimeout(3000);
    };
    document.body.appendChild(x);
  }

  x.innerText = "Please wait...";
  x.className = "show";

  ///MessageProcessingLogRuns('AF5eUbNwAc1SeL_vdh09y4njOvwO')/RunSteps?$inlinecount=allpages&$format=json&$top=500
  var resp = await getMessageProcessingLogRuns(MessageGuid)

  var y = document.getElementById("cpiHelper_sidebar_popup");
  y.innerText = "";


  if (resp == null || resp.length == 0) {
    y.innerText = "No data available.";
    return;
  }


  let error = false;
  for (var i = 0; i < resp.length; i++) {
    if (resp[i].Error) {
      error = true;
      let errorText = createErrorMessageElement(resp[i].Error);
      y.appendChild(errorText);
    }
  }
  if (!error || resp.length == 0) {
    let errorText = document.createElement("span");
    errorText.className = "contentText";
    y.appendChild(errorText);
    y.innerText = "No errors found in processed message";
  }

};

function lookupError(message) {
  if (/unable to find valid certification path to requested target/.test(message)) {
    return "Probably you did not add a certificate for the https host that you are caling to the keystore";
  }

  return null;
}

function createErrorMessageElement(message) {
  let errorElement = document.createElement("div");
  errorElement.style.color = "red";
  errorElement.className = "contentText";
  errorElement.innerText = message;

  let errorContainer = document.createElement("div");
  errorContainer.appendChild(errorElement);

  let explain = lookupError(message);
  if (explain) {
    errorContainer.appendChild(createElementFromHTML("<div>Possible explanation: " + explain + "</div>"));
  }
  return errorContainer;
}

async function getMessageProcessingLogRuns(MessageGuid) {
  return makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogs('" + MessageGuid + "')/Runs?$inlinecount=allpages&$format=json&$top=500", true).then((responseText) => {
    var resp = JSON.parse(responseText);
    console.log(resp);
    return resp.d.results[0].Id;
  }).then((runId) => {
    return makeCallPromise("GET", "/itspaces/odata/api/v1/MessageProcessingLogRuns('" + runId + "')/RunSteps?$inlinecount=allpages&$format=json&$top=500", true);
  }).then((response) => {
    return JSON.parse(response).d.results;
  }).catch((e) => {
    console.log(e);
    return null;
  });
}

var timeOutTimer;
function infoPopupSetTimeout(milliseconds) {
  if (milliseconds) {
    timeOutTimer = setTimeout(() => {
      infoPopupClose();
    }, milliseconds);
  } else {
    clearTimeout(timeOutTimer);
  }
}

function infoPopupClose() {
  var x = document.getElementById("cpiHelper_sidebar_popup");
  if (x) {
    x.className = "hide_popup";
  }
}

//function to get the iFlow name from the URL
function getIflowName() {
  var url = window.location.href;
  let dateRegexp = /\/integrationflows\/(?<integrationFlowId>[0-9a-zA-Z_\-.]+)/;
  var result;

  try {
    let groups = url.match(dateRegexp).groups;

    result = groups.integrationFlowId;
    console.log("Found iFlow:" + result);

  } catch (e) {
    console.log(e);
    console.log("no integrationflow found");
  }

  cpiData.integrationFlowId = result;
  return result;
}

//we have to check for url changes to deactivate sidebar and to inject buttons, when on iflow site.
var oldURL = "";
function checkURLchange() {
  var currentURL = window.location.href;
  var urlChanged = false;
  if (currentURL != oldURL) {
    urlChanged = true;
    console.log("url changed! to " + currentURL);
    oldURL = currentURL;
    handleUrlChange();
  }
  oldURL = window.location.href;
  return urlChanged;
}

//function that handles the dragging
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    /* if present, the header is where you move the DIV from:*/
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

//this function is fired when the url changes
function handleUrlChange() {
  if (getIflowName()) {
    //if iflow found, inject buttons
    storeVisitedIflowsForPopup();

  } else {
    //deactivate sidebar if not on iflow page
    if (sidebar.active) {
      sidebar.deactivate();
    }
  }
}

async function storageGetPromise(name) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([name], function (result) {
      resolve(result[name]);
    });
  })
}

async function whatsNewCheck() {

  var manifestVersion = chrome.runtime.getManifest().version;

  check = await storageGetPromise("whatsNewV" + manifestVersion);

  if (!check) {
    html = `<div id="cpiHelper_WhatsNew">Thank you for using the ConVista CPI Helper. <p>You hace successfully updated to version ${manifestVersion}</p>
    <h3>Recent Innovations</h3>
    <ul>
    <li>Version 1.2.2: If you had issues that CPIHelper improvements wasn't shown in the header bar, this should be fixed now.</li>
    <li>Version 1.2.0: You can now change the tab icon, text and main color of your different CPI tenants. This is very helpful when you have dev and prod tenant or different customers. You can make these settings on the CPI Helper icon (the cloud) in your browser bar (normally on the top right).</li>
    <li>Version 1.1.0: You can now view and delete variables in the Integration Flow Info-PopUp (Press Info in the right top corner)</li>
    <li>Version 1.0.0: Activate InlineTrace to debug your Integration Flows directly in the Designer (<a href="https://blogs.sap.com/2020/03/31/cpi-the-next-evolution-see-traces-directly-in-the-integration-flow-designer-of-sap-cloud-platform-integration/" target="_blank">more</a>)</li>
  </ul>
     <p>If you like our work you can tell your coworkers about this plug-in. To stay informed about updates, you can follow <a href="https://people.sap.com/dbeckbauer"  target="_blank">me</a> or leave a like or message in the <a href="https://blogs.sap.com/2020/03/31/cpi-the-next-evolution-see-traces-directly-in-the-integration-flow-designer-of-sap-cloud-platform-integration/"  target="_blank">SAP Community</a>.</p>
     <p>The CPI Helper is free and Open Source. If you want to contribute or you have found any bugs than have a look at our <a href="https://github.com/dbeck121/ConVista-CPI-Helper-Chrome-Extension" target="_blank">GitHub Page</a>.</p>

  </div>
  `;
    showBigPopup(html);
    var obj = {};
    obj["whatsNewV" + manifestVersion] = "show";
    chrome.storage.local.set(obj, function () {
      console.log("whats new displayed and saved");
    });
  }

  //persist so that the popup does not appear again
}

//Visited IFlows are stored to show in the popup that appears when pressing the button in browser bar
function storeVisitedIflowsForPopup() {
  var tenant = document.location.href.split("/")[2].split(".")[0];
  var name = 'visitedIflows_' + tenant;
  chrome.storage.sync.get([name], function (result) {
    var visitedIflows = result[name];

    if (!visitedIflows) {
      visitedIflows = [];
    }

    //filter out the current flow
    if (visitedIflows.length > 0) {
      visitedIflows = visitedIflows.filter((element) => {
        return element.name != cpiData.integrationFlowId;
      });
    }

    //put the current flow to the last element. last position indicates last visited element
    visitedIflows.push({ name: cpiData.integrationFlowId, "url": document.location.href, "favorit": false });

    //delete the first one when there are more than 10 iflows in visited list
    if (visitedIflows.length > 10) {
      visitedIflows.shift();
    }

    var obj = {};
    obj[name] = visitedIflows;

    chrome.storage.sync.set(obj, function () {
    });

  });
}

//start
checkURLchange();
setInterval(function () {
  var elements = document.querySelectorAll("[id$='-BDI-content']");
  for (var i = 0; i < elements.length; i++) {

   buildButtonBar();
  }
  /*  if (elements[i].innerHTML == "Deploy") {
      buildButtonBar();
    }  */
  }
  checkURLchange(window.location.href);
}, 3000);






