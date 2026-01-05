const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '../prompts');
const LEGACY_DIR = path.join(PROMPTS_DIR, 'legacy');
const CONTENT_DIR = path.join(PROMPTS_DIR, 'content');
const HIERARCHY_DIR = path.join(PROMPTS_DIR, 'topic_hierarchy');

if (!fs.existsSync(LEGACY_DIR)) {
    fs.mkdirSync(LEGACY_DIR);
}

const patterns = [
    { dir: PROMPTS_DIR, filter: /^cefr_.*\.(txt)$/ },
    { dir: CONTENT_DIR, filter: /^content_generation_.*\.(txt)$/ },
    { dir: CONTENT_DIR, filter: /^generate_bilingual_.*\.(txt)$/ },
    { dir: CONTENT_DIR, filter: /^translate_and_adapt_.*\.(txt)$/ },
    { dir: PROMPTS_DIR, filter: /^topic_detail_suggestions\.txt$/ },
    { dir: HIERARCHY_DIR, filter: /^generate_subtopics\.txt$/ }
];

let movedCount = 0;

patterns.forEach(group => {
    if (!fs.existsSync(group.dir)) return;

    const files = fs.readdirSync(group.dir);
    files.forEach(file => {
        if (file.match(group.filter)) {
            const src = path.join(group.dir, file);
            const dest = path.join(LEGACY_DIR, file); // Flattening structure in legacy

            // If dest exists, append timestamp
            let finalDest = dest;
            if (fs.existsSync(finalDest)) {
                finalDest = path.join(LEGACY_DIR, `${Date.now()}_${file}`);
            }

            fs.renameSync(src, finalDest);
            console.log(`Moved: ${file} -> legacy/`);
            movedCount++;
        }
    });
});

console.log(`Migration complete. ${movedCount} files moved to legacy.`);
