'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="text-xl font-semibold text-destructive mb-2">Erro</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {error.message || 'Ocorreu um erro ao carregar esta página.'}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60 mt-1">
          Digest: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
