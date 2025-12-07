const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'LingRoot_NotebookLM_Source.md';
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration: Paths to include
const INCLUDES = [
    { type: 'glob', pattern: '*.md', root: true }, // Root markdown files
    { type: 'dir', path: 'docs', extension: '.md' }, // Docs folder
    { type: 'dir', path: 'backend/models', extension: '.js' }, // Database schemas
    { type: 'file', path: 'backend/utils/liroPromptGenerator.js' }, // Important logic
    { type: 'file', path: 'PROJECT_MEMORY.md' }, // Explicitly important
    { type: 'file', path: 'LIRO_SYSTEM_GUIDE.md' } // Explicitly important
];

// Content accumulator
let fullContent = `# LingRoot Project Source for NotebookLM\n\nGenerated on: ${new Date().toISOString()}\n\n`;
let tableOfContents = "## Table of Contents\n\n";

function readFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(ROOT_DIR, filePath);
            console.log(`Adding: ${relativePath}`);

            // Add to TOC
            tableOfContents += `- [${relativePath}](#${relativePath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()})\n`;

            // Add to Body
            return `\n\n---\n\n## <a id="${relativePath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}"></a>FILE: ${relativePath}\n\n\`\`\`${path.extname(filePath).substring(1)}\n${content}\n\`\`\`\n`;
        }
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
    }
    return '';
}

function processDirectory(dirPath, extension) {
    let results = '';
    if (!fs.existsSync(dirPath)) return results;

    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
            results += processDirectory(fullPath, extension);
        } else if (file.name.endsWith(extension)) {
            results += readFile(fullPath);
        }
    }
    return results;
}

function main() {
    console.log("Starting NotebookLM source generation...");

    // Process Root MD files manually to avoid node_modules junk if we just globbed
    const rootFiles = fs.readdirSync(ROOT_DIR);
    rootFiles.forEach(file => {
        if (file.endsWith('.md') && fs.statSync(path.join(ROOT_DIR, file)).isFile()) {
            // Check if already explicitly included to avoid duplicates? 
            // The simple logic below just adds everything found so far.
            // We'll manage duplicates by a set if needed, but for now simplest is sequential.
            fullContent += readFile(path.join(ROOT_DIR, file));
        }
    });

    // Process Docs
    fullContent += processDirectory(path.join(ROOT_DIR, 'docs'), '.md');

    // Process Models
    fullContent += processDirectory(path.join(ROOT_DIR, 'backend', 'models'), '.js');

    // Process specific files (checking for duplicates via path check would be better, but let's just append specific critical code files if not caught above)
    // NOTE: backend/models was already caught.

    // Add Liro Prompt Generator if not already
    fullContent += readFile(path.join(ROOT_DIR, 'backend/utils/liroPromptGenerator.js'));

    // Final Assembly
    const finalOutput = fullContent.replace("## Table of Contents\n\n", tableOfContents + "\n\n");

    fs.writeFileSync(path.join(ROOT_DIR, OUTPUT_FILE), finalOutput);
    console.log(`\nSuccess! Generated ${OUTPUT_FILE} (${(finalOutput.length / 1024).toFixed(2)} KB)`);
}

main();
