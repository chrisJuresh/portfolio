import { mountCorners } from './corners';
import { mountGrain } from './effect-stack/grain';
import { handles } from './handles';
import { mountSections, observeSection } from './loader';
import { hold, release } from './motion';
import { followSystemTheme, toggleTheme } from './theme';
import { createTurn } from './turn';

/**
 * The Kernel's client half, and the whole of what crosses a Section boundary at
 * run time. Everything here is either something every Section may rely on or a
 * handle a Check or the Editor needs.
 */

createTurn();
mountCorners();
mountGrain();
followSystemTheme();
mountSections();

const kernel = handles();
kernel.observeSection = observeSection;
kernel.toggleTheme = toggleTheme;
kernel.hold = hold;
kernel.release = release;
