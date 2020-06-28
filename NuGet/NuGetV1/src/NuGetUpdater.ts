import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as path from 'path';
import * as fs from 'fs';
import * as parser from 'xml2js';
import { Dependency } from './Dependency';
import { IUpdater } from '../../../Common/CommonV1/src//IUpdater';
import { DependencyToUpdate } from '../../../Common/CommonV1/src//DependencyToUpdate';
import { DependencyFile } from '../../../Common/CommonV1/src/DependencyFile';
import { NuGetVersionGetter } from './NuGetVersionGetter';
import { FileFinder } from '../../../Common/CommonV1/src//FileFinder';

/**
 * Update npm packages
 */
export class NuGetUpdater implements IUpdater {
    readonly versionGetter: NuGetVersionGetter;
    readonly fileFinder: FileFinder;
    /**
     * Contractor for {@linkcode NpmUpdater}
     * 
     * @param fileFinder an implementation of {@linkcode FileFinder}
     * @param versionGetter an implementation of {@linkcode NuGetVersionGetter}
     */
    constructor(fileFinder: FileFinder, versionGetter: NuGetVersionGetter) {
        this.fileFinder = fileFinder;
        this.versionGetter = versionGetter;
    }

    /**
     * Updates all `.csproj` files in the directory specified.
     * 
     * @remarks
     * Recursively searches the specified path for `.csproj` files and updates all specified packages 
     * in respective file. 
     * 
     * @param rootPath The root path to start the search for `.csproj` file in.
     * 
     * @returns An array of {@linkcode DependencyFile}
     */
    public async updateDependencies(rootPath: string): Promise<DependencyFile[]> {
        const updates: DependencyFile[] = [];

        // Recursively get all .csproj files in rootPath
        const files = this.fileFinder.getAllPathForFilename(rootPath, '.csproj');

        for (const file of files) {
            // update npm packages 
            const updatesForFile = await this.updateDependenciesForFile(path.join(rootPath, file));

            // If there is any updates for the .csproj
            if (updatesForFile.length > 0)
                // Save the meta data about what packages where updated
                updates.push(new DependencyFile(file, updatesForFile));
        }

        return updates;
    }

    private async updateDependenciesForFile(filePath: string): Promise<DependencyToUpdate[]> {
        let updates: DependencyToUpdate[] = [];

        // Check if the .csproj file exists on disk
        if (fs.existsSync(filePath)) {
            // Read the text form of the .csproj file
            const text = fs.readFileSync(filePath, 'utf-8');

            const xml = await parser.parseStringPromise(text);

            const dependencies: Dependency[] = [];
            for (const i of xml['Project'].ItemGroup) {
                try {
                    for (const q of i['PackageReference']) {

                        const name = q['$'].Include;
                        const version: string = q['$'].Version;
                        dependencies.push(new Dependency(name, version));
                    }

                } catch (e) {
                    // we do not care about the errors
                }
            }

            // Update packages for the different dependency sections in the .csproj
            updates = updates.concat(await this.updatePackages(dependencies, filePath));
        }

        return updates;
    }

    private async updatePackages(dependencies: Dependency[], filePath: string): Promise<DependencyToUpdate[]> {
        const updates: DependencyToUpdate[] = [];

        for (const dependency of dependencies) {
            // Get the old version of the package
            const oldVersion: string = dependency.Version;

            // get the path of the folder containing the .csproj file
            const workingDirectory = path.dirname(filePath);

            // Use the SDK to get the dotnet tool
            const dotnet = tl.tool(tl.which('dotnet', true));

            // Add argument 'add' to the dotnet command
            dotnet.arg('add');

            // Add file path argument
            dotnet.arg(filePath);

            // Add 'package' argument
            dotnet.arg('package');

            // Add the dependency name to the NuGet command
            dotnet.arg(dependency.Name);

            // Set the working directory for the dotnet command
            const options = { cwd: workingDirectory } as tr.IExecOptions;

            // Run the dotnet update command for the package
            const exitCode = await dotnet.exec(options);

            if (exitCode != 0) {

            }

            // Get the the version of the package
            const newVersion = await this.versionGetter.getNewVersion(filePath, dependency.Name);

            console.log(dependency + ': ' + oldVersion + ' ==> ' + newVersion);
            // Check in the package was updated
            if (oldVersion !== newVersion) {
                // Save the package meta data
                updates.push(new DependencyToUpdate(dependency.Name, oldVersion, newVersion));
            }
        }

        return updates;
    }
}
