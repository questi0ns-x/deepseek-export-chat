import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { MagicCard } from '@/components/ui/magic-card'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { TextAnimate } from '@/components/ui/text-animate'
import { cn } from '@/lib/utils'
import {
  DEFAULT_PROXY,
  downloadMd,
  fetchShare,
  parseId,
  toMarkdown,
  type Options,
} from '@/lib/deepseek'

function load(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage blocked */
  }
}

const field =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-400/60'

export default function App() {
  const [url, setUrl] = useState('')
  const [proxy, setProxy] = useState(load('proxy', DEFAULT_PROXY))
  const [opts, setOpts] = useState<Options>({
    think: load('think', '1') === '1',
    refs: load('refs', '1') === '1',
  })
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>({ text: '' })
  const [result, setResult] = useState<{ title: string; md: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showOpts, setShowOpts] = useState(false)

  function render(json: unknown) {
    const r = toMarkdown(json, opts)
    setResult(r)
    setMsg({ text: `Listo: ${r.md.length} caracteres.` })
  }

  async function go() {
    const id = parseId(url)
    if (!id) return setMsg({ text: 'Link no válido.', err: true })
    save('proxy', proxy.trim())
    save('think', opts.think ? '1' : '0')
    save('refs', opts.refs ? '1' : '0')
    setLoading(true)
    setMsg({ text: 'Cargando…' })
    try {
      render(await fetchShare(id, proxy))
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      const cors = !proxy.trim() || /Failed to fetch|NetworkError/i.test(m)
      setMsg({
        text: 'Error: ' + m + (cors ? ' (CORS: configura el proxy en Opciones o usa el plan B)' : ''),
        err: true,
      })
      setShowOpts(true)
    } finally {
      setLoading(false)
    }
  }

  function convertRaw() {
    try {
      render(JSON.parse(raw))
    } catch (e) {
      setMsg({ text: 'JSON inválido: ' + (e instanceof Error ? e.message : e), err: true })
    }
  }

  async function copy() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.md)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setMsg({ text: 'No se pudo copiar.', err: true })
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <DotPattern className="fill-zinc-700/40 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]" />
      <main className="relative mx-auto max-w-3xl px-4 py-16">
        <BlurFade delay={0.05}>
          <TextAnimate
            by="word"
            animation="blurInUp"
            as="h1"
            className="text-center text-4xl font-bold tracking-tight sm:text-5xl"
          >
            DeepSeek Chat a Markdown
          </TextAnimate>
          <p className="mt-3 text-center text-zinc-400">
            Pega un link público de DeepSeek y descarga la conversación como .md
          </p>
        </BlurFade>

        <BlurFade delay={0.2}>
          <MagicCard className="mt-10 rounded-xl" gradientColor="#262626">
            <div className="relative space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className={field}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && go()}
                  placeholder="https://chat.deepseek.com/share/xxxxxxxx"
                  autoComplete="off"
                />
                <ShimmerButton
                  onClick={go}
                  disabled={loading}
                  background="rgba(79,70,229,1)"
                  className="shrink-0 disabled:opacity-60"
                >
                  <span className="text-sm font-medium">{loading ? 'Cargando…' : 'Cargar'}</span>
                </ShimmerButton>
              </div>

              <p
                role="status"
                className={cn('min-h-5 text-sm', msg.err ? 'text-red-400' : 'text-zinc-400')}
              >
                {msg.text}
              </p>

              <button
                type="button"
                onClick={() => setShowOpts((s) => !s)}
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                {showOpts ? '▾' : '▸'} Opciones y plan B
              </button>

              {showOpts && (
                <div className="space-y-4 rounded-lg border border-white/10 p-4">
                  <label className="block text-sm text-zinc-400">
                    URL del proxy (Cloudflare Worker)
                    <input
                      className={cn(field, 'mt-1')}
                      value={proxy}
                      onChange={(e) => setProxy(e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={opts.think}
                      onChange={(e) => setOpts({ ...opts, think: e.target.checked })}
                    />
                    Incluir razonamiento
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={opts.refs}
                      onChange={(e) => setOpts({ ...opts, refs: e.target.checked })}
                    />
                    Incluir fuentes de búsqueda
                  </label>
                  <div>
                    <p className="mb-1 text-sm text-zinc-400">
                      Plan B: pega aquí el JSON de /api/v0/share/content?share_id=ID
                    </p>
                    <textarea
                      className={cn(field, 'min-h-28 font-mono text-xs')}
                      value={raw}
                      onChange={(e) => setRaw(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={convertRaw}
                      className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
                    >
                      Convertir JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </MagicCard>
        </BlurFade>

        {result && (
          <BlurFade delay={0.05} inView>
            <div className="relative mt-8 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 p-5">
              <BorderBeam size={160} duration={8} />
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="truncate font-medium">{result.title}</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <ShimmerButton
                    onClick={() => downloadMd(result.title, result.md)}
                    background="rgba(79,70,229,1)"
                    className="px-4 py-1.5"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Download size={14} /> Descargar .md
                    </span>
                  </ShimmerButton>
                </div>
              </div>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-4 font-mono text-xs leading-relaxed text-zinc-300">
                {result.md}
              </pre>
            </div>
          </BlurFade>
        )}
      </main>
    </div>
  )
}
