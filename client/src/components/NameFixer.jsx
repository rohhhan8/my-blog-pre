import { useEffect, useState } from 'react';

/**
 * This component is a special utility to fix author names throughout the application.
 * It runs a series of fixes to ensure all instances of "Official Editz" are replaced with "Kuldeep".
 */
const NameFixer = () => {
  const [fixesApplied, setFixesApplied] = useState(false);

  useEffect(() => {
    // Function to fix all author names
    const fixAuthorNames = () => {
      console.log('NameFixer: Running author name fixes...');
      
      try {
        // 1. Update localStorage entries
        localStorage.setItem('currentUserProfile', JSON.stringify({
          old_name: 'Official Editz',
          display_name: 'Kuldeep',
          timestamp: new Date().toISOString()
        }));
        
        // 2. Update all cached author entries
        const cachedAuthors = Object.keys(localStorage)
          .filter(key => key.startsWith('author_'));
          
        for (const key of cachedAuthors) {
          const authorName = key.replace('author_', '');
          if (authorName === 'Official Editz') {
            localStorage.setItem(key, JSON.stringify({
              display_name: 'Kuldeep',
              timestamp: new Date().toISOString()
            }));
          }
        }
        
        // 3. Check for any JSON strings in localStorage that might contain the old name
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          try {
            const value = localStorage.getItem(key);
            if (value && value.includes('Official Editz')) {
              const updatedValue = value.replace(/Official Editz/g, 'Kuldeep');
              localStorage.setItem(key, updatedValue);
            }
          } catch (e) {
            // Ignore errors for non-string values
          }
        }
        
        // 4. Replace text in DOM nodes
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        const nodesToReplace = [];
        let node;
        while (node = walker.nextNode()) {
          if (node.nodeValue && node.nodeValue.includes('Official Editz')) {
            nodesToReplace.push(node);
          }
        }
        
        nodesToReplace.forEach(node => {
          node.nodeValue = node.nodeValue.replace(/Official Editz/g, 'Kuldeep');
        });
        
        console.log('NameFixer: All fixes applied successfully!');
        setFixesApplied(true);
      } catch (error) {
        console.error('NameFixer: Error applying fixes:', error);
      }
    };
    
    // Run the fixes
    fixAuthorNames();
    
    // Set up an interval to run the fixes periodically
    const interval = setInterval(fixAuthorNames, 2000);
    
    // Clean up the interval when component unmounts
    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
};

export default NameFixer;
