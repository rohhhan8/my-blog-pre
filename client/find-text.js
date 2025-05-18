const fs = require('fs');
const path = require('path');

// Text to search for
const searchText = '## CSS Base Styles';

// Directories to exclude
const excludeDirs = ['node_modules', 'dist', '.git', 'build'];

// File extensions to search
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.md'];

// Function to search files recursively
function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!excludeDirs.includes(file)) {
        searchFiles(filePath);
      }
    } else {
      // Check file extension
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes(searchText)) {
            console.log(`Found in: ${filePath}`);
            
            // Get line number
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(searchText)) {
                console.log(`  Line ${i + 1}: ${lines[i].trim()}`);
              }
            }
          }
        } catch (err) {
          console.error(`Error reading ${filePath}: ${err.message}`);
        }
      }
    }
  }
}

// Start search from current directory
console.log('Searching for:', searchText);
searchFiles('.');
console.log('Search complete.');