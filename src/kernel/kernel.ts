import { mountCorners } from './corners';
import { mountGrain } from './effect-stack/grain';
import { handles } from './handles';
import { mountSections, observeSection } from './loader';
import { hold, release } from './motion';
import { mountPageTurn, ports, snapping } from './page-turn';
import { followSystemTheme, toggleTheme } from './theme';
import { createTurn } from './turn';
import { mountWheel } from './wheel';

/**
 * The Kernel's client half, and the whole of what crosses a Section boundary at
 * run time. Everything here is either something every Section may rely on or a
 * handle a Check or the Editor needs.
 */

createTurn();
mountCorners();
mountGrain();
followSystemTheme();
// Before the Sections, and before the page turn: both ask who owns the wheel, so
// the listener that settles it has to be on the document first — it runs in the
// capture phase, but only for events that arrive after it is attached.
mountWheel();
mountPageTurn();
mountSections();

const kernel = handles();
kernel.observeSection = observeSection;
kernel.toggleTheme = toggleTheme;
kernel.hold = hold;
kernel.release = release;
kernel.snapping = snapping;
kernel.ports = ports;
