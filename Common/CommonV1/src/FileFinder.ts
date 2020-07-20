import * as path from 'path';
import * as fs from 'fs';

/**
 * Recursively search for files where the path ends with the specified string
 */
export class FileFinder {
    /**
     * Recursively search for files in a directory.
     *
     * @param rootPath The directory to search for files in.
     * @param filter The path for the file needs to end with this string.
     *
     * @returns An array of strings with the paths to tha matching files.
     */
    public getAllPathForFilename(rootPath: string, filter: string): string[] {
        return this.walkDir(rootPath, rootPath, filter);
    }

    private walkDir(rootPath: string, currentPath: string, filter: string): string[] {
        const files: string[] = [];

        // Get all file or directories in the current path.
        const filesAndDirectories = fs.readdirSync(currentPath);

        for (const fileOrDirectory of filesAndDirectories) {
            // Construct the full path for the file or directory
            const current = path.join(currentPath, fileOrDirectory);

            // Check if the current path is not a directory and ands with the specified filter.
            if (fs.statSync(current).isFile() && current.endsWith(filter)) {
                // Add the current path to the result
                files.push(current.replace(rootPath, ''));
            }

            // Check in the current path is a directory
            else if (fs.statSync(current).isDirectory()) {
                // Walk the next folder
                const filesFromDirectory = this.walkDir(rootPath, current, filter);

                // Add the files to the result
                for (const file of filesFromDirectory) {
                    files.push(file);
                }
            }
        }

        return files;
    }
}
