import { describe, expect, it } from 'vitest';
import {
  claudeToolArgs,
  codexToolArgs,
  gemieToolsUrl,
  opencodeToolsEnv,
  toolsEnv,
} from '../gemie-tools.js';

/**
 * The gemie's tools reach each CLI as the MCP server `gemies` of the run (Gemies ADR 0039), with the
 * credential in the environment and never on the command line.
 */
const tools = { url: 'https://api.gemies.ai/mcp/agents/agent-1', credential: 'gxa_secret' };

describe('gemie tools for a run', () => {
  it('address the agent’s own tool server', () => {
    expect(gemieToolsUrl('https://api.gemies.ai', 'agent-1')).toBe(tools.url);
  });

  it('keep the credential off every command line', () => {
    for (const args of [claudeToolArgs(tools), codexToolArgs(tools)]) {
      expect(args.join(' ')).not.toContain('gxa_secret');
    }
    expect(toolsEnv(tools, { PATH: '/bin' })).toEqual({
      PATH: '/bin',
      GEMIES_AGENT_CREDENTIAL: 'gxa_secret',
    });
  });

  it('give Claude Code the server, its header from the environment, and its tools allowed', () => {
    const [flag, config, allow, server] = claudeToolArgs(tools);
    expect([flag, allow, server]).toEqual(['--mcp-config', '--allowedTools', 'mcp__gemies']);
    expect(JSON.parse(config)).toEqual({
      mcpServers: {
        gemies: {
          type: 'http',
          url: tools.url,
          headers: { Authorization: 'Bearer ${GEMIES_AGENT_CREDENTIAL}' },
        },
      },
    });
  });

  it('give Codex config overrides that read the bearer from the environment', () => {
    expect(codexToolArgs(tools)).toEqual([
      '-c',
      `mcp_servers.gemies.url="${tools.url}"`,
      '-c',
      'mcp_servers.gemies.bearer_token_env_var="GEMIES_AGENT_CREDENTIAL"',
    ]);
  });

  it('give OpenCode the server merged into the config the person already passes', () => {
    const env = opencodeToolsEnv(tools, {
      OPENCODE_CONFIG_CONTENT: JSON.stringify({ model: 'x', mcp: { mine: { type: 'local' } } }),
    });
    expect(env.GEMIES_AGENT_CREDENTIAL).toBe('gxa_secret');
    expect(JSON.parse(env.OPENCODE_CONFIG_CONTENT)).toEqual({
      model: 'x',
      mcp: {
        mine: { type: 'local' },
        gemies: {
          type: 'remote',
          url: tools.url,
          headers: { Authorization: 'Bearer {env:GEMIES_AGENT_CREDENTIAL}' },
        },
      },
    });
    expect(env.OPENCODE_CONFIG_CONTENT).not.toContain('gxa_secret');
  });
});
