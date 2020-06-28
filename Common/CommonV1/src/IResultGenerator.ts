import { DependencyFile } from './DependencyFile';

/**
 * Generates results in different formats for the updated packages in the dependency files supplied.
 */
export interface IResultGenerator {
    /**
     * Get the updated dependencies in markdown format.
     * 
     * @param files An array of {@linkcode DependencyFile} 
     * 
     * @returns A markdown formatted string with information about what packages got updated.
     */
    getMarkdown(files: DependencyFile[]): string;

    /**
     * Gets a space separated string of updated files.
     * 
     * @param files An array of {@linkcode DependencyFile}
     * 
     * @returns A space separated list of updated files. 
     */
    getFiles(files: DependencyFile[]): string;
}
