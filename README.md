# Codea

Codea is Alia's coding assistant, in two surfaces:

| Package | Name | What it is |
| --- | --- | --- |
| [`packages/vscode`](packages/vscode/) | `alia-codea` (`oxy.alia-codea`) | VS Code extension — chat, inline completions, agentic tools |
| [`packages/cli`](packages/cli/) | `@alia-codea/cli` | Terminal assistant |

Both talk to [Alia](https://github.com/OxyHQ/Alia)'s product API through
[`@alia.onl/server`](https://www.npmjs.com/package/@alia.onl/server) and sign in with Oxy.

## Development

```bash
bun install
bun run dev:vscode   # esbuild watch for the extension
bun run dev:cli
bun run test
bun run lint
```

## License

MIT — see [LICENSE](LICENSE).
