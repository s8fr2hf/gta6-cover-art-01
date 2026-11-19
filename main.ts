// Palm Shores cover studio — the hand-in program (Node 22, standard library only).
//
// It gathers the entry for make.fun: the static web app in app/ and the
// screenshots/ folder are copied next to this file into the output folder,
// and dossier.json is written there from those copied files using the
// vendored make.fun helper. Run it locally as:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader the output folder is /output instead (MAKEFUN_OUTPUT_DIR
// unset). The run writes the same bytes every time: no timestamps, no
// randomness, files copied in directory order.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appSource = join(repoRoot, 'app');
const shotsSource = join(repoRoot, 'screenshots');
const appTarget = join(outputDir, 'app');
const shotsTarget = join(outputDir, 'screenshots');

mkdirSync(outputDir, { recursive: true });
rmSync(appTarget, { recursive: true, force: true });
rmSync(shotsTarget, { recursive: true, force: true });
cpSync(appSource, appTarget, { recursive: true });
mkdirSync(shotsTarget, { recursive: true });
if (existsSync(shotsSource)) cpSync(shotsSource, shotsTarget, { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`wrote ${outputDir}/dossier.json`);
