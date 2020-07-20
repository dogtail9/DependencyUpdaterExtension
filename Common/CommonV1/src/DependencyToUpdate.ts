/**
 * Data class for a dependency. Stores the name och the package and the new and old versions.
 */
export class DependencyToUpdate {
    /**
     * Contractor for {@linkcode DependencyToUpdate}
     * 
     * @param name The name of the package.
     * @param oldVersion The old version of the package.
     * @param newVersion The new version of the package.
     */
    constructor(public name: string, public oldVersion: string, public newVersion: string) { }
}
