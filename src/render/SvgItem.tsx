import { useMemo } from 'react'
import type { SVGSpec } from '../lib/types'
import { specToSvg } from './composites'

/**
 * Renders an SVGSpec through the shared string pipeline. The markup is
 * entirely self-generated from typed data (no user-provided strings reach
 * it), so innerHTML injection is safe here.
 */
export default function SvgItem({
  spec, uid, title, className,
}: {
  spec: SVGSpec
  uid: string
  title: string
  className?: string
}) {
  const html = useMemo(() => specToSvg(spec, uid, title), [spec, uid, title])
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
