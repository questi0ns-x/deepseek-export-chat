export const DEFAULT_PROXY = 'https://red-dust-d309.questi0ns-x.workers.dev/'

export interface Options {
  think: boolean
  refs: boolean
  preamble: boolean
}

type Obj = Record<string, unknown>
interface Message {
  role?: string
  message_id?: number
  files?: Obj[]
  fragments?: Obj[]
}
interface Root {
  title?: string
  messages?: Message[]
}

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

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const first = (o: Obj, keys: string[]) => {
  for (const k of keys) if (o[k] != null && o[k] !== '') return o[k]
  return undefined
}

function fmtSize(n: unknown): string {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return ''
  return v < 1024 ? v + ' B' : v < 1048576 ? (v / 1024).toFixed(1) + ' KB' : (v / 1048576).toFixed(1) + ' MB'
}

function fileBlock(f: Obj): string[] {
  const name = str(first(f, ['file_name', 'name', 'filename', 'title'])) || 'archivo'
  const size = fmtSize(first(f, ['file_size', 'size']))
  const content = str(first(f, ['content', 'text', 'parsed_content', 'preview']))
  const attrs = `nombre="${name.replace(/"/g, "'")}"` + (size ? ` tamaño="${size}"` : '')
  if (content)
    return [`<archivo_adjunto ${attrs}>`, content.replace(/\s+$/, ''), '</archivo_adjunto>', '']
  return [
    `<archivo_adjunto ${attrs}>`,
    '[El contenido del archivo NO está en el enlace compartido. Vuelve a adjuntarlo en la nueva sesión.]',
    '</archivo_adjunto>',
    '',
  ]
}

function refList(refs: unknown): string[] {
  if (!Array.isArray(refs) || !refs.length) return []
  const out = ['<fuentes>']
  for (const r of refs as Obj[]) {
    const u = str(first(r, ['url', 'link']))
    const t = str(first(r, ['title', 'site_name'])) || u
    if (u) out.push('- [' + t.replace(/\n/g, ' ') + '](' + u + ')')
  }
  out.push('</fuentes>', '')
  return out.length > 3 ? out : []
}

function searchBlock(f: Obj, withRefs: boolean): string[] {
  if (!withRefs) return []
  const results = (f.results ?? f.search_results ?? f.references) as unknown
  const q = str(first(f, ['query', 'queries']))
  const list = refList(results)
  if (!list.length && !q) return []
  return [q ? `<busqueda consulta="${q.replace(/"/g, "'")}">` : '<busqueda>', ...list, '</busqueda>', '']
}

export function toMarkdown(json: unknown, opts: Options): { title: string; md: string } {
  const j = json as { data?: { biz_data?: Root } & Root; biz_data?: Root } & Root
  const root: Root = j?.data?.biz_data ?? j?.biz_data ?? j?.data ?? j
  const msgs = root?.messages
  if (!Array.isArray(msgs)) throw new Error("Formato inesperado: no hay 'messages'")
  const title =
    root.title && root.title !== 'Shared Conversation' ? root.title : 'Conversación DeepSeek'
  const out: string[] = ['# ' + title, '']

  if (opts.preamble) {
    const nFiles = msgs.reduce((n, m) => n + (m.files?.length ?? 0), 0)
    out.push(
      '> **Contexto para la IA:** a continuación está la transcripción de una sesión anterior de esta conversación, que llegó a su límite.',
      '> Cada turno está marcado como `<usuario>` (lo que escribió la persona) o `<ia>` (lo que respondió el asistente).',
      '> Lee todo como memoria de lo ya hecho y decidido. No repitas lo ya resuelto. Continúa desde el último mensaje cuando la persona te escriba.',
      nFiles ? `> Hubo ${nFiles} archivo(s) adjunto(s); revisa las etiquetas \`<archivo_adjunto>\`.` : '',
      '',
      `Total de mensajes: ${msgs.length}`,
      '',
      '---',
      '',
    )
  }

  msgs.forEach((m, i) => {
    const isUser = String(m.role).toUpperCase() === 'USER'
    const tag = isUser ? 'usuario' : 'ia'
    const n = i + 1
    out.push(
      isUser ? `## 👤 USUARIO · mensaje ${n}` : `## 🤖 IA (DeepSeek) · mensaje ${n}`,
      '',
      `<${tag} n="${n}">`,
      '',
    )

    for (const f of m.files ?? []) out.push(...fileBlock(f))

    for (const f of m.fragments ?? []) {
      const t = str(f.type).toUpperCase()
      const c = str(f.content).replace(/\s+$/, '')
      if (t === 'REQUEST' || t === 'RESPONSE' || t === 'TEXT' || t === '') {
        if (c) out.push(c, '')
        out.push(...(opts.refs ? refList(f.references) : []))
      } else if (t === 'THINK' || t === 'THINKING') {
        if (opts.think && c) out.push('<razonamiento>', c, '</razonamiento>', '')
      } else if (t.includes('FILE')) {
        out.push(...fileBlock(f))
      } else if (t.includes('SEARCH') || t.includes('READ_LINK')) {
        out.push(...searchBlock(f, opts.refs))
        if (opts.refs && c) out.push(c, '')
      } else if (c) {
        out.push(`<fragmento tipo="${t.toLowerCase()}">`, c, '</fragmento>', '')
      }
    }

    out.push(`</${tag}>`, '', '---', '')
  })

  out.push('**Fin de la transcripción.**')
  return { title, md: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n' }
}

export function downloadMd(title: string, md: string) {
  const name = title.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'chat'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }))
  a.download = name + '.md'
  a.click()
  URL.revokeObjectURL(a.href)
}
