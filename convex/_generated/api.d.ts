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
import type * as helpers_appHelpers from "../helpers/appHelpers.js";
import type * as internal_ from "../internal.js";
import type * as rbac from "../rbac.js";
import type * as schemas_appDataSchemas from "../schemas/appDataSchemas.js";
import type * as schemas_appSchemaBase from "../schemas/appSchemaBase.js";
import type * as schemas_appStoreSchemas from "../schemas/appStoreSchemas.js";
import type * as schemas_coreSchemas from "../schemas/coreSchemas.js";
import type * as schemas_utilitySchemas from "../schemas/utilitySchemas.js";
import type * as seedAdmin from "../seedAdmin.js";

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
  "helpers/appHelpers": typeof helpers_appHelpers;
  internal: typeof internal_;
  rbac: typeof rbac;
  "schemas/appDataSchemas": typeof schemas_appDataSchemas;
  "schemas/appSchemaBase": typeof schemas_appSchemaBase;
  "schemas/appStoreSchemas": typeof schemas_appStoreSchemas;
  "schemas/coreSchemas": typeof schemas_coreSchemas;
  "schemas/utilitySchemas": typeof schemas_utilitySchemas;
  seedAdmin: typeof seedAdmin;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
