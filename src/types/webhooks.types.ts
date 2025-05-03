/** 
 * Заголовки, которые приходит GitHub при вебхуке 
 */
export interface GitHubWebhookHeaders {
    host: string
    'x-real-ip': string
    'x-forwarded-for': string
    connection: string
    'content-length': string
    'user-agent': string
    accept: string
    'content-type': 'application/json'
    'x-github-delivery': string
    'x-github-event': string
    'x-github-hook-id': string
    'x-github-hook-installation-target-id': string
    'x-github-hook-installation-target-type': string
    'x-hub-signature': string
    'x-hub-signature-256': string

    // остальные заголовки, которые могут придти
    [key: string]: string | undefined
}