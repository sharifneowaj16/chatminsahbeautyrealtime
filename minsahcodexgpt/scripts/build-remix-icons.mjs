import fs from 'node:fs';
import path from 'node:path';

const dir = 'public/icons/remix';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

const iconDefs = {};

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  // Match all paths or inner SVG content
  const innerMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  const name = f.replace('.svg', '');
  if (innerMatch) {
    iconDefs[name] = innerMatch[1].trim();
  }
});

function toPascalCase(str) {
  let name = str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') + 'Icon';
  if (/^[0-9]/.test(name)) {
    name = 'Ri' + name;
  }
  return name;
}

const componentLines = [
  `import React from 'react';`,
  ``,
  `export interface RemixIconProps extends React.SVGProps<SVGSVGElement> {`,
  `  size?: number | string;`,
  `  className?: string;`,
  `}`,
  ``,
  `const iconPaths: Record<string, string> = ${JSON.stringify(iconDefs, null, 2)};`,
  ``,
  `export type RemixIconName = keyof typeof iconPaths;`,
  ``,
  `export const RemixIcon: React.FC<RemixIconProps & { name: RemixIconName }> = ({`,
  `  name,`,
  `  size = 20,`,
  `  className = '',`,
  `  ...props`,
  `}) => {`,
  `  const inner = iconPaths[name];`,
  `  if (!inner) return null;`,
  `  return (`,
  `    <svg`,
  `      xmlns="http://www.w3.org/2000/svg"`,
  `      viewBox="0 0 24 24"`,
  `      fill="currentColor"`,
  `      width={size}`,
  `      height={size}`,
  `      className={className}`,
  `      aria-hidden="true"`,
  `      dangerouslySetInnerHTML={{ __html: inner }}`,
  `      {...props}`,
  `    />`,
  `  );`,
  `};`,
  ``
];

// Add individual convenient exported components for the most common ones
Object.keys(iconDefs).forEach(name => {
  const compName = toPascalCase(name);
  componentLines.push(
    `export const ${compName}: React.FC<RemixIconProps> = (props) => <RemixIcon name="${name}" {...props} />;`
  );
});

fs.mkdirSync('components/ui/icons', { recursive: true });
fs.writeFileSync('components/ui/icons/RemixIcons.tsx', componentLines.join('\n'));
console.log('Successfully generated components/ui/icons/RemixIcons.tsx with', Object.keys(iconDefs).length, 'icons.');
