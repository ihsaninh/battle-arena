#!/usr/bin/env bun

import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface FileStats {
  path: string;
  hasTest: boolean;
  type: 'component' | 'hook' | 'lib' | 'type';
}

const SRC_DIR = join(process.cwd(), 'src');

// Directories to scan
const SCAN_DIRS = ['components', 'hooks', 'lib'];

// Extensions to check
const SOURCE_EXTENSIONS = ['.ts', '.tsx'];
const TEST_EXTENSIONS = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getAllSourceFiles(fullPath));
      } else if (stat.isFile()) {
        const hasSourceExt = SOURCE_EXTENSIONS.some(ext => item.endsWith(ext));
        const isTestFile = TEST_EXTENSIONS.some(ext => item.includes(ext));

        if (hasSourceExt && !isTestFile && item !== 'index.ts') {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist, skip
  }

  return files;
}

function getFileType(filePath: string): FileStats['type'] {
  if (filePath.includes('/components/')) return 'component';
  if (filePath.includes('/hooks/')) return 'hook';
  if (filePath.includes('/lib/')) return 'lib';
  return 'type';
}

function hasTestFile(sourcePath: string): boolean {
  const withoutExt = sourcePath.replace(/\.(ts|tsx)$/, '');

  for (const ext of TEST_EXTENSIONS) {
    try {
      const testPath = `${withoutExt}${ext}`;
      statSync(testPath);
      return true;
    } catch {
      // File doesn't exist
    }
  }

  return false;
}

function analyzeTestCoverage(): FileStats[] {
  const allFiles: FileStats[] = [];

  for (const dir of SCAN_DIRS) {
    const dirPath = join(SRC_DIR, dir);
    const sourceFiles = getAllSourceFiles(dirPath);

    for (const file of sourceFiles) {
      allFiles.push({
        path: relative(SRC_DIR, file),
        hasTest: hasTestFile(file),
        type: getFileType(file),
      });
    }
  }

  return allFiles;
}

function printReport(files: FileStats[]) {
  console.log('\n📊 Test Coverage Report\n');
  console.log('━'.repeat(80));

  // Group by type
  const byType: Record<string, FileStats[]> = {
    hook: [],
    component: [],
    lib: [],
    type: [],
  };

  for (const file of files) {
    byType[file.type].push(file);
  }

  // Print stats
  const totalFiles = files.length;
  const testedFiles = files.filter(f => f.hasTest).length;
  const coverage =
    totalFiles > 0 ? ((testedFiles / totalFiles) * 100).toFixed(1) : '0.0';

  console.log(
    `\n📈 Overall Coverage: ${testedFiles}/${totalFiles} files (${coverage}%)`
  );

  // Print by category
  for (const [type, items] of Object.entries(byType)) {
    if (items.length === 0) continue;

    const tested = items.filter(f => f.hasTest).length;
    const total = items.length;
    const percent = ((tested / total) * 100).toFixed(1);

    console.log(
      `\n${getTypeIcon(type as FileStats['type'])} ${capitalize(type)}s: ${tested}/${total} (${percent}%)`
    );
    console.log('─'.repeat(80));

    // Sort: untested first
    const sorted = [...items].sort((a, b) => {
      if (a.hasTest === b.hasTest) return a.path.localeCompare(b.path);
      return a.hasTest ? 1 : -1;
    });

    for (const file of sorted) {
      const status = file.hasTest ? '✅' : '❌';
      console.log(`  ${status} ${file.path}`);
    }
  }

  console.log('\n' + '━'.repeat(80));

  // Summary
  const untestedFiles = files.filter(f => !f.hasTest);
  if (untestedFiles.length > 0) {
    console.log(`\n⚠️  ${untestedFiles.length} file(s) need tests\n`);
  } else {
    console.log('\n🎉 All files have tests!\n');
  }
}

function getTypeIcon(type: FileStats['type']): string {
  switch (type) {
    case 'hook':
      return '🪝';
    case 'component':
      return '🧩';
    case 'lib':
      return '📚';
    case 'type':
      return '📝';
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Main execution
const files = analyzeTestCoverage();
printReport(files);

// Exit with error code if coverage is below threshold (only in CI mode)
const isCI = process.env.CI === 'true' || process.argv.includes('--ci');
const coverage = (files.filter(f => f.hasTest).length / files.length) * 100;
const threshold = parseFloat(process.env.TEST_THRESHOLD || '80');

if (isCI && coverage < threshold) {
  console.log(
    `❌ Coverage ${coverage.toFixed(1)}% is below threshold ${threshold}%`
  );
  process.exit(1);
}
