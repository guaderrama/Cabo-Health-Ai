#!/usr/bin/env node
/**
 * Script para instalar dependencias e iniciar servidor de desarrollo
 * Ejecutar con: node start-dev.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = __dirname;
const nodeModulesPath = path.join(projectPath, 'node_modules');
const packageJsonPath = path.join(projectPath, 'package.json');

console.log('\x1b[36m%s\x1b[0m', '========================================');
console.log('\x1b[36m%s\x1b[0m', ' Cabo Health Nova - Dev Server');
console.log('\x1b[36m%s\x1b[0m', '========================================');
console.log('');

// Verificar que package.json existe
if (!fs.existsSync(packageJsonPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: package.json no encontrado');
  process.exit(1);
}

// Verificar si necesita instalar dependencias
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\x1b[33m%s\x1b[0m', 'Instalando dependencias (primera vez)...');
  console.log('');
  try {
    execSync('npm install', { 
      cwd: projectPath, 
      stdio: 'inherit',
      shell: true 
    });
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'ERROR: npm install falló');
    process.exit(1);
  }
  console.log('');
}

console.log('\x1b[32m%s\x1b[0m', 'Iniciando servidor de desarrollo...');
console.log('');
console.log('\x1b[32m%s\x1b[0m', 'Abrirá en: http://localhost:5173');
console.log('');
console.log('\x1b[33m%s\x1b[0m', 'Presiona Ctrl+C para detener');
console.log('');

// Ejecutar dev server
try {
  execSync('npm run dev', { 
    cwd: projectPath, 
    stdio: 'inherit',
    shell: true 
  });
} catch (error) {
  // npm run dev no es un error fatal
  if (error.status !== 124) { // 124 es SIGTERM from Ctrl+C
    console.error('\x1b[31m%s\x1b[0m', 'Error al ejecutar npm run dev');
    process.exit(1);
  }
}
