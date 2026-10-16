import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const lighthouse = require('lighthouse').default
const chromeLauncher = require('chrome-launcher')

const origin = 'http://127.0.0.1:4183'
const pages = [
  { id: 'home', path: '/' },
  { id: 'detail', path: '/nfts/nft_emerald' },
]
const profiles = [
  { id: 'mobile', config: undefined },
  {
    id: 'desktop',
    config: {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
        throttling: {
          rttMs: 40,
          throughputKbps: 10_240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      },
    },
  },
]

const categories = ['performance', 'accessibility', 'best-practices', 'seo']

async function serverIsUp() {
  try {
    const response = await fetch(origin)
    return response.ok
  } catch {
    return false
  }
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(async () => {
      if (await serverIsUp()) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - started > 30_000) {
        clearInterval(timer)
        reject(new Error('O preview não respondeu em http://127.0.0.1:4183'))
      }
    }, 400)
  })
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

const previewOwned = !(await serverIsUp())
const preview = previewOwned
  ? spawn('npm', ['run', 'preview'], { shell: true, stdio: 'inherit' })
  : null
if (previewOwned) await waitForServer()

await mkdir('lighthouse/reports', { recursive: true })
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
const summary = {
  generatedAt: new Date().toISOString(),
  origin,
  runs: 3,
  lighthouse: require('lighthouse/package.json').version,
  chrome: chrome.port ? 'chrome-launcher' : 'chrome-launcher',
  pages: {},
}

try {
  for (const profile of profiles) {
    for (const page of pages) {
      const scores = []
      const metrics = []
      for (let run = 1; run <= 3; run += 1) {
        const result = await lighthouse(`${origin}${page.path}`, {
          port: chrome.port,
          output: ['html', 'json'],
          onlyCategories: categories,
          logLevel: 'error',
        }, profile.config)
        const lhr = result.lhr
        const report = {
          performance: Math.round(lhr.categories.performance.score * 100),
          accessibility: Math.round(lhr.categories.accessibility.score * 100),
          bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
          seo: Math.round(lhr.categories.seo.score * 100),
          lcp: lhr.audits['largest-contentful-paint'].displayValue,
          cls: lhr.audits['cumulative-layout-shift'].displayValue,
          tbt: lhr.audits['total-blocking-time'].displayValue,
        }
        scores.push(report)
        metrics.push({
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
        })
        const base = `lighthouse/reports/${profile.id}-${page.id}-run${run}`
        await writeFile(`${base}.json`, result.report[1])
        await writeFile(`${base}.html`, result.report[0])
        console.log(`${profile.id} ${page.id} run ${run}`, report)
      }
      summary.pages[`${profile.id}-${page.id}`] = {
        median: {
          performance: median(scores.map((item) => item.performance)),
          accessibility: median(scores.map((item) => item.accessibility)),
          bestPractices: median(scores.map((item) => item.bestPractices)),
          seo: median(scores.map((item) => item.seo)),
          lcpMs: median(metrics.map((item) => item.lcp)),
          cls: median(metrics.map((item) => item.cls)),
          tbtMs: median(metrics.map((item) => item.tbt)),
        },
        runs: scores,
      }
    }
  }
} finally {
  await chrome.kill()
  if (preview) preview.kill()
}

await writeFile('lighthouse/summary.json', JSON.stringify(summary, null, 2))
console.log('Mediana gravada em lighthouse/summary.json')
