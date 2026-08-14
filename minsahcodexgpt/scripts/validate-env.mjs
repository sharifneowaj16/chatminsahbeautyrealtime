#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, 'config', 'env.manifest.json'), 'utf8'),
);

function readArgValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseEnvFile(source) {
  const values = {};
  const duplicates = [];

  for (const [index, originalLine] of source.split(/\r?\n/).entries()) {
    const line = originalLine.trim();
    if (!line || line.startsWith('#')) continue;

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const equalsIndex = normalized.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = normalized.slice(0, equalsIndex).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;

    let value = normalized.slice(equalsIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    if (Object.hasOwn(values, key)) {
      duplicates.push(`${key} (line ${index + 1})`);
    }
    values[key] = value;
  }

  return { values, duplicates };
}

function isPlaceholder(value) {
  const normalized = value.toLowerCase();
  return manifest.placeholderFragments.some((fragment) => normalized.includes(fragment));
}

function validateValues(values, { production, template }) {
  const errors = [];
  const warnings = [];
  const required = production
    ? [...manifest.required, ...manifest.productionRequired]
    : manifest.required;

  for (const key of required) {
    const value = values[key]?.trim();
    if (!value) {
      errors.push(`${key} is required${production ? ' in production' : ''}.`);
      continue;
    }
    if (production && !template && isPlaceholder(value)) {
      errors.push(`${key} still contains a placeholder value.`);
    }
  }

  if (production) {
    for (const key of manifest.recommendedProduction) {
      if (!values[key]?.trim()) {
        warnings.push(`${key} is recommended for production but is not configured.`);
      }
    }
  }

  for (const key of manifest.urls) {
    const value = values[key]?.trim();
    if (!value) continue;
    if (production && !template && isPlaceholder(value)) continue;
    try {
      const parsed = new URL(value);
      if (!parsed.protocol || !parsed.hostname) {
        errors.push(`${key} must be an absolute URL.`);
      }
    } catch {
      errors.push(`${key} must be a valid absolute URL.`);
    }
  }

  const acceptedBooleans = new Set(['true', 'false', '1', '0', 'yes', 'no']);
  for (const key of manifest.booleans) {
    const value = values[key]?.trim().toLowerCase();
    if (value && !acceptedBooleans.has(value)) {
      errors.push(`${key} must be true/false, 1/0, or yes/no.`);
    }
  }

  for (const [key, acceptedValues] of Object.entries(manifest.enums ?? {})) {
    const value = values[key]?.trim();
    if (!value) continue;
    const normalized = value.toUpperCase();
    if (!acceptedValues.includes(normalized)) {
      errors.push(`${key} must be one of: ${acceptedValues.join(', ')}.`);
    }
  }

  for (const key of manifest.integers) {
    const value = values[key]?.trim();
    if (!value) continue;
    if (!/^-?\d+$/.test(value)) {
      errors.push(`${key} must be an integer.`);
    }
  }

  for (const key of manifest.positiveNumbers) {
    const value = values[key]?.trim();
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      errors.push(`${key} must be a positive number.`);
    }
  }

  if (!template) {
    for (const [key, minimumLength] of Object.entries(manifest.secretMinimumLengths)) {
      const value = values[key]?.trim();
      if (!value) continue;
      if (isPlaceholder(value)) {
        if (production) errors.push(`${key} still contains a placeholder value.`);
        continue;
      }
      if (value.length < minimumLength) {
        errors.push(`${key} must be at least ${minimumLength} characters.`);
      }
    }
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

const examplePath = readArgValue('--example');
const explicitFile = readArgValue('--file');
const template = Boolean(examplePath);
const production = process.argv.includes('--production') || template;

let values;
let sourceLabel;
let duplicates = [];

if (examplePath || explicitFile) {
  const relativePath = examplePath ?? explicitFile;
  const resolvedPath = path.resolve(projectRoot, relativePath);
  const parsed = parseEnvFile(await readFile(resolvedPath, 'utf8'));
  values = parsed.values;
  duplicates = parsed.duplicates;
  sourceLabel = path.relative(projectRoot, resolvedPath);
} else {
  values = { ...process.env };
  sourceLabel = 'process environment';
}

const { errors, warnings } = validateValues(values, { production, template });
if (duplicates.length > 0) {
  errors.unshift(`Duplicate environment keys: ${duplicates.join(', ')}`);
}

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (errors.length > 0) {
  console.error(`Environment validation failed for ${sourceLabel}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Environment validation passed for ${sourceLabel} (${production ? 'production' : 'base'} contract).`,
);
