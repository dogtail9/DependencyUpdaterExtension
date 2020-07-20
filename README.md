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
{
    "name": "DependencyUpdaterExtension",
    "dockerFile": "Dockerfile",
    // Set *default* container specific settings.json values on container create.
    "settings": {
        "terminal.integrated.shell.linux": "/opt/microsoft/powershell/7/pwsh",
        "editor.fontFamily": "'Cascadia Code PL', Consolas, 'Courier New', monospace",
        "window.menuBarVisibility": "visible",
        "explorer.openEditors.visible": 0,
        "workbench.colorTheme": "Default Dark+",
        "cSpell.words": [
            "linkcode",
            "codespaces",
            "devcontainer",
            "dogtail",
            "Cascadia",
            "Consolas",
            "pwsh",
            "monospace",
            "streetsidesoftware",
            "mhutchie",
            "davidanson",
            "markdownlint",
            "azuretools",
            "onlyutkarsh",
            "vsix",
            "editorconfig",
            "noninteractive",
            "CLIs",
            "autoremove",
            "dpkg",
            "procps",
            "Repos",
            "taskkey",
            "tsbuildinfo",
            "dependencyupdaterextension",
            "Hanselman",
            "dependencybot",
            "toolrunner",
            "Christer",
            "Eriksson",
            "embedme"
        ]
    },
    // Add the IDs of extensions you want installed when the container is created.
    "extensions": [
        "ms-vscode.vs-keybindings",
        "streetsidesoftware.code-spell-checker",
        "mhutchie.git-graph",
        "davidanson.vscode-markdownlint",
        "ms-azuretools.vscode-docker",
        "ms-vscode.powershell-preview",
        "ms-vscode.vscode-typescript-tslint-plugin",
        "onlyutkarsh.vsix-viewer",
        "editorconfig.editorconfig",
        "ms-azure-devops.azure-pipelines"
    ],
    // Use 'forwardPorts' to make a list of ports inside the container available locally.
    // "forwardPorts": [],
    // Use 'postCreateCommand' to run commands after the container is created.
    // "postCreateCommand": "npm install"
    // Uncomment to connect as a non-root user. See https://aka.ms/vscode-remote/containers/non-root.
    // "remoteUser": "node"
}

```

### Dockerfile

I use `node:14-buster` as the base image for the development container.
I like `Powershell` as my shell so I install Powershell and the .NET Core SDK.
I also customize the prompt with [posh-git](https://github.com/dahlbyk/posh-git) ans [oh-my-posh](https://github.com/JanDeDobbeleer/oh-my-posh), [Scott Hanselman has a blog post](https://www.hanselman.com/blog/HowToMakeAPrettyPromptInWindowsTerminalWithPowerlineNerdFontsCascadiaCodeWSLAndOhmyposh.aspx) on how to do this.  

<!-- embedme .devcontainer/Dockerfile -->
```Dockerfile
FROM node:14-buster

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Configure apt and install packages
RUN apt-get update \
    && apt-get -y install --no-install-recommends apt-utils 2>&1 \
    # Verify git, process tools, lsb-release (common in install instructions for CLIs), wget installed
    && apt-get -y install git procps lsb-release wget \
    # Install PowerShell 7
    && wget https://packages.microsoft.com/config/debian/10/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y powershell \
    && apt-get install -y tree \
    # Install .NET Core 3.1
    && apt-get install -y apt-transport-https \
    && apt-get update \
    && apt-get install -y dotnet-sdk-3.1 \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Powershell customization
ENV DOTNET_CLI_TELEMETRY_OPTOUT=true
COPY dogtail.psm1 /root/.config/powershell/PoshThemes/dogtail.psm1
RUN pwsh -c 'Install-Module posh-git -Scope CurrentUser -Force'
RUN pwsh -c 'Install-Module oh-my-posh -Scope CurrentUser -Force'
RUN pwsh -c 'Install-Module -Name PSReadLine -AllowPrerelease -Scope CurrentUser -Force -SkipPublisherCheck'
RUN \
    ## Create PS profile
    pwsh -c 'New-Item -Path $profile -ItemType File -Force' \
    ## Add alias
    && pwsh -c "'Import-Module posh-git' | Out-File -FilePath \$profile" \
    && pwsh -c "Add-Content -Path \$profile -Value 'Import-Module oh-my-posh'" \
    && pwsh -c "Add-Content -Path \$profile -Value 'Set-Theme dogtail'"

# Install Developer Tools
RUN npm install -g typescript
RUN npm i -g tfx-cli
RUN npm install -g editorconfig

# Install embedme
RUN npm install -g embedme

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog

```

### dogtail.psm1

I do not like the default prompt in [oh-my-posh](https://github.com/JanDeDobbeleer/oh-my-posh), when using [Visual Studio Codespaces](https://online.visualstudio.com/) the prompt starts with a long guid so I made my own style for [oh-my-posh](https://github.com/JanDeDobbeleer/oh-my-posh) that do not show the user in the prompt.

<!-- embedme .devcontainer/dogtail.psm1 -->
```Powershell
#requires -Version 2 -Modules posh-git

