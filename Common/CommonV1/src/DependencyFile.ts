import { DependencyToUpdate } from './DependencyToUpdate';

/**
 * Data class for a dependency file. Stores the path to the dependency file and all updated packages.
 * This data is used to generate the Markdown for the description in the pull request and the list of files to be added to the `dependencybot` branch.
 */
export class DependencyFile {
    /**
     * 
     * @param path The path to the dependency file.
     * @param updates All updated dependencies for the file.
     */
    constructor(public path: string, public updates: DependencyToUpdate[]) { }
}
