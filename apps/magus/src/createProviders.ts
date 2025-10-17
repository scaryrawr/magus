import { which } from "@magus/common-utils";
import {
  createAzureProvider,
  createGitHubProvider,
  createLmStudioProvider,
  createOllamaProvider,
  createOpenRouterProvider,
  type MagusProvider,
} from "@magus/providers";

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

/**
 * Build the providers object based on environment variables.
 * Extracted to its own module for easier testing/injection.
 */
export const createProviders = () => {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  const azureOptions =
    process.env.AZURE_RESOURCE_GROUP && process.env.AZURE_RESOURCE_NAME && process.env.AZURE_SUBSCRIPTION && which("az")
      ? {
          resourceGroup: process.env.AZURE_RESOURCE_GROUP,
          subscription: process.env.AZURE_SUBSCRIPTION,
          name: process.env.AZURE_RESOURCE_NAME,
        }
      : undefined;
  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_COPILOT_TOKEN ?? process.env.GITHUB_COPILOT_TOKEN;

  const creators = [
    createLmStudioProvider,
    createOllamaProvider,
    openrouterApiKey ? () => createOpenRouterProvider(openrouterApiKey) : undefined,
    azureOptions ? () => createAzureProvider(azureOptions) : undefined,
    githubToken ? () => createGitHubProvider({ oauthToken: githubToken }) : undefined,
  ].filter(isDefined);

  return creators.reduce<MagusProvider>((acc, create) => {
    try {
      return { ...acc, ...create() };
    } catch {
      // Failure to create a provider should not block others from being used (is annoying though)
      return acc;
    }
  }, {});
};
