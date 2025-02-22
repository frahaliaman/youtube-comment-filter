document.addEventListener('DOMContentLoaded', function() {
    const keywordInput = document.getElementById('keyword-filter');
    const sortSelect = document.getElementById('sort-type');
    const highEngagementCheckbox = document.getElementById('high-engagement');
    const hideSpamCheckbox = document.getElementById('hide-spam');
    const statusDiv = document.getElementById('status');
    const bookmarksList = document.getElementById('bookmarks-list');

    function updateFilters() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'filterComments',
                    options: {
                        keyword: keywordInput.value,
                        highEngagement: highEngagementCheckbox.checked,
                        hideSpam: hideSpamCheckbox.checked
                    }
                }, function(response) {
                    if (response && response.success) {
                        statusDiv.textContent = `Found ${response.matchCount} matching comments`;
                    }
                });
            }
        });
    }

    function loadBookmarks() {
        chrome.storage.sync.get('bookmarks', function(data) {
            const bookmarks = data.bookmarks || [];
            if (bookmarks.length === 0) {
                bookmarksList.innerHTML = '<p>No bookmarks yet</p>';
                return;
            }
    
            bookmarksList.innerHTML = bookmarks.map((bookmark, index) => `
                <div class="bookmark-item">
                    <div class="bookmark-author">${bookmark.author}</div>
                    <div class="bookmark-text">${bookmark.text}</div>
                    <div class="bookmark-meta">
                        <span class="bookmark-time">${bookmark.timestamp}</span>
                        <a href="${bookmark.videoUrl}" 
                           class="video-link" 
                           target="_blank">
                           Go to Video ↗
                        </a>
                    </div>
                    <button class="remove-bookmark" data-index="${index}">Remove</button>
                </div>
            `).join('');
    
            // Add click listeners for remove buttons
            document.querySelectorAll('.remove-bookmark').forEach(button => {
                button.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    removeBookmark(index);
                });
            });
    
            // Add click listeners for video links
            document.querySelectorAll('.video-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    chrome.tabs.create({ 
                        url: this.href,
                        active: true
                    });
                });
            });
        });
    }

    function removeBookmark(index) {
        chrome.storage.sync.get('bookmarks', function(data) {
            const bookmarks = data.bookmarks || [];
            bookmarks.splice(index, 1);
            chrome.storage.sync.set({ bookmarks: bookmarks }, function() {
                loadBookmarks(); // Refresh the bookmarks list
            });
        });
    }

    // Listen for input changes
    keywordInput.addEventListener('input', updateFilters);
    highEngagementCheckbox.addEventListener('change', updateFilters);
    hideSpamCheckbox.addEventListener('change', updateFilters);

    // Listen for sort changes
    sortSelect.addEventListener('change', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'sortComments',
                    sortType: sortSelect.value
                });
            }
        });
    });

    // Load bookmarks when popup opens
    loadBookmarks();

    // Initial filter update
    updateFilters();
});