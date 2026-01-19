const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const logger = require('./logger');

class PromptService {
    constructor() {
        this.templateCache = new Map();
        this.partialsLoaded = false;
        this.promptsDir = path.join(__dirname, '../prompts');

        // Register helpers
        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });
    }

    /**
     * Initializes the service by loading partials.
     * Should be called on app startup.
     */
    loadPartials() {
        try {
            const partialsDir = path.join(this.promptsDir, 'partials');

            if (!fs.existsSync(partialsDir)) {
                logger.warn('[PromptService] Partials directory not found, creating it...');
                fs.mkdirSync(partialsDir, { recursive: true });
                return;
            }

            const files = fs.readdirSync(partialsDir);

            files.forEach(file => {
                if (file.endsWith('.hbs')) {
                    const name = path.basename(file, '.hbs');
                    const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
                    handlebars.registerPartial(name, content);
                    logger.info(`[PromptService] Registered partial: ${name}`);
                }
            });

            this.partialsLoaded = true;
        } catch (error) {
            logger.error('[PromptService] Failed to load partials:', error);
            throw error;
        }
    }

    /**
     * Compiles and executes a prompt template
     * @param {string} templateName - Relative path to template under prompts/ (e.g., 'content/generation')
     * @param {Object} context - Data to pass to the template
     * @returns {string} Compiled prompt
     */
    getPrompt(templateName, context) {
        if (!this.partialsLoaded) {
            this.loadPartials();
        }

        try {
            // Check cache first
            if (this.templateCache.has(templateName) && process.env.NODE_ENV === 'production') {
                return this.templateCache.get(templateName)(context);
            }

            // Load template file
            // Support both .hbs and .txt extensions (automigration friendly)
            let templatePath = path.join(this.promptsDir, `${templateName}.hbs`);
            if (!fs.existsSync(templatePath)) {
                // Fallback to templates directory if not found in root
                templatePath = path.join(this.promptsDir, 'templates', `${templateName}.hbs`);

                if (!fs.existsSync(templatePath)) {
                    throw new Error(`Template not found: ${templateName}`);
                }
            }

            const templateContent = fs.readFileSync(templatePath, 'utf8');
            const compiledTemplate = handlebars.compile(templateContent, { noEscape: true }); // No HTML escaping for prompts

            // Cache in production
            if (process.env.NODE_ENV === 'production') {
                this.templateCache.set(templateName, compiledTemplate);
            }

            return compiledTemplate(context);

        } catch (error) {
            logger.error(`[PromptService] Error compiling template ${templateName}:`, error);
            throw error;
        }
    }
}

// Singleton instance
const promptService = new PromptService();
module.exports = promptService;
