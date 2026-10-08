// src/lib/server/tryitout/runtimeDockerode.ts
// Server-only module — SvelteKit enforces that src/lib/server/ cannot be imported client-side.
//
// dockerode-backed ContainerRuntime over the Podman Docker-compatible socket
// (D-01/D-04). This is the ONLY file in src/ that imports dockerode and
// tar-stream. The Docker client is constructed lazily on first use, never at
// import time, so importing this module never opens the socket.
//
// Files move in and out through the archive API (putArchive/getArchive), never
// bind mounts (Pitfall 2), and exec never uses stdin (R-01).

import Docker from 'dockerode'
import tar from 'tar-stream'
import { PassThrough } from 'node:stream'
import { finished } from 'node:stream/promises'
import {
  LABEL_MANAGED,
  TryItOutRuntimeError,
  isSafeRelativePath,
  type ContainerRuntime,
  type ContainerSpec,
  type ExecOptions,
  type ExecResult,
  type GetFilesLimits,
  type ManagedContainer,
  type StagedFile,
} from './runtime'
import type { RunnerConfig } from './runnerConfig'

const MB = 1024 * 1024

/**
 * Pure create-options builder (D-21). Never emits Binds, PortBindings,
 * ExposedPorts, Privileged or CapAdd; caller data is limited to name, labels, env.
 */
export function buildCreateOptions(cfg: RunnerConfig, spec: ContainerSpec): Docker.ContainerCreateOptions {
  return {
    Image: cfg.image,
    name: spec.name,
    User: 'pi',
    Cmd: ['sleep', 'infinity'],
    Labels: spec.labels,
    Env: spec.env,
    HostConfig: {
      Memory: Math.round(cfg.memoryMb * MB),
      NanoCpus: Math.round(cfg.cpus * 1e9),
      PidsLimit: cfg.pids,
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges'],
      Init: true,
      NetworkMode: cfg.network,
      ReadonlyRootfs: true,
      Tmpfs: {
        '/work': `rw,size=${cfg.workTmpfsMb}m,mode=1777`,
        '/tmp': `rw,size=${cfg.tmpTmpfsMb}m,mode=1777`,
        '/home/pi/agent': `rw,size=${cfg.agentTmpfsMb}m,uid=1000,gid=1000,mode=0700`,
      },
    },
  }
}

async function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  }
  return Buffer.concat(chunks)
}

async function buildTar(files: StagedFile[]): Promise<Buffer> {
  const pack = tar.pack()
  const done = collect(pack)
  for (const f of files) {
    if (!isSafeRelativePath(f.path)) {
      pack.destroy(new Error(`unsafe staged path: ${f.path}`))
      throw new TryItOutRuntimeError('exec_failed', `unsafe staged path: ${f.path}`)
    }
    if (f.type === 'dir') {
      pack.entry({ name: f.path, type: 'directory', mode: f.mode ?? 0o755, uid: 1000, gid: 1000 })
    } else {
      const raw = f.content ?? ''
      const body = typeof raw === 'string' ? Buffer.from(raw) : Buffer.from(raw)
      pack.entry({ name: f.path, type: 'file', mode: f.mode ?? 0o644, uid: 1000, gid: 1000, size: body.length }, body)
    }
  }
  pack.finalize()
  return done
}

export function createDockerodeRuntime(cfg: RunnerConfig, instanceId: string): ContainerRuntime {
  void instanceId // reserved: labels are supplied by the caller via ContainerSpec
  let docker: Docker | undefined
  const client = (): Docker => {
    if (!docker) docker = new Docker({ socketPath: cfg.socketPath })
    return docker
  }

  return {
    async ping() {
      await client().ping()
    },

    async ensureNetwork() {
      const d = client()
      try {
        await d.getNetwork(cfg.network).inspect()
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode !== 404) throw err
        try {
          await d.createNetwork({ Name: cfg.network, Internal: true, Labels: { [LABEL_MANAGED]: '1' } })
        } catch (createErr) {
          if ((createErr as { statusCode?: number }).statusCode !== 409) throw createErr
        }
      }
    },

    async createAndStart(spec) {
      const container = await client().createContainer(buildCreateOptions(cfg, spec))
      await container.start()
      return container.id
    },

    async putFiles(containerId, destDir, files) {
      const body = await buildTar(files)
      await client().getContainer(containerId).putArchive(body, { path: destDir })
    },

    async exec(containerId, opts: ExecOptions): Promise<ExecResult> {
      const d = client()
      const exec = await d.getContainer(containerId).exec({
        Cmd: opts.cmd,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        WorkingDir: opts.workingDir,
      })
      const stream = await exec.start({ Detach: false, Tty: false })
      const out = new PassThrough()
      const err = new PassThrough()
      out.on('data', (c: Buffer) => opts.onStdout(c))
      err.on('data', (c: Buffer) => opts.onStderr(c))
      d.modem.demuxStream(stream, out, err)
      await new Promise<void>((resolve, reject) => {
        stream.on('end', resolve)
        stream.on('close', resolve)
        stream.on('error', reject)
      })
      // Flush: let both demuxed streams drain before reporting completion.
      out.end()
      err.end()
      await Promise.all([finished(out), finished(err)])
      // ExitCode can still be null / Running:true right after the stream ends.
      const deadline = Date.now() + 2000
      let info = await exec.inspect()
      while (info.Running && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 100))
        info = await exec.inspect()
      }
      return { exitCode: info.ExitCode ?? null }
    },

    async getFiles(containerId, dir, limits: GetFilesLimits) {
      const archive = await client().getContainer(containerId).getArchive({ path: dir })
      const extract = tar.extract()
      const out: Record<string, Uint8Array> = {}
      let total = 0
      let count = 0
      const piped = archive.pipe(extract)
      for await (const entry of piped) {
        const header = entry.header
        if (header.type !== 'file') {
          entry.resume()
          continue
        }
        if (!isSafeRelativePath(header.name)) {
          entry.resume()
          throw new TryItOutRuntimeError('output_invalid', `unsafe output path: ${header.name}`)
        }
        // Strip the archived directory's basename (first segment).
        const slash = header.name.indexOf('/')
        const rel = slash === -1 ? header.name : header.name.slice(slash + 1)
        if (!isSafeRelativePath(rel)) {
          entry.resume()
          continue
        }
        count += 1
        if (count > limits.maxFiles) {
          throw new TryItOutRuntimeError('output_invalid', `output exceeds ${limits.maxFiles} files`)
        }
        const body = await collect(entry)
        total += body.length
        if (total > limits.maxBytes) {
          throw new TryItOutRuntimeError('output_invalid', `output exceeds ${limits.maxBytes} bytes`)
        }
        out[rel] = new Uint8Array(body)
      }
      return out
    },

    async remove(containerId) {
      try {
        await client().getContainer(containerId).remove({ force: true })
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 404) return
        throw err
      }
    },

    async listManaged(): Promise<ManagedContainer[]> {
      const list = await client().listContainers({
        all: true,
        filters: { label: [`${LABEL_MANAGED}=1`] },
      })
      return list.map((c) => ({ id: c.Id, labels: c.Labels ?? {} }))
    },
  }
}
