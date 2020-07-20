# Introduction

This is a tutorial on how to write [Azure Pipelines](https://azure.microsoft.com/services/devops/pipelines/) tasks to update [npm](https://www.npmjs.com/) and [NuGet](https://www.nuget.org/)-packages.
I am also going to describe how to use these tasks in an [Azure Pipeline](https://azure.microsoft.com/services/devops/pipelines/) and create a pull request in an [Azure Repos](https://azure.microsoft.com/services/devops/repos/) Git repository.
I am using [Visual Studio Codespaces](https://online.visualstudio.com/) to write this tutorial.
It provides the opportunity for a source code-managed development environment in the same way that we handle the source code in Git.
If you do not have access to [Visual Studio Codespaces](https://online.visualstudio.com/) you can use the [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension for [Visual Studio Code](https://code.visualstudio.com/) and [Docker](https://www.docker.com/) to host the container locally instead.
The [Azure Pipelines](https://azure.microsoft.com/services/devops/pipelines/) task are written in [Typescript](https://www.typescriptlang.org/) on top on [Node.js](https://nodejs.org) and are therefore cross platform.
That means that we can update [npm](https://www.npmjs.com/) and [NuGet](https://www.nuget.org/) packages on Windows, Linux and MacOS build agents.

## Setup Visual Studio Codespaces

In the root directory of the project, create a `.devcontainer` folder.
In that folder create these three files, `devcontainer.json`, `Dockerfile` and `dogtail.psm1`.
Add an `.editorconfig` file to the root folder.

```powershell
.
├── .devcontainer
│   ├── devcontainer.json
│   ├── Dockerfile
│   └── dogtail.psm1
├── .editorconfig
└── .gitignore
```

You can read more about [customizing Visual Studio Codespaces](https://code.visualstudio.com/docs/remote/codespaces) or [Developing inside a Container](https://code.visualstudio.com/docs/remote/containers).

### devcontainer.json

This file adds the VSCode extension and sets the default shell in the VSCode terminal to Powershell.

<!-- embedme .devcontainer/devcontainer.json -->
```json
```

### Dockerfile

I use `node:14-buster` as the base image for the development container.
I like `Powershell` as my shell so I install Powershell and the .NET Core SDK.
I also customize the prompt with [posh-git](https://github.com/dahlbyk/posh-git) ans [oh-my-posh](https://github.com/JanDeDobbeleer/oh-my-posh), [Scott Hanselman has a blog post](https://www.hanselman.com/blog/HowToMakeAPrettyPromptInWindowsTerminalWithPowerlineNerdFontsCascadiaCodeWSLAndOhmyposh.aspx) on how to do this.  

<!-- embedme .devcontainer/Dockerfile -->
```Dockerfile
```

### dogtail.psm1

I do not like the default prompt in [oh-my-posh](https://github.com/JanDeDobbeleer/oh-my-posh), when using [Visual Studio Codespaces](https://online.visualstudio.com/) the prompt starts with a long guid so I made my own style for [oh-my-posh](https://github.com/JanDeDobbeleer/oh-my-posh) that do not show the user in the prompt.

<!-- embedme .devcontainer/dogtail.psm1 -->
```Powershell
```

### .editorconfig

I added an [.editorconfig](https://editorconfig.org/) file to the project so every developer formats the code the same way.

<!-- embedme .editorconfig -->
```ini
```

### .gitignore

<!-- embedme .gitignore -->
```gitignore
```

## Setup the Typescript project

First initialize a Npm project.

```Powershell
npm init
npm install azure-pipelines-task-lib xml2js --save
npm install @types/node @types/q @types/xml2js --save-dev
```

### package.json

<!-- embedme package.json -->
```json
```

### package-lock.json

<!-- embedme package-lock.json -->
```json
```

### Typescript configuration files

Create a `Common` folder.
Create a `CommonV1` folder in the `Common` folder.
Create a `tsconfig.json` file in the `CommonV1` folder.

<!-- embedme Common/CommonV1/tsconfig.json -->
```json
```

Create a `Npm` folder.
Create a `NpmV1` folder in the `Npm` folder.
Create a `tsconfig.json` file in the `NpmV1` folder.

<!-- embedme Npm/NpmV1/tsconfig.json -->
```json
```

Create a `NuGet` folder.
Create a `NuGetV1` folder in the `NuGet` folder.
Create a `tsconfig.json` file in the `NuGet` folder.

<!-- embedme NuGet/NuGetV1/tsconfig.json -->
```json
```

In the `root` folder create a `tsconfig.json` file.

<!-- embedme tsconfig.json -->
```json
```

In the `root` folder create a `tsconfig-base.json` file.

<!-- embedme tsconfig-base.json -->
```json
```

### Summary: Setup Visual Studio Codespaces

We added files to configure [Visual Studio Codespaces](https://online.visualstudio.com/) and added the project files for our project.
Commit the files to you repository and create a [Visual Studio Codespaces](https://online.visualstudio.com/) for your repository.
We are now ready to write some code.

```powershell
.
├── .devcontainer
│   ├── Dockerfile
│   ├── devcontainer.json
│   └── dogtail.psm1
├── Common
│   └── CommonV1
│       └── tsconfig.json
├── Npm
│   └── NpmV1
│       └── tsconfig.json
├── NuGet
│   └── NuGetV1
│       └── tsconfig.json
├── .editorconfig
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── tsconfig-base.json
└── tsconfig.json
```

## Add common code for both the Npm and NuGet tasks

It is finally time to write som code!
We need a way to get what version of a package is in the project we run the updater on.

### DependencyToUpdate.ts

We need a data class for a package with properties for tha name of the package ans the old and new version.

<!-- embedme Common/CommonV1/src/DependencyToUpdate.ts -->
```Typescript
```

### DependencyFile.ts

We need a data class for a file where dependencies are specified.
For `Npm` this is the `package.json` file and for `NuGet` this is the `csproj` files.
We also need a list of all packages with the version information.

<!-- embedme Common/CommonV1/src/DependencyFile.ts -->
```Typescript
```

### FileFinder.ts

We need a way to recursive search a directory for the files where the packages is specified.
The filer argument should match the end of the path for the file.
If a path is `C:\temp\packages.json` the file will be returned if the filter is `package.json`
and if the path is `C:\temp\demo.csproj` the file will be returned if the filer is `csproj`.

<!-- embedme Common/CommonV1/src/FileFinder.ts -->
```Typescript
```

### IResultGenerator.ts

We need a way to format the result of an update for a file.
When we create the pull request we need a `Markdown` string containing the file, all packages that was updated, what the old version where and what the new version is.
When we run the [Azure Pipeline](https://azure.microsoft.com/services/devops/pipelines/) that updates our packages we will create a new branch before we run the updates.
We will check in the files that where changed so we need a string that contains a space separated list of all the files so we can run `git add FILES_VARIABLE` in the pipeline.
When we update `Npm` packages not only the `packages.json` file is updated but also the `package-lock.json` file.
When we update `NuGet` packages only the `csproj` file will be updates.
Thats why we need an interface and different implementation for the ResultGenerator for different package managers.

<!-- embedme Common/CommonV1/src/IResultGenerator.ts -->
```Typescript
```

### IUpdater.ts

The updater class is the class that runs the CLI for the package manager to update packages.
We will have one implementation for `Npm` and one for `NuGet`, thats why we need an interface.

<!-- embedme Common/CommonV1/src/IUpdater.ts -->
```Typescript
```

### UpdaterTask.ts

The UpdateTask orchestrates the update process of updating packages and creates and sets the output variables for the task.

<!-- embedme Common/CommonV1/src/UpdaterTask.ts -->
```Typescript
```

### Summary: Add common code for both the Npm and NuGet tasks

We added common code for finding files needed to be updated with new version of the packages,
code for getting information about the updates made and code for orchestrating the update process.

```powershell
.
├── .devcontainer
│   ├── Dockerfile
│   ├── devcontainer.json
│   └── dogtail.psm1
├── Common
│   └── CommonV1
│       ├── src
│       │   ├── DependencyFile.ts
│       │   ├── DependencyToUpdate.ts
│       │   ├── FileFinder.ts
│       │   ├── IResultGenerator.ts
│       │   ├── IUpdater.ts
│       │   └── UpdaterTask.ts
│       └── tsconfig.json
├── .editorconfig
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── tsconfig-base.json
└── tsconfig.json
```

## Add code for the Npm updater task

Let's implement the npm updater task first.
It will use the npm cli to update packages, for example `npm update <packageName>`.
The task will recursively search the specified folder for `package.json` files and run `npm update` for all packages in all the files it finds.

### NpmResultGenerator.ts

The concrete implementation of `IResultGenerator` for Npm packages.

<!-- embedme Npm/NpmV1/src/NpmResultGenerator.ts -->
```Typescript
```

### NpmVersionGetter.ts

The implementation of the version getter for Npm packages.

<!-- embedme Npm/NpmV1/src/NpmVersionGetter.ts -->
```Typescript
```

### NpmUpdater.ts

The concrete implementation of `IUpdater` for Npm packages.

<!-- embedme Npm/NpmV1/src/NpmUpdater.ts -->
```Typescript
```

### npmIndex.ts

The `run` function in this file is the function that executes when the task runs in a pipeline.
This function acts as our dependency creator.
It creates the objects needed by the `UpdateTask` class and calls the `run` method in the `UpdaterTask` class.

<!-- embedme Npm/NpmV1/src/index.ts -->
```Typescript
```

### Summary: Add code for the Npm updater task

```powershell
.
├── .devcontainer
│   ├── Dockerfile
│   ├── devcontainer.json
│   └── dogtail.psm1
├── Common
│   └── CommonV1
│       ├── src
│       │   ├── DependencyFile.ts
│       │   ├── DependencyToUpdate.ts
│       │   ├── FileFinder.ts
│       │   ├── IResultGenerator.ts
│       │   ├── IUpdater.ts
│       │   └── UpdaterTask.ts
│       └── tsconfig.json
├── Npm
│   └── NpmV1
│       ├── src
│       │   ├── NpmResultGenerator.ts
│       │   ├── NpmUpdater.ts
│       │   ├── NpmVersionGetter.ts
│       │   └── index.ts
│       └── tsconfig.json
├── .editorconfig
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── tsconfig-base.json
└── tsconfig.json
```

## Add code for the NuGet updater Task

The npm updater task is done, now let's implement the NuGet updater task.
It will use the dotnet cli to update packages, for example `dotnet add <filepath> package <packageName>`.
The task will recursively search the specified folder for `.csproj` files and run `dotnet add <filePath> package <packageName>` for all packages in all the files it finds.

### Dependency.ts

<!-- embedme NuGet/NuGetV1/src/Dependency.ts -->
```Typescript
```

### NuGetResultGenerator.ts

The concrete implementation of `IResultGenerator` for NuGet packages.

<!-- embedme NuGet/NuGetV1/src/NuGetResultGenerator.ts -->
```Typescript
```

### NuGetVersionGetter.ts

The implementation of the version getter for NuGet packages.

<!-- embedme NuGet/NuGetV1/src/NuGetVersionGetter.ts -->
```Typescript
```

### NuGetUpdater.ts

The concrete implementation of `IUpdater` for NuGet packages.

<!-- embedme NuGet/NuGetV1/src/NuGetUpdater.ts -->
```Typescript
```

### NuGetIndex.ts

The `run` function in this file is the function that executes when the task runs in a pipeline.
This function acts as our dependency creator.
It creates the objects needed by the `UpdateTask` class and calls the `run` method in the `UpdaterTask` class.

<!-- embedme NuGet/NuGetV1/src/index.ts -->
```Typescript
```

### Summary: Add code for the NuGet updater Task

```powershell
.
├── .devcontainer
│   ├── Dockerfile
│   ├── devcontainer.json
│   └── dogtail.psm1
├── Common
│   └── CommonV1
│       ├── src
│       │   ├── DependencyFile.ts
│       │   ├── DependencyToUpdate.ts
│       │   ├── FileFinder.ts
│       │   ├── IResultGenerator.ts
│       │   ├── IUpdater.ts
│       │   └── UpdaterTask.ts
│       └── tsconfig.json
├── Npm
│   └── NpmV1
│       ├── src
│       │   ├── NpmResultGenerator.ts
│       │   ├── NpmUpdater.ts
│       │   ├── NpmVersionGetter.ts
│       │   └── index.ts
│       └── tsconfig.json
├── NuGet
│   └── NuGetV1
│       ├── src
│       │   ├── Dependency.ts
│       │   ├── NuGetResultGenerator.ts
│       │   ├── NuGetUpdater.ts
│       │   ├── NuGetVersionGetter.ts
│       │   └── index.ts
│       └── tsconfig.json
├── .editorconfig
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── tsconfig-base.json
└── tsconfig.json
```

## Add task and extension files

To create a task there needs to be a `task.json` file.
This file contains the metadata for the tasks.

To create an extension for [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/) we need a manifest file, in my case `vss-extension.json`.
This file contains the metadata for the extension.

If you clone this repo and want to try it yourself remember to change all the `Guids` in the `task.json` and `vss-extension.json` files.

```powershell
New-Guid
```

Use powershell to generate a new `Guid`.

### task.json for the Npm task

The `task.json` file for the `Npm` task.

<!-- embedme Npm/NpmV1/task.json -->
```json
```

### task.json for the NuGet task

The `task.json` file for the `NuGet` task.

<!-- embedme NuGet/NuGetV1/task.json -->
```json
```

### vss-extension.json

The manifest file for the [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/) extension.

<!-- embedme vss-extension.json -->
```json
```

### Add icon files

Each task folder needs an icon file and the extension also needs an icon file.

### Summary: Add task and extension files

Almost all (the Azure Pipelines file is still missing) the files for the [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/) extension are done.
My file listing looks like this now.

```powershell
.
├── .devcontainer
│   ├── Dockerfile
│   ├── devcontainer.json
│   └── dogtail.psm1
├── Common
│   └── CommonV1
│       ├── src
│       │   ├── DependencyFile.ts
│       │   ├── DependencyToUpdate.ts
│       │   ├── FileFinder.ts
│       │   ├── IResultGenerator.ts
│       │   ├── IUpdater.ts
│       │   └── UpdaterTask.ts
│       └── tsconfig.json
├── Npm
│   └── NpmV1
│       ├── src
│       │   ├── NpmResultGenerator.ts
│       │   ├── NpmUpdater.ts
│       │   ├── NpmVersionGetter.ts
│       │   └── index.ts
│       ├── icon.png
│       ├── task.json
│       └── tsconfig.json
├── NuGet
│   └── NuGetV1
│       ├── src
│       │   ├── Dependency.ts
│       │   ├── NuGetResultGenerator.ts
│       │   ├── NuGetUpdater.ts
│       │   ├── NuGetVersionGetter.ts
│       │   └── index.ts
│       ├── icon.png
│       ├── task.json
│       └── tsconfig.json
├── .editorconfig
├── .gitignore
├── README.md
├── extension-icon.png
├── package-lock.json
├── package.json
├── tsconfig-base.json
├── tsconfig.json
└── vss-extension.json
```

If you make changes to one of the task that breaks backward compatibility like adding an input or output variable,
create a new version folder for that task and place the `code` and `task.json` for the new version in that folder.
Also remember to add the files in the `files` section in the `vss-extension.json` file.
You do not want to delete the old version of the task before every pipeline dependent on the old version of the task has upgraded to the new version,
if you do it will break all pipelines dependent on the old version of the task.

```powershell
.
└── Npm
    ├── NpmV1
    │   ├── src
    │   │   ├── NpmResultGenerator.ts
    │   │   ├── NpmUpdater.ts
    │   │   ├── NpmVersionGetter.ts
    │   │   └── index.ts
    │   ├── icon.png
    │   ├── task.json
    │   └── tsconfig.json
    └── NpmV2
        ├── src
        │   ├── NpmResultGenerator.ts
        │   ├── NpmUpdater.ts
        │   ├── NpmVersionGetter.ts
        │   └── index.ts
        ├── icon.png
        ├── task.json
        └── tsconfig.json
```

## Build and deploy the extension in an Azure Pipeline

The pipeline has three stages, `Build`, `Deploy` and `UpdateDependencies`.
`Build` triggers on every update of the `main` or `feature/*` branches.
`UpdateDependencies` runs when the pipeline is triggered by the scheduler.
If the pipeline is manually triggered the `ForceUpdateDependencies` parameter can be used to force the `UpdateDependencies` stage to run.
If a build is triggered by a pull request only the `Build` stage is run.
By default the pipeline is executed on the `ubuntu-latest` image but you can choose another image if you run the pipeline manually.
To be able to deploy the extension to your [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/) organization you need an account in the [Visual Studio Marketplace](https://marketplace.visualstudio.com/azuredevops).
You also need to add a service connection to the marketplace in your team project in [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/).
My service connection is named `Marketplace`.

### Scheduler

[Scheduled triggers](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/scheduled-triggers?view=azure-devops&tabs=yaml) can be used to trigger a pipeline.

```none
* * * * *
│ │ │ │ └──── Day of the Week   (range: 0-6, 0 standing for Sunday)
│ │ │ └────── Month of the Year (range: 1-12)
│ │ └──────── Day of the Month  (range: 1-31)
│ └────────── Hour              (range: 0-23)
└──────────── Minute            (range: 0-59)
```

### YAML Pipeline

The YAML pipeline for our repository.
this pipeline triggers every day at midnight to check if there are any updates to npm or NuGet packages in the repository.
Times are expressed in UTC (Coordinated Universal Time).
Add the `Build` and `Deploy` stage first, if you add the `UpdateDependencies` stage before the extension is deployed to your organization in [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/) the [Pipeline](https://azure.microsoft.com/services/devops/pipelines/) won't start because it can't find the `NpmUpdater` and/or `NuGetUpdater` Tasks.

<!-- embedme azure-pipelines.yml -->
```yaml
```

## Test Data

Create a folder named `TestData`, create `package.json`, `package-lock.json` and `OldVersion.csproj` files in the `TestData` folder.

### package.json

<!-- embedme TestData/package.json -->
```json
```

### package-lock.json

<!-- embedme TestData/package-lock.json -->
```json
```

### OldVersion.csproj

<!-- embedme TestData/OldVersion.csproj -->
```xml
```

```powershell
.
├── .devcontainer
│   ├── Dockerfile
│   ├── devcontainer.json
│   └── dogtail.psm1
├── Common
│   └── CommonV1
│       ├── src
│       │   ├── DependencyFile.ts
│       │   ├── DependencyToUpdate.ts
│       │   ├── FileFinder.ts
│       │   ├── IResultGenerator.ts
│       │   ├── IUpdater.ts
│       │   └── UpdaterTask.ts
│       └── tsconfig.json
├── Npm
│   └── NpmV1
│       ├── src
│       │   ├── NpmResultGenerator.ts
│       │   ├── NpmUpdater.ts
│       │   ├── NpmVersionGetter.ts
│       │   └── index.ts
│       ├── icon.png
│       ├── task.json
│       └── tsconfig.json
├── NuGet
│   └── NuGetV1
│       ├── src
│       │   ├── Dependency.ts
│       │   ├── NuGetResultGenerator.ts
│       │   ├── NuGetUpdater.ts
│       │   ├── NuGetVersionGetter.ts
│       │   └── index.ts
│       ├── icon.png
│       ├── task.json
│       └── tsconfig.json
├── TestData
│   ├── OldVersion.csproj
│   ├── package-lock.json
│   └── package.json
├── .editorconfig
├── .gitignore
├── README.md
├── azure-pipelines.yml
├── azure-pipelines_old.yml
├── extension-icon.png
├── package-lock.json
├── package.json
├── tsconfig-base.json
├── tsconfig.json
└── vss-extension.json
```

### Summary: Build and deploy the extension in an Azure Pipeline

A pull request is created against the branch the pipeline executed for.
We used the markdown output variables to create a description of all the updated packages for each file in the pull request.
There is a limit of 4000 characters in the description of a pull request in [Azure Repos](https://azure.microsoft.com/services/devops/repos/),
if the description markdown string is longer then 4000 characters we will truncate the string before we create the pull request.

```markdown
# DepenencyBot updated the following dependencies

 ## /package.json

* **@types/node:** ^14.0.4 => ^14.0.23

 ## /OldVersion.csproj

* **Newtonsoft.Json:** 12.0.2 => 12.0.3

```

## Summary

We created an extension for [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/) with two tasks to update [npm](https://www.npmjs.com/) and [NuGet](https://www.nuget.org/)-packages.
We created a pipeline that builds and publishes the extension to [Visual Studio Marketplace](https://marketplace.visualstudio.com/azuredevops) and then deploys the extension to an organization in [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/).
We also tried our new tasks in the `UpdateDependencies` stage of our pipeline and got a pull request with updated packages.
There are more package managers out there.
I hope this helps you to implement the next task to update dependencies on your own.
