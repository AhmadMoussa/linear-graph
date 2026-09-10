import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'

const MESSAGES: Record<string, string> = {
  state: 'Sign-in was interrupted. Please try again.',
  token: 'Linear rejected the sign-in. Check the OAuth app credentials.',
  config: 'The server is missing its Linear OAuth credentials.',
}

export function Landing({ error, configured }: { error?: string; configured: boolean }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center p-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <Logo size={40} />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Linear Graph</h1>
      <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted">
        Explore a team&apos;s issues as a force-directed graph: parents, sub-issues, blockers and relations, colored by
        what matters.
      </p>
      {configured ? (
        <a href="/api/auth/login" className="button mt-8">
          Connect Linear
        </a>
      ) : (
        <div className="mt-8 max-w-sm rounded-lg border border-line bg-panel p-4 text-sm leading-relaxed">
          <p className="font-medium">Not configured yet</p>
          <p className="mt-1 text-muted">
            Add <code className="font-mono text-xs">LINEAR_CLIENT_ID</code> and{' '}
            <code className="font-mono text-xs">LINEAR_CLIENT_SECRET</code> from your Linear OAuth application to{' '}
            <code className="font-mono text-xs">.env.local</code>, then restart the dev server.
          </p>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-500">{MESSAGES[error] ?? 'Something went wrong.'}</p>}
      <p className="mt-10 max-w-xs text-center text-xs leading-relaxed text-muted">
        Read-only access. Your token is stored encrypted in a cookie in this browser and nowhere else.
      </p>
    </main>
  )
}
