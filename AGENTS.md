# Codea

El asistente de programación de Alia: extensión de VS Code (`packages/vscode`, paquete
`alia-codea`, publicada como `oxy.alia-codea`) y CLI de terminal (`packages/cli`,
`@alia-codea/cli`). Monorepo de bun workspaces; la webview de la extensión es el workspace
`packages/vscode/webview-ui`. Habla con la API de Alia (`/v1/chat/completions`) mediante
`@alia.onl/server` publicado en npm, con inicio de sesión de Oxy.

## Comandos

```bash
bun install
bun run lint          # Biome (CI: `bunx biome ci .`)
bun run typecheck
bun run test          # vitest; nunca `bun test` a pelo
bun run build
bun run package:vscode   # genera el VSIX (no publica)
```

## Reglas

- **No cambies ids de publicación ni versiones por tu cuenta.** Extensión `oxy.alia-codea`
  (nombre `alia-codea`, `private: true`: se publica en el Marketplace a mano) y npm
  `@alia-codea/cli`. Un bump de versión mergeado a `main` publica el CLI vía
  `release-packages.yml` (OIDC, workflow compartido de Oxy) cuando CI pasó en ese commit —
  `~/Oxy/docs/npm-releases.md`.
- `@alia.onl/server` es una dependencia npm con versión fijada, no un workspace: súbela
  cuando la API de Alia cambie el contrato del stream.
- Biome formatea y lintea (`~/Oxy/docs/lint-and-format.md`). `bun.lock` va en el mismo commit
  que el `package.json` que lo cambia.
- La documentación propia de cada paquete vive en su carpeta (`README.md`, `FEATURES.md`,
  `CHANGELOG.md`).
