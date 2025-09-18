# Azure Provider

The Azure Provider is a little different from how other folks implement the Azure Provider. Traditionally, you just provide a key and resource name. This has an annoying issue where by default the `/models` endpoint lists ALL POSSIBLE MODELS, not the ones you actually have deployed.

I wanted to automate deployed model discovery. This ends up requiring using APIs completely separate from the Azure OpenAI APIs.

Because of this, we end up requiring Azure Auth to hit the Azure Deployments API to list the models that are deployed.

So instead of just needing a key + endpoint, we need Azure CLI already logged in, a subscription ID, resource group name, and the OpenAI service name.

From there, we can get the key automatically from the deployment (so if you need to rotate keys, we don't care).

And, we can hit the deployments API to get the list of models you actually have deployed.

In the Magus App (which actually is just a Proof of Concept app 🤣). We need these environment variables set, someday we'll have config files...:

```sh
AZURE_RESOURCE_GROUP=my-resource-group
AZURE_RESOURCE_NAME=my-openai-deployment
AZURE_SUBSCRIPTION=d924c8ab-d588-4431-9bf1-b90f71e38a7e
```

What's nice is for some folks (like me), we have Azure CLI signed in for work, personal, other accounts, etc... But, you don't need to switch Azure CLI to the account with the OpenAI resource because we take in the subscription ID (I use Azure CLI for tons of other things, so I don't want to have to switch back and forth).

To get your subscription ID using the Azure CLI, I do something like:

```sh
> az account list | jq -r '.[] | select(.name == "Visual Studio Ultimate with MSDN") | .id'
d924c8ab-d588-4431-9bf1-b90f71e38a7e
```

The other reason I like doing it this way, is we don't have sensitive information in and configuration files. None of these variables are actually sensitive, it requires the Azure CLI to be signed in, and all token handling is done by the Azure SDK + Azure Identity library (on top of the Azure CLI).
