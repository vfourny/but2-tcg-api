#!/usr/bin/env node

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

if (!GITHUB_TOKEN) {
    console.error('❌ Erreur: GITHUB_TOKEN n\'est pas défini');
    process.exit(1);
}

if (!GITHUB_REPOSITORY) {
    console.error('❌ Erreur: GITHUB_REPOSITORY n\'est pas défini');
    process.exit(1);
}

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const templateOwner = process.env.TEMPLATE_OWNER || owner;
const templateRepo = process.env.TEMPLATE_REPO || repo.replace('-', '-template-');

console.log(`📋 Copie des issues de ${templateOwner}/${templateRepo} vers ${owner}/${repo}`);

// Fonction pour faire des requêtes API GitHub
function makeGitHubRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: path,
            method: method,
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'Node.js Script',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`GitHub API Error (${res.statusCode}): ${data}`));
                } else {
                    resolve(JSON.parse(data || '{}'));
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

// Fonction pour obtenir toutes les issues (pagination)
async function getAllIssues(issueOwner, issueRepo) {
    let allIssues = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const issues = await makeGitHubRequest(
            'GET',
            `/repos/${issueOwner}/${issueRepo}/issues?state=all&per_page=100&page=${page}`
        );

        if (issues.length === 0) {
            hasMore = false;
        } else {
            allIssues = allIssues.concat(issues);
            page++;
        }
    }

    return allIssues;
}

// Fonction pour créer une issue
async function createIssue(issueOwner, issueRepo, issue) {
    const issueData = {
        title: issue.title,
        body: issue.body || '',
        labels: issue.labels ? issue.labels.map(l => l.name) : [],
        state: issue.state
    };

    // On n'assigne pas automatiquement pour éviter les erreurs de permissions
    // Les instructeurs peuvent le faire manuellement si nécessaire

    try {
        const createdIssue = await makeGitHubRequest(
            'POST',
            `/repos/${issueOwner}/${issueRepo}/issues`,
            issueData
        );
        return createdIssue;
    } catch (error) {
        console.error(`❌ Erreur lors de la création de l'issue "${issue.title}":`, error.message);
        throw error;
    }
}

// Fonction principale
async function copyIssues() {
    try {
        // Vérifier que ce n'est pas déjà le template
        if (owner === templateOwner && repo === templateRepo) {
            console.log('ℹ️  Ce repo est le template lui-même, copie non nécessaire');
            process.exit(0);
        }

        console.log(`\n🔍 Récupération des issues du template...`);
        const templateIssues = await getAllIssues(templateOwner, templateRepo);

        if (templateIssues.length === 0) {
            console.log('ℹ️  Aucune issue à copier');
            process.exit(0);
        }

        console.log(`✅ ${templateIssues.length} issue(s) trouvée(s)\n`);

        let successCount = 0;
        let failureCount = 0;

        for (const issue of templateIssues) {
            try {
                await createIssue(owner, repo, issue);
                console.log(`✅ Issue créée: "${issue.title}"`);
                successCount++;
            } catch (error) {
                console.error(`❌ Erreur: ${error.message}`);
                failureCount++;
            }
        }

        console.log(`\n📊 Résumé:`);
        console.log(`   ✅ Succès: ${successCount}`);
        console.log(`   ❌ Erreurs: ${failureCount}`);

        if (failureCount > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Erreur fatale:', error.message);
        process.exit(1);
    }
}

copyIssues();