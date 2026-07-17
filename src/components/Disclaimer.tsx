import { APP_NAME } from '../lib/config'

export default function Disclaimer() {
  return (
    <div
      role="note"
      className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900"
    >
      <strong>{APP_NAME} is for entertainment.</strong> It gives a rough estimate of
      pattern-recognition ability — it is not a clinical assessment, and no online test can
      measure IQ. Only a licensed psychologist administering a standardized battery can
      produce a real IQ score.
    </div>
  )
}
