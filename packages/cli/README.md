# Codea CLI

AI coding assistant for your terminal by Alia.

```
   ██████╗ ██████╗ ██████╗ ███████╗ █████╗
  ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗
  ██║     ██║   ██║██║  ██║█████╗  ███████║
  ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██║
  ╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║
   ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
```

Requires Node 22 or newer.

## Installation

```bash
npm install -g @alia-codea/cli
```

## Quick Start

1. Sign in to Oxy using the shared device approval flow:
```bash
codea login
```

2. Start coding:
```bash
codea
```

## Features

- **Interactive Chat**: Natural language conversations with your AI coding assistant
- **File Operations**: Read, write, and edit files directly
- **Command Execution**: Run shell commands, build, test, and more
- **Codebase Context**: Automatically understands your project structure
- **Session Management**: Save and resume conversations
- **Multiple Models**: Switch between Codea, Codea Pro, and Codea Thinking

## Commands

### Start Interactive Session
```bash
codea              # Start a new chat session
codea chat         # Same as above
```

### Run Single Prompt
```bash
codea run "fix the bug in auth.ts"
codea r "add unit tests for the User class" -y  # Auto-approve changes
```

### Connect an external agent

```bash
codea connect AB12-CD34-EF56-GH78 --cli codex   # pair this computer, then serve it
codea connect                                   # serve the agents this computer is paired with
```

Serves Claude Code, Codex or OpenCode to Gemies as one of your gemies. In Gemies, Settings → Connect
external Gemie gives you one text to paste into your agent; it runs the first command. There is no
sign-in: the single-use code is the authorisation, and redeeming it leaves this computer the agent's
own credential (in the CLI's config directory, readable by you only), so `codea connect` reconnects
after a restart without asking anything. Removing the agent in Gemies revokes it; **Reconnect** there
replaces it.

The process dials Gemies outbound and runs the CLI you are already signed in to, so the answers use
your own subscription. It runs in the current directory (`--cwd` to change it) and may edit files
there; pass `--read-only` to forbid it.

### Session Management
```bash
codea sessions     # List recent sessions
codea resume       # Resume a previous session
codea resume 1     # Resume session #1
```

### Configuration
```bash
codea login        # Configure API key
```

## Slash Commands (in chat)

| Command    | Description                |
|------------|----------------------------|
| `/help`    | Show available commands    |
| `/clear`   | Clear conversation         |
| `/model`   | List or switch models      |
| `/context` | Show current context       |
| `/save`    | Save conversation          |
| `/exit`    | Exit Codea                 |

## Models

Codea uses the real models in the live Alia catalogue (ids like
`publisher/model`). With no choice, Alia answers with its default model.

```bash
codea --model publisher/model   # or any text that matches one model
# or in chat:
/model                  # list models: featured first, then by publisher
/model <id or name>     # switch
/model default          # back to the server's default model
```

## Tools

Codea can:
- **read_file**: Read file contents
- **write_file**: Create or overwrite files
- **edit_file**: Make targeted edits
- **list_files**: Explore directories
- **search_files**: Search code patterns
- **run_command**: Execute shell commands

## Examples

```bash
# Start coding
codea

# In chat:
❯ explain this codebase
❯ fix the TypeScript errors
❯ add authentication to the API
❯ write tests for the User model
❯ run npm test and fix any failures
```

## Configuration

Config is stored in `~/.config/alia-codea-cli/config.json`. `defaultModel` is a
`publisher/model` id from the catalogue, or empty for the server's default:

```json
{
  "apiKey": "your-api-key",
  "apiBaseUrl": "https://api.gemies.ai",
  "defaultModel": ""
}
```

## License

MIT - Created by [Alia](https://alia.onl)

## Stopping a turn

Ctrl+C during a turn sends authenticated Stop and waits for acknowledgement.
If acknowledgement fails, press Ctrl+C again to retry control; the CLI does not
retry generation. While stopping, no new local tool is started and pending approval
is declined. Already completed tool actions are not undone. Each tool continuation
uses a new turn ID.

Closing the terminal, a broken output pipe, or changing accounts detaches the reader;
it does not claim remote cancellation. Billing and any recovery remain the server's
measured settlement. During interactive use, Ctrl+C when idle exits normally.
