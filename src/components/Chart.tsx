/**
 * Deux graphiques, dessinés à la main en SVG.
 *
 * Aucune bibliothèque : le besoin tient en cent lignes, et une dépendance de
 * plus serait un chargement de plus à précacher pour une application qui tient
 * à ne rien demander au réseau.
 *
 * Parti pris graphique, conforme à la charte : un seul vert, un trait fin, une
 * grille discrète, aucun dégradé. Les couleurs viennent des variables du
 * thème, donc les graphiques suivent le mode sombre sans rien de particulier.
 */

const PAD = { top: 8, right: 8, bottom: 22, left: 30 }

/** Barres verticales avec une valeur en pourcentage : la courbe de l'oubli. */
export function BarChart({
  points,
  height = 150,
}: {
  points: { label: string; value: number; muted?: boolean }[]
  height?: number
}) {
  const width = 320
  const inner = { w: width - PAD.left - PAD.right, h: height - PAD.top - PAD.bottom }
  const step = inner.w / Math.max(1, points.length)
  const barWidth = Math.min(28, step * 0.55)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      {[0, 0.5, 1].map((tick) => {
        const y = PAD.top + inner.h * (1 - tick)
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y + 3.5}
              textAnchor="end"
              fill="var(--ink-4)"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {Math.round(tick * 100)}
            </text>
          </g>
        )
      })}

      {points.map((point, index) => {
        const x = PAD.left + step * index + (step - barWidth) / 2
        const h = Math.max(1, inner.h * point.value)
        return (
          <g key={point.label}>
            <rect
              x={x}
              y={PAD.top + inner.h - h}
              width={barWidth}
              height={h}
              rx={3}
              fill={point.muted ? 'var(--border)' : 'var(--primary-fill)'}
            />
            <text
              x={x + barWidth / 2}
              y={height - 7}
              textAnchor="middle"
              fill="var(--ink-4)"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {point.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Deux lignes cumulées, dont l'une remplie : découvertes et acquises. */
export function LineChart({
  series,
  labels,
  height = 150,
}: {
  /** La première série est remplie ; la seconde reste un trait. */
  series: { name: string; values: number[]; filled?: boolean }[]
  labels: string[]
  height?: number
}) {
  const width = 320
  const inner = { w: width - PAD.left - PAD.right, h: height - PAD.top - PAD.bottom }
  const count = Math.max(1, series[0]?.values.length ?? 1)
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const x = (index: number) => PAD.left + (inner.w * index) / Math.max(1, count - 1)
  const y = (value: number) => PAD.top + inner.h * (1 - value / max)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
    >
      {[0, 0.5, 1].map((tick) => {
        const ly = PAD.top + inner.h * (1 - tick)
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={ly}
              y2={ly}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={ly + 3.5}
              textAnchor="end"
              fill="var(--ink-4)"
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
            >
              {Math.round(max * tick)}
            </text>
          </g>
        )
      })}

      {series.map((serie) => {
        const line = serie.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(v)}`).join(' ')
        return (
          <g key={serie.name}>
            {serie.filled && (
              <path
                d={`${line} L${x(count - 1)} ${PAD.top + inner.h} L${x(0)} ${PAD.top + inner.h} Z`}
                fill="var(--primary-tint)"
                opacity={0.9}
              />
            )}
            <path
              d={line}
              fill="none"
              stroke={serie.filled ? 'var(--primary-fill)' : 'var(--ink-4)'}
              strokeWidth={serie.filled ? 2 : 1.4}
              strokeDasharray={serie.filled ? undefined : '3 3'}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        )
      })}

      {labels.map((label, index) =>
        label ? (
          <text
            key={index}
            x={x(index)}
            y={height - 7}
            textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}
            fill="var(--ink-4)"
            style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
          >
            {label}
          </text>
        ) : null,
      )}
    </svg>
  )
}
