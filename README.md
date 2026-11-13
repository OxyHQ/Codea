# Codea

Codea is Alia's coding assistant, in two surfaces:

| Package | Name | What it is |
| --- | --- | --- |
| [`packages/vscode`](packages/vscode/) | `alia-codea` (`oxy.alia-codea`) | VS Code extension — chat, inline completions, agentic tools |
| [`packages/cli`](packages/cli/) | `@alia-codea/cli` | Terminal assistant |

Both talk to Alia through the [Gemies](https://github.com/OxyHQ/Gemies) API, via
[`@gemies/server`](https://www.npmjs.com/package/@gemies/server) and sign in with Oxy.

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
