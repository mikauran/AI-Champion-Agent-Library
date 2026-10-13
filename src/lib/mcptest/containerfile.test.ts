import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const file = read('../../../Containerfile.mcp-test-runner')
const pkg = JSON.parse(read('../../../package.json')) as {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}
const exact = (range: string) => range.replace(/^[\^~]/, '')
const lines = file.split('\n')
const code = lines.filter((l) => !l.trim().startsWith('#'))

describe('Containerfile.mcp-test-runner (static checks, never built here)', () => {
  it('pins a Node 22 base image, not latest', () => {
    expect(file).toMatch(/^ARG NODE_VERSION=22\.\d+[\w.-]*$/m)
    expect(file).toMatch(/^FROM node:\$\{NODE_VERSION\}$/m)
    expect(file).not.toMatch(/^(FROM|ARG NODE_VERSION=).*latest/m)
  })
  it('installs python3 and pip', () => {
    expect(file).toMatch(/python3 python3-pip/)
  })
  it('installs yaml, zod, fflate and tsx at the package.json versions under /', () => {
    const run = code.join('\n')
    expect(run).toContain('npm install --prefix /')
    expect(run).toContain(`yaml@${exact(pkg.dependencies.yaml)}`)
    expect(run).toContain(`zod@${exact(pkg.dependencies.zod)}`)
    expect(run).toContain(`fflate@${exact(pkg.dependencies.fflate)}`)
    expect(run).toContain(`tsx@${exact(pkg.devDependencies.tsx)}`)
  })
  it('has the fastmcp line with an UNVERIFIED comment', () => {
    const i = lines.findIndex((l) => l.includes('fastmcp') && !l.trim().startsWith('#'))
    expect(i).toBeGreaterThan(0)
    const before = lines.slice(Math.max(0, i - 6), i).join('\n')
    expect(before).toContain('UNVERIFIED')
    expect(before).toContain('human decides the pin')
  })
  it('runs as non-root in /work', () => {
    expect(file).toMatch(/^USER node$/m)
    expect(file).toMatch(/^WORKDIR \/work$/m)
    expect(code.join('\n')).not.toMatch(/^USER (root|0)\b/m)
  })
  it('bakes in no secrets, exposes nothing and starts no server', () => {
    for (const l of code.filter((x) => /^\s*(ENV|ARG)\b/.test(x))) expect(l).not.toMatch(/KEY|TOKEN|SECRET|PASSWORD/i)
    expect(code.join('\n')).not.toMatch(/^EXPOSE\b/m)
    expect(code.join('\n')).not.toMatch(/^ENTRYPOINT\b/m)
    expect(code.filter((l) => l.startsWith('CMD'))).toEqual(['CMD ["sleep", "infinity"]'])
  })
  it('documents the build command and that runtime needs no network', () => {
    expect(file).toContain('podman build -t localhost/mcp-test-runner:latest -f Containerfile.mcp-test-runner .')
    expect(file).toMatch(/needs no network/)
  })
})
