// Utility functions for managing meta tags for better social media sharing

/**
 * Update meta tags for individual blog posts
 * @param {Object} blog - Blog object containing title, content, image_url, etc.
 * @param {string} authorName - Author name for the blog
 */
export const updateBlogMetaTags = (blog, authorName = '') => {
  if (!blog) return;

  const baseUrl = window.location.origin;
  const blogUrl = `${baseUrl}/blog/${blog._id}`;
  const blogTitle = blog.title || 'BlogHub - Blog Post';
  const blogDescription = blog.content 
    ? blog.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
    : 'Read this interesting blog post on BlogHub';
  const blogImage = blog.image_url || `${baseUrl}/public/blog-icon.svg`;
  const authorInfo = authorName ? ` by ${authorName}` : '';

  // Update document title
  document.title = `${blogTitle} - BlogHub`;

  // Update or create meta tags
  updateMetaTag('description', blogDescription);
  updateMetaTag('keywords', `blog, ${blog.title}, ${authorName}, blogging, stories`);

  // Open Graph tags
  updateMetaProperty('og:type', 'article');
  updateMetaProperty('og:url', blogUrl);
  updateMetaProperty('og:title', `${blogTitle}${authorInfo}`);
  updateMetaProperty('og:description', blogDescription);
  updateMetaProperty('og:image', blogImage);
  updateMetaProperty('og:site_name', 'BlogHub');
  updateMetaProperty('og:article:author', authorName);
  
  if (blog.created_at) {
    updateMetaProperty('og:article:published_time', new Date(blog.created_at).toISOString());
  }

  // Twitter Card tags
  updateMetaProperty('twitter:card', 'summary_large_image');
  updateMetaProperty('twitter:url', blogUrl);
  updateMetaProperty('twitter:title', `${blogTitle}${authorInfo}`);
  updateMetaProperty('twitter:description', blogDescription);
  updateMetaProperty('twitter:image', blogImage);
  updateMetaProperty('twitter:creator', authorName ? `@${authorName}` : '@BlogHub');

  // Update canonical URL
  updateCanonicalUrl(blogUrl);

  console.log('Meta tags updated for blog:', blogTitle);
};

/**
 * Reset meta tags to default values
 */
export const resetMetaTags = () => {
  const baseUrl = window.location.origin;
  const defaultTitle = 'BlogHub - Ideas That Inspire, Stories That Matter';
  const defaultDescription = 'A modern blogging platform where ideas inspire and stories matter. Share your thoughts and connect with diverse voices.';
  const defaultImage = `${baseUrl}/public/blog-icon.svg`;
  const defaultUrl = baseUrl;

  // Reset document title
  document.title = defaultTitle;

  // Reset meta tags
  updateMetaTag('description', defaultDescription);
  updateMetaTag('keywords', 'blog, blogging, writing, stories, ideas, platform, share, connect');

  // Reset Open Graph tags
  updateMetaProperty('og:type', 'website');
  updateMetaProperty('og:url', defaultUrl);
  updateMetaProperty('og:title', defaultTitle);
  updateMetaProperty('og:description', defaultDescription);
  updateMetaProperty('og:image', defaultImage);
  updateMetaProperty('og:site_name', 'BlogHub');

  // Reset Twitter Card tags
  updateMetaProperty('twitter:card', 'summary_large_image');
  updateMetaProperty('twitter:url', defaultUrl);
  updateMetaProperty('twitter:title', defaultTitle);
  updateMetaProperty('twitter:description', defaultDescription);
  updateMetaProperty('twitter:image', defaultImage);

  // Reset canonical URL
  updateCanonicalUrl(defaultUrl);

  console.log('Meta tags reset to default');
};

/**
 * Update or create a meta tag with name attribute
 * @param {string} name - Meta tag name
 * @param {string} content - Meta tag content
 */
const updateMetaTag = (name, content) => {
  if (!content) return;

  let metaTag = document.querySelector(`meta[name="${name}"]`);
  
  if (metaTag) {
    metaTag.setAttribute('content', content);
  } else {
    metaTag = document.createElement('meta');
    metaTag.setAttribute('name', name);
    metaTag.setAttribute('content', content);
    document.head.appendChild(metaTag);
  }
};

/**
 * Update or create a meta tag with property attribute
 * @param {string} property - Meta tag property
 * @param {string} content - Meta tag content
 */
const updateMetaProperty = (property, content) => {
  if (!content) return;

  let metaTag = document.querySelector(`meta[property="${property}"]`);
  
  if (metaTag) {
    metaTag.setAttribute('content', content);
  } else {
    metaTag = document.createElement('meta');
    metaTag.setAttribute('property', property);
    metaTag.setAttribute('content', content);
    document.head.appendChild(metaTag);
  }
};

/**
 * Update canonical URL
 * @param {string} url - Canonical URL
 */
const updateCanonicalUrl = (url) => {
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  
  if (canonicalLink) {
    canonicalLink.setAttribute('href', url);
  } else {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    canonicalLink.setAttribute('href', url);
    document.head.appendChild(canonicalLink);
  }
};

/**
 * Generate structured data for blog posts (JSON-LD)
 * @param {Object} blog - Blog object
 * @param {string} authorName - Author name
 */
export const updateStructuredData = (blog, authorName = '') => {
  if (!blog) return;

  const baseUrl = window.location.origin;
  const blogUrl = `${baseUrl}/blog/${blog._id}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blog.title,
    "description": blog.content ? blog.content.replace(/<[^>]*>/g, '').substring(0, 160) : '',
    "url": blogUrl,
    "datePublished": blog.created_at ? new Date(blog.created_at).toISOString() : '',
    "dateModified": blog.updated_at ? new Date(blog.updated_at).toISOString() : blog.created_at ? new Date(blog.created_at).toISOString() : '',
    "author": {
      "@type": "Person",
      "name": authorName || "BlogHub Author"
    },
    "publisher": {
      "@type": "Organization",
      "name": "BlogHub",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/public/blog-icon.svg`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": blogUrl
    }
  };

  if (blog.image_url) {
    structuredData.image = {
      "@type": "ImageObject",
      "url": blog.image_url
    };
  }

  // Remove existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);

  console.log('Structured data updated for blog:', blog.title);
};

/**
 * Remove structured data
 */
export const removeStructuredData = () => {
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
    console.log('Structured data removed');
  }
};
