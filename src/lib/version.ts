/**
 * The app version, read from package.json at build time so the footer, the
 * about page and exported files can never drift out of sync with a release.
 */
import manifest from '../../package.json';

export const APP_VERSION: string = manifest.version;
export const APP_NAME: string = manifest.name;
