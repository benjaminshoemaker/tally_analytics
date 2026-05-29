export function productionAnalyticsTrafficFilter(alias?: string): string {
  const prefix = alias ? `${alias}.` : '';
  const url = `ifNull(${prefix}url, '')`;

  return `
        AND ifNull(${prefix}environment, 'production') = 'production'
        AND NOT startsWith(${url}, 'http://localhost')
        AND NOT startsWith(${url}, 'https://localhost')
        AND NOT startsWith(${url}, 'http://127.0.0.1')
        AND NOT startsWith(${url}, 'https://127.0.0.1')
        AND NOT startsWith(${url}, 'http://[::1]')
        AND NOT startsWith(${url}, 'https://[::1]')
        AND position(${url}, '.vercel.app') = 0`;
}
