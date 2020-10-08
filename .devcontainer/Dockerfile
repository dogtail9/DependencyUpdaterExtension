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
    && pwsh -c "Add-Content -Path \$profile -Value 'Set-Theme dogtail'" \
    && pwsh -c "Add-Content -Path \$profile -Value 'Set-PSReadLineOption -PredictionSource History'"

# Install Developer Tools
RUN npm install -g typescript
RUN npm i -g tfx-cli
RUN npm install -g editorconfig

# Install embedme
RUN npm install -g embedme

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog
