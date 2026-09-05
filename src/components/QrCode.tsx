import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/**
 * QR code rendu en SVG, sans requête réseau ni canvas.
 *
 * Les modules sont réunis en un seul tracé : un `<rect>` par module donnerait
 * plusieurs milliers de nœuds pour un lien un peu long.
 */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const svg = useMemo(() => {
    try {
      // Type 0 : la bibliothèque choisit la plus petite version qui convient.
      // Correction « L » : la plus petite redondance, donc le code le moins
      // dense — préférable ici, un écran n'étant ni sale ni froissé.
      const qr = qrcode(0, 'L')
      qr.addData(value, 'Byte')
      qr.make()
      const count = qr.getModuleCount()
      let path = ''
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
        }
      }
      return { path, count }
    } catch {
      return null
    }
  }, [value])

  if (!svg) return null

  // La marge silencieuse (4 modules) est exigée par la norme pour que les
  // lecteurs repèrent les bords du code.
  const quiet = 4
  const total = svg.count + quiet * 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label="QR code du lien de partage"
      style={{ display: 'block', borderRadius: 'var(--r-md)' }}
      shapeRendering="crispEdges"
    >
      <rect width={total} height={total} fill="#ffffff" />
      <g transform={`translate(${quiet} ${quiet})`} fill="#111111">
        <path d={svg.path} />
      </g>
    </svg>
  )
}

/** Nombre de modules d'un côté, ou null si le lien dépasse la capacité du format. */
export function qrModuleCount(value: string): number | null {
  try {
    const qr = qrcode(0, 'L')
    qr.addData(value, 'Byte')
    qr.make()
    return qr.getModuleCount()
  } catch {
    return null
  }
}
