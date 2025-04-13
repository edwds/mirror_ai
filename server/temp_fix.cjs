const fs = require('fs');

// Read the file
const filePath = 'server/storage.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the first occurrence
content = content.replace(
  /if \(exifData\?\.cameraMake.*?exifData\?\.cameraModel\) \{/s,
  'if (exifData?.cameraMake && exifData?.cameraModel) {'
);

// Fix the second occurrence if needed
content = content.replace(
  /if \(exifData\?\.cameraMake.*?exifData\?\.cameraModel\) \{/s,
  'if (exifData?.cameraMake && exifData?.cameraModel) {'
);

// Save the changes
fs.writeFileSync(filePath, content, 'utf8');
console.log('File fixed successfully');
