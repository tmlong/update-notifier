// Update Notifier
// By Todd Long <longfocus@gmail.com>
// http://www.longfocus.com/firefox/updatenotifier/

// Window preferences
var UN_gFinalHeight = 50;
var UN_gSlideIncrement = 1;
var UN_gSlideTime = 10;
var UN_gOpenTime = 4000;

function UN_gPrefillAlertInfo()
{
  var items = UN_getManager().getUpdateItems({});
  
  UN_getEBI("un-alert-image").src = UN_ICON;
  
  if (items.length > 0) {
    if (items.length == 1)
      UN_getEBI("un-alert-title").value = UN_getBundleString("tb-tooltip-new-update");
    else
      UN_getEBI("un-alert-title").value = UN_getBundleFString("tb-tooltip-new-updates", [items.length]);
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var element = document.createElement("label");
      element.setAttribute("value", item.name + " " + item.newVersion + " (" + UN_getBundleString("tb-tooltip-currently") + " " + item.oldVersion + ")");
      UN_getEBI("un-alert-items").appendChild(element);
    }
  }
  else
    window.close();
}

function UN_gAlertLoad()
{
  try {
    var prefBranch = UN_CC["@mozilla.org/preferences-service;1"].getService(UN_CI.nsIPrefService).getBranch(null);
    UN_gSlideIncrement = prefBranch.getIntPref("alerts.slideIncrement");
    UN_gSlideTime = prefBranch.getIntPref("alerts.slideIncrementTime");
    UN_gOpenTime = prefBranch.getIntPref("alerts.totalOpenTime");
  } catch(e) {}
  
  sizeToContent();
  UN_gFinalHeight = window.outerHeight;
  window.outerHeight = 1;
  window.moveTo((screen.availLeft + screen.availWidth - window.outerWidth) - 10, screen.availHeight - window.outerHeight);
  
  setTimeout(UN_gAlertAnimate, UN_gSlideTime);
}

function UN_gAlertAnimate()
{
  if (window.outerHeight < UN_gFinalHeight) {
    window.screenY -= UN_gSlideIncrement - screen.availTop;
    window.outerHeight += UN_gSlideIncrement;
    setTimeout(UN_gAlertAnimate, UN_gSlideTime);
  } else {
    setTimeout(UN_gAlertClose, UN_gOpenTime);
  }
}

function UN_gAlertClose()
{
  if (window.outerHeight > 1)
  {
    window.screenY += UN_gSlideIncrement + screen.availTop;
    window.outerHeight -= UN_gSlideIncrement;
    setTimeout(UN_gAlertClose, UN_gSlideTime);
  }
  else
    window.close();
}