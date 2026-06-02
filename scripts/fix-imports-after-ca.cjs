const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function rel(fromDir, toPathNoExt) {
  let rel = path.relative(fromDir, path.join(SRC, toPathNoExt)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  const original = content;

  const rewrites = [
    [/from ['"](?:\.\.\/)+entities\/([^'"]+)['"]/g, (m, e) => `from '${rel(dir, `domain/entities/${e}`.replace(/\.ts$/, ''))}'`],
    [/from ['"](?:\.\.\/)+auth\/jwt-payload\.interface['"]/g, () => `from '${rel(dir, 'domain/auth/jwt-payload.interface')}'`],
    [/from ['"](?:\.\.\/)+rbac\/privilege-codes['"]/g, () => `from '${rel(dir, 'domain/rbac/privilege-codes')}'`],
    [/from ['"](?:\.\.\/)+domain\/rbac\/privilege-codes['"]/g, () => `from '${rel(dir, 'domain/rbac/privilege-codes')}'`],
    [/from ['"](?:\.\.\/)+cache\/([^'"]+)['"]/g, (m, e) => `from '${rel(dir, `infrastructure/cache/${e}`.replace(/\.ts$/, ''))}'`],
    [/from ['"](?:\.\.\/)+redis\/([^'"]+)['"]/g, (m, e) => `from '${rel(dir, `infrastructure/redis/${e}`.replace(/\.ts$/, ''))}'`],
    [/from ['"](?:\.\.\/)+queue\/([^'"]+)['"]/g, (m, e) => `from '${rel(dir, `infrastructure/queue/${e}`.replace(/\.ts$/, ''))}'`],
    [/from ['"](?:\.\.\/)+notifications\/([^'"]+)['"]/g, (m, e) => `from '${rel(dir, `infrastructure/notifications/${e}`.replace(/\.ts$/, ''))}'`],
    [/from ['"](?:\.\.\/)+database\/([^'"]+)['"]/g, (m, e) => `from '${rel(dir, `infrastructure/database/${e}`.replace(/\.ts$/, ''))}'`],
    [/from ['"](?:\.\.\/)+common\/http-exception\.filter['"]/g, () => `from '${rel(dir, 'shared/presentation/filters/http-exception.filter')}'`],
    [/from ['"](?:\.\.\/)+auth\/jwt-auth\.guard['"]/g, () => `from '${rel(dir, 'shared/presentation/guards/jwt-auth.guard')}'`],
    [/from ['"](?:\.\.\/)+auth\/auth-kind\.guard['"]/g, () => `from '${rel(dir, 'shared/presentation/guards/auth-kind.guard')}'`],
    [/from ['"](?:\.\.\/)+rbac\/privileges\.guard['"]/g, () => `from '${rel(dir, 'shared/presentation/guards/privileges.guard')}'`],
    [/from ['"](?:\.\.\/)+shared\/presentation\/guards\/privileges\.guard['"]/g, () => `from '${rel(dir, 'shared/presentation/guards/privileges.guard')}'`],
    [/from ['"](?:\.\.\/)+auth\/current-user\.decorator['"]/g, () => `from '${rel(dir, 'shared/presentation/decorators/current-user.decorator')}'`],
    [/from ['"](?:\.\.\/)+rbac\/require-privileges\.decorator['"]/g, () => `from '${rel(dir, 'shared/presentation/decorators/require-privileges.decorator')}'`],
    [/from ['"](?:\.\.\/)+auth\/jwt\.strategy['"]/g, () => `from '${rel(dir, 'shared/presentation/strategies/jwt.strategy')}'`],
    [/from ['"](?:\.\.\/)+config\/data-source-options['"]/g, () => `from '${rel(dir, 'config/data-source-options')}'`],
    [/from ['"]\.\/app\.module['"]/g, () => `from '${rel(dir, 'app.module')}'`],
  ];

  for (const [regex, replacer] of rewrites) {
    content = content.replace(regex, replacer);
  }

  // Cross-module service/controller imports at old flat paths
  const features = [
    'auth', 'appointments', 'capabilities', 'skills', 'dealerships',
    'service-bays', 'technicians', 'service-types', 'admins',
    'admin-groups', 'admin-privileges', 'reference', 'health', 'rbac',
  ];
  for (const feature of features) {
    const kebab = feature;
    const name = kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const baseNames = {
      auth: 'auth',
      appointments: 'appointments',
      capabilities: 'capabilities',
      skills: 'skills',
      dealerships: 'dealerships',
      'service-bays': 'service-bays',
      technicians: 'technicians',
      'service-types': 'service-types',
      admins: 'admins',
      'admin-groups': 'admin-groups',
      'admin-privileges': 'admin-privileges',
      reference: 'reference',
      health: 'health',
      rbac: 'rbac',
    };
    const bn = baseNames[kebab];

    content = content.replace(
      new RegExp(`from ['"](?:\\.\\./)+${kebab}/${bn}\\.(service|controller|module)['"]`, 'g'),
      (m, ext) => {
        if (ext === 'module') {
          return `from '${rel(dir, `modules/${kebab}/${bn}.${ext}`)}'`;
        }
        const layer = ext === 'service' ? 'application' : 'presentation';
        return `from '${rel(dir, `modules/${kebab}/${layer}/${bn}.${ext}`)}'`;
      },
    );

    // admin-appointments special case
    content = content.replace(
      new RegExp(`from ['"](?:\\.\\./)+appointments/admin-appointments\\.(service|controller)['"]`, 'g'),
      (m, ext) => {
        const layer = ext === 'service' ? 'application' : 'presentation';
        return `from '${rel(dir, `modules/appointments/${layer}/admin-appointments.${ext}`)}'`;
      },
    );

    content = content.replace(
      new RegExp(`from ['"]\\.\\./${kebab}/${bn}\\.(service|controller)['"]`, 'g'),
      (m, ext) => {
        const layer = ext === 'service' ? 'application' : 'presentation';
        return `from '${rel(dir, `modules/${kebab}/${layer}/${bn}.${ext}`)}'`;
      },
    );
  }

  // Same-module: presentation importing ./foo.service -> ../application/foo.service
  if (filePath.includes(`${path.sep}presentation${path.sep}`)) {
    content = content.replace(
      /from ['"]\.\/([a-z0-9-]+)\.service['"]/g,
      (m, name) => `from '../application/${name}.service'`,
    );
    content = content.replace(
      /from ['"]\.\/dto\//g,
      "from './dto/",
    );
  }

  // application layer importing ./dto -> ../presentation/dto
  if (filePath.includes(`${path.sep}application${path.sep}`)) {
    content = content.replace(
      /from ['"]\.\/dto\//g,
      "from '../presentation/dto/",
    );
  }

  // Module files importing local controller/service
  if (filePath.endsWith('.module.ts')) {
    content = content.replace(
      /from ['"]\.\/([a-z0-9-]+)\.controller['"]/g,
      "from './presentation/$1.controller'",
    );
    content = content.replace(
      /from ['"]\.\/([a-z0-9-]+)\.service['"]/g,
      "from './application/$1.service'",
    );
    content = content.replace(
      /from ['"]\.\/admin-appointments\.controller['"]/g,
      "from './presentation/admin-appointments.controller'",
    );
    content = content.replace(
      /from ['"]\.\/admin-appointments\.service['"]/g,
      "from './application/admin-appointments.service'",
    );
    content = content.replace(
      /from ['"]\.\/presentation\/([a-z0-9-]+)\.controller['"]/g,
      (m, name) => {
        const p = path.join(path.dirname(filePath), 'presentation', `${name}.controller.ts`);
        if (fs.existsSync(p)) return m;
        return m;
      },
    );
  }

  // admin-privileges service path in guard
  content = content.replace(
    /from ['"](?:\.\.\/)+admin-privileges\/admin-privileges\.service['"]/g,
    () => `from '${rel(dir, 'modules/admin-privileges/application/admin-privileges.service')}'`,
  );

  content = content.replace(
    /from ['"](?:\.\.\/)+admin-groups\/admin-groups\.service['"]/g,
    () => `from '${rel(dir, 'modules/admin-groups/application/admin-groups.service')}'`,
  );

  content = content.replace(
    /from ['"](?:\.\.\/)+admin-privileges\/admin-privileges\.module['"]/g,
    () => `from '${rel(dir, 'modules/admin-privileges/admin-privileges.module')}'`,
  );

  content = content.replace(
    /from ['"](?:\.\.\/)+capabilities\/capabilities\.service['"]/g,
    () => `from '${rel(dir, 'modules/capabilities/application/capabilities.service')}'`,
  );
  content = content.replace(
    /from ['"](?:\.\.\/)+skills\/skills\.service['"]/g,
    () => `from '${rel(dir, 'modules/skills/application/skills.service')}'`,
  );
  content = content.replace(
    /from ['"](?:\.\.\/)+dealerships\/dealerships\.service['"]/g,
    () => `from '${rel(dir, 'modules/dealerships/application/dealerships.service')}'`,
  );

  if (content !== original) fs.writeFileSync(filePath, content);
}

for (const file of walk(SRC)) fixFile(file);

// package.json seed path
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts.seed = 'ts-node -r tsconfig-paths/register src/infrastructure/database/seed.ts';
pkg.scripts['migration:generate'] = 'npm run typeorm -- migration:generate ./src/migrations/Migration -d ./src/infrastructure/database/data-source.ts';
pkg.scripts['migration:run'] = 'npm run typeorm -- migration:run -d ./src/infrastructure/database/data-source.ts';
pkg.scripts['migration:revert'] = 'npm run typeorm -- migration:revert -d ./src/infrastructure/database/data-source.ts';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log('Fixed imports in', walk(SRC).length, 'files');
