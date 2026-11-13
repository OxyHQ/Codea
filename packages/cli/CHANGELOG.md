# @alia-codea/cli

## 4.2.0

`codea connect` keeps the agent connected on its own. After pairing it installs the daemon as a
per-user service and returns once the agent is connected:

| Platform | Service |
|---|---|
| Linux | systemd `--user` unit `codea.service`, with lingering turned on when allowed |
| macOS | LaunchAgent `so.oxy.codea` |
| Windows | Scheduled Task `Codea`, at logon |

It starts at login, restarts when it fails and survives the session that ran `connect` and a
restart of the machine, so nobody has to reconnect the agent. Nothing is asked: the output says
what was installed and how to remove it.

- `codea status` shows the service, the agents it serves and its last log lines.
- `codea disconnect` stops and removes the service; with `--forget` it also forgets the agents
  paired here.
- A CLI run through npx is copied, at its exact version, to the daemon's own folder, so the
  service never points at npm's cache.
- The daemon no longer gives up when Gemies cannot be reached (a machine just booted, a network
  down): only a refusal from Gemies counts toward giving up.
- Each agent keeps the folder and the read-only choice it was paired with.

## 4.1.0

The agent gets its gemie's tools
([Gemies ADR 0039](https://github.com/OxyHQ/Gemies/blob/main/docs/adr/0039-external-agents-reach-their-tools-over-mcp.md)).
Gemies serves what the owner granted it in its editor (connected Notion, Linear…, the web, …) as a
remote MCP server, and every turn `codea connect` runs hands it to the CLI as the server `gemies`:
Claude Code through `--mcp-config` (its tools allowed, since `-p` cannot ask), Codex through
`-c mcp_servers.gemies.*`, OpenCode through `OPENCODE_CONFIG_CONTENT`. The credential goes in the
child's environment, never on a command line, and your CLI's config files are not touched. The tools
run in Gemies; nothing new runs on your machine.

## 4.0.0

`codea connect` signs in to nothing. The pairing code from Gemies is the authorisation
([Gemies ADR 0038](https://github.com/OxyHQ/Gemies/blob/main/docs/adr/0038-external-agents-connect-with-their-own-credential.md)):
`codea connect <code> --cli <claude|codex|opencode>` redeems it with no session and keeps the agent's
own credential, readable by you only (0600), which every later `codea connect` presents, so a restart
reconnects with no login. No Oxy device flow, no sign-in link to approve. Only `chat`, `run`, `exec`
and `resume` ask for an Oxy session now.

Breaking: the code is a positional argument (`--code` is gone), and the daemon speaks only the
agent's credential, which needs the Gemies API of ADR 0038. An agent paired by 3.x has no credential:
`codea connect` says so, and **Reconnect** on it in Gemies (Settings → Connect external Gemie) gives
you the text that issues one, keeping the agent and its conversations.

## 3.4.0

`codea connect` continues the CLI's own session for each Alia conversation (Claude Code
`--resume`, Codex `exec resume`), so the agent keeps its tool context between messages and no longer
gets the whole conversation re-sent. If the CLI lost the session it starts a new one on its own.
Sessions are remembered across restarts of the daemon.

## 3.3.1

`codea connect` lets the agent edit files in its working directory by default: read-only made Claude
Code and Codex answer "I don't have permission" to almost anything. Start it with `--read-only` to
forbid changes, and the agent then says how to lift that instead of just refusing. Run it from the
folder you want the agent to work in.

## 3.3.0

`codea connect` serves Claude Code, Codex or OpenCode to Alia as one of your agents
([ADR 0030](../../docs/adr/0030-external-agents.md)). Create a code in Alia (Settings → Connect an
external agent), paste the text it gives you into your agent, and it runs
`codea connect --code <code> --cli <claude|codex|opencode>`. The process dials Alia outbound with your
Oxy session and answers the messages Alia sends it by running the CLI you are already signed in to, in
the current directory, read-only unless started with `--write`. Run `codea connect` again to serve the
agents this machine is paired with.

## 3.2.0

`codea login` prints the request's short comparison code (`CE7F-B31F`,
`deviceComparisonCode` from core 7.9) instead of all thirty-two characters of the
authorize code: the same code `auth.oxy.so/device` now prints, so the two can
actually be compared. The full code still travels in the link and the QR and is
the only thing that approves. Uses core 7.9.

## 3.1.0

Ctrl+C requests authenticated Stop for the current generation and waits for its
acknowledgement before closing the stream. Every tool continuation has its own
turn ID; Stop blocks further tools, including approvals resolved late. Incidental
teardown and broken output pipes only detach. Account changes fence both lanes. Acknowledged Stop retains visible partial text
without incomplete tool calls; account teardown never saves that partial reply.

Uses the shared server SDK 1.3.1 wire parser and removes the unused OpenAI dependency.
Requires Node 22 or newer, matching the shared SDK and current CLI dependencies.

## 3.0.2

Uses core 7.1 linked transports for chat and the public model catalogue.
Refresh, redirect protection and account switching use the shared session;
catalogues no longer persist across accounts. CLI commands and options remain unchanged.
