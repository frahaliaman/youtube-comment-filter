console.log('YouTube Comment Filter loaded');

function filterComments(options) {
    console.log('Filtering with options:', options);
    
    const comments = document.querySelectorAll('ytd-comment-thread-renderer');
    console.log('Found comments:', comments.length);

    let matchCount = 0;

    comments.forEach(comment => {
        // First, ensure bookmark button exists
        addBookmarkButton(comment);

        const text = comment.querySelector('#content-text')?.textContent?.toLowerCase() || '';
        const author = comment.querySelector('#author-text')?.textContent?.toLowerCase() || '';
        const likes = parseInt(comment.querySelector('#vote-count-middle')?.textContent) || 0;
        const replies = comment.querySelector('#replies') ? 
            parseInt(comment.querySelector('#replies').textContent) || 0 : 0;

        let matches = true;

        // Keyword filter
        if (options.keyword) {
            matches = matches && (
                text.includes(options.keyword.toLowerCase()) || 
                author.includes(options.keyword.toLowerCase())
            );
        }

        // Engagement filter
        if (options.highEngagement) {
            matches = matches && (likes > 10 || replies > 2);
        }

        // Spam filter
        if (options.hideSpam) {
            const spamIndicators = [
                'subscribe to my channel',
                'check out my',
                'follow me',
                '👉👉👉',
                'www.',
                'http'
            ];
            const isSpam = spamIndicators.some(indicator => 
                text.includes(indicator.toLowerCase())
            );
            matches = matches && !isSpam;
        }

        comment.style.display = matches ? '' : 'none';
        if (matches) {
            matchCount++;
            if (options.keyword) {
                comment.style.backgroundColor = '#ffd70033';
            }
        } else {
            comment.style.backgroundColor = '';
        }
    });

    return matchCount;
}

function addBookmarkButton(comment) {
    if (!comment.querySelector('.bookmark-btn')) {
        const header = comment.querySelector('#header-author');
        if (header) {
            const bookmarkBtn = document.createElement('button');
            bookmarkBtn.className = 'bookmark-btn';
            bookmarkBtn.innerHTML = '🔖';
            bookmarkBtn.style.cssText = `
                margin-left: 8px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                padding: 0 5px;
                transition: color 0.3s;
            `;
            bookmarkBtn.onclick = () => bookmarkComment(comment);
            header.appendChild(bookmarkBtn);
        }
    }
}

function bookmarkComment(comment) {
    // Get the video ID from the current URL
    const videoId = new URLSearchParams(window.location.search).get('v');
    
    const commentData = {
        text: comment.querySelector('#content-text')?.textContent || '',
        author: comment.querySelector('#author-text')?.textContent || '',
        timestamp: comment.querySelector('#published-time-text')?.textContent || '',
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        date: new Date().toISOString()
    };
    
    chrome.storage.sync.get('bookmarks', function(data) {
        const bookmarks = data.bookmarks || [];
        bookmarks.push(commentData);
        chrome.storage.sync.set({ bookmarks: bookmarks }, function() {
            // Visual feedback
            const btn = comment.querySelector('.bookmark-btn');
            if (btn) {
                btn.style.color = '#ff0000';
                setTimeout(() => {
                    btn.style.color = '';
                }, 1000);
            }
            console.log('Comment bookmarked:', commentData);
        });
    });
}
function highlightComment(commentId) {
    if (!commentId) return;
    
    const checkForComment = setInterval(() => {
        const comment = document.querySelector(`#${commentId}`);
        if (comment) {
            clearInterval(checkForComment);
            
            comment.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const commentContainer = comment.closest('ytd-comment-thread-renderer');
            if (commentContainer) {
                commentContainer.style.backgroundColor = '#ffd70033';
                setTimeout(() => {
                    commentContainer.style.backgroundColor = '';
                }, 3000);
            }
        }
    }, 1000);
    
    setTimeout(() => clearInterval(checkForComment), 10000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'filterComments') {
        const matchCount = filterComments(request.options);
        sendResponse({success: true, matchCount: matchCount});
    } else if (request.action === 'sortComments') {
        sortComments(request.sortType);
        sendResponse({success: true});
    } else if (request.action === 'highlightComment') {
        highlightComment(request.commentId);
        sendResponse({success: true});
    }
    return true;
});

// Add observer for dynamic comment loading
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
                if (node.querySelector && node.querySelector('ytd-comment-thread-renderer')) {
                    addBookmarkButton(node);
                }
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});