import * as tl from 'azure-pipelines-task-lib/task';
import { IUpdater } from './IUpdater';
import { IResultGenerator } from './IResultGenerator';

/**
 * Main class for the NuGet updater task.
 */
export class UpdaterTask {
    readonly updater: IUpdater;
    readonly resultGenerator: IResultGenerator;

    /**
     * Contractor for {@linkcode UpdaterTask}
     *
     * @param updater An implementation of {@linkcode IUpdater}
     * @param resultGenerator An instance of {@linkcode IResultGenerator}
     */
    constructor(updater: IUpdater, resultGenerator: IResultGenerator) {
        this.updater = updater;
        this.resultGenerator = resultGenerator;
    }

    /**
     * Main method of the task
     */
    public async run() {
        try {
            // Get the root path
            const dependencyPath = tl.getPathInput('Path', true, true) as string;

            // Update dependencies
            const files = await this.updater.updateDependencies(dependencyPath as string);

            // Get Markdown string for updated dependencies
            const markdown = this.resultGenerator.getMarkdown(files);

            // Set the output variable for Markdown
            tl.setVariable('Markdown', markdown);

            // Get space separated file list of updated files
            const changedFiles = this.resultGenerator.getFiles(files);

            // Set the output variable for files
            tl.setVariable('Files', changedFiles);

            // Set a succeeded result for the task
            tl.setResult(tl.TaskResult.Succeeded, dependencyPath, true);
        }
        catch (error) {
            // Set a failed result for the task
            tl.setResult(tl.TaskResult.Failed, error.message);
        }
    }
}
