import React from 'react';

/**
 * Nova a veces responde con formato Markdown sencillo (**negritas** y listas con "*" o "-").
 * Aquí se muestra como texto con formato en lugar de dejar los asteriscos a la vista.
 */

const BULLET = /^[ \t]*[*-][ \t]+/gm;
const BOLD = /(\*\*[^*\n]+?\*\*)/g;

/** Texto plano sin marcas (para leer en voz alta o mientras se escribe la respuesta). */
export function stripMarkdown(text: string): string {
  return text.replace(BULLET, '• ').replace(/\*\*/g, '');
}

/** Texto con negritas y viñetas reales. */
export function renderRichText(text: string): React.ReactNode {
  return text
    .replace(BULLET, '• ')
    .split(BOLD)
    .map((part, i) =>
      part.length > 4 && part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        : part.replace(/\*\*/g, '')
    );
}
