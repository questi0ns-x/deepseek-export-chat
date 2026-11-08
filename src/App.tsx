import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Download, MessagesSquare, Waypoints } from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { BorderBeam } from '@/components/ui/border-beam'
import { DotPattern } from '@/components/ui/dot-pattern'
import { MagicCard } from '@/components/ui/magic-card'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ChatView } from '@/components/ChatView'
import { RelayBeam } from '@/components/RelayBeam'
import { cn } from '@/lib/utils'
import {
  DEFAULT_PROXY,
  FORMATS,
  downloadFile,
  fetchShare,
  parseChat,
  parseId,
  render,
  type Chat,
  type Format,
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
  'w-full rounded-xl border border-line bg-ink/70 px-4 py-3 text-[0.95rem] text-paper placeholder:text-fog/70 outline-none transition-colors focus:border-ds'

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg px-1 py-2 text-left hover:bg-white/[0.03]"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-fog">{hint}</span>
      </span>
      <span className={cn('relative h-6 w-10 shrink-0 rounded-full border transition-colors', checked ? 'border-ds bg-ds' : 'border-line bg-ink')}>
        <span className={cn('absolute top-0.5 size-4.5 rounded-full bg-white transition-all', checked ? 'left-[1.15rem]' : 'left-0.5')} />
      </span>
    </button>
  )
}

function initialFormat(): Format {
  const f = load('fmt', 'md')
  return f in FORMATS ? (f as Format) : 'md'
}

