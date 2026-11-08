import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Brain, Globe, Paperclip, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Chat, Options, Turn } from '@/lib/deepseek'

function Bubble({ t, o }: { t: Turn; o: Options }) {
  const user = t.role === 'user'
  return (
    <article className={cn('flex min-w-0 gap-3', user && 'flex-row-reverse')} aria-label={user ? 'Usuario' : 'IA'}>
      <div
        className={cn(
          'mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border',
          user ? 'border-amber/40 bg-amber/10 text-amber' : 'border-ds/40 bg-ds/10 text-ds-soft',
        )}
      >
        {user ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={cn('flex min-w-0 flex-1 flex-col', user && 'items-end')}>
        <div className="mb-1 flex items-center gap-2 text-xs text-fog">
          <span className={cn('font-semibold', user ? 'text-amber-soft' : 'text-ds-soft')}>
            {user ? 'Tú' : 'DeepSeek'}
          </span>
          <span className="tnum">#{t.n}</span>
        </div>
        <div
          className={cn(
            'min-w-0 max-w-[94%] rounded-2xl border px-4 py-3 text-[0.95rem] leading-relaxed',
            user
              ? 'rounded-tr-sm border-amber/25 bg-amber/[0.07]'
              : 'rounded-tl-sm border-line bg-raise',
          )}
        >
          {t.files.map((f, i) => (
            <div key={i} className="mb-2 rounded-lg border border-line bg-ink/60 p-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Paperclip size={14} className="text-amber" />
                <span className="truncate font-medium">{f.name}</span>
                {f.size && <span className="text-xs text-fog tnum">{f.size}</span>}
              </div>
              {!f.content && (
                <p className="mt-1 text-xs text-fog">Contenido no incluido en el enlace compartido.</p>
              )}
            </div>
          ))}

          {o.think && t.thinking && (
            <details className="mb-2 rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-fog">
              <summary className="flex cursor-pointer items-center gap-2 select-none">
                <Brain size={14} /> Razonamiento
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{t.thinking}</p>
            </details>
          )}

          {user ? (
            <p className="whitespace-pre-wrap break-words">{t.text}</p>
          ) : (
            <div className="md break-words">
              <Markdown remarkPlugins={[remarkGfm]}>{t.text}</Markdown>
            </div>
          )}

          {o.refs && t.sources.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs">
              {t.sources.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Globe size={12} className="shrink-0 text-fog" />
                  <a href={s.url} target="_blank" rel="noreferrer" className="truncate text-ds-soft underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  )
}

export function ChatView({ chat, o }: { chat: Chat; o: Options }) {
  return (
    <div className="space-y-6">
      {chat.turns.map((t) => (
        <Bubble key={t.n} t={t} o={o} />
      ))}
    </div>
  )
}
