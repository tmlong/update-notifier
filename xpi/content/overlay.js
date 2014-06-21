// Update Notifier
// By Todd Long <longfocus@gmail.com>
// http://www.longfocus.com/firefox/updatenotifier/

const UN_NOTIFY_TOPIC = "UN:update-topic";
const UN_NOTIFY_TYPE_CHANGE = "UN:update-type-change";
const UN_NOTIFY_TYPE_RESTART = "UN:update-type-restart";
const UN_NOTIFY_TYPE_BUSY_NONE = "UN:update-type-busy-none";
const UN_NOTIFY_TYPE_BUSY_CHECKING = "UN:update-type-busy-checking";
const UN_NOTIFY_TYPE_BUSY_DOWNLOAD = "UN:update-type-busy-download";
const UN_NOTIFY_TYPE_BUSY_INSTALL = "UN:update-type-busy-install";

function UN_onOverlayLoad() {
  UN_gOverlay.load();
}

function UN_onOverlayUnload() {
  UN_gOverlay.unload();
}

var UN_gOverlay = {
  _em: null,
  _branchWatch: null,
  _observer: null,
  _restart: false,
  _busyStatus: UN_NOTIFY_TYPE_BUSY_NONE,
  
  load: function()
  {
    // Initialization
    this._em = UN_CC["@mozilla.org/extensions/manager;1"].getService(UN_CI.nsIExtensionManager);
    
    // Preferences
    this._branchWatch = UN_getBranch().QueryInterface(UN_CI.nsIPrefBranch2);
    this._branchWatch.addObserver("", this, false);
    
    // Adds the observer for new updates
    this._observer = UN_CC["@mozilla.org/observer-service;1"].getService(UN_CI.nsIObserverService);
    this._observer.addObserver(this, UN_NOTIFY_TOPIC, false);
    
    // Load manager
    UN_getManager().load();
    
    // Initialize update state
    this._restart = UN_getManager().restart;
    this._busyStatus = UN_getManager().status;
    
    // Check preferences
    this._checkPrefs();
  },
  
  unload: function()
  {
    // Removes the observers
    this._branchWatch.removeObserver("", this);
    this._observer.removeObserver(this, UN_NOTIFY_TOPIC);
  },
  
  _checkPrefs: function()
  {
    // Check first time run
    if (UN_getBoolPref("first-time"))
    {
      // Check for Firefox menu
      var tb = UN_getEBI("toolbar-menubar");
      
      // Check for Thunderbird 2.0b1 menu
      if (!tb)
        tb = UN_getEBI("mail-bar");
      
      // Check for Thunderbird 2.0.0.* menu
      if (!tb)
        tb = UN_getEBI("mail-toolbar-menubar2");
      
      // Check for Sunbird menu
      if (!tb)
        tb = UN_getEBI("calendar-bar");
      
      // Check for Mac/Songbird menu
      if (!tb)
        tb = UN_getEBI("nav-bar");
      
      if (tb && tb.currentSet && tb.currentSet.indexOf("un-toolbarbutton") == -1)
      {
        if (tb.currentSet.indexOf("throbber-box") > -1)
          tb.currentSet = tb.currentSet.replace("throbber-box", "un-toolbarbutton,throbber-box");
        else
        {
          // Check for Firefox 3.5 which lacks the spring
          if (tb.lastChild.id == "menubar-items")
          {
            var spring = document.createElement("toolbarspring");
            spring.setAttribute("class", "chromeclass-toolbar-additional");
            tb.appendChild(spring);
          }
          
          tb.currentSet += ",un-toolbarbutton";
        }
        
        tb.setAttribute("currentset", tb.currentSet);
        document.persist(tb.id, "currentset");
        
        if (UN_isFirefox()) {
          try {
            BrowserToolboxCustomizeDone(true);
          } catch (e) {}
        }
      }
      
      // Set first time run to false
      UN_setBoolPref("first-time", "false");
    }
    
    // Updates the icons
    this._updateIcons();
    
    // Checks the statusbar
    this._checkStatusbar();
  },
  
  _updateIcons: function()
  {
    var items = UN_getManager().getItems({});
    var extensions = false;
    var themes = false;
    var icon = "none";
    var collapsed = false;
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      
      if (item.type == "extension" && item.newVersion != null)
        extensions = true;
      else if (item.type == "theme" && item.newVersion != null)
        themes = true;
    }
    
    // Set icon type
    if (this._busyStatus != UN_NOTIFY_TYPE_BUSY_NONE)
      icon = "busy";
    else if (this._restart)
      icon = "restart"
    else if (extensions && !themes)
      icon = "extension"
    else if (!extensions && themes)
      icon = "theme";
    else if (extensions && themes)
      icon = "both";
    
    // Set icon collapsed
    if (!this._restart && !extensions && !themes)
      collapsed = !UN_getBoolPref("icon.always-display");
    
    // Set toolbar icons
    if (UN_getEBI("un-toolbarbutton")) {
  	  UN_setEBIA("un-toolbarbutton", "icon", icon);
      UN_setEBIA("un-toolbarbutton", "collapsed", collapsed);
    }
    
    // Set statusbar icons
    UN_setEBIA("un-statusbar-panel", "icon", icon);
    UN_setEBIA("un-statusbar-panel", "collapsed", collapsed);
  },
  
  _checkStatusbar: function()
  {
    var sbar = UN_getEBI("status-bar");
    var sbarPanel = UN_getEBI("un-statusbar-panel");
    
    sbarPanel.hidden = !UN_getBoolPref("statusbar");
    sbar.removeChild(sbarPanel);
    
    if (UN_getBoolPref("statusbar.always-last"))
      sbar.appendChild(sbarPanel);
    else {
      var pos = UN_getIntPref("statusbar.position");
      sbar.insertBefore(sbarPanel, sbar.childNodes[pos]);
    }
  },
  
  checkRestart: function(aAuto)
  {
    var msg = null;
    var display = true;
    
    if (aAuto)
    {
      var items = UN_getManager().getItems({});
      var updateList = "";
      
      for (var i = 0; i < items.length; i++) {
        if (items[i].needsRestart)
          updateList += "\n" + items[i].name + " " + items[i].oldVersion + " " + UN_getBundleString(items[i].opType == "needs-upgrade" ? "tb-tooltip-upgraded" : "tb-tooltip-installed");
      }
      
      if (updateList != "")
        updateList += "\n";
      
      msg = UN_getBundleFString("un-confirm-restart-auto", [updateList, UN_getPlatform()]);
    }
    else
      msg = UN_getBundleFString("un-confirm-restart", [UN_getPlatform()]);
    
    try {
      if (getBrowser() != UN_getBrowser().getBrowser())
        display = false;
    } catch(e) {}
    
    if (display) {
      var check = {value: !UN_getBoolPref("restart.prompt")};
      if (check.value || UN_confirmCheck(msg, check)) {
        UN_setBoolPref("restart.prompt", !check.value);
        UN_restart();
      }
    }
  },
  
  populatePopup: function(aId)
  {
    var items = UN_getManager().getItems({});
    var restart = false;
    var popup = UN_getEBI(aId);
    var item = null;
    
    for (var i = 0; i < items.length && !restart; i++)
      restart = (items[i].newVersion != null);
    
    while (popup.hasChildNodes())
      popup.removeChild(popup.lastChild);
    
    item = document.createElement("menuitem");
    item.setAttribute("label", UN_getBundleString("tb-popup-menu-check-all-updates"));
    item.setAttribute("oncommand", "UN_getManager().checkUpdates();");
    popup.appendChild(item);
    
    item = document.createElement("menuitem");
    item.setAttribute("label", UN_getBundleString("tb-popup-menu-install-all-updates"));
    item.setAttribute("oncommand", "UN_getManager().installUpdates();");
    item.setAttribute("disabled", !restart);
    popup.appendChild(item);
    
    item = document.createElement("menuitem");
    item.setAttribute("label", UN_getBundleFString("tb-popup-menu-restart", [UN_getPlatform()]));
    item.setAttribute("oncommand", "UN_gOverlay.checkRestart(false);");
    popup.appendChild(item);
    
    popup.appendChild(document.createElement("menuseparator"));
    
    var isNewAddOnsDialog = true;
    var addOnsFunctionName = null;
    
    // Check which function will be used for opening the "Add-Ons" dialog
    if (typeof BrowserOpenAddonsMgr == "function")
    {
      // Firefox 2.0.0.*
      addOnsFunctionName = "BrowserOpenAddonsMgr()";
    }
    else if (typeof openAddonsMgr == "function")
    {
      // Thunderbird 2.0.0.*
      addOnsFunctionName = "openAddonsMgr()";
    }
    else if (typeof goOpenAddons == "function")
    {
      // Sunbird 0.2 to 0.8
      addOnsFunctionName = "goOpenAddons()";
    }
    else if (typeof SBOpenPreferences == "function")
    {
      // Songbird 0.5
      addOnsFunctionName = "SBOpenPreferences('paneAddons')";
    }
    else if (typeof BrowserOpenExtensions == "function")
    {
      // Firefox 1.5.0.*
      isNewAddOnsDialog = false;
      addOnsFunctionName = "BrowserOpenExtensions";
    }
    else if (typeof openExtensions == "function")
    {
      // Thunderbird 1.5.0.*
      isNewAddOnsDialog = false;
      addOnsFunctionName = "openExtensions";
    }
    else if (typeof toEM == "function")
    {
      // SeaMonkey 2.0a3
      isNewAddOnsDialog = false;
      addOnsFunctionName = "toEM";
    }
    
    if (addOnsFunctionName)
    {
      if (isNewAddOnsDialog)
      {
        item = document.createElement("menuitem");
        item.setAttribute("label", UN_getBundleString("tb-popup-menu-addons"));
        item.setAttribute("oncommand", addOnsFunctionName);
        popup.appendChild(item);
      }
      else
      {
        item = document.createElement("menuitem");
        item.setAttribute("label", UN_getBundleString("tb-popup-menu-extensions"));
        item.setAttribute("oncommand", addOnsFunctionName + "('extensions');");
        popup.appendChild(item);
        
        item = document.createElement("menuitem");
        item.setAttribute("label", UN_getBundleString("tb-popup-menu-themes"));
        item.setAttribute("oncommand", addOnsFunctionName + "('themes');");
        popup.appendChild(item);
        
        // TODO: Plugins
      }
      
      popup.appendChild(document.createElement("menuseparator"));
    }
    
    item = document.createElement("menuitem");
    item.setAttribute("label", UN_getBundleString("tb-popup-menu-homepage"));
    item.setAttribute("oncommand", "UN_visitSite(UN_WEBSITE);");
    popup.appendChild(item);
    
    item = document.createElement("menuitem");
    item.setAttribute("label", UN_getBundleString("tb-popup-menu-options"));
    item.setAttribute("default", "true");
    item.setAttribute("oncommand", "window.openDialog('chrome://updatenotifier/content/options.xul', 'UN:Prefs', 'centerscreen,chrome,dependent');");
    popup.appendChild(item);
  },
  
  populateTooltip: function()
  {
    var items = UN_getManager().getItems({});
    var itemUpdates = 0;
    var tte = UN_getEBI("un-toolbar-tooltip-updates-extensions");
    var ttt = UN_getEBI("un-toolbar-tooltip-updates-themes");
    
    // Remove all extensions
    while (tte.hasChildNodes())
      tte.removeChild(tte.lastChild);
    
    // Remove all extensions
    while (ttt.hasChildNodes())
      ttt.removeChild(ttt.lastChild);
    
    for (var i = 0; i < items.length; i++)
    {
      // Create item row
      var itemRow = document.createElement("row");
      
      // Create item image
      var itemImage = document.createElement("image");
      itemImage.setAttribute("class", "un-icons");
      itemImage.setAttribute("icon", items[i].type);
      itemRow.appendChild(itemImage);
      
      if (items[i].needsRestart && this._restart)
      {
        // Create label with item name
        var itemLabel = document.createElement("label");
        itemLabel.setAttribute("value", items[i].name + " " + items[i].oldVersion);
        itemRow.appendChild(itemLabel);
        
        // Create label with install type
        var itemLabel = document.createElement("label");
        itemLabel.setAttribute("value", UN_getBundleString((items[i].opType == "needs-upgrade" ? "tb-tooltip-upgraded" : "tb-tooltip-installed")));
        itemRow.appendChild(itemLabel);
      }
      else if (!items[i].needsRestart && !this._restart)
      {
        // Create label with new version
        var itemLabel = document.createElement("label");
        itemLabel.setAttribute("class", "bold");
        itemLabel.setAttribute("value", items[i].name + " " + items[i].newVersion);
        itemRow.appendChild(itemLabel);
        
        // Create label with old version
        var itemLabel = document.createElement("label");
        itemLabel.setAttribute("value", "(" + UN_getBundleString("tb-tooltip-currently") + " " + items[i].oldVersion + ")");
        itemRow.appendChild(itemLabel);
      }
      else
        continue;
      
      itemUpdates++;
      
      switch(items[i].type)
      {
        case "extension":
          tte.appendChild(itemRow);
          break;
        case "theme":
          ttt.appendChild(itemRow);
          break;
      }
    }
    
    // Set tooltip
    if (this._busyStatus == UN_NOTIFY_TYPE_BUSY_CHECKING)
    {
      // Checking for updates
      UN_setEBIA("un-toolbar-tooltip-header-label", "value", UN_getBundleString("tb-tooltip-checking"));
    }
    else if (this._busyStatus == UN_NOTIFY_TYPE_BUSY_DOWNLOAD)
    {
      // Installing new updates
      UN_setEBIA("un-toolbar-tooltip-header-label", "value", UN_getBundleString("tb-tooltip-download"));
    }
    else if (this._busyStatus == UN_NOTIFY_TYPE_BUSY_INSTALL)
    {
      // Installing new updates
      UN_setEBIA("un-toolbar-tooltip-header-label", "value", UN_getBundleString("tb-tooltip-install"));
    }
    else if (this._restart)
    {
      // Restart is required
      UN_setEBIA("un-toolbar-tooltip-header-label", "value", UN_getBundleString("tb-tooltip-restart"));
    }
    else if (itemUpdates == 0)
    {
      // No available updates
      UN_setEBIA("un-toolbar-tooltip-header-label", "value", UN_getBundleString("tb-tooltip-no-updates"));
    }
    else
    {
      // Updates available header
      if (itemUpdates == 1)
        UN_setEBIA("un-toolbar-tooltip-header-label", "value", UN_getBundleString("tb-tooltip-new-update"));
      else
        UN_setEBIA("un-toolbar-tooltip-header-label", "value", UN_getBundleFString("tb-tooltip-new-updates", [itemUpdates]));
    }
    
    // Extensions
    tte.parentNode.setAttribute("collapsed", !tte.hasChildNodes());
    tte.parentNode.setAttribute("hidden", !tte.hasChildNodes());
    
    // Themes
    ttt.parentNode.setAttribute("collapsed", !ttt.hasChildNodes());
    ttt.parentNode.setAttribute("hidden", !ttt.hasChildNodes());
    
    // Display updates appropriately
    UN_setEBIA("un-toolbar-tooltip-updates", "collapsed", (this._checking || itemUpdates == 0));
  },
  
  toolbarClick: function(aEvent)
  {
    // Check for middle click
    if (aEvent.button == 1)
      UN_getManager().checkUpdates();
  },
  
  observe: function(aSubject, aTopic, aData)
  {
    if (aTopic == "nsPref:changed")
    {
      switch (aData)
      {
        case "auto.install":
        {
          // Check for auto install
          if (UN_getBoolPref("auto.install"))
            setTimeout("UN_getManager().installUpdates()", 1000);
          
          break;
        }
        case "icon.always-display":
        {
          // Updates the icons
          this._updateIcons();
          break;
        }
        case "statusbar":
        case "statusbar.always-last":
        case "statusbar.position":
        {
          // Checks the statusbar
          this._checkStatusbar();
          break;
        }
      }
    }
    else if (aTopic == UN_NOTIFY_TOPIC)
    {
      // Check notify type
      switch (aData)
      {
        case UN_NOTIFY_TYPE_CHANGE:
        {
          // Check for auto install
          if (UN_getBoolPref("auto.install"))
            setTimeout("UN_getManager().installUpdates()", 1000);
          
          // Check for restart
          this._restart = UN_getManager().restart;
          
          // Check for auto restart
          if (this._restart && UN_getBoolPref("auto.restart"))
            setTimeout("UN_gOverlay.checkRestart(true)", 1000);
          
          break;
        }
        case UN_NOTIFY_TYPE_BUSY_NONE:
        case UN_NOTIFY_TYPE_BUSY_CHECKING:
        case UN_NOTIFY_TYPE_BUSY_DOWNLOAD:
        case UN_NOTIFY_TYPE_BUSY_INSTALL:
        {
          // Sets the busy status
          this._busyStatus = aData;
          break;
        }
      }
      
      // Updates the icons
      this._updateIcons();
    }
  }
}