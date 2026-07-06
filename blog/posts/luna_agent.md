---
title: I Built My Own AI Agent (And Open-Sourced It)
date: 2026-03-04
description: Why I rejected every agent framework and built Luna — a ~2,300-line Python AI agent with SQLite hybrid-search memory, MCP tools, and Discord, fully local.
tags: ai, agents, open-source, python, homelab
---

This started because I wanted a Discord bot that could remember things.

Not a chatbot — I have plenty of those. I wanted an agent that could hold a conversation across days, search the web, run shell commands, and actually *learn* who I am over time. The kind of thing where you message it on Tuesday about a project and on Friday it remembers the context without you re-explaining everything.

So I went looking for a framework. That's where the trouble started.

## The Framework Problem

There are approximately ten thousand AI agent frameworks right now, and every week someone on Hacker News launches a new one. They all promise the same thing: "Build powerful AI agents in minutes!" I evaluated three seriously.

| Framework | Size | Problem |
|-----------|------|---------|
| OpenClaw | ~400,000 lines | 42,000 exposed instances on Shodan. Impossible to audit. |
| ZeroClaw | ~2,000 lines | 9 days old. No community, uncertain future. |
| NanoClaw | ~500 lines | Too thin. Missing memory, MCP, observability. Would rebuild most of it anyway. |

The core needs — LLM chat, persistent memory, tool calling, Discord interface, structured logging — are individually simple and well-understood problems. No 400K-line framework needed. The risk of building from scratch was spending a few days writing Python. The risk of a framework was inheriting its complexity, its security surface, and its opinions about how agents should work.

Easy tradeoff.

## What Luna Actually Does

Luna is a custom AI agent that runs entirely on local hardware — two RTX 3090s (48GB total VRAM) running Qwen3-Coder-Next via llama-server, with no cloud APIs and no ongoing costs. The architecture is deliberately boring:

```
Discord (discord.py)
     |
     v
+-----------------------+
|    Luna Agent Core    |
|                       |
|  agent.py             |  agent loop: msg -> memory -> prompt -> LLM -> tools -> respond
|    +-- llm.py         |  single LLM client, configurable endpoint
|    +-- memory.py      |  SQLite + FTS5 + sqlite-vec hybrid search
|    +-- tools.py       |  native tools: bash, files, web fetch, web search
|    +-- tool_output.py |  smart output pipeline for large results
|    +-- mcp_manager.py |  MCP client for community tool servers
|    +-- observe.py     |  structured JSON logging
|                       |
+-----------------------+
         |
         v
   llama-server          any OpenAI-compatible endpoint
```

One process, one database file, one config file, eight runtime dependencies. The whole thing is ~2300 lines of Python including tests. Every line is auditable because there aren't that many lines to audit.

## The Design Choices That Matter

Building from scratch means you own every decision, which is both the privilege and the burden. Here are the ones that shaped Luna the most:

**SQLite for everything.** Messages, memories, full-text search, and vector search all live in a single file. FTS5 is built into SQLite, and sqlite-vec adds vector search without needing a separate vector database. The entire memory system backs up with `cp`. I spent exactly zero hours configuring Postgres, managing Redis, or debugging connection pools. For a single-user agent running on a homelab, this is exactly the right level of infrastructure.

**Hybrid search with Reciprocal Rank Fusion.** Memory retrieval combines FTS5 keyword search with sqlite-vec semantic search. Keyword search catches the exact matches that embeddings miss — things like "error code E1234." Vector search catches the semantic matches that keywords miss — *"the bug where the server crashes"* finds a memory about a segfault even though neither word appears. RRF fuses the two result sets with one line of math per result, no trained model needed.

**One LLM endpoint, firewall-ready.** All traffic flows through a single `LLMClient` pointing at one configurable URL. Today that's `localhost:8001`. When I'm ready to add an AI firewall — an input/output filtering proxy — I change the URL to `localhost:9000` and put the proxy in front of the real LLM. Zero code changes required. I didn't build the firewall, but I didn't block the insertion point either.

**Conversation compression.** Every 50 messages, the LLM summarizes the conversation and extracts facts with importance scores. Important facts go into long-term memory, and the summary keeps the conversation coherent across sessions. This gives effectively infinite conversation length — the agent always has context, even if the verbatim messages were summarized away days ago.

