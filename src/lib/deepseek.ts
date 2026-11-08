export const DEFAULT_PROXY = 'https://red-dust-d309.questi0ns-x.workers.dev/'

export interface Options {
  think: boolean
  refs: boolean
}

interface Reference {
  url?: string
  link?: string
  title?: string
}
interface Fragment {
  type?: string
  content?: string
  references?: Reference[]
}
interface Message {
  role?: string
  fragments?: Fragment[]
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

export function toMarkdown(json: unknown, opts: Options): { title: string; md: string } {
  const j = json as { data?: { biz_data?: Root } & Root; biz_data?: Root } & Root
  const root: Root = j?.data?.biz_data ?? j?.biz_data ?? j?.data ?? j
  const msgs = root?.messages
  if (!Array.isArray(msgs)) throw new Error("Formato inesperado: no hay 'messages'")
  const title =
    root.title && root.title !== 'Shared Conversation' ? root.title : 'Conversación DeepSeek'
  const out: string[] = ['# ' + title, '']
  for (const m of msgs) {
    const isUser = String(m.role).toUpperCase() === 'USER'
    out.push('## ' + (isUser ? 'Usuario' : 'DeepSeek'), '')
    for (const f of m.fragments ?? []) {
      const t = String(f.type ?? '').toUpperCase()
      const c = String(f.content ?? '').replace(/\s+$/, '')
      if (t === 'THINK' || t === 'THINKING') {
        if (opts.think && c)
          out.push('<details><summary>Razonamiento</summary>', '', c, '', '</details>', '')
      } else if (c) {
        out.push(c, '')
      }
      if (opts.refs && Array.isArray(f.references) && f.references.length) {
        out.push('**Fuentes:**', '')
        for (const r of f.references) {
          const u = r.url || r.link || ''
          if (u) out.push('- [' + String(r.title || u).replace(/\n/g, ' ') + '](' + u + ')')
        }
        out.push('')
      }
    }
  }
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
