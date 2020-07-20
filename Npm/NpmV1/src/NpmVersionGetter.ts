import * as fs from 'fs';

/**
 * Gets the version number of a package in a package.json file.
 */
export class NpmVersionGetter {
    /**
     * Get the version of a npm package in a `package.json` file.
     *
     * @param filePath The path to the `package.json` file.
     * @param dependency The name of the package to return the version of.
     *
     * @returns the version for the npm package in the `package.json` file.
     */
    public getNewVersion(filePath: string, dependency: string): string {
        // Read the text from of the package.json file
        const text = fs.readFileSync(filePath, 'utf-8');

        // Convert the text to a Json object
        const obj = JSON.parse(text);

        // Get the dependencies sections of the package.json file 
        let dependencies = obj['dependencies'];

        // try to get the version number of the package
        let newVersion: string = dependencies[dependency];

        // Check if we got a version number
        if (newVersion === undefined) {
            // Did not find a new version
            // Get the devDependencies sections of the package.json file
            dependencies = obj['devDependencies'];

            // try to get the version number of the package
            newVersion = dependencies[dependency];

             // Check if we got a version number
            if (newVersion === undefined) {

                // Get the optionalDependencies sections of the package.json file
                dependencies = obj['optionalDependencies'];
                newVersion = dependencies[dependency];
            }
        }

        return newVersion;
    }
}