function Write-Theme {
    param(
        [bool]
        $lastCommandFailed,
        [string]
        $with
    )

    $lastColor = $sl.Colors.PromptBackgroundColor
    $prompt = Write-Prompt -Object $sl.PromptSymbols.StartSymbol -ForegroundColor $sl.Colors.PromptForegroundColor -BackgroundColor $sl.Colors.SessionInfoBackgroundColor

    #check the last command state and indicate if failed
    If ($lastCommandFailed) {
        $prompt += Write-Prompt -Object "$($sl.PromptSymbols.FailedCommandSymbol) " -ForegroundColor $sl.Colors.CommandFailedIconForegroundColor -BackgroundColor $sl.Colors.SessionInfoBackgroundColor
    }

    #check for elevated prompt
    If (Test-Administrator) {
        $prompt += Write-Prompt -Object "$($sl.PromptSymbols.ElevatedSymbol) " -ForegroundColor $sl.Colors.AdminIconForegroundColor -BackgroundColor $sl.Colors.SessionInfoBackgroundColor
    }

    $user = $sl.CurrentUser
    $computer = $sl.CurrentHostname
    $path = Get-FullPath -dir $pwd

    if (Test-VirtualEnv) {
        $prompt += Write-Prompt -Object "$($sl.PromptSymbols.SegmentForwardSymbol) " -ForegroundColor $sl.Colors.SessionInfoBackgroundColor -BackgroundColor $sl.Colors.VirtualEnvBackgroundColor
        $prompt += Write-Prompt -Object "$($sl.PromptSymbols.VirtualEnvSymbol) $(Get-VirtualEnvName) " -ForegroundColor $sl.Colors.VirtualEnvForegroundColor -BackgroundColor $sl.Colors.VirtualEnvBackgroundColor
        $prompt += Write-Prompt -Object "$($sl.PromptSymbols.SegmentForwardSymbol) " -ForegroundColor $sl.Colors.VirtualEnvBackgroundColor -BackgroundColor $sl.Colors.PromptBackgroundColor
    }
    else {
        $prompt += Write-Prompt -Object "$($sl.PromptSymbols.SegmentForwardSymbol) " -ForegroundColor $sl.Colors.SessionInfoBackgroundColor -BackgroundColor $sl.Colors.PromptBackgroundColor
    }

    # Writes the drive portion
    $prompt += Write-Prompt -Object "$path " -ForegroundColor $sl.Colors.PromptForegroundColor -BackgroundColor $sl.Colors.PromptBackgroundColor

    $status = Get-VCSStatus
    if ($status) {
        $themeInfo = Get-VcsInfo -status ($status)
        $lastColor = $themeInfo.BackgroundColor
        $prompt += Write-Prompt -Object $($sl.PromptSymbols.SegmentForwardSymbol) -ForegroundColor $sl.Colors.PromptBackgroundColor -BackgroundColor $lastColor
        $prompt += Write-Prompt -Object " $($themeInfo.VcInfo) " -BackgroundColor $lastColor -ForegroundColor $sl.Colors.GitForegroundColor
    }

    # Writes the postfix to the prompt
    $prompt += Write-Prompt -Object $sl.PromptSymbols.SegmentForwardSymbol -ForegroundColor $lastColor

    $timeStamp = Get-Date -UFormat %R
    $timestamp = "[$timeStamp]"

    $prompt += Set-CursorForRightBlockWrite -textLength ($timestamp.Length + 1)
    $prompt += Write-Prompt $timeStamp -ForegroundColor $sl.Colors.PromptForegroundColor

    $prompt += Set-Newline

    if ($with) {
        $prompt += Write-Prompt -Object "$($with.ToUpper()) " -BackgroundColor $sl.Colors.WithBackgroundColor -ForegroundColor $sl.Colors.WithForegroundColor
    }
    $prompt += Write-Prompt -Object ($sl.PromptSymbols.PromptIndicator) -ForegroundColor $sl.Colors.PromptBackgroundColor
    $prompt += ' '
    $prompt
}

$sl = $global:ThemeSettings #local settings
$sl.PromptSymbols.StartSymbol = ''
$sl.PromptSymbols.PromptIndicator = [char]::ConvertFromUtf32(0x276F)
$sl.PromptSymbols.SegmentForwardSymbol = [char]::ConvertFromUtf32(0xE0B0)
$sl.Colors.PromptForegroundColor = [ConsoleColor]::White
$sl.Colors.PromptSymbolColor = [ConsoleColor]::White
$sl.Colors.PromptHighlightColor = [ConsoleColor]::DarkBlue
$sl.Colors.GitForegroundColor = [ConsoleColor]::Black
$sl.Colors.WithForegroundColor = [ConsoleColor]::DarkRed
$sl.Colors.WithBackgroundColor = [ConsoleColor]::Magenta
$sl.Colors.VirtualEnvBackgroundColor = [System.ConsoleColor]::Red
$sl.Colors.VirtualEnvForegroundColor = [System.ConsoleColor]::White

```

### .editorconfig

I added an [.editorconfig](https://editorconfig.org/) file to the project so every developer formats the code the same way.

<!-- embedme .editorconfig -->
```ini
# EditorConfig is awesome: https://EditorConfig.org

# top-most EditorConfig file
root = true

# Unix-style newlines with a newline ending every file
[*]
end_of_line = lf
insert_final_newline = true

# Matches multiple files with brace expansion notation
# Set default charset
[*.{js}]
charset = utf-8

# 4 space indentation
[*.js]
indent_style = space
indent_size = 4

[*.json]
indent_style = space
indent_size = 4

[*.psm1]
indent_style = space
indent_size = 4

