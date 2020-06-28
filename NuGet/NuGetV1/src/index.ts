import { NuGetUpdater } from './NuGetUpdater';
import { NuGetVersionGetter } from './NuGetVersionGetter';
import { NuGetResultGenerator } from './NuGetResultGenerator';
import { FileFinder } from '../../../Common/CommonV1/src/FileFinder';
import { UpdaterTask } from '../../../Common/CommonV1/src/UpdaterTask'

/**
 * Function that gets called when the task executes.
 */
async function run() {
    // Create a FileFinder object
    const fileFinder: FileFinder = new FileFinder();

    // Create a ResultGenerator object
    const resultGenerator: NuGetResultGenerator = new NuGetResultGenerator();

    // Create a VersionGetter object 
    const versionGetter: NuGetVersionGetter = new NuGetVersionGetter();

    // Create a NpmUpdater object and pass the file finder and version getter objects to the constructor
    const updater: NuGetUpdater = new NuGetUpdater(fileFinder, versionGetter);

    // Create a NpmUpdaterTask object and pass the updater and result generator to the constructor
    const task: UpdaterTask = new UpdaterTask(updater, resultGenerator);

    // Run the task
    await task.run();
}

// Execute the run function
run();
