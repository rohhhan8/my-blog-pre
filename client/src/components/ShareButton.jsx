import { useState } from 'react';
import PropTypes from 'prop-types';

const ShareButton = ({ 
  url, 
  title, 
  description, 
  className = "", 
  variant = "default",
  size = "md",
  showText = true 
}) => {
  const [showToast, setShowToast] = useState(false);

  // Enhanced share functionality with multiple options
  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const shareData = {
        title: title,
        text: description || `Check out: ${title}`,
        url: url,
      };

      console.log("Sharing:", shareData);

      if (navigator.share) {
        // Use Web Share API if available (mobile devices)
        await navigator.share(shareData);
        console.log("Shared successfully using Web Share API");
      } else {
        // Desktop fallback - show share options
        showShareOptions(url, title, description);
      }
    } catch (err) {
      console.error("Error sharing:", err);
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard!", "success");
      } catch (clipboardErr) {
        showToast("Error sharing: " + err.message, "error");
      }
    }
  };

  // Show share options for desktop
  const showShareOptions = (shareUrl, shareTitle, shareText) => {
    // Create share modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Share this content</h3>
        <div class="space-y-3">
          <button onclick="shareToTwitter('${shareUrl}', '${shareTitle}')" class="w-full flex items-center space-x-3 p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            <span>Share on Twitter</span>
          </button>
          <button onclick="shareToFacebook('${shareUrl}')" class="w-full flex items-center space-x-3 p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span>Share on Facebook</span>
          </button>
          <button onclick="shareToLinkedIn('${shareUrl}', '${shareTitle}')" class="w-full flex items-center space-x-3 p-3 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span>Share on LinkedIn</span>
          </button>
          <button onclick="copyToClipboardShare('${shareUrl}')" class="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <span>Copy Link</span>
          </button>
        </div>
        <button onclick="closeShareModalShare()" class="mt-4 w-full p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
          Cancel
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Add global functions for sharing
    window.shareToTwitter = (url, title) => {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
      closeShareModalShare();
    };

    window.shareToFacebook = (url) => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      closeShareModalShare();
    };

    window.shareToLinkedIn = (url, title) => {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
      closeShareModalShare();
    };

    window.copyToClipboardShare = async (url) => {
      try {
        await navigator.clipboard.writeText(url);
        showToastMessage("Link copied to clipboard!", "success");
        closeShareModalShare();
      } catch (err) {
        showToastMessage("Failed to copy link", "error");
      }
    };

    window.closeShareModalShare = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeShareModalShare();
      }
    });
  };

  // Enhanced toast notification function
  const showToastMessage = (message, type = "success") => {
    const toast = document.createElement('div');
    const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove the toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  // Get button styles based on variant and size
  const getButtonStyles = () => {
    const baseStyles = "inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    const variants = {
      default: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-500",
      primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
      secondary: "bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-500",
      outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-gray-500"
    };

    const sizes = {
      sm: "px-2 py-1 text-sm rounded",
      md: "px-3 py-2 text-sm rounded-md",
      lg: "px-4 py-2 text-base rounded-lg"
    };

    return `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={getButtonStyles()}
        aria-label="Share this content"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`${size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} ${showText ? 'mr-2' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
          />
        </svg>
        {showText && <span>Share</span>}
      </button>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
          Link copied to clipboard!
        </div>
      )}
    </>
  );
};

ShareButton.propTypes = {
  url: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'primary', 'secondary', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showText: PropTypes.bool
};

export default ShareButton;
