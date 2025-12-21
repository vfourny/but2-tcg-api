import * as YAML from 'js-yaml';
import * as path from 'path';
import * as fs from 'fs';

// Load the main Swagger configuration
const swaggerConfig = YAML.load(
  fs.readFileSync(path.join(__dirname, 'swagger.config.yml'), 'utf8')
) as any;

// Load all route documentation files
const authDoc = YAML.load(
  fs.readFileSync(path.join(__dirname, 'auth.doc.yml'), 'utf8')
) as any;

const cardDoc = YAML.load(
  fs.readFileSync(path.join(__dirname, 'card.doc.yml'), 'utf8')
) as any;

const deckDoc = YAML.load(
  fs.readFileSync(path.join(__dirname, 'deck.doc.yml'), 'utf8')
) as any;

// Merge all paths into a single Swagger document
export const swaggerDocument = {
  ...swaggerConfig,
  paths: {
    ...authDoc.paths,
    ...cardDoc.paths,
    ...deckDoc.paths,
  },
};
