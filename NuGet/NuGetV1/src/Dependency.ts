/**
 * Data class for a dependency. Stores the name of the package and the version.
 */
export class Dependency {
    /**
     * Contractor for {@linkcode Dependency}
     * 
     * @param Name The name of the package.
     * @param Version The version of the package.
     */
    constructor(public Name: string, public Version: string) { }
}
