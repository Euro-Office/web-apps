// Renders the About dialog text from theme/<THEME>/meta/about.json into HTML at build time.
// Shared by the web-apps editors and the DesktopEditors start page / macOS About:
//   node build/about-html.mjs   → prints {"buildInfo": "...", "legal": "..."}
// Inputs (env): THEME, BUILD_COMMITS="DocumentServer=<sha> web-apps=<sha> ..." (parent repo first),
// BUILD_DATE=YYYY-MM-DD (defaults to today, UTC).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function buildCommits() {
  return (process.env.BUILD_COMMITS || '').split(/\s+/).filter(Boolean).map(entry => {
    const [repo, sha] = entry.split('=');
    if (!/^[\w.-]+$/.test(repo) || !/^[0-9a-f]{7,40}$/.test(sha)) {
      throw new Error(`[about-html] invalid BUILD_COMMITS entry: ${entry}`);
    }
    return { repo, sha };
  });
}

function buildDate() {
  const date = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`[about-html] invalid BUILD_DATE: ${date}`);
  return date;
}

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// "external" keeps Framework7 (mobile) from routing the link inside the app
const link = (href, label) => `<a href="${href}" target="_blank" class="external">${label}</a>`;

export function aboutHtml(theme = process.env.THEME || 'euro-office') {
  const { sourceUrl, blocks } = JSON.parse(fs.readFileSync(path.join(rootDir, 'theme', theme, 'meta', 'about.json'), 'utf8'));
  const commits = buildCommits();
  const date = buildDate();
  const main = commits[0];
  const commitLink = ({ repo, sha }) => link(`${sourceUrl}/${repo}/commit/${sha}`, sha.slice(0, 7));
  const urls = {
    licenceUrl: main ? `${sourceUrl}/${main.repo}/blob/${main.sha}/LICENSE` : 'https://www.gnu.org/licenses/agpl-3.0.html',
    sourceUrl:  main ? `${sourceUrl}/${main.repo}/tree/${main.sha}` : sourceUrl,
    // Commit history until a list of modifications is shipped with the program
    modificationsUrl: main ? `${sourceUrl}/${main.repo}/commits/${main.sha}` : sourceUrl,
  };

  const renderText = text => escape(text)
    .replace('{buildDate}', date)
    .replace(/\d{4}-\d{2}-\d{2}/g, '<span>$&</span>')
    .replace(/\[([^\]]+)\]\(\{(\w+)\}\)/g, (_, label, key) => link(urls[key], label))
    .replace(/\n/g, '<br>');

  const legal = blocks.map(block => {
    if (block.heading) return `<div class="about-legal-heading">${escape(block.heading)}</div>`;
    if (block.commits) {
      if (!commits.length) return '';
      const rows = commits.map(commit => `<tr><td>${commit.repo}</td><td>${commitLink(commit)}</td></tr>`).join('');
      return `<div class="about-legal-heading">${escape(block.commits)}</div><table class="about-legal-commits">${rows}</table>`;
    }
    return `<p>${renderText(block.text)}</p>`;
  }).join('');

  return {
    buildInfo: `&nbsp;· build ${date}` + (main ? ` · commit ${commitLink(main)}` : ''),
    legal,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(aboutHtml()));
}
