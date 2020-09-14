chrome.runtime.onMessage.addListener(receiver);
 console.log('Successful in Page');
// Callback for when a message is received
function receiver(request, sender, sendResponse) {
  if (request.message === "user clicked!") {
    // Do something!
    console.log('Successful');

    //showBigPopup();

      if (sidebar.active) {
        sidebar.deactivate();
      }

        sidebar.init();


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
     <div>
    <div id="cpiHelper_contentheader">Integration Helper<span id='sidebar_modal_close' class='cpiHelper_closeButton'>X</span></div>



    <div id="outerFrame">
    <div id="updatedText" class="contentText">


                                               				    <form id="myForm">
                                               					<label for="fname">Basic</label><br>
                                               					<input type="text" id="basicid" name="fname"><br>
                                               					<label for="lname">Message</label><br>
                                               					<input type="text" id="messageid" name="lname"><br>
                                               					<label for="exten">Extension</label><br>
                                               					<input type="text" id="extensionid" name="exten"><br><br>

                                                            <button type='submit'>Start</button>

                                               				</form>


 <div id="updatedTextMessage" class="contentText"> </div>
                                               				 </div>

    <div><table id="messageList" class="contentText"></table></div>

 </div>

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
    //cpiData.lastMessageHashList = [];

    }
    };



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

    }

				function myFunction() {
				event.preventDefault();
				console.log(document.getElementById("myForm").basicid.value);
				var basForm = document.getElementById("myForm").basicid.value;
				var mesForm = document.getElementById("myForm").messageid.value;
				var extForm = document.getElementById("myForm").extensionid.value;

    			 document.getElementById("myForm").style.display = 'none';

				 document.getElementById("updatedTextMessage").innerHTML = "Hello World";
				 sendXML(basForm,mesForm,extForm);

				}

                      addEventListener("submit", (btn) => {myFunction();});


                     /* 	function sendXML(a,b,c) {



var http = new XMLHttpRequest();
var url = 'https://postman-echo.com/post';
var params = 'Basic=Orders&Message=Hello World&Extension=2';
http.open('POST', url, true);

//Send the proper header information along with the request
http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

http.onreadystatechange = function() {//Call a function when the state changes.
    if(http.readyState == 4 && http.status == 200) {
        console.log(http.responseText);
    }
}
http.send(params);





                      } */

                      function sendXML(a,b,c){
var data = new FormData();
data.append("Basic", "Order");
data.append("Message", "Hello");
data.append("Extension", "2");

var xhr = new XMLHttpRequest();
xhr.withCredentials = true;

xhr.addEventListener("readystatechange", function() {
  if(this.readyState === 4) {
    console.log('Response:'+this.responseText);


  }
});

xhr.open("Post", "/");
//xhr.setRequestHeader("Cookie", "sails.sid=s%3AWT7EPE9CCe-qvRoeG8_CgXyBSGUx9g2W.203%2FPE8RJluxTZ0OenXMzC4N6f0fjj0mSngAM1QU0cQ");
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(data);
                               }


