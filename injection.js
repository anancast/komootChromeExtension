let script = document.createElement("script");
script.src = chrome.runtime.getURL("content-script.js");
script.defer = true;
document.body.appendChild(script);