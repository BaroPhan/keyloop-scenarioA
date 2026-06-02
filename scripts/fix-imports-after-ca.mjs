#!/usr/bin/env node
/**
 * Rewrites relative imports after clean-architecture folder moves.
 * Resolves paths to canonical src/ locations from each file's directory.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const ALIAS_TARGETS = {
  'domain/entities': 'domain/entities',
  'domain/auth/jwt-payload.interface': 'domain/auth/jwt-payload.interface',
  'domain/rbac/privilege-codes': 'domain/rbac/privilege-codes',
  'infrastructure/cache': 'infrastructure/cache',
  'infrastructure/redis': 'infrastructure/redis',
  'infrastructure/queue': 'infrastructure/queue',
  'infrastructure/notifications': 'infrastructure/notifications',
  'infrastructure/database': 'infrastructure/database',
  'shared/presentation/guards': 'shared/presentation/guards',
  'shared/presentation/decorators': 'shared/presentation/decorators',
  'shared/presentation/filters': 'shared/presentation/filters',
  'shared/presentation/strategies': 'shared/presentation/strategies',
  'config/data-source-options': 'config/data-source-options',
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function relImport(fromDir, targetPathWithoutExt) {
  let rel = path.relative(fromDir, path.join(SRC, targetPathWithoutExt)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function resolveModule(fromFile, importPath) {
  if (!importPath.startsWith('.')) return importPath;

  const fromDir = path.dirname(fromFile);
  const abs = path.normalize(path.join(fromDir, importPath));
  const relToSrc = path.relative(SRC, abs).replace(/\\/g, '/');

  // modules/{feature}/application|presentation/...
  const moduleMatch = relToSrc.match(
    /^modules\/([^/]+)\/(application|presentation)(?:\/(.+))?$/,
  );
  if (moduleMatch) {
    const [, feature, layer, rest] = moduleMatch;
    if (!rest) return importPath;
    const base = rest.replace(/\.(service|controller|module)$/, '');
    return importPath; // already correct relative
  }

  return importPath;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fromDir = path.dirname(filePath);
  let changed = false;

  // Map legacy folder segments to new canonical roots
  const legacyPatterns = [
    [/from ['"](\.+\/)entities\/([^'"]+)['"]/g, 'domain/entities/$2'],
    [/from ['"](\.+\/)auth\/jwt-payload\.interface['"]/g, 'domain/auth/jwt-payload.interface'],
    [/from ['"](\.+\/)rbac\/privilege-codes['"]/g, 'domain/rbac/privilege-codes'],
    [/from ['"](\.+\/)cache\/([^'"]+)['"]/g, 'infrastructure/cache/$2'],
    [/from ['"](\.+\/)redis\/([^'"]+)['"]/g, 'infrastructure/redis/$2'],
    [/from ['"](\.+\/)queue\/([^'"]+)['"]/g, 'infrastructure/queue/$2'],
    [/from ['"](\.+\/)notifications\/([^'"]+)['"]/g, 'infrastructure/notifications/$2'],
    [/from ['"](\.+\/)database\/([^'"]+)['"]/g, 'infrastructure/database/$2'],
    [/from ['"](\.+\/)common\/http-exception\.filter['"]/g, 'shared/presentation/filters/http-exception.filter'],
    [/from ['"](\.+\/)auth\/jwt-auth\.guard['"]/g, 'shared/presentation/guards/jwt-auth.guard'],
    [/from ['"](\.+\/)auth\/auth-kind\.guard['"]/g, 'shared/presentation/guards/auth-kind.guard'],
    [/from ['"](\.+\/)rbac\/privileges\.guard['"]/g, 'shared/presentation/guards/privileges.guard'],
    [/from ['"](\.+\/)auth\/current-user\.decorator['"]/g, 'shared/presentation/decorators/current-user.decorator'],
    [/from ['"](\.+\/)rbac\/require-privileges\.decorator['"]/g, 'shared/presentation/decorators/require-privileges.decorator'],
    [/from ['"](\.+\/)auth\/jwt\.strategy['"]/g, 'shared/presentation/strategies/jwt.strategy'],
    [/from ['"](\.+\/)config\/data-source-options['"]/g, 'config/data-source-options'],
  ];

  for (const [regex, targetTpl] of legacyPatterns) {
    content = content.replace(regex, (match, _dots, capture) => {
      const target = targetTpl.replace('$2', capture ?? '').replace(/\.$/, '');
      const rel = relImport(fromDir, target.replace(/\.ts$/, ''));
      changed = true;
      const quote = match.includes('"') ? '"' : "'";
      return `from ${quote}${rel}${quote}`;
    });
  }

  // Fix cross-module feature imports: ../capabilities/capabilities.service -> ../capabilities/application/capabilities.service
  content = content.replace(
    /from ['"](\.+\/)((?:capabilities|skills|dealerships|service-bays|technicians|service-types|admins|admin-groups|admin-privileges|auth|appointments|reference|rbac))\/([a-z0-9-]+)\.(service|controller|module)['"]/gi,
    (match, dots, feature, name, ext) => {
      if (ext === 'module') {
        changed = true;
        const rel = relImport(fromDir, `modules/${feature}/${name}.${ext}`.replace(/\.module$/, '.module'));
        return `from '${path.relative(fromDir, path.join(SRC, 'modules', feature, `${name}.${ext}`)).replace(/\\/g, '/').replace(/^(?!\.)/, './$&')}'`.replace("from './", "from '");
      }
      const layer = ext === 'service' ? 'application' : 'presentation';
      const target = `modules/${feature}/${layer}/${name}.${ext}`;
      const rel = relImport(fromDir, target.replace(/\.ts$/, ''));
      changed = true;
      return `from '${rel}'`;
    },
  );

  // Fix same-feature relative imports: ./capabilities.service in presentation -> ../application/
  content = content.replace(
    /from ['"]\.\/([a-z0-9-]+)\.(service)['"]/g,
    (match, name, ext) => {
      if (!filePath.includes(`${path.sep}presentation${path.sep}`)) return match;
      const target = path.join(path.dirname(filePath), '..', 'application', `${name}.${ext}`);
      if (!fs.existsSync(target)) return match;
      changed = true;
      return `from '../application/${name}.${ext}'`;
    },
  );

  // Fix admin-privileges service import name path
  content = content.replace(
    /from ['"](\.+\/)admin-privileges\/admin-privileges\.service['"]/g,
    (match, dots) => {
      changed = true;
      const rel = relImport(fromDir, 'modules/admin-privileges/application/admin-privileges.service');
      return `from '${rel}'`;
    },
  );

  content = content.replace(
    /from ['"](\.+\/)admin-groups\/admin-groups\.service['"]/g,
    () => {
      changed = true;
      return `from '${relImport(fromDir, 'modules/admin-groups/application/admin-groups.service')}'`;
    },
  );

  if (changed) fs.writeFileSync(filePath, content);
}

for (const file of walk(SRC)) {
  fixFile(file);
}

// Fix test file at old location if moved
const e2ePath = path.join(__dirname, '..', 'test', 'appointments.e2e-spec.ts');
if (fs.existsSync(e2ePath)) {
  let c = fs.readFileSync(e2ePath, 'utf8');
  c = c.replace(/from '\.\.\/src\/app\.module'/g, "from '../src/app.module'");
  fs.writeFileSync(e2ePath, c);
}

console.log('Import fix pass complete.');