## What I Didn't Build (On Purpose)

Honestly, this is the list I'm most proud of:

- No AI firewall *(future — just don't block the insertion point)*
- No web dashboard *(the structured logs are ready for one when I want it)*
- No multi-user auth *(single user)*
- No cloud LLM fallback *(local only)*
- No Docker *(systemd is simpler for a single-user Python process)*
- No abstractions for hypothetical future requirements

Every feature I *didn't* build is a feature I don't have to maintain, secure, or debug at 2am. Sophisticated is the enemy of simple, complex is the enemy of valuable. The right amount of complexity is the minimum needed for the current problem.

## How Memory Actually Works

This is the part I'm most technically proud of, because it's the thing that makes Luna feel like more than a stateless chatbot. The memory system has three layers that work together:

**Message history** is the raw conversation, stored per session. This is what gives the agent short-term context — the last 20 messages in the current thread.

**Extracted memories** are facts the LLM identifies as worth remembering, each with an importance score from 1 to 10. A score of 10 (*"user's name is Fabio"*) always surfaces when relevant. A score of 2 (*"the weather was nice"*) fades quickly. These persist across sessions — the agent builds a growing understanding of the world over time.

**Session summaries** are LLM-generated compressions of old message blocks. When the conversation gets long, older messages get summarized so the agent retains the gist without eating the entire context window.

When the agent needs to recall something, search combines all three signals:

```
final_score = rrf_score + (recency_weight * 2^(-age_days / 7)) + (importance / 10 * 0.1)
```

The recency decay has a 7-day half-life — a week-old memory scores half as much as a fresh one. All of these parameters live in `config.toml`, so you can experiment with the tradeoffs without touching code.

For embeddings, I went with nomic-embed-text-v1.5: 22M parameters, loads in seconds, runs entirely on CPU without touching GPU memory. It supports Matryoshka representations, which means I can use 384 dimensions now and scale to 768 later without re-embedding everything.

## Tools: Native and MCP

Luna ships with six built-in tools — bash (with safety guardrails), file read/write, directory listing, web fetch, and web search. The bash tool checks commands against blocked patterns before execution, enforces a 30-second timeout, and caps output at 50KB. No `rm -rf /`, no `mkfs`, no fork bombs.

For everything beyond the builtins, there's MCP. The Model Context Protocol lets you connect community tool servers by editing a JSON config:

```json
{
  "servers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "transport": "stdio"
    }
  }
}
```

Need browser automation? Add the Playwright MCP server. Need filesystem tools? Add that server. Each one runs as a separate process with natural isolation, and tool names get namespaced automatically (`browser__navigate`, `filesystem__read_file`) so nothing collides. Adding a new capability to the agent is editing JSON, not writing code.

## The Numbers

- **~2300 lines** of Python (agent + tests)
- **106 tests**, all passing — no GPU or running LLM required to run them
- **8 runtime dependencies** — discord.py, openai, mcp, sentence-transformers, einops, sqlite-vec, html2text, duckduckgo-search
- **~187 tokens/sec** prompt processing, **~81 tokens/sec** generation on 2x RTX 3090

## Why Open Source It

I built Luna for my homelab, and it works well for what I need. But the decisions behind it — custom build over framework, SQLite over Postgres, local LLM over cloud API, deliberate simplicity over feature checklists — those aren't unique to my setup. Anyone with a GPU and a desire to actually *understand* their AI agent stack could use this as a starting point, or at least steal the ideas they like.

The code is MIT licensed. The [DESIGN.md](https://github.com/nonatofabio/luna-agent/blob/main/DESIGN.md) explains the reasoning behind every major architectural decision. The tests mock the LLM client so you can run them on a laptop. The config is a single TOML file with sensible defaults.

If you're tired of agent frameworks that are bigger than the applications they power, maybe start with something you can actually read.

**[GitHub: nonatofabio/luna-agent](https://github.com/nonatofabio/luna-agent)**

---

*The repo has a few [good first issues](https://github.com/nonatofabio/luna-agent/issues?q=is%3Aopen+label%3A%22good+first+issue%22) if you want to contribute. And if you build something interesting with it, I'd genuinely love to hear about it.*

*Thanks for reading.*

*Keep it Awesome!*
