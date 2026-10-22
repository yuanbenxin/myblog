import { HookHandler, Visit } from 'swup';
import Plugin from '@swup/plugin';
import 'focus-options-polyfill';
import { Announcer } from './announcements.js';
type VisitFocus = {
    /** the element selector to focus */
    selector: string;
    /** wait until "visit:end" before focusing? Default: true */
    wait: boolean;
};
export interface VisitA11y {
    /** How to announce the new content after it inserted */
    announce: string | false | undefined;
    /**
     * How to move focus after the content is replaced
     * - pass a string to focus an element
     * - pass an object for more control
     */
    focus: string | false | VisitFocus;
}
declare module 'swup' {
    interface Visit {
        /** Accessibility settings for this visit */
        a11y: VisitA11y;
    }
    interface HookDefinitions {
        'content:announce': undefined;
        'content:focus': undefined;
    }
    interface Swup {
        /**
         * Announce something programmatically
         */
        announce?: SwupA11yPlugin['announce'];
    }
}
/** Templates for announcements of the new page content. */
export type Announcements = {
    /** How to announce the new page. */
    visit: string;
    /** How to read a page url. Used as fallback if no heading was found. */
    url: string;
};
/** Translations of announcements, keyed by language. */
export type AnnouncementTranslations = {
    [lang: string]: Announcements;
};
export type Options = {
    /** The selector for finding headings inside the main content area. Use an array to try different selectors in order. */
    headingSelector: string | string[];
    /** Whether to skip animations for users that prefer reduced motion. */
    respectReducedMotion: boolean;
    /** How to announce the new page title and url. */
    announcements: Announcements | AnnouncementTranslations;
    /** Whether to focus elements with an [autofocus] attribute after navigation. */
    autofocus: boolean;
};
export default class SwupA11yPlugin extends Plugin {
    name: string;
    requires: {
        swup: string;
    };
    defaults: Options;
    options: Options;
    /**
     * The announcer instance for reading new page content.
     */
    announcer: Announcer;
    /**
     * The delay before announcing new page content.
     * Why 100ms? see research at https://github.com/swup/a11y-plugin/pull/50
     */
    announcementDelay: number;
    /**
     * The selector for the main content area of the page, to focus after navigation.
     */
    rootSelector: string;
    constructor(options?: Partial<Options>);
    mount(): void;
    unmount(): void;
    announce(message: string): Promise<void>;
    markAsBusy(): void;
    unmarkAsBusy(): void;
    prepareVisit(visit: Visit): void;
    announceContent(visit: Visit): void;
    maybeFocusEarly(visit: Visit): void;
    maybeFocusLate(visit: Visit): void;
    focusContent(visit: Visit): void;
    /**
     * parse `visit.focus`
     */
    parseVisitFocus(value: false | string | VisitFocus): false | VisitFocus;
    handleAnchorScroll: HookHandler<'scroll:anchor'>;
    getPageAnnouncement(): string | undefined;
    disableAnimations(visit: Visit): void;
}
export {};
