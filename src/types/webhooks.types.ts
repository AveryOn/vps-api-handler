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


// src/types/github-webhook.ts

/**
 * Описание авторства коммита
 */
export interface GitHubUserInfo {
    name: string
    email: string
    username: string
}

/**
 * Один коммит из payload
 */
export interface GitHubCommit {
    id: string
    tree_id: string
    distinct: boolean
    message: string
    timestamp: string
    url: string
    author: GitHubUserInfo
    committer: GitHubUserInfo
    added: string[]
    removed: string[]
    modified: string[]
}

/**
 * Информация о владельце репо
 */
export interface GitHubRepoOwner {
    name: string
    email: string
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    user_view_type: string
    site_admin: boolean
}

/**
 * Основная инфа по репозиторию
 */
export interface GitHubRepository {
    id: number
    node_id: string
    name: string
    full_name: string
    private: boolean
    owner: GitHubRepoOwner
    html_url: string
    description: string | null
    fork: boolean
    url: string
    forks_url: string
    keys_url: string
    collaborators_url: string
    teams_url: string
    hooks_url: string
    issue_events_url: string
    events_url: string
    assignees_url: string
    branches_url: string
    tags_url: string
    blobs_url: string
    git_tags_url: string
    git_refs_url: string
    trees_url: string
    statuses_url: string
    languages_url: string
    stargazers_url: string
    contributors_url: string
    subscribers_url: string
    subscription_url: string
    commits_url: string
    git_commits_url: string
    comments_url: string
    issue_comment_url: string
    contents_url: string
    compare_url: string
    merges_url: string
    archive_url: string
    downloads_url: string
    issues_url: string
    pulls_url: string
    milestones_url: string
    notifications_url: string
    labels_url: string
    releases_url: string
    deployments_url: string
    created_at: number
    updated_at: string
    pushed_at: number
    git_url: string
    ssh_url: string
    clone_url: string
    svn_url: string
    homepage: string | null
    size: number
    stargazers_count: number
    watchers_count: number
    language: string
    has_issues: boolean
    has_projects: boolean
    has_downloads: boolean
    has_wiki: boolean
    has_pages: boolean
    has_discussions: boolean
    forks_count: number
    mirror_url: string | null
    archived: boolean
    disabled: boolean
    open_issues_count: number
    license: any
    allow_forking: boolean
    is_template: boolean
    web_commit_signoff_required: boolean
    topics: any[]
    visibility: string
    forks: number
    open_issues: number
    watchers: number
    default_branch: string
    stargazers: number
    master_branch: string
}

/**
 * Pusher
 */
export interface GitHubPusher {
    name: string
    email: string
}

/**
 * Sender
 */
export interface GitHubSender {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    user_view_type: string
    site_admin: boolean
}

/**
 * Полный payload GitHub push webhook
 */
export interface GitHubPushEventPayload {
    ref: string
    before: string
    after: string
    repository: GitHubRepository
    pusher: GitHubPusher
    sender: GitHubSender
    created: boolean
    deleted: boolean
    forced: boolean
    base_ref: string | null
    compare: string
    commits: GitHubCommit[]
    head_commit: GitHubCommit
}


export type GitHubGuardResponse = { payload: GitHubPushEventPayload, event: string }
export type ENVIRONMENTS = 'DEV' | 'PROD' | 'LOCAL'
export interface ExecuteDeploymentScript {
    script: string,
    branch: string,
    environment?: string | null,
    namespace?: string | null,
    side?: 'server' | 'client' | null,
}