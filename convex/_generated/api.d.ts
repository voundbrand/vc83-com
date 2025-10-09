/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as cryptoActions from "../cryptoActions.js";
import type * as emailService from "../emailService.js";
import type * as helpers_appHelpers from "../helpers/appHelpers.js";
import type * as internal_ from "../internal.js";
import type * as ontologyAdmin from "../ontologyAdmin.js";
import type * as ontologyHelpers from "../ontologyHelpers.js";
import type * as ontologyTranslations from "../ontologyTranslations.js";
import type * as organizationMutations from "../organizationMutations.js";
import type * as organizationOntology from "../organizationOntology.js";
import type * as organizations from "../organizations.js";
import type * as rbac from "../rbac.js";
import type * as rbacHelpers from "../rbacHelpers.js";
import type * as rbacQueries from "../rbacQueries.js";
import type * as schemas_appDataSchemas from "../schemas/appDataSchemas.js";
import type * as schemas_appSchemaBase from "../schemas/appSchemaBase.js";
import type * as schemas_appStoreSchemas from "../schemas/appStoreSchemas.js";
import type * as schemas_coreSchemas from "../schemas/coreSchemas.js";
import type * as schemas_ontologySchemas from "../schemas/ontologySchemas.js";
import type * as schemas_translationSchemas from "../schemas/translationSchemas.js";
import type * as schemas_utilitySchemas from "../schemas/utilitySchemas.js";
import type * as seedAdmin from "../seedAdmin.js";
import type * as seedOntologyData from "../seedOntologyData.js";
import type * as seedTranslations from "../seedTranslations.js";
import type * as seedTranslations_login_window from "../seedTranslations_login_window.js";
import type * as userPreferences from "../userPreferences.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cryptoActions: typeof cryptoActions;
  emailService: typeof emailService;
  "helpers/appHelpers": typeof helpers_appHelpers;
  internal: typeof internal_;
  ontologyAdmin: typeof ontologyAdmin;
  ontologyHelpers: typeof ontologyHelpers;
  ontologyTranslations: typeof ontologyTranslations;
  organizationMutations: typeof organizationMutations;
  organizationOntology: typeof organizationOntology;
  organizations: typeof organizations;
  rbac: typeof rbac;
  rbacHelpers: typeof rbacHelpers;
  rbacQueries: typeof rbacQueries;
  "schemas/appDataSchemas": typeof schemas_appDataSchemas;
  "schemas/appSchemaBase": typeof schemas_appSchemaBase;
  "schemas/appStoreSchemas": typeof schemas_appStoreSchemas;
  "schemas/coreSchemas": typeof schemas_coreSchemas;
  "schemas/ontologySchemas": typeof schemas_ontologySchemas;
  "schemas/translationSchemas": typeof schemas_translationSchemas;
  "schemas/utilitySchemas": typeof schemas_utilitySchemas;
  seedAdmin: typeof seedAdmin;
  seedOntologyData: typeof seedOntologyData;
  seedTranslations: typeof seedTranslations;
  seedTranslations_login_window: typeof seedTranslations_login_window;
  userPreferences: typeof userPreferences;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
