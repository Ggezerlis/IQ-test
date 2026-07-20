import { describe, expect, it } from 'vitest'
import { adConfig, adsTxtEntry, donateUrl } from './monetization'

const BASE_ENV: ImportMetaEnv = { BASE_URL: '/', MODE: 'test', DEV: false, PROD: true, SSR: false }

describe('monetization config', () => {
  it('is fully off with no env vars set (the default)', () => {
    expect(adConfig(BASE_ENV)).toBeNull()
    expect(donateUrl(BASE_ENV)).toBeNull()
  })

  it('adConfig requires the client id; slots are optional', () => {
    expect(adConfig({ ...BASE_ENV, VITE_ADSENSE_CLIENT: '' })).toBeNull()
    expect(adConfig({ ...BASE_ENV, VITE_ADSENSE_CLIENT: 'ca-pub-123' })).toEqual({
      client: 'ca-pub-123', slotHome: undefined, slotResults: undefined,
    })
    expect(adConfig({
      ...BASE_ENV, VITE_ADSENSE_CLIENT: 'ca-pub-123', VITE_ADSENSE_SLOT_HOME: 'h1', VITE_ADSENSE_SLOT_RESULTS: 'r1',
    })).toEqual({ client: 'ca-pub-123', slotHome: 'h1', slotResults: 'r1' })
  })

  it('donateUrl passes through only when set', () => {
    expect(donateUrl({ ...BASE_ENV, VITE_DONATE_URL: 'https://ko-fi.com/example' }))
      .toBe('https://ko-fi.com/example')
  })

  it('adsTxtEntry derives the ads.txt line from the client id', () => {
    expect(adsTxtEntry('ca-pub-1234567890123456'))
      .toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n')
    // Already-bare publisher IDs pass through unchanged.
    expect(adsTxtEntry('pub-999')).toBe('google.com, pub-999, DIRECT, f08c47fec0942fa0\n')
  })
})
