import { installVirtualClock } from '../.stageshow/kit/clock'

// React's scheduler captures the timer globals when it loads, so the virtual
// clock goes in before React or the scene is imported.
const fps = Number(new URLSearchParams(location.search).get('render'))
if (fps) installVirtualClock({ fps, epoch: 0 })

const [{ createElement }, { createRoot }, { default: Clip }] = await Promise.all([import('react'), import('react-dom/client'), import('./clip1')])
createRoot(document.getElementById('root')!).render(createElement(Clip))
