/**
 * The Projects Panel has no Timeline yet, and that is the ticket's own decision
 * rather than an omission: the Panel's motion — how the composition arrives and
 * how it comes apart when it is left — is reworked in a later session, once the
 * Editor and Variants make it something to choose by eye instead of by
 * description. Rebuilding it twice is what that ordering avoids. NOTES.md.
 *
 * The file exists because every Section holds one, and exporting no default is
 * how the loader is told there is nothing to register: a Section with no motion
 * still mounts. Nothing registered means nothing for the `moments` Check to ask
 * for a moment, which is the honest state — a Timeline wired to nothing is a
 * failure it exists to catch.
 */
export {};
