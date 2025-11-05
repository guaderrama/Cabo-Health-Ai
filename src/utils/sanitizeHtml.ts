import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML usando DOMPurify para prevenir ataques XSS.
 * Permite tags HTML seguros y atributos como href, target, class para enlaces.
 * @param dirtyHtml El string HTML potencialmente inseguro.
 * @returns Un string HTML sanitizado.
 */
export const sanitizeHtml = (dirtyHtml: string): string => {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  // Configurar DOMPurify para permitir tags y atributos seguros
  const config = {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 'b', 'i',
      'ul', 'ol', 'li',
      'div', 'span',
      'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(dirtyHtml, config);
};
