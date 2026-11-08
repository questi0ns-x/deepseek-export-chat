export const DEFAULT_PROXY = 'https://red-dust-d309.questi0ns-x.workers.dev/'

export interface Options {
  think: boolean
  refs: boolean
  preamble: boolean
}

export type Format = 'md' | 'txt' | 'json'

export interface Source {
  title: string
  url: string
}
export interface Attachment {
  name: string
  size: string
  content: string
}
export interface Turn {
  n: number
  role: 'user' | 'ai'
  text: string
  thinking: string
  files: Attachment[]
  sources: Source[]
  extras: { type: string; text: string }[]
}
export interface Chat {
  title: string
  turns: Turn[]
}

type Obj = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const first = (o: Obj, keys: string[]) => {
  for (const k of keys) if (o[k] != null && o[k] !== '') return o[k]
  return undefined
}
const trimEnd = (s: string) => s.replace(/\s+$/, '')

export function parseId(input: string): string | null {
  const t = input.trim()
  const m = t.match(/share\/([A-Za-z0-9_-]+)/) ?? t.match(/^([A-Za-z0-9_-]{6,64})$/)
  return m ? m[1] : null
}

export async function fetchShare(id: string, proxy: string): Promise<unknown> {
  const p = proxy.trim()
  const url = p
    ? p + (p.includes('?') ? '&' : p.endsWith('/') ? '?' : '/?') + 'share_id=' + encodeURIComponent(id)
    : 'https://chat.deepseek.com/api/v0/share/content?share_id=' + encodeURIComponent(id)
  const r = await fetch(url)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const json = (await r.json()) as { data?: { biz_code?: number; biz_msg?: string } }
  if (json.data && json.data.biz_code !== 0) {
    throw new Error(json.data.biz_msg || 'El share no existe o es privado')
  }
  return json
}

function fmtSize(n: unknown): string {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return ''
  return v < 1024 ? v + ' B' : v < 1048576 ? (v / 1024).toFixed(1) + ' KB' : (v / 1048576).toFixed(1) + ' MB'
}

function toAttachment(f: Obj): Attachment {
  return {
    name: str(first(f, ['file_name', 'name', 'filename', 'title'])) || 'archivo',
    size: fmtSize(first(f, ['file_size', 'size'])),
    content: trimEnd(str(first(f, ['content', 'text', 'parsed_content', 'preview']))),
  }
}

function toSources(refs: unknown): Source[] {
  if (!Array.isArray(refs)) return []
  const out: Source[] = []
  for (const r of refs as Obj[]) {
    const url = str(first(r, ['url', 'link']))
    if (url) out.push({ url, title: str(first(r, ['title', 'site_name'])).replace(/\n/g, ' ') || url })
  }
  return out
}

/** Normalise the raw share JSON into a Chat model. */
export function parseChat(json: unknown): Chat {
  type Root = { title?: string; messages?: Obj[] }
  const j = json as { data?: { biz_data?: Root } & Root; biz_data?: Root } & Root
  const root: Root = j?.data?.biz_data ?? j?.biz_data ?? j?.data ?? j
  if (!Array.isArray(root?.messages)) throw new Error("Formato inesperado: no hay 'messages'")
  const title =
    root.title && root.title !== 'Shared Conversation' ? root.title : 'Conversación DeepSeek'

  const turns: Turn[] = root.messages.map((m, i) => {
    const turn: Turn = {
      n: i + 1,
      role: str(m.role).toUpperCase() === 'USER' ? 'user' : 'ai',
      text: '',
      thinking: '',
      files: Array.isArray(m.files) ? (m.files as Obj[]).map(toAttachment) : [],
      sources: [],
      extras: [],
    }
    const texts: string[] = []
    const thinks: string[] = []
    for (const f of (Array.isArray(m.fragments) ? m.fragments : []) as Obj[]) {
      const t = str(f.type).toUpperCase()
      const c = trimEnd(str(f.content))
      if (t === 'REQUEST' || t === 'RESPONSE' || t === 'TEXT' || t === '') {
        if (c) texts.push(c)
        turn.sources.push(...toSources(f.references))
      } else if (t === 'THINK' || t === 'THINKING') {
        if (c) thinks.push(c)
      } else if (t.includes('FILE')) {
        turn.files.push(toAttachment(f))
      } else if (t.includes('SEARCH') || t.includes('READ_LINK')) {
        turn.sources.push(...toSources(f.results ?? f.search_results ?? f.references))
        if (c) turn.extras.push({ type: t.toLowerCase(), text: c })
      } else if (c) {
        turn.extras.push({ type: t.toLowerCase(), text: c })
      }
    }
    turn.text = texts.join('\n\n')
    turn.thinking = thinks.join('\n\n')
    return turn
  })
  return { title, turns }
}