# Indentation override for all JS under lib directory
[lib/**.js]
indent_style = space
indent_size = 2

# Matches the exact files either package.json or .travis.yml
[{package.json,.travis.yml}]
indent_style = space
indent_size = 2

```

### .gitignore

<!-- embedme .gitignore -->
```gitignore
node_modules/
built/
.taskkey
*.vsix
*.tgz
*.tsbuildinfo

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
{
  "name": "dependencyupdaterextension",
  "version": "0.0.1",
  "description": "Azure pipelines tasks to update npm and NuGet packages",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "tsc -b -v",
    "clean": "tsc -b --clean",
    "package": "tsc -b -v && tfx extension create --manifest-globs vss-extension.json"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/dogtail9/DependencyUpdaterExtension.git"
  },
  "keywords": [
    "Npm",
    "NuGet",
    "Azure",
    "Pipeline"
  ],
  "author": "Dogtail9",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/dogtail9/DependencyUpdaterExtension/issues"
  },
  "homepage": "https://github.com/dogtail9/DependencyUpdaterExtension#readme",
  "dependencies": {
    "azure-pipelines-task-lib": "^2.9.6",
    "xml2js": "^0.4.23"
  },
  "devDependencies": {
    "@types/node": "^14.0.14",
    "@types/q": "^1.5.4",
    "@types/xml2js": "^0.4.5"
  }
}

```

### package-lock.json

<!-- embedme package-lock.json -->
```json
{
  "name": "dependencyupdaterextension",
  "version": "0.0.1",
  "lockfileVersion": 1,
  "requires": true,
  "dependencies": {
    "@types/node": {
      "version": "14.0.14",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-14.0.14.tgz",
      "integrity": "sha512-syUgf67ZQpaJj01/tRTknkMNoBBLWJOBODF0Zm4NrXmiSuxjymFrxnTu1QVYRubhVkRcZLYZG8STTwJRdVm/WQ==",
      "dev": true
    },
    "@types/q": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/@types/q/-/q-1.5.4.tgz",
      "integrity": "sha512-1HcDas8SEj4z1Wc696tH56G8OlRaH/sqZOynNNB+HF0WOeXPaxTtbYzJY2oEfiUxjSKjhCKr+MvR7dCHcEelug==",
      "dev": true
    },
    "@types/xml2js": {
      "version": "0.4.5",
      "resolved": "https://registry.npmjs.org/@types/xml2js/-/xml2js-0.4.5.tgz",
      "integrity": "sha512-yohU3zMn0fkhlape1nxXG2bLEGZRc1FeqF80RoHaYXJN7uibaauXfhzhOJr1Xh36sn+/tx21QAOf07b/xYVk1w==",
      "dev": true,
      "requires": {
        "@types/node": "*"
      }
    },
    "asap": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/asap/-/asap-2.0.6.tgz",
      "integrity": "sha1-5QNHYR1+aQlDIIu9r+vLwvuGbUY="
    },
    "azure-pipelines-task-lib": {
      "version": "2.9.6",
      "resolved": "https://registry.npmjs.org/azure-pipelines-task-lib/-/azure-pipelines-task-lib-2.9.6.tgz",
      "integrity": "sha512-KTJuFdMl/r1Y8Snh5lHyV2YOyTu9bKzltMlRlnod8YKLc9GfENDkxwm+z9cHH6NlDln+2YI3G82Ri9XcbhyuZg==",
      "requires": {
        "minimatch": "3.0.4",
        "mockery": "^1.7.0",
        "q": "^1.1.2",
        "semver": "^5.1.0",
        "shelljs": "^0.3.0",
        "sync-request": "3.0.1",
        "uuid": "^3.0.1"
      }
    },
    "balanced-match": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.0.tgz",
      "integrity": "sha1-ibTRmasr7kneFk6gK4nORi1xt2c="
    },
    "brace-expansion": {
      "version": "1.1.11",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.11.tgz",
      "integrity": "sha512-iCuPHDFgrHX7H2vEI/5xpz07zSHB00TpugqhmYtVmMO6518mCuRMoOYFldEBl0g187ufozdaHgWKcYFb61qGiA==",
      "requires": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "buffer-from": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/buffer-from/-/buffer-from-1.1.1.tgz",
      "integrity": "sha512-MQcXEUbCKtEo7bhqEs6560Hyd4XaovZlO/k9V3hjVUF/zwW7KBVdSK4gIt/bzwS9MbR5qob+F5jusZsb0YQK2A=="
    },
    "caseless": {
      "version": "0.11.0",
      "resolved": "https://registry.npmjs.org/caseless/-/caseless-0.11.0.tgz",
      "integrity": "sha1-cVuW6phBWTzDMGeSP17GDr2k99c="
    },
    "concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha1-2Klr13/Wjfd5OnMDajug1UBdR3s="
    },
    "concat-stream": {
      "version": "1.6.2",
      "resolved": "https://registry.npmjs.org/concat-stream/-/concat-stream-1.6.2.tgz",
      "integrity": "sha512-27HBghJxjiZtIk3Ycvn/4kbJk/1uZuJFfuPEns6LaEvpvG1f0hTea8lilrouyo9mVc2GWdcEZ8OLoGmSADlrCw==",
      "requires": {
        "buffer-from": "^1.0.0",
        "inherits": "^2.0.3",
        "readable-stream": "^2.2.2",
        "typedarray": "^0.0.6"
      }
    },
    "core-util-is": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/core-util-is/-/core-util-is-1.0.2.tgz",
      "integrity": "sha1-tf1UIgqivFq1eqtxQMlAdUUDwac="
    },
    "http-basic": {
      "version": "2.5.1",
      "resolved": "https://registry.npmjs.org/http-basic/-/http-basic-2.5.1.tgz",
      "integrity": "sha1-jORHvbW2xXf4pj4/p4BW7Eu02/s=",
      "requires": {
        "caseless": "~0.11.0",
        "concat-stream": "^1.4.6",
        "http-response-object": "^1.0.0"
      }
    },
    "http-response-object": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/http-response-object/-/http-response-object-1.1.0.tgz",
      "integrity": "sha1-p8TnWq6C87tJBOT0P2FWc7TVGMM="
    },
    "inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ=="
    },
    "isarray": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-1.0.0.tgz",
      "integrity": "sha1-u5NdSFgsuhaMBoNJV6VKPgcSTxE="
    },
    "minimatch": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.0.4.tgz",
      "integrity": "sha512-yJHVQEhyqPLUTgt9B83PXu6W3rx4MvvHvSUvToogpwoGDOUQ+yDrR0HRot+yOCdCO7u4hX3pWft6kWBBcqh0UA==",
      "requires": {
        "brace-expansion": "^1.1.7"
      }
    },
    "mockery": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/mockery/-/mockery-1.7.0.tgz",
      "integrity": "sha1-9O3g2HUMHJcnwnLqLGBiniyaHE8="
    },
    "process-nextick-args": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/process-nextick-args/-/process-nextick-args-2.0.1.tgz",
      "integrity": "sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag=="
    },
    "promise": {
      "version": "7.3.1",
      "resolved": "https://registry.npmjs.org/promise/-/promise-7.3.1.tgz",
      "integrity": "sha512-nolQXZ/4L+bP/UGlkfaIujX9BKxGwmQ9OT4mOt5yvy8iK1h3wqTEJCijzGANTCCl9nWjY41juyAn2K3Q1hLLTg==",
      "requires": {
        "asap": "~2.0.3"
      }
    },
    "q": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/q/-/q-1.5.1.tgz",
      "integrity": "sha1-fjL3W0E4EpHQRhHxvxQQmsAGUdc="
    },
    "qs": {
      "version": "6.9.4",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.9.4.tgz",
      "integrity": "sha512-A1kFqHekCTM7cz0udomYUoYNWjBebHm/5wzU/XqrBRBNWectVH0QIiN+NEcZ0Dte5hvzHwbr8+XQmguPhJ6WdQ=="
    },
    "readable-stream": {
      "version": "2.3.7",
      "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.7.tgz",
      "integrity": "sha512-Ebho8K4jIbHAxnuxi7o42OrZgF/ZTNcsZj6nRKyUmkhLFq8CHItp/fy6hQZuZmP/n3yZ9VBUbp4zz/mX8hmYPw==",
      "requires": {
        "core-util-is": "~1.0.0",
        "inherits": "~2.0.3",
        "isarray": "~1.0.0",
        "process-nextick-args": "~2.0.0",
        "safe-buffer": "~5.1.1",
        "string_decoder": "~1.1.1",
        "util-deprecate": "~1.0.1"
      }
    },
    "safe-buffer": {
      "version": "5.1.2",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
      "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g=="
    },
    "sax": {
      "version": "1.2.4",
      "resolved": "https://registry.npmjs.org/sax/-/sax-1.2.4.tgz",
      "integrity": "sha512-NqVDv9TpANUjFm0N8uM5GxL36UgKi9/atZw+x7YFnQ8ckwFGKrl4xX4yWtrey3UJm5nP1kUbnYgLopqWNSRhWw=="
    },
    "semver": {
      "version": "5.7.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-5.7.1.tgz",
      "integrity": "sha512-sauaDf/PZdVgrLTNYHRtpXa1iRiKcaebiKQ1BJdpQlWH2lCvexQdX55snPFyK7QzpudqbCI0qXFfOasHdyNDGQ=="
    },
    "shelljs": {
      "version": "0.3.0",
      "resolved": "https://registry.npmjs.org/shelljs/-/shelljs-0.3.0.tgz",
      "integrity": "sha1-NZbmMHp4FUT1kfN9phg2DzHbV7E="
    },
    "string_decoder": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
      "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
      "requires": {
        "safe-buffer": "~5.1.0"
      }
    },
    "sync-request": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/sync-request/-/sync-request-3.0.1.tgz",
      "integrity": "sha1-yqEjWq+Im6UBB2oYNMQ2gwqC+3M=",
      "requires": {
        "concat-stream": "^1.4.7",
        "http-response-object": "^1.0.1",
        "then-request": "^2.0.1"
      }
    },
    "then-request": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/then-request/-/then-request-2.2.0.tgz",
      "integrity": "sha1-ZnizL6DKIY/laZgbvYhxtZQGDYE=",
      "requires": {
        "caseless": "~0.11.0",
        "concat-stream": "^1.4.7",
        "http-basic": "^2.5.1",
        "http-response-object": "^1.1.0",
        "promise": "^7.1.1",
        "qs": "^6.1.0"
      }
    },
    "typedarray": {
      "version": "0.0.6",
      "resolved": "https://registry.npmjs.org/typedarray/-/typedarray-0.0.6.tgz",
      "integrity": "sha1-hnrHTjhkGHsdPUfZlqeOxciDB3c="
    },
    "util-deprecate": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
      "integrity": "sha1-RQ1Nyfpw3nMnYvvS1KKJgUGaDM8="
    },
    "uuid": {
      "version": "3.4.0",
      "resolved": "https://registry.npmjs.org/uuid/-/uuid-3.4.0.tgz",
      "integrity": "sha512-HjSDRw6gZE5JMggctHBcjVak08+KEVhSIiDzFnT9S9aegmp85S/bReBVTb4QTFaRNptJ9kuYaNhnbNEOkbKb/A=="
    },
    "xml2js": {
      "version": "0.4.23",
      "resolved": "https://registry.npmjs.org/xml2js/-/xml2js-0.4.23.tgz",
      "integrity": "sha512-ySPiMjM0+pLDftHgXY4By0uswI3SPKLDw/i3UXbnO8M/p28zqexCUoPmQFrYD+/1BzhGJSs2i1ERWKJAtiLrug==",
      "requires": {
        "sax": ">=0.6.0",
        "xmlbuilder": "~11.0.0"
      }
    },
    "xmlbuilder": {
      "version": "11.0.1",
      "resolved": "https://registry.npmjs.org/xmlbuilder/-/xmlbuilder-11.0.1.tgz",
      "integrity": "sha512-fDlsI/kFEx7gLvbecc0/ohLG50fugQp8ryHzMTuW9vSa1GJ0XYWKnhsUx7oie3G98+r56aTQIUB4kht42R3JvA=="
    }
  }
}

```

### Typescript configuration files

Create a `Common` folder.
Create a `CommonV1` folder in the `Common` folder.
Create a `tsconfig.json` file in the `CommonV1` folder.

<!-- embedme Common/CommonV1/tsconfig.json -->
```json
{
    "extends": "../../tsconfig-base.json",
    "compilerOptions": {
        "outDir": "../../built/Common/CommonV1",
        "rootDir": "."
    }
}

```

Create a `Npm` folder.
Create a `NpmV1` folder in the `Npm` folder.
Create a `tsconfig.json` file in the `NpmV1` folder.

<!-- embedme Npm/NpmV1/tsconfig.json -->
```json
{
    "extends": "../../tsconfig-base.json",
    "compilerOptions": {
        "outDir": "../../built/Npm/NpmV1",
        "rootDir": "."
    },
    "references": [
        { "path": "../../Common/CommonV1" }
      ]
}

```

Create a `NuGet` folder.
Create a `NuGetV1` folder in the `NuGet` folder.
Create a `tsconfig.json` file in the `NuGet` folder.

<!-- embedme NuGet/NuGetV1/tsconfig.json -->
```json
{
    "extends": "../../tsconfig-base.json",
    "compilerOptions": {
        "outDir": "../../built/NuGet/NuGetV1",
        "rootDir": "."
    },
    "references": [
        { "path": "../../Common/CommonV1" }
      ]
}

```

In the `root` folder create a `tsconfig.json` file.

<!-- embedme tsconfig.json -->
```json
{
    "files": [],
    "references": [
        {
            "path": "./Npm/NpmV1"
        },
        {
            "path": "./NuGet/NuGetV1"
        }
    ]
}

```

In the `root` folder create a `tsconfig-base.json` file.

<!-- embedme tsconfig-base.json -->
```json
{
    "compilerOptions": {
        "module": "commonjs",
        "target": "es6",
        "declaration": true,
        "noImplicitAny": false,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "composite": true
    }
}

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
/**
 * Data class for a dependency. Stores the name och the package and the new and old versions.
 */
export class DependencyToUpdate {
    /**
     * Contractor for {@linkcode DependencyToUpdate}
     * 
     * @param name The name of the package.
     * @param oldVersion The old version of the package.
     * @param newVersion The new version of the package.
     */
    constructor(public name: string, public oldVersion: string, public newVersion: string) { }
}

```

### DependencyFile.ts

We need a data class for a file where dependencies are specified.
For `Npm` this is the `package.json` file and for `NuGet` this is the `csproj` files.
We also need a list of all packages with the version information.

<!-- embedme Common/CommonV1/src/DependencyFile.ts -->
```Typescript
import { DependencyToUpdate } from './DependencyToUpdate';

/**
 * Data class for a dependency file. Stores the path to the dependency file and all updated packages.
 * This data is used to generate the Markdown for the description in the pull request and the list of files to be added to the `dependencybot` branch.
 */
export class DependencyFile {
    /**
     * 
     * @param path The path to the dependency file.
     * @param updates All updated dependencies for the file.
     */
    constructor(public path: string, public updates: DependencyToUpdate[]) { }
}

```

### FileFinder.ts

We need a way to recursive search a directory for the files where the packages is specified.
The filer argument should match the end of the path for the file.
If a path is `C:\temp\packages.json` the file will be returned if the filter is `package.json`
and if the path is `C:\temp\demo.csproj` the file will be returned if the filer is `csproj`.

<!-- embedme Common/CommonV1/src/FileFinder.ts -->
```Typescript
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
import { DependencyFile } from './DependencyFile';

/**
 * Generates results in different formats for the updated packages in the dependency files supplied.
 */
export interface IResultGenerator {
    /**
     * Get the updated dependencies in markdown format.
     * 
     * @param files An array of {@linkcode DependencyFile} 
     * 
     * @returns A markdown formatted string with information about what packages got updated.
     */
    getMarkdown(files: DependencyFile[]): string;

    /**
     * Gets a space separated string of updated files.
     * 
     * @param files An array of {@linkcode DependencyFile}
     * 
     * @returns A space separated list of updated files. 
     */
    getFiles(files: DependencyFile[]): string;
}

```

### IUpdater.ts

The updater class is the class that runs the CLI for the package manager to update packages.
We will have one implementation for `Npm` and one for `NuGet`, thats why we need an interface.

<!-- embedme Common/CommonV1/src/IUpdater.ts -->
```Typescript
import { DependencyFile } from './DependencyFile';

/**
 * Interface for a package updater
 */
export interface IUpdater {
    /**
     * Updates all dependencies in the directory specified.
     * 
     * @remarks
     * Recursively searches the specified path for dependency files and updates all specified packages 
     * in respective file. 
     * 
     * @param rootPath The root path to start the search for dependency files in.
     * 
     * @returns An array of {@linkcode DependencyFile}
     */
    updateDependencies(rootPath: string): Promise<DependencyFile[]>;
}

```

### UpdaterTask.ts

The UpdateTask orchestrates the update process of updating packages and creates and sets the output variables for the task.

<!-- embedme Common/CommonV1/src/UpdaterTask.ts -->
```Typescript
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

```

### NpmVersionGetter.ts

The implementation of the version getter for Npm packages.

<!-- embedme Npm/NpmV1/src/NpmVersionGetter.ts -->
```Typescript
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

```

### NpmUpdater.ts

The concrete implementation of `IUpdater` for Npm packages.

<!-- embedme Npm/NpmV1/src/NpmUpdater.ts -->
```Typescript
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

```

### npmIndex.ts

The `run` function in this file is the function that executes when the task runs in a pipeline.
This function acts as our dependency creator.
It creates the objects needed by the `UpdateTask` class and calls the `run` method in the `UpdaterTask` class.

<!-- embedme Npm/NpmV1/src/index.ts -->
```Typescript
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
/**
 * Data class for a dependency. Stores the name of the package and the version.
 */
export class Dependency {
    /**
     * Contractor for {@linkcode Dependency}
     * 
     * @param Name The name of the package.
     * @param Version The version of the package.
     */
    constructor(public Name: string, public Version: string) { }
}

```

### NuGetResultGenerator.ts

The concrete implementation of `IResultGenerator` for NuGet packages.

<!-- embedme NuGet/NuGetV1/src/NuGetResultGenerator.ts -->
```Typescript
import * as tl from 'azure-pipelines-task-lib/task';
import * as path from 'path';
import { DependencyFile } from '../../../Common/CommonV1/src/DependencyFile';
import { IResultGenerator } from '../../../Common/CommonV1/src/IResultGenerator';

/**
 * Implementation of {@linkcode:IResultGenerator} for NuGet packages.
 */
export class NuGetResultGenerator implements IResultGenerator {
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

        let returnFiles = "";

        for (const i in files) {
            // Add package.json and package-lock.json files to the list of updated files.
            returnFiles += path.join(dependencyPath + files[i].path) + ' ';
        }

        return returnFiles;
    }
}

