// src/background.js
chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
  if (details.url.includes('youtube.com/watch')) {
      chrome.tabs.sendMessage(details.tabId, {
          action: 'pageChanged'
      });
  }
});