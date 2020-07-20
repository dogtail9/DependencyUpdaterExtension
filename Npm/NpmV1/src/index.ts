import { NpmUpdater } from './NpmUpdater';
import { NpmVersionGetter } from './NpmVersionGetter';
import { NpmResultGenerator } from './NpmResultGenerator';
import { FileFinder } from '../../../Common/CommonV1/src/FileFinder';
import { UpdaterTask } from '../../../Common/CommonV1/src/UpdaterTask';

/**
 * Function that gets called when the task executes.
 */
async function run() {
    // Create a FileFinder object
    const fileFinder: FileFinder = new FileFinder();

    // Create a ResultGenerator object
    const resultGenerator: NpmResultGenerator = new NpmResultGenerator();

    // Create a VersionGetter object 
    const versionGetter: NpmVersionGetter = new NpmVersionGetter();

    // Create a NpmUpdater object and pass the file finder and version getter objects to the constructor
    const updater: NpmUpdater = new NpmUpdater(fileFinder, versionGetter);

    // Create a NpmUpdaterTask object and pass the updater and result generator to the constructor
    const task: UpdaterTask = new UpdaterTask(updater, resultGenerator);

    // Run the task
    await task.run();
}

// Execute the run function
run();
