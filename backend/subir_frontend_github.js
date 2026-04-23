const fs = require('fs')
const path = require('path')
const https = require('https')

const TOKEN = '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'
const REPO = 'agusricciardiw/cat-plataforma'
const FRONTEND = 'C:\\Users\\Agust\xedn\\cat-plataforma'
const IGNORAR = new Set(['node_modules', 'dist', 'dist-ssr', '.git', '.env', '.env.local'])

function apiRequest(method, repoPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const options = {
      hostname: 'api.github.com',
      path: '/repos/' + REPO + '/contents/' + repoPath,
      method,
      headers: {
        'Authorization': 'token ' + TOKEN,
        'Content-Type': 'application/json',
        'User-Agent': 'cat-plataforma-uploader',
        'Content-Length': Buffer.byteLength(data),
      }
    }
    const req = https.request(options, res => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }) }
        catch { resolve({ status: res.statusCode, data: raw }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function getSha(repoPath) {
  const res = await apiRequest('GET', repoPath, {})
  if (res.status === 200) return res.data.sha
  return null
}

async function uploadFile(localPath, repoPath) {
  const content = fs.readFileSync(localPath)
  const encoded = content.toString('base64')
  const sha = await getSha(repoPath)
  const body = { message: (sha ? 'Update ' : 'Add ') + repoPath, content: encoded }
  if (sha) body.sha = sha
  const res = await apiRequest('PUT', repoPath, body)
  if (res.status === 200 || res.status === 201) {
    console.log('OK ' + repoPath)
  } else {
    console.log('ERR ' + repoPath + ': ' + (res.data.message || res.status))
  }
}

function listarArchivos(dir, base) {
  const archivos = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORAR.has(entry.name)) continue
    if (entry.name.startsWith('.') && entry.name !== '.gitignore' && entry.name !== '.env.example') continue
    const fullPath = path.join(dir, entry.name)
    const repoRel = base ? base + '/' + entry.name : entry.name
    if (entry.isDirectory()) {
      archivos.push(...listarArchivos(fullPath, repoRel))
    } else {
      archivos.push({ local: fullPath, repo: 'frontend/' + repoRel })
    }
  }
  return archivos
}

async function main() {
  console.log('Escaneando frontend...')
  const archivos = listarArchivos(FRONTEND, '')
  console.log(archivos.length + ' archivos. Subiendo...')
  for (const a of archivos) {
    await uploadFile(a.local, a.repo)
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('Listo: https://github.com/agusricciardiw/cat-plataforma')
  console.log('IMPORTANTE: revoca el token en https://github.com/settings/tokens')
}

main().catch(console.error)