```

### NuGetVersionGetter.ts

The implementation of the version getter for NuGet packages.

<!-- embedme NuGet/NuGetV1/src/NuGetVersionGetter.ts -->
```Typescript
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

```

### NuGetUpdater.ts

The concrete implementation of `IUpdater` for NuGet packages.

<!-- embedme NuGet/NuGetV1/src/NuGetUpdater.ts -->
```Typescript
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

```

### NuGetIndex.ts

The `run` function in this file is the function that executes when the task runs in a pipeline.
This function acts as our dependency creator.
It creates the objects needed by the `UpdateTask` class and calls the `run` method in the `UpdaterTask` class.

<!-- embedme NuGet/NuGetV1/src/index.ts -->
```Typescript
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
{
  "id": "3ae21815-ce97-4f5f-abd0-afc3394409bf",
  "name": "NpmUpdater",
  "friendlyName": "Npm Updater",
  "description": "Updates all npm packages in the specified folder.",
  "category": "Deploy",
  "author": "Dogtail9",
  "version": {
    "Major": 0,
    "Minor": 0,
    "Patch": 1,
    "IsTest": false
  },
  "demands": [],
  "groups": [],
  "inputs": [
    {
      "name": "Path",
      "type": "filePath",
      "label": "The root path to start looking for package.json files.",
      "defaultValue": "",
      "required": true
    }
  ],
  "OutputVariables": [
    {
      "name": "Markdown",
      "description": "Updated files and packages in Markdown."
    },
    {
      "name": "Files",
      "description": "Updated files in a space separated list. This variable can be used after 'git add' in a script in a pipeline."
    }
  ],
  "instanceNameFormat": "Update npm packages in $(Path)",
  "execution": {
    "Node10": {
      "target": "Npm/NpmV1/src/index.js"
    }
  }
}

