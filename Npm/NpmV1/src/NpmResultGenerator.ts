import * as tl from 'azure-pipelines-task-lib/task';
import * as path from 'path';
import { DependencyFile } from '../../../Common/CommonV1/src/DependencyFile';
import { IResultGenerator } from '../../../Common/CommonV1/src/IResultGenerator';

/**
 * Implementation of {@linkcode:IResultGenerator} for Npm packages.
 */
export class NpmResultGenerator implements IResultGenerator {
   /**
    * Get the updated dependencies in markdown format.
    * 
    * @param files An array of  {@linkcode DependencyFile}
    * 
    * @returns A markdown formatted string with information about what packages got updated.
    */
    public getMarkdown(files: DependencyFile[]): string {
        let markdown = '';
        for (const file of files) {
            let dependenciesMarkdown = "";
            for (const update of file.updates) {
                // Create a line in the bullet list of dependencies
                dependenciesMarkdown += '* **' + update.name + ':** ' + update.oldVersion + ' => ' + update.newVersion + '\n';
            }
            // Create a headline for the file
            markdown += '## ' + file.path + '\n\n' + dependenciesMarkdown + '\n';
        }
        return markdown;
    }

    /**
     * Gets a space separated string of updated files.
     * 
     * @param files An array of  {@linkcode DependencyFile}
     * 
     * @returns A space separated list of updated files.
     */
    public getFiles(files: DependencyFile[]): string {
        const dependencyPath = tl.getPathInput('Path', true, true);

        const packageLockFiles: string[] = [];
        // Create paths for package-lock.json files.
        
        files.forEach((file) => {
            packageLockFiles.push(file.path.replace('package.json', 'package-lock.json'));
        });

        let returnFiles = "";

        for (const i in files) {
            // Add package.json and package-lock.json files to the list of updated files.
            returnFiles += path.join(dependencyPath + files[i].path) + ' ' + path.join(dependencyPath + packageLockFiles[i]) + ' ';
        }

        return returnFiles;
    }
}
