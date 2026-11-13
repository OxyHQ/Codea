/**
 * `codea connect` — serve a coding-agent CLI to Gemies as one of the person's gemies (Gemies ADR 0030,
 * ADR 0038).
 *
 *   codea connect AB12-CD34-EF56-GH78 --cli codex     pair this machine, then serve it
 *   codea connect                                     serve the agents this machine is paired with
 *
 * No sign-in of any kind. The pairing code, minted in Gemies by the signed-in person, is the whole
 * authorisation: redeeming it returns a credential for that one agent, kept on this machine (0600),
 * and the daemon connects with it for as long as the agent exists, across restarts.
 *
 * Outbound only: it dials Gemies over WebSocket and drives the installed CLI under the person's own
 * login to it. Nothing is listening on this machine, and no token of the CLI's vendor reaches Gemies.
 */
import { hostname } from 'node:os';
import chalk from 'chalk';
import { config, DEFAULT_API_BASE_URL } from '../utils/config.js';
import { startDaemon, type Daemon } from '../external/daemon.js';
import { gemieToolsUrl } from '../external/gemie-tools.js';
import { runProcess } from '../external/process.js';
import { NEW_CODE_HINT, redeemCode, type ConnectableAgent } from '../external/redeem.js';
import { runtimeFor } from '../external/registry.js';
import {
  forgetAgent,
  pairedAgents,
  rememberAgent,
  sessionStore,
  type PairedAgent,
} from '../external/state.js';
import { EXTERNAL_CLIS, isExternalCli, type ExternalCli } from '../external/types.js';

export interface ConnectOptions {
  cli?: string;
  agent?: string;
  cwd?: string;
  /** Commander turns `--read-only` into `readOnly`. */
  readOnly?: boolean;
}

const WRITE_NOTICE =
  'The agent may edit files in the working directory. Start with --read-only to forbid it.';

async function installed(cli: ExternalCli): Promise<boolean> {
  const result = await runProcess({
    command: cli,
    args: ['--version'],
    cwd: process.cwd(),
    signal: new AbortController().signal,
  }).catch(() => null);
  return result !== null && result.code === 0;
}

async function chooseCli(requested: string | undefined): Promise<ExternalCli | null> {
  if (requested !== undefined) {
    if (!isExternalCli(requested)) {
      console.error(chalk.red(`--cli must be one of: ${EXTERNAL_CLIS.join(', ')}`));
      return null;
    }
    if (!(await installed(requested))) {
      console.error(chalk.red(`\`${requested}\` is not installed or not on the PATH.`));
      return null;
    }
    return requested;
  }
  const found: ExternalCli[] = [];
  for (const cli of EXTERNAL_CLIS) if (await installed(cli)) found.push(cli);
  if (found.length === 1) return found[0];
  console.error(
    chalk.red(
      found.length === 0
        ? `No supported CLI found (${EXTERNAL_CLIS.join(', ')}).`
        : `Several CLIs are installed (${found.join(', ')}); pick one with --cli.`,
    ),
  );
  return null;
}

const connectable = (agent: PairedAgent): agent is ConnectableAgent =>
  typeof agent.credential === 'string' && agent.credential !== '';

export async function connect(code: string | undefined, options: ConnectOptions): Promise<void> {
  const apiBaseUrl = config.get('apiBaseUrl') || DEFAULT_API_BASE_URL;
  let agents = pairedAgents(apiBaseUrl);

  if (code !== undefined) {
    const cli = await chooseCli(options.cli);
    if (cli === null) process.exit(1);
    const redeemed = await redeemCode({
      apiBaseUrl,
      code,
      cli,
      hostName: hostname().slice(0, 80) || 'this computer',
    });
    if (typeof redeemed === 'string') {
      console.error(chalk.red(redeemed));
      process.exit(1);
    }
    rememberAgent(redeemed);
    console.log(chalk.green(`Paired: ${redeemed.name}`));
    agents = [redeemed];
  } else if (options.agent !== undefined) {
    agents = agents.filter((a) => a.agentId === options.agent);
  }

  // Paired by Codea 3.x, with the person's Oxy session: Gemies issues it a credential once it is
  // reconnected with a code made for it.
  for (const agent of agents.filter((a) => !connectable(a))) {
    console.error(
      chalk.yellow(
        `${agent.name} needs reconnecting once: in Gemies, Settings → Connect external Gemie → Reconnect, then paste the text it gives you into your agent.`,
      ),
    );
  }
  const serving = agents.filter(connectable);
  if (serving.length === 0) {
    if (agents.length === 0) {
      console.error(chalk.red(`This machine is not paired with any agent. ${NEW_CODE_HINT}`));
    }
    process.exit(1);
  }

  const cwd = options.cwd ?? process.cwd();
  const write = options.readOnly !== true;
  const wsUrl = `${apiBaseUrl.replace(/^http/, 'ws')}/ws/external-agent`;
  const daemons: Daemon[] = [];

  console.log(
    chalk.gray(`Working directory: ${cwd}${write ? `\n${WRITE_NOTICE}` : ' (read-only)'}`),
  );
  for (const agent of serving) {
    let announced = false;
    const daemon = startDaemon({
      wsUrl,
      agentId: agent.agentId,
      agentName: agent.name,
      runtime: runtimeFor(agent.cli),
      sessions: sessionStore(),
      cwd,
      write,
      credential: agent.credential,
      toolsUrl: gemieToolsUrl(apiBaseUrl, agent.agentId),
      log: (message) => {
        if (message === 'connected') {
          if (!announced) console.log(chalk.green(`Connected: ${agent.name}`));
          announced = true;
          return;
        }
        console.log(chalk.gray(`[${agent.name}] ${message}`));
      },
    });
    daemons.push(daemon);
    void daemon.done.then((exit) => {
      if (exit.reason === 'revoked' || exit.reason === 'unknown-agent') {
        forgetAgent(agent.agentId, agent.credential);
        console.log(chalk.yellow(`${agent.name} was removed in Gemies; this machine forgot it.`));
      } else if (exit.reason === 'credential-rejected') {
        forgetAgent(agent.agentId, agent.credential);
        console.log(
          chalk.yellow(`${agent.name} was reconnected with a newer code; this connection stopped.`),
        );
      }
    });
  }

  const stopAll = () => {
    for (const daemon of daemons) daemon.stop();
  };
  process.once('SIGINT', stopAll);
  process.once('SIGTERM', stopAll);

  await Promise.all(daemons.map((daemon) => daemon.done));
}
