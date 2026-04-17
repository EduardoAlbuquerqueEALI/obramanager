'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <h2 style={{ color: '#dc2626' }}>Algo deu errado</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          {error.message || 'Erro interno do servidor'}
        </p>
        {error.digest && (
          <p style={{ color: '#999', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#222',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