export default function App() {
  const [url, setUrl] = useState('')
  const [proxy, setProxy] = useState(load('proxy', DEFAULT_PROXY))
  const [opts, setOpts] = useState<Options>({
    think: load('think2', '0') === '1',
    refs: load('refs2', '1') === '1',
    preamble: load('pre2', '1') === '1',
  })
  const [format, setFormat] = useState<Format>(initialFormat)
  const [raw, setRaw] = useState('')
  const [chat, setChat] = useState<Chat | null>(null)
  const [tab, setTab] = useState<'chat' | 'file'>('chat')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; err?: boolean }>({ text: '' })
  const [copied, setCopied] = useState(false)
  const [adv, setAdv] = useState(false)

  const viewer = useRef<HTMLElement>(null)
  useEffect(() => {
    if (chat && window.innerWidth < 1024) viewer.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [chat])

  const output = useMemo(() => (chat ? render(chat, format, opts) : ''), [chat, format, opts])
  const tokens = Math.round(output.length / 4)

  function setOpt<K extends keyof Options>(k: K, v: Options[K]) {
    const next = { ...opts, [k]: v }
    setOpts(next)
    save('think2', next.think ? '1' : '0')
    save('refs2', next.refs ? '1' : '0')
    save('pre2', next.preamble ? '1' : '0')
  }

  async function go() {
    const id = parseId(url)
    if (!id) return setMsg({ text: 'Ese link no parece de chat.deepseek.com/share/…', err: true })
    save('proxy', proxy.trim())
    setLoading(true)
    setMsg({ text: '' })
    try {
      setChat(parseChat(await fetchShare(id, proxy)))
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      const cors = !proxy.trim() || /Failed to fetch|NetworkError/i.test(m)
      setMsg({ text: m + (cors ? '. El navegador bloquea la llamada directa: revisa el proxy en Avanzado o usa el plan B.' : ''), err: true })
      setAdv(true)
    } finally {
      setLoading(false)
    }
  }

  function convertRaw() {
    try {
      setChat(parseChat(JSON.parse(raw)))
      setMsg({ text: '' })
    } catch (e) {
      setMsg({ text: 'JSON inválido: ' + (e instanceof Error ? e.message : e), err: true })
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setMsg({ text: 'No se pudo copiar al portapapeles.', err: true })
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <DotPattern className="fill-line/70 [mask-image:radial-gradient(900px_circle_at_20%_10%,white,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-ds/20 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10 lg:py-12">
        {/* LEFT: controls */}
        <section className="lg:sticky lg:top-8 lg:self-start">
          <BlurFade>
            <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Waypoints size={18} className="text-ds-soft" /> retomar
              <span className="font-normal text-fog">· DeepSeek share a archivo</span>
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Tu chat se llenó. <span className="text-amber">Retómalo</span> en una sesión nueva.
            </h1>
            <p className="mt-4 max-w-md text-pretty text-fog">
              Pega el link público del chat y descarga una transcripción lista para pegar como contexto, con quién dijo qué y los adjuntos marcados.
            </p>
          </BlurFade>

          <BlurFade delay={0.15} className="my-8">
            <RelayBeam />
          </BlurFade>

          <BlurFade delay={0.25}>
            <MagicCard className="rounded-2xl" gradientColor="#1b2033" gradientFrom="#4d6bfe" gradientTo="#ffb547">
              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Link del chat compartido</span>
                  <input
                    className={field}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && go()}
                    placeholder="https://chat.deepseek.com/share/…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>

                <ShimmerButton
                  onClick={go}
                  disabled={loading}
                  background="#4d6bfe"
                  shimmerColor="#dbe3ff"
                  borderRadius="12px"
                  className="w-full py-3 text-[0.95rem] font-semibold disabled:opacity-60"
                >
                  {loading ? 'Cargando chat…' : 'Cargar chat'}
                </ShimmerButton>

                {msg.text && (
                  <p role="alert" className={cn('text-sm', msg.err ? 'text-red-300' : 'text-fog')}>
                    {msg.text}
                  </p>
                )}

                <div className="divide-y divide-line/70 border-t border-line pt-1">
                  <Switch checked={opts.preamble} onChange={(v) => setOpt('preamble', v)} label="Prefacio de contexto" hint="Explica a la nueva sesión cómo leer el archivo" />
                  <Switch checked={opts.refs} onChange={(v) => setOpt('refs', v)} label="Fuentes de búsqueda" hint="Enlaces que usó la IA" />
                  <Switch checked={opts.think} onChange={(v) => setOpt('think', v)} label="Razonamiento" hint="Gasta mucho contexto; suele sobrar" />
                </div>

                <button
                  type="button"
                  onClick={() => setAdv((s) => !s)}
                  aria-expanded={adv}
                  className="flex items-center gap-1.5 text-sm text-fog hover:text-paper"
                >
                  <ChevronDown size={14} className={cn('transition-transform', adv && 'rotate-180')} /> Avanzado y plan B
                </button>
                {adv && (
                  <div className="space-y-4 rounded-xl border border-line bg-ink/50 p-4">
                    <label className="block text-sm text-fog">
                      URL del proxy (Cloudflare Worker)
                      <input className={cn(field, 'mt-1.5 text-sm')} value={proxy} onChange={(e) => setProxy(e.target.value)} />
                    </label>
                    <div>
                      <p className="mb-1.5 text-sm text-fog">
                        Plan B: abre <span className="font-mono text-xs">/api/v0/share/content?share_id=ID</span> en DeepSeek y pega el JSON.
                      </p>
                      <textarea className={cn(field, 'min-h-24 font-mono text-xs')} value={raw} onChange={(e) => setRaw(e.target.value)} />
                      <button type="button" onClick={convertRaw} className="mt-2 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-white/5">
                        Convertir JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </MagicCard>
          </BlurFade>
        </section>

        {/* RIGHT: viewer */}
        <section ref={viewer} className="min-w-0 scroll-mt-4">
          <BlurFade delay={0.35}>
            <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/90 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]">
              {chat && <BorderBeam size={220} duration={9} colorFrom="#4d6bfe" colorTo="#ffb547" />}

              <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                <div className="flex rounded-lg border border-line bg-ink/70 p-0.5" role="tablist" aria-label="Vista">
                  {(['chat', 'file'] as const).map((k) => (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={tab === k}
                      onClick={() => setTab(k)}
                      className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', tab === k ? 'bg-raise text-paper' : 'text-fog hover:text-paper')}
                    >
                      {k === 'chat' ? 'Chat' : 'Archivo'}
                    </button>
                  ))}
                </div>

                {chat && (
                  <p className="tnum text-sm text-fog">
                    <span className="text-paper">{chat.turns.length}</span> mensajes · ~<span className="text-paper">{tokens.toLocaleString('es')}</span> tokens
                  </p>
                )}

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg border border-line bg-ink/70 p-0.5" role="radiogroup" aria-label="Formato">
                    {(Object.keys(FORMATS) as Format[]).map((f) => (
                      <button
                        key={f}
                        role="radio"
                        aria-checked={format === f}
                        onClick={() => {
                          setFormat(f)
                          save('fmt', f)
                          if (chat) setTab('file')
                        }}
                        className={cn('rounded-md px-2.5 py-1.5 font-mono text-xs uppercase transition-colors', format === f ? 'bg-ds text-white' : 'text-fog hover:text-paper')}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={copy}
                    disabled={!chat}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-40"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                  <ShimmerButton
                    disabled={!chat}
                    onClick={() => chat && downloadFile(chat.title, output, format)}
                    background="#4d6bfe"
                    shimmerColor="#dbe3ff"
                    borderRadius="10px"
                    className="px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    <Download size={14} className="mr-1.5" /> Descargar .{format}
                  </ShimmerButton>
                </div>
              </header>

              <div className="h-[min(72vh,52rem)] min-h-[26rem] overflow-y-auto px-4 py-6 sm:px-6">
                {!chat ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <MessagesSquare size={36} className="text-fog/60" />
                    <p className="max-w-xs text-pretty text-fog">
                      El chat aparecerá aquí, con tus mensajes y los de la IA separados. Pega un link y pulsa Cargar chat.
                    </p>
                  </div>
                ) : tab === 'chat' ? (
                  <ChatView chat={chat} o={opts} />
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-[0.8rem] leading-relaxed text-paper/90">{output}</pre>
                )}
              </div>
            </div>
          </BlurFade>
        </section>
      </div>
    </div>
  )
}
