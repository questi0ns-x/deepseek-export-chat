# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React + Vite + Tailwind v4 + Magic UI components (shadcn registry). Static, hosted on GitHub Pages (`docs/`). Cloudflare Worker proxy for CORS.

## Users
Heavy DeepSeek users who hit the per-chat length limit and must continue in a fresh session. Job: carry the whole conversation (and attachments) into a new session without losing context.

## Product Purpose
Turn a public `chat.deepseek.com/share/...` link into a portable transcript (md, txt, json) that can be pasted into a new session. Success: the new session continues as if nothing was lost.

## Positioning
Link in, continuation-ready file out. The output is designed as model context (clear user/AI roles, attachments, preamble), not a pretty archive.

## Capabilities and Constraints
Parsing is client-side; fetch goes through a Cloudflare Worker proxy. Share links may not include attachment contents. Output formats: Markdown, plain text, JSON. Spanish UI.

## Product Principles
- The file is for a model first, a human second.
- Roles (user vs AI) must be unmistakable in every format.
- Be honest about what the share did not include (attachment contents).

## Brand Commitments
User explicitly wants a modern look with plenty of Magic UI effects, not a generic template.