const MISSING =
  '[El contenido del archivo NO está en el enlace compartido. Vuelve a adjuntarlo en la nueva sesión.]'
const q = (s: string) => s.replace(/"/g, "'")

export function toMarkdown(chat: Chat, o: Options): string {
  const out: string[] = ['# ' + chat.title, '']
  if (o.preamble) {
    const nFiles = chat.turns.reduce((n, t) => n + t.files.length, 0)
    out.push(
      '> **Contexto para la IA:** a continuación está la transcripción de una sesión anterior de esta conversación, que llegó a su límite.',
      '> Cada turno está marcado como `<usuario>` (lo que escribió la persona) o `<ia>` (lo que respondió el asistente).',
      '> Lee todo como memoria de lo ya hecho y decidido. No repitas lo ya resuelto. Continúa desde el último mensaje cuando la persona te escriba.',
      ...(nFiles ? [`> Hubo ${nFiles} archivo(s) adjunto(s); revisa las etiquetas \`<archivo_adjunto>\`.`] : []),
      '',
      `Total de mensajes: ${chat.turns.length}`,
      '',
      '---',
      '',
    )
  }
  for (const t of chat.turns) {
    const tag = t.role === 'user' ? 'usuario' : 'ia'
    out.push(
      t.role === 'user' ? `## USUARIO · mensaje ${t.n}` : `## IA (DeepSeek) · mensaje ${t.n}`,
      '',
      `<${tag} n="${t.n}">`,
      '',
    )
    for (const f of t.files) {
      const attrs = `nombre="${q(f.name)}"` + (f.size ? ` tamaño="${f.size}"` : '')
      out.push(`<archivo_adjunto ${attrs}>`, f.content || MISSING, '</archivo_adjunto>', '')
    }
    if (t.text) out.push(t.text, '')
    if (o.think && t.thinking) out.push('<razonamiento>', t.thinking, '</razonamiento>', '')
    if (o.refs && t.sources.length) {
      out.push('<fuentes>', ...t.sources.map((s) => `- [${s.title}](${s.url})`), '</fuentes>', '')
    }
    if (o.refs) for (const e of t.extras) out.push(`<fragmento tipo="${e.type}">`, e.text, '</fragmento>', '')
    out.push(`</${tag}>`, '', '---', '')
  }
  out.push('**Fin de la transcripción.**')
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export function toText(chat: Chat, o: Options): string {
  const out: string[] = [chat.title.toUpperCase(), '']
  if (o.preamble) {
    out.push(
      'CONTEXTO PARA LA IA: transcripción de una sesión anterior que llegó a su límite.',
      'Los turnos van marcados como [USUARIO] (la persona) o [IA] (el asistente).',
      'Léela como memoria de lo ya hecho. No repitas lo resuelto. Continúa desde el último mensaje.',
      '',
      '='.repeat(60),
      '',
    )
  }
  for (const t of chat.turns) {
    out.push(`[${t.role === 'user' ? 'USUARIO' : 'IA'} #${t.n}]`)
    for (const f of t.files) {
      out.push(`(archivo adjunto: ${f.name}${f.size ? ', ' + f.size : ''})`, f.content || MISSING)
    }
    if (t.text) out.push(t.text)
    if (o.think && t.thinking) out.push('(razonamiento)', t.thinking)
    if (o.refs && t.sources.length) out.push('(fuentes)', ...t.sources.map((s) => `- ${s.title}: ${s.url}`))
    out.push('', '-'.repeat(60), '')
  }
  out.push('FIN DE LA TRANSCRIPCIÓN')
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export function toJson(chat: Chat, o: Options): string {
  return (
    JSON.stringify(
      {
        title: chat.title,
        messages: chat.turns.map((t) => ({
          n: t.n,
          role: t.role === 'user' ? 'user' : 'assistant',
          content: t.text,
          ...(t.files.length ? { attachments: t.files } : {}),
          ...(o.think && t.thinking ? { reasoning: t.thinking } : {}),
          ...(o.refs && t.sources.length ? { sources: t.sources } : {}),
        })),
      },
      null,
      2,
    ) + '\n'
  )
}

export const FORMATS: Record<Format, { label: string; ext: string; mime: string }> = {
  md: { label: 'Markdown', ext: 'md', mime: 'text/markdown' },
  txt: { label: 'Texto', ext: 'txt', mime: 'text/plain' },
  json: { label: 'JSON', ext: 'json', mime: 'application/json' },
}

export function render(chat: Chat, f: Format, o: Options): string {
  return f === 'md' ? toMarkdown(chat, o) : f === 'txt' ? toText(chat, o) : toJson(chat, o)
}

export function downloadFile(title: string, content: string, f: Format) {
  const name = title.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'chat'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: FORMATS[f].mime + ';charset=utf-8' }))
  a.download = name + '.' + FORMATS[f].ext
  a.click()
  URL.revokeObjectURL(a.href)
}