```

### task.json for the NuGet task

The `task.json` file for the `NuGet` task.

<!-- embedme NuGet/NuGetV1/task.json -->
```json
{
  "id": "2568427a-914f-4aca-84de-2e17d582e05c",
  "name": "NuGetUpdater",
  "friendlyName": "NuGet Updater",
  "description": "Updates all NuGet packages in the specified folder.",
  "category": "Deploy",
  "author": "Dogtail9",
  "version": {
    "Major": 0,
    "Minor": 0,
    "Patch": 1,
    "IsTest": false
  },
  "demands": [],
  "groups": [],
  "inputs": [
    {
      "name": "Path",
      "type": "filePath",
      "label": "The root path to start looking for package.json files.",
      "defaultValue": "",
      "required": true
    }
  ],
  "OutputVariables": [
    {
      "name": "Markdown",
      "description": "Updated files and packages in Markdown."
    },
    {
      "name": "Files",
      "description": "Updated files in a space separated list. This variable can be used after 'git add' in a script in a pipeline."
    }
  ],
  "instanceNameFormat": "Update npm packages in $(Path)",
  "execution": {
    "Node10": {
      "target": "NuGet/NuGetV1/src/index.js"
    }
  }
}

```

### vss-extension.json

The manifest file for the [Azure DevOps](https://azure.microsoft.com/sv-se/services/devops/) extension.

<!-- embedme vss-extension.json -->
```json
{
    "manifestVersion": 1,
    "id": "dependency-updater-tasks",
    "name": "Dogtail Dependency Updater Tasks",
    "version": "0.0.1",
    "publisher": "Dogtail",
    "targets": [
        {
            "id": "Microsoft.VisualStudio.Services"
        }
    ],
    "description": "Azure Pipelines tasks to update Npm and NuGet packages.",
    "categories": [
        "Azure Pipelines"
    ],
    "icons": {
        "default": "extension-icon.png"
    },
    "files": [
        {
            "path": "built/Npm/NpmV1/",
            "packagePath": "Npm/NpmV1/Npm/NpmV1/"
        },
        {
            "path": "built/Common/CommonV1/",
            "packagePath": "Npm/NpmV1/Common/CommonV1/"
        },
        {
            "path": "node_modules",
            "packagePath": "Npm/NpmV1/node_modules"
        },
        {
            "path":"Npm/NpmV1/icon.png",
            "packagePath":"Npm/NpmV1/icon.png"
        },
        {
            "path":"Npm/NpmV1/task.json",
            "packagePath":"Npm/NpmV1/task.json"
        },
        {
            "path": "built/NuGet/NuGetV1/",
            "packagePath": "NuGet/NuGetV1/NuGet/NuGetV1/"
        },
        {
            "path": "built/Common/CommonV1/",
            "packagePath": "NuGet/NuGetV1/Common/CommonV1/"
        },
        {
            "path": "node_modules",
            "packagePath": "NuGet/NuGetV1/node_modules"
        },
        {
            "path":"NuGet/NuGetV1/icon.png",
            "packagePath":"NuGet/NuGetV1/icon.png"
        },
        {
            "path":"NuGet/NuGetV1/task.json",
            "packagePath":"NuGet/NuGetV1/task.json"
        }
    ],
    "contributions": [
        {
            "id": "2744a226-8073-4fe2-b86c-d2c9cb6353b9",
            "type": "ms.vss-distributed-task.task",
            "targets": [
                "ms.vss-distributed-task.tasks"
            ],
            "properties": {
                "name": "Npm"
            }
        },
        {
            "id": "69137d5e-0acd-4df2-9513-5f7bae478616",
            "type": "ms.vss-distributed-task.task",
            "targets": [
                "ms.vss-distributed-task.tasks"
            ],
            "properties": {
                "name": "NuGet"
            }
        }
    ]
}

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
schedules:
  - cron: "0 0 * * *"
    displayName: Daily midnight build
    always: true
    branches:
      include:
      - main
      
