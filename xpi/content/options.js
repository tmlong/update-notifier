// Update Notifier
// By Todd Long <longfocus@gmail.com>
// http://www.longfocus.com/firefox/updatenotifier/

const HOUR_INTERVALS = [6, 12, 24, 48];
const HOUR_INTERVAL_DEFAULT = 24;

var UN_gOptions = {
  _interval: 86400,
  
  load: function()
  {
    // Load strings
    this._loadStrings();
    
    // Load preferences
    this._loadPrefs();
  },
  
  _loadStrings: function()
  {
    UN_setEBIA("un-options-header-description", "value", UN_getMyVersion());
    
    // Check for updates at startup
    UN_setEBIA("un-options-general-startup-check", "label",
      UN_getBundleFString("options-check-startup", [UN_getPlatform()]));
    
    // Auto restart when updates install
    UN_setEBIA("un-options-general-auto-restart", "label",
      UN_getBundleFString("options-auto-restart", [UN_getPlatform()]));
    
    // Restart prompt
    UN_setEBIA("un-options-general-restart-prompt", "label",
      UN_getBundleFString("options-restart", [UN_getPlatform()]));
    
    // Interval hours
    UN_setEBIA("un-options-notifications-set-interval", "label",
      UN_getBundleFString("options-set-interval", [UN_getPlatform()]));
    
    var elem = UN_getEBI("un-options-notifications-interval-hours");
    
    while (elem.hasChildNodes())
      elem.removeChild(elem.lastChild);
    
    for (var i = 0; i < HOUR_INTERVALS.length; i++) {
      var item = document.createElement("menuitem");
      var value = HOUR_INTERVALS[i] + " " + UN_getBundleString("options-hours");
      
      if (HOUR_INTERVALS[i] == HOUR_INTERVAL_DEFAULT) {
        value += " (" + UN_getBundleString("options-default") + ")";
        item.setAttribute("selected", true);
      }
      
      item.setAttribute("label", value);
      elem.appendChild(item);
    }
  },
  
  _loadPrefs: function()
  {
    UN_getEBI("un-options-general-startup-check").checked = UN_getBoolPref("startup.check");
    UN_getEBI("un-options-general-auto-install").checked = UN_getBoolPref("auto.install");
    UN_getEBI("un-options-general-auto-restart").checked = UN_getBoolPref("auto.restart");
    UN_getEBI("un-options-general-restart-prompt").checked = UN_getBoolPref("restart.prompt");
    UN_getEBI("un-options-toolbar-icon-display").checked = UN_getBoolPref("icon.always-display");
    UN_getEBI("un-options-toolbar-statusbar").checked = UN_getBoolPref("statusbar");
    UN_getEBI("un-options-toolbar-statusbar-radiogroup").selectedIndex = (UN_getBoolPref("statusbar.always-last") ? 0 : 1);
    UN_getEBI("un-options-toolbar-statusbar-position-textbox").value = UN_getIntPref("statusbar.position");
    UN_getEBI("un-options-notifications-set-interval").checked = UN_getBoolPref("check.interval");
    UN_getEBI("un-options-notifications-alerts-display").checked = UN_getBoolPref("alerts");
    
    // Update interval
    this._interval = UN_CC["@mozilla.org/preferences-service;1"]
                       .getService(UN_CI.nsIPrefBranch)
                       .getIntPref("extensions.update.interval");
    
    var index = HOUR_INTERVALS.indexOf(this._interval / 3600);
    
    if (index == -1)
      index = HOUR_INTERVALS.indexOf(HOUR_INTERVAL_DEFAULT);
    
    UN_getEBI("un-options-notifications-interval-menulist").selectedIndex = index;
    
    // Initialize fields
    this.onAction(null);
  },
  
  _savePrefs: function()
  {
    UN_setBoolPref("startup.check", UN_getEBI("un-options-general-startup-check").checked);
    UN_setBoolPref("auto.install", UN_getEBI("un-options-general-auto-install").checked);
    UN_setBoolPref("auto.restart", UN_getEBI("un-options-general-auto-restart").checked);
    UN_setBoolPref("restart.prompt", UN_getEBI("un-options-general-restart-prompt").checked);
    UN_setBoolPref("icon.always-display", UN_getEBI("un-options-toolbar-icon-display").checked);
    UN_setBoolPref("statusbar", UN_getEBI("un-options-toolbar-statusbar").checked);
    UN_setBoolPref("statusbar.always-last", UN_getEBI("un-options-toolbar-statusbar-always-last-radio").selected);
    UN_setIntPref("statusbar.position", UN_getEBI("un-options-toolbar-statusbar-position-textbox").value);
    UN_setBoolPref("check.interval", UN_getEBI("un-options-notifications-set-interval").checked);
    UN_setBoolPref("alerts", UN_getEBI("un-options-notifications-alerts-display").checked);
    
    if (UN_getEBI("un-options-notifications-set-interval").checked)
      this._interval = HOUR_INTERVALS[UN_getEBI("un-options-notifications-interval-menulist").selectedIndex] * 3600;
    
    UN_CC["@mozilla.org/preferences-service;1"]
      .getService(UN_CI.nsIPrefBranch)
      .setIntPref("extensions.update.interval", this._interval);
  },
  
  onAction: function(aEvent)
  {
    // Statusbar
    UN_getEBI("un-options-toolbar-statusbar-radiogroup")
      .disabled = !UN_getEBI("un-options-toolbar-statusbar").checked;
    
    UN_getEBI("un-options-toolbar-statusbar-position-textbox")
      .disabled = (!UN_getEBI("un-options-toolbar-statusbar-position-radio").selected || !UN_getEBI("un-options-toolbar-statusbar").checked);
    
    UN_getEBI("un-options-toolbar-statusbar-position-range")
      .hidden = (!UN_getEBI("un-options-toolbar-statusbar-position-radio").selected || !UN_getEBI("un-options-toolbar-statusbar").checked);
    
    if (UN_getStatusbarPanels())
      UN_getEBI("un-options-toolbar-statusbar-position-range")
        .value = "0 - " + UN_getStatusbarPanels();
    
    // Alerts
    UN_getEBI("un-options-notifications-interval-label")
      .disabled = !UN_getEBI("un-options-notifications-set-interval").checked;
    
    UN_getEBI("un-options-notifications-interval-menulist")
      .disabled = !UN_getEBI("un-options-notifications-set-interval").checked;
  },
  
  loadDefaults: function()
  {
    // Confirm default change in values
    if (UN_confirm(UN_getBundleString("options-load-defaults")) == true)
    {
      // Set default preferences
      UN_setBoolPref("alerts", true);
      UN_setBoolPref("auto.install", false);
      UN_setBoolPref("auto.restart", false);
      UN_setBoolPref("check.interval", true);
      UN_setBoolPref("icon.always-display", true);
      UN_setBoolPref("restart.prompt", true);
      UN_setBoolPref("startup.check", false);
      UN_setBoolPref("statusbar", false);
      UN_setBoolPref("statusbar.always-last", true);
      UN_setIntPref("statusbar.position", 0);
      
      // Load preferences
      this._loadPrefs();
    }
  },
  
  buttonOK: function()
  {
    // Save preferences
    this._savePrefs();
    
    // Closes the window
    window.close();
  }
}