import * as fs from 'fs';
import * as parser from 'xml2js';

/**
 * Gets the version number of a package in a .csproj file.
 */
export class NuGetVersionGetter {
    /**
     * Get the version of a npm package in a `.csproj` file.
     *
     * @param filePath The path to the `.csproj` file.
     * @param dependency The name of the package to return the version of.
     *
     * @returns the version for the npm package in the `package.json` file.
     */
    public async getNewVersion(filePath: string, dependency: string): Promise<string> {
        // Read the text from of the package.json file
        const text = fs.readFileSync(filePath, 'utf-8');

        const xml = await parser.parseStringPromise(text);

        for (const i of xml['Project'].ItemGroup) {
            try {
                for (const q of i['PackageReference']) {
    
                    const name = q['$'].Include;
                    const version: string = q['$'].Version;
                    if(name === dependency){
                        return version;
                    }
                }
    
            } catch (e) {
                // we do not care about the errors
            }
        }

        throw "NuGet package " + dependency + " not found.";
    }
}
