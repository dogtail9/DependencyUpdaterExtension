import { DependencyFile } from './DependencyFile';

/**
 * Interface for a package updater
 */
export interface IUpdater {
    /**
     * Updates all dependencies in the directory specified.
     * 
     * @remarks
     * Recursively searches the specified path for dependency files and updates all specified packages 
     * in respective file. 
     * 
     * @param rootPath The root path to start the search for dependency files in.
     * 
     * @returns An array of {@linkcode DependencyFile}
     */
    updateDependencies(rootPath: string): Promise<DependencyFile[]>;
}