trigger:
  - main
  - feature/*
    
resources:
  - repo: self
    
parameters:
  - name: image
    displayName: Pool Image
    type: string
    default: ubuntu-latest
    values:
    - windows-latest
    - vs2017-win2016
    - ubuntu-latest
    - ubuntu-16.04
    - macOS-latest
    - macOS-10.14
      
  - name: ForceUpdateDependencies
    displayName: Force Dependency Update
    type: boolean
    default: false

stages:
  - stage: Build
    dependsOn: []
    condition: and(or(eq(${{ parameters.ForceUpdateDependencies }}, ${{ false }}), in(variables['Build.Reason'], 'IndividualCI', 'BatchedCI')), ne(variables['Build.Reason'], 'Schedule'))
    displayName: Build
    
    jobs:
    - job:
      dependsOn: []
      displayName: Build
      
      pool:
        vmImage: ${{ parameters.image }}
        
      steps:
      - task: Npm@1
        inputs:
          command: 'install'
          
      - script: |
          tsc -b -v
          
      - task: TfxInstaller@3
        inputs:
          version: 'v0.7.x'
          
      - task: QueryAzureDevOpsExtensionVersion@3
        name: QueryVersion
        inputs:
          connectTo: 'VsTeam'
          connectedServiceName: 'Marketplace'
          publisherId: 'Dogtail'
          extensionId: 'dependency-updater-tasks'
          versionAction: 'Patch'
          setBuildNumber: 'true'
          
      - task: PackageAzureDevOpsExtension@3
        inputs:
          rootFolder: 
          outputPath: '$(build.artifactstagingdirectory)/VSIX'
          extensionVersion: '$(QueryVersion.Extension.Version)'
          updateTasksVersion: true
          extensionVisibility: 'private'
            
      - task: PublishPipelineArtifact@1
        inputs:
          targetPath: '$(build.artifactstagingdirectory)/VSIX'
          artifact: 'VSIX'
          publishLocation: 'pipeline'
      
  - stage: Deploy
    dependsOn:
    - Build
    condition: and(or(eq(${{ parameters.ForceUpdateDependencies }}, ${{ false }}), in(variables['Build.Reason'], 'IndividualCI', 'BatchedCI')), ne(variables['Build.Reason'], 'Schedule'), ne(variables['Build.Reason'], 'PullRequest')) 
    displayName: Deploy

    jobs:
    - deployment:
      dependsOn: 
      displayName: Deploy

      pool:
        vmImage: ${{ parameters.image }}
      environment: Test
      strategy:
        runOnce:
          deploy:
            steps:
              - task: TfxInstaller@3
                inputs:
                  version: 'v0.7.x'

              - task: PublishAzureDevOpsExtension@3
                inputs:
                  connectTo: 'VsTeam'
                  connectedServiceName: 'Marketplace'
                  fileType: 'vsix'
                  vsixFile: '$(Pipeline.Workspace)/VSIX/*.vsix'
                  updateTasksVersion: false
                  extensionVisibility: 'private'

              - task: IsAzureDevOpsExtensionValid@3
                inputs:
                  connectTo: 'VsTeam'
                  connectedServiceName: 'Marketplace'
                  method: 'vsix'
                  vsixFile: '$(Pipeline.Workspace)/VSIX/*.vsix'
                
              - task: ShareAzureDevOpsExtension@3
                inputs:
                  connectTo: 'VsTeam'
                  connectedServiceName: 'Marketplace'
                  method: 'vsix'
                  vsixFile: '$(Pipeline.Workspace)/VSIX/*.vsix'
                  accounts: 'dogtail'

              - task: InstallAzureDevOpsExtension@3
                inputs:
                  connectTo: 'VsTeam'
                  connectedServiceName: 'Marketplace'
                  method: 'vsix'
                  vsixFile: '$(Pipeline.Workspace)/VSIX/*.vsix'
                  accounts: 'https://dogtail.visualstudio.com'

  - stage: UpdateDependencies 
    dependsOn: []
    condition: or(eq(${{ parameters.ForceUpdateDependencies }}, ${{ true }}), eq(variables['Build.Reason'], 'Schedule'))
    displayName: Update Dependencies
    
    jobs:
    - job:
      dependsOn: []
      displayName: Update Npm and NuGet
      pool:
        vmImage: ${{ parameters.image }}
      steps:
      - checkout: self
        clean: true
        persistCredentials: true

      - script: | 
          git config --global user.email 'dependencybot@dogtail.se'
          git config --global user.name 'DependencyBot'
          git checkout -b dependencybot/$(Build.BuildNumber)
        displayName: Checkout 'dependencybot/$(Build.BuildNumber)'

      - task: NpmUpdater@0
        name: NpmUpdater
        inputs:
          Path: TestData
      
      - script: |
          git add $(NpmUpdater.Files)
          git commit -m "Update Npm Dependencies"
        displayName: Commit Npm Updates

      - task: NuGetUpdater@0
        name: NuGetUpdater
        inputs:
          Path: TestData

      - script: |
          git add $(NuGetUpdater.Files)
          git commit -m "Update NuGet Dependencies"
        displayName: Commit NuGet Updates

      - script: git push --set-upstream origin dependencybot/$(Build.BuildNumber)
        displayName: Push Updates

      - powershell: |
          $url = "$(System.TeamFoundationCollectionUri)/$(System.TeamProject)/_apis/git/repositories/$(Build.Repository.Name)/pullrequests?api-version=5.0"
          $description = "# DepenencyBot updated the following dependencies`r`n`r`n $(NpmUpdater.Markdown) $(NuGetUpdater.Markdown)";
          if($description.length -gt 4000) {
              $description = $description[0..3995] -join ""
              $description += " ..."
              write-host "truncated"
          }
          $body = @{
                  sourceRefName = "refs/heads/dependencybot/$(Build.BuildNumber)"
                  targetRefName = "$(Build.SourceBranch)"
                  title         = "DependencyBot: Update Dependencies"
                  description   = $description
                  reviewers     = ""
                  isDraft       = "false"
                  WorkItemRefs  = ""
          }
          $head = @{ Authorization = "Bearer $env:ACCESSTOKEN" }
          $jsonBody = ConvertTo-Json $body
          Write-Host $head
          Write-Host $jsonBody
          Write-Host $url
          Write-Host $description
          try {
              $response = Invoke-RestMethod -Uri $url -Method Post -Headers $head -Body $jsonBody -ContentType "application/json;charset=UTF-8"
              if ($Null -ne $response) {
                  write-host $response
                  # If the response not null - the create PR succeeded
                  $pullRequestId = $response.pullRequestId
                  Write-Host "*************************"
                  Write-Host "******** Success ********"
                  Write-Host "*************************"
                  Write-Host "Pull Request $pullRequestId created."
              }
          }
          catch {
              Write-Error $_
              Write-Error $_.Exception.Message
          }
        displayName: Create Pull Request
          
        env:
          ACCESSTOKEN: $(System.AccessToken)
          

```

## Test Data

Create a folder named `TestData`, create `package.json`, `package-lock.json` and `OldVersion.csproj` files in the `TestData` folder.

### package.json

<!-- embedme TestData/package.json -->
```json
{
  "name": "dependencyupdaterextension",
  "version": "1.0.0",
  "private": true,
  "description": "Azure Pipelines tasks to update dependencies such as npm and NuGet.",
  "author": "Christer Eriksson",
  "license": "MIT",
  "dependencies": {
    "azure-pipelines-task-lib": "^2.9.5"
  },
  "devDependencies": {
    "@types/node": "^14.0.4",
    "@types/q": "^1.5.4"
  }
}

```

### package-lock.json

<!-- embedme TestData/package-lock.json -->
```json
{
    "name": "dependencyupdaterextension",
    "version": "1.0.0",
    "lockfileVersion": 1,
    "requires": true,
    "dependencies": {
      "@types/node": {
        "version": "14.0.4",
        "resolved": "https://registry.npmjs.org/@types/node/-/node-14.0.4.tgz",
        "integrity": "sha512-k3NqigXWRzQZVBDS5D1U70A5E8Qk4Kh+Ha/x4M8Bt9pF0X05eggfnC9+63Usc9Q928hRUIpIhTQaXsZwZBl4Ew==",
        "dev": true
      },
      "@types/q": {
        "version": "1.5.4",
        "resolved": "https://registry.npmjs.org/@types/q/-/q-1.5.4.tgz",
        "integrity": "sha512-1HcDas8SEj4z1Wc696tH56G8OlRaH/sqZOynNNB+HF0WOeXPaxTtbYzJY2oEfiUxjSKjhCKr+MvR7dCHcEelug==",
        "dev": true
      },
      "asap": {
        "version": "2.0.6",
        "resolved": "https://registry.npmjs.org/asap/-/asap-2.0.6.tgz",
        "integrity": "sha1-5QNHYR1+aQlDIIu9r+vLwvuGbUY="
      },
      "azure-pipelines-task-lib": {
        "version": "2.9.5",
        "resolved": "https://registry.npmjs.org/azure-pipelines-task-lib/-/azure-pipelines-task-lib-2.9.5.tgz",
        "integrity": "sha512-yI338OHDRmsW8YRmoXffqi1ZgqbtaT4+7E2K2luLw/OJ93v9OK/0Ul1bov0X+IWzL73U3N2IbUnRIODQa38SBQ==",
        "requires": {
          "minimatch": "3.0.4",
          "mockery": "^1.7.0",
          "q": "^1.1.2",
          "semver": "^5.1.0",
          "shelljs": "^0.3.0",
          "sync-request": "3.0.1",
          "uuid": "^3.0.1"
        }
      },
      "balanced-match": {
        "version": "1.0.0",
        "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.0.tgz",
        "integrity": "sha1-ibTRmasr7kneFk6gK4nORi1xt2c="
      },
      "brace-expansion": {
        "version": "1.1.11",
        "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.11.tgz",
        "integrity": "sha512-iCuPHDFgrHX7H2vEI/5xpz07zSHB00TpugqhmYtVmMO6518mCuRMoOYFldEBl0g187ufozdaHgWKcYFb61qGiA==",
        "requires": {
          "balanced-match": "^1.0.0",
          "concat-map": "0.0.1"
        }
      },
      "buffer-from": {
        "version": "1.1.1",
        "resolved": "https://registry.npmjs.org/buffer-from/-/buffer-from-1.1.1.tgz",
        "integrity": "sha512-MQcXEUbCKtEo7bhqEs6560Hyd4XaovZlO/k9V3hjVUF/zwW7KBVdSK4gIt/bzwS9MbR5qob+F5jusZsb0YQK2A=="
      },
      "caseless": {
        "version": "0.11.0",
        "resolved": "https://registry.npmjs.org/caseless/-/caseless-0.11.0.tgz",
        "integrity": "sha1-cVuW6phBWTzDMGeSP17GDr2k99c="
      },
      "concat-map": {
        "version": "0.0.1",
        "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
        "integrity": "sha1-2Klr13/Wjfd5OnMDajug1UBdR3s="
      },
      "concat-stream": {
        "version": "1.6.2",
        "resolved": "https://registry.npmjs.org/concat-stream/-/concat-stream-1.6.2.tgz",
        "integrity": "sha512-27HBghJxjiZtIk3Ycvn/4kbJk/1uZuJFfuPEns6LaEvpvG1f0hTea8lilrouyo9mVc2GWdcEZ8OLoGmSADlrCw==",
        "requires": {
          "buffer-from": "^1.0.0",
          "inherits": "^2.0.3",
          "readable-stream": "^2.2.2",
          "typedarray": "^0.0.6"
        }
      },
      "core-util-is": {
        "version": "1.0.2",
        "resolved": "https://registry.npmjs.org/core-util-is/-/core-util-is-1.0.2.tgz",
        "integrity": "sha1-tf1UIgqivFq1eqtxQMlAdUUDwac="
      },
      "http-basic": {
        "version": "2.5.1",
        "resolved": "https://registry.npmjs.org/http-basic/-/http-basic-2.5.1.tgz",
        "integrity": "sha1-jORHvbW2xXf4pj4/p4BW7Eu02/s=",
        "requires": {
          "caseless": "~0.11.0",
          "concat-stream": "^1.4.6",
          "http-response-object": "^1.0.0"
        }
      },
      "http-response-object": {
        "version": "1.1.0",
        "resolved": "https://registry.npmjs.org/http-response-object/-/http-response-object-1.1.0.tgz",
        "integrity": "sha1-p8TnWq6C87tJBOT0P2FWc7TVGMM="
      },
      "inherits": {
        "version": "2.0.4",
        "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
        "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ=="
      },
      "isarray": {
        "version": "1.0.0",
        "resolved": "https://registry.npmjs.org/isarray/-/isarray-1.0.0.tgz",
        "integrity": "sha1-u5NdSFgsuhaMBoNJV6VKPgcSTxE="
      },
      "minimatch": {
        "version": "3.0.4",
        "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.0.4.tgz",
        "integrity": "sha512-yJHVQEhyqPLUTgt9B83PXu6W3rx4MvvHvSUvToogpwoGDOUQ+yDrR0HRot+yOCdCO7u4hX3pWft6kWBBcqh0UA==",
        "requires": {
          "brace-expansion": "^1.1.7"
        }
      },
      "mockery": {
        "version": "1.7.0",
        "resolved": "https://registry.npmjs.org/mockery/-/mockery-1.7.0.tgz",
        "integrity": "sha1-9O3g2HUMHJcnwnLqLGBiniyaHE8="
      },
      "process-nextick-args": {
        "version": "2.0.1",
        "resolved": "https://registry.npmjs.org/process-nextick-args/-/process-nextick-args-2.0.1.tgz",
        "integrity": "sha512-3ouUOpQhtgrbOa17J7+uxOTpITYWaGP7/AhoR3+A+/1e9skrzelGi/dXzEYyvbxubEF6Wn2ypscTKiKJFFn1ag=="
      },
      "promise": {
        "version": "7.3.1",
        "resolved": "https://registry.npmjs.org/promise/-/promise-7.3.1.tgz",
        "integrity": "sha512-nolQXZ/4L+bP/UGlkfaIujX9BKxGwmQ9OT4mOt5yvy8iK1h3wqTEJCijzGANTCCl9nWjY41juyAn2K3Q1hLLTg==",
        "requires": {
          "asap": "~2.0.3"
        }
      },
      "q": {
        "version": "1.5.1",
        "resolved": "https://registry.npmjs.org/q/-/q-1.5.1.tgz",
        "integrity": "sha1-fjL3W0E4EpHQRhHxvxQQmsAGUdc="
      },
      "qs": {
        "version": "6.9.4",
        "resolved": "https://registry.npmjs.org/qs/-/qs-6.9.4.tgz",
        "integrity": "sha512-A1kFqHekCTM7cz0udomYUoYNWjBebHm/5wzU/XqrBRBNWectVH0QIiN+NEcZ0Dte5hvzHwbr8+XQmguPhJ6WdQ=="
      },
      "readable-stream": {
        "version": "2.3.7",
        "resolved": "https://registry.npmjs.org/readable-stream/-/readable-stream-2.3.7.tgz",
        "integrity": "sha512-Ebho8K4jIbHAxnuxi7o42OrZgF/ZTNcsZj6nRKyUmkhLFq8CHItp/fy6hQZuZmP/n3yZ9VBUbp4zz/mX8hmYPw==",
        "requires": {
          "core-util-is": "~1.0.0",
          "inherits": "~2.0.3",
          "isarray": "~1.0.0",
          "process-nextick-args": "~2.0.0",
          "safe-buffer": "~5.1.1",
          "string_decoder": "~1.1.1",
          "util-deprecate": "~1.0.1"
        }
      },
      "safe-buffer": {
        "version": "5.1.2",
        "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.1.2.tgz",
        "integrity": "sha512-Gd2UZBJDkXlY7GbJxfsE8/nvKkUEU1G38c1siN6QP6a9PT9MmHB8GnpscSmMJSoF8LOIrt8ud/wPtojys4G6+g=="
      },
      "semver": {
        "version": "5.7.1",
        "resolved": "https://registry.npmjs.org/semver/-/semver-5.7.1.tgz",
        "integrity": "sha512-sauaDf/PZdVgrLTNYHRtpXa1iRiKcaebiKQ1BJdpQlWH2lCvexQdX55snPFyK7QzpudqbCI0qXFfOasHdyNDGQ=="
      },
      "shelljs": {
        "version": "0.3.0",
        "resolved": "https://registry.npmjs.org/shelljs/-/shelljs-0.3.0.tgz",
        "integrity": "sha1-NZbmMHp4FUT1kfN9phg2DzHbV7E="
      },
      "string_decoder": {
        "version": "1.1.1",
        "resolved": "https://registry.npmjs.org/string_decoder/-/string_decoder-1.1.1.tgz",
        "integrity": "sha512-n/ShnvDi6FHbbVfviro+WojiFzv+s8MPMHBczVePfUpDJLwoLT0ht1l4YwBCbi8pJAveEEdnkHyPyTP/mzRfwg==",
        "requires": {
          "safe-buffer": "~5.1.0"
        }
      },
      "sync-request": {
        "version": "3.0.1",
        "resolved": "https://registry.npmjs.org/sync-request/-/sync-request-3.0.1.tgz",
        "integrity": "sha1-yqEjWq+Im6UBB2oYNMQ2gwqC+3M=",
        "requires": {
          "concat-stream": "^1.4.7",
          "http-response-object": "^1.0.1",
          "then-request": "^2.0.1"
        }
      },
      "then-request": {
        "version": "2.2.0",
        "resolved": "https://registry.npmjs.org/then-request/-/then-request-2.2.0.tgz",
        "integrity": "sha1-ZnizL6DKIY/laZgbvYhxtZQGDYE=",
        "requires": {
          "caseless": "~0.11.0",
          "concat-stream": "^1.4.7",
          "http-basic": "^2.5.1",
          "http-response-object": "^1.1.0",
          "promise": "^7.1.1",
          "qs": "^6.1.0"
        }
      },
      "typedarray": {
        "version": "0.0.6",
        "resolved": "https://registry.npmjs.org/typedarray/-/typedarray-0.0.6.tgz",
        "integrity": "sha1-hnrHTjhkGHsdPUfZlqeOxciDB3c="
      },
      "util-deprecate": {
        "version": "1.0.2",
        "resolved": "https://registry.npmjs.org/util-deprecate/-/util-deprecate-1.0.2.tgz",
        "integrity": "sha1-RQ1Nyfpw3nMnYvvS1KKJgUGaDM8="
      },
      "uuid": {
        "version": "3.4.0",
        "resolved": "https://registry.npmjs.org/uuid/-/uuid-3.4.0.tgz",
        "integrity": "sha512-HjSDRw6gZE5JMggctHBcjVak08+KEVhSIiDzFnT9S9aegmp85S/bReBVTb4QTFaRNptJ9kuYaNhnbNEOkbKb/A=="
      }
    }
  }
  
```

### OldVersion.csproj

<!-- embedme TestData/OldVersion.csproj -->
```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>netstandard2.1</TargetFramework>
    <nullable>enable</nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="12.0.2" />
  </ItemGroup>

</Project>

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
