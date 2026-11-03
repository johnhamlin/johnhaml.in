import type { ComponentType } from 'react'
import { installVirtualClock } from '../.stageshow/kit/clock'

const CLIPS: Record<string, () => Promise<{ default: ComponentType }>> = { 1: () => import('./clip1'), 2: () => import('./clip2') }

// React's scheduler captures the timer globals when it loads, so the virtual
// clock goes in before React or the scene is imported.
const params = new URLSearchParams(location.search)
const fps = Number(params.get('render'))
if (fps) installVirtualClock({ fps, epoch: 0 })
const clip = params.get('clip') ?? '1'
const load = CLIPS[clip]
if (!load) throw new Error(`unknown clip ${clip}`)

const [{ createElement }, { createRoot }, { default: Clip }] = await Promise.all([import('react'), import('react-dom/client'), load()])
createRoot(document.getElementById('root')!).render(createElement(Clip))
