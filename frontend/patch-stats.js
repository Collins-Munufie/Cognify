import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statsPath = path.join(__dirname, 'stats.html');

try {
  if (fs.existsSync(statsPath)) {
    let content = fs.readFileSync(statsPath, 'utf8');
    
    // Replace the buggy nodeParts lookup with a safe conditional check
    const target = '(_a = data.nodeParts[nodeData.uid][sizeKey]) !== null && _a !== void 0 ? _a : 0';
    const replacement = '(_a = data.nodeParts[nodeData.uid] ? data.nodeParts[nodeData.uid][sizeKey] : 0) !== null && _a !== void 0 ? _a : 0';
    
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(statsPath, content, 'utf8');
      console.log('Successfully patched stats.html nodeParts bug.');
    } else {
      console.log('stats.html already patched or visualizer code pattern changed.');
    }
  } else {
    console.warn('stats.html not found, skipping patch.');
  }
} catch (err) {
  console.error('Error patching stats.html:', err);
}
