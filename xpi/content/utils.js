// Update Notifier
// By Todd Long <longfocus@gmail.com>
// http://www.longfocus.com/firefox/updatenotifier/

const UN_CC = Components.classes;
const UN_CI = Components.interfaces;
const UN_CS = UN_CC['@mozilla.org/consoleservice;1'].getService(UN_CI.nsIConsoleService);

const UN_ICON = "chrome://updatenotifier/skin/un-icon.png";
const UN_WEBSITE = "http://www.longfocus.com/firefox/updatenotifier/";

/**
 * Manager utils
 */
function UN_getManager() {
  return UN_CC["@longfocus.com/updatenotifier/manager;1"].getService(UN_CI.unIManager);
}

/**
 * Logging service
 */
function UN_log(aStr) {
  UN_CS.logStringMessage(aStr);
}

/**
 * Document element
 */
function UN_getEBI(aId) {
  return document.getElementById(aId);
}

function UN_setEBIA(aId, aAttr, aValue) {
  UN_getEBI(aId).setAttribute(aAttr, aValue);
}

/**
 * String bundle
 */
function UN_getBundleString(aName) {
  return UN_getManager().bundle.GetStringFromName(aName);
}

function UN_getBundleFString(aName, aParams) {
  return UN_getManager().bundle.formatStringFromName(aName, aParams, aParams.length);
}

/**
 * Prompt service
 */
function UN_confirm(aMsg) {
  return UN_CC["@mozilla.org/embedcomp/prompt-service;1"]
           .getService(UN_CI.nsIPromptService)
           .confirm(window, UN_getBundleString("un-ext-name"), aMsg);
}

function UN_confirmCheck(aMsg, aCheck) {
  return UN_CC["@mozilla.org/embedcomp/prompt-service;1"]
           .getService(UN_CI.nsIPromptService)
           .confirmCheck(window, UN_getBundleString("un-ext-name"), aMsg, UN_getBundleString("un-confirm-dont-ask"), aCheck);
}

/**
 * Branch services
 */
function UN_getBranch() {
  return UN_getManager().branch;
}

function UN_getBoolPref(aName) {
  return UN_getBranch().getBoolPref(aName);
}

function UN_setBoolPref(aName, aValue) {
  UN_getBranch().setBoolPref(aName, aValue);
}

function UN_getIntPref(aName) {
  return UN_getBranch().getIntPref(aName);
}

function UN_setIntPref(aName, aValue) {
  UN_getBranch().setIntPref(aName, aValue);
}

/**
 * Misc
 */
function UN_restart() {
  // Notify all windows that an application quit has been requested
  var observerService = UN_CC["@mozilla.org/observer-service;1"].getService(UN_CI.nsIObserverService);
  var cancelQuit = UN_CC["@mozilla.org/supports-PRBool;1"].createInstance(UN_CI.nsISupportsPRBool);
  
  observerService.notifyObservers(cancelQuit, "quit-application-requested", "restart");
  
  // Something aborted the quit process
  if (cancelQuit.data)
    return;
  
  //Restart the application
  UN_CC["@mozilla.org/toolkit/app-startup;1"]
    .getService(UN_CI.nsIAppStartup)
    .quit(UN_CI.nsIAppStartup.eRestart | UN_CI.nsIAppStartup.eAttemptQuit);
}

function UN_getPlatform() {
  return UN_CC["@mozilla.org/xre/app-info;1"].getService(UN_CI.nsIXULAppInfo).name;
}

function UN_isFirefox() {
  return (UN_getPlatform() == "Firefox");
}

function UN_getAddon(aId) {
  return UN_CC["@mozilla.org/extensions/manager;1"]
           .getService(UN_CI.nsIExtensionManager)
           .getItemForID(aId);
}

function UN_getStatusbarPanels() {
  try {
    return UN_getBrowser().ownerDocument.getElementById("status-bar").childNodes.length;
  } catch(e) {}
  return null;
}

function UN_getBrowser() {
  var windowMediator = UN_CC["@mozilla.org/appshell/window-mediator;1"].getService(UN_CI.nsIWindowMediator)
  var window = windowMediator.getMostRecentWindow("navigator:browser");
  
  if (window)
    return window.getBrowser();
  else
  {
    window = windowMediator.getMostRecentWindow("Songbird:Main");
    
    if (window)
      return window.getBrowser();
    else if (typeof getBrowser == "function")
      return getBrowser();
  }
  
  return null;
}

function UN_getMyVersion() {
  return UN_getAddon("{95f24680-9e31-11da-a746-0800200c9a66}").version;
}

function UN_visitSite(aSite) {
  var ios = UN_CC["@mozilla.org/network/io-service;1"].getService(UN_CI.nsIIOService);
  var refString = UN_WEBSITE + "v/" + UN_getMyVersion() + "/";
  var refUri = ios.newURI(refString, null, null);
  var browser = UN_getBrowser();
  
  if (browser && typeof browser.addTab == "function")
    browser.addTab(aSite, refUri);
  else
  {
    try {
      var uri = ios.newURI(aSite, null, null);
      var protocolSvc = UN_CC['@mozilla.org/uriloader/external-protocol-service;1'].getService(UN_CI.nsIExternalProtocolService);
      protocolSvc.loadUrl(uri, refUri);
    } catch(e) {}
  }
}