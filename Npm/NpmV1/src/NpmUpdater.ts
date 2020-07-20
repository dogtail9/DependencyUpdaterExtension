import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as path from 'path';
import * as fs from 'fs';
import { IUpdater } from '../../../Common/CommonV1/src//IUpdater';
import { DependencyToUpdate } from '../../../Common/CommonV1/src//DependencyToUpdate';
import { DependencyFile } from '../../../Common/CommonV1/src//DependencyFile';
import { NpmVersionGetter } from './NpmVersionGetter';
import { FileFinder } from '../../../Common/CommonV1/src//FileFinder';

/**
 * Update npm packages
 */
export class NpmUpdater implements IUpdater {
    readonly versionGetter: NpmVersionGetter;
    readonly fileFinder: FileFinder;
    /**
     * Contractor for {@linkcode NpmUpdater}
     * 
     * @param fileFinder an implementation of {@linkcode FileFinder}
     * @param versionGetter an implementation of {@linkcode NpmVersionGetter}
     */
    constructor(fileFinder: FileFinder, versionGetter: NpmVersionGetter) {
        this.fileFinder = fileFinder;
        this.versionGetter = versionGetter;
    }

    /**
     * Updates all `package.json` files in the directory specified.
     * 
     * @remarks
     * Recursively searches the specified path for `package.json` files and updates all specified packages 
     * in respective file. 
     * 
     * @param rootPath The root path to start the search for `package.json` file in.
     * 
     * @returns An array of {@linkcode DependencyFile}
     */
    public async updateDependencies(rootPath: string): Promise<DependencyFile[]> {
        const updates: DependencyFile[] = [];

        // Recursively get all package.json files in rootPath
        const files = this.fileFinder.getAllPathForFilename(rootPath, 'package.json');

        for (const file of files) {
            // update npm packages 
            const updatesForFile = await this.updateDependenciesForFile(path.join(rootPath, file));

            // If there is any updates for the package.json
            if (updatesForFile.length > 0)
                // Save the meta data about what packages where updated
                updates.push(new DependencyFile(file, updatesForFile));
        }

        return updates;
    }

    private async updateDependenciesForFile(filePath: string): Promise<DependencyToUpdate[]> {
        let updates: DependencyToUpdate[] = [];

        // Check if the package.json file exists on disk
        if (fs.existsSync(filePath)) {
            // Read the text form of the package.json file
            const text = fs.readFileSync(filePath, 'utf-8');

            // Convert the text to a Json object
            const obj = JSON.parse(text);

            // Get the different dependencies sections of the package.json file
            const dependencies = obj['dependencies'];
            const devDependencies = obj['devDependencies'];
            const optionalDependencies = obj['optionalDependencies'];

            // Update packages for the different dependency sections in the package.json
            updates = updates.concat(await this.updatePackages(dependencies, filePath));
            updates = updates.concat(await this.updatePackages(devDependencies, filePath));
            updates = updates.concat(await this.updatePackages(optionalDependencies, filePath));
        }

        return updates;
    }

    private async updatePackages(dependencies: JSON, filePath: string): Promise<DependencyToUpdate[]> {
        const updates: DependencyToUpdate[] = [];

        for (const dependency in dependencies) {
            // Get the old version of the package
            const oldVersion: string = dependencies[dependency];

            // get the path of the folder containing the package.json file
            const workingDirectory = path.dirname(filePath);

            // Use the SDK to get the npm tool
            const npm = tl.tool(tl.which('npm', true));

            // Add argument 'update' to the npm command
            npm.arg('update');

            // Add the dependency name to the npm command
            npm.arg(dependency);

            // Set the working directory for the npm command
            const options = { cwd: workingDirectory } as tr.IExecOptions;

            // Run the npm update command for the package
            const exitCode = await npm.exec(options);

            if(exitCode != 0)
            {}

            // Get the the version of the package
            const newVersion = this.versionGetter.getNewVersion(filePath, dependency);

            console.log(dependency + ': ' + oldVersion + ' ==> ' + newVersion);
            // Check in the package was updated
            if (oldVersion !== newVersion) {
                // Save the package meta data
                updates.push(new DependencyToUpdate(dependency, oldVersion, newVersion));
            }
        }

        return updates;
    }
}
