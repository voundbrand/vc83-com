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
import type * as antiBot from "../antiBot.js";
import type * as appInstallations from "../appInstallations.js";
import type * as app_podcasting from "../app_podcasting.js";
import type * as apps from "../apps.js";
import type * as auth from "../auth.js";
import type * as botProtection from "../botProtection.js";
import type * as email from "../email.js";
import type * as emailVerification from "../emailVerification.js";
import type * as helpers_appHelpers from "../helpers/appHelpers.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as memberships from "../memberships.js";
import type * as organizations from "../organizations.js";
import type * as passwordReset from "../passwordReset.js";
import type * as schemas_appDataSchemas from "../schemas/appDataSchemas.js";
import type * as schemas_appSchemaBase from "../schemas/appSchemaBase.js";
import type * as schemas_appStoreSchemas from "../schemas/appStoreSchemas.js";
import type * as schemas_coreSchemas from "../schemas/coreSchemas.js";
import type * as schemas_utilitySchemas from "../schemas/utilitySchemas.js";
import type * as security from "../security.js";
import type * as tests_helpers from "../tests/helpers.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  antiBot: typeof antiBot;
  appInstallations: typeof appInstallations;
  app_podcasting: typeof app_podcasting;
  apps: typeof apps;
  auth: typeof auth;
  botProtection: typeof botProtection;
  email: typeof email;
  emailVerification: typeof emailVerification;
  "helpers/appHelpers": typeof helpers_appHelpers;
  helpers: typeof helpers;
  http: typeof http;
  init: typeof init;
  memberships: typeof memberships;
  organizations: typeof organizations;
  passwordReset: typeof passwordReset;
  "schemas/appDataSchemas": typeof schemas_appDataSchemas;
  "schemas/appSchemaBase": typeof schemas_appSchemaBase;
  "schemas/appStoreSchemas": typeof schemas_appStoreSchemas;
  "schemas/coreSchemas": typeof schemas_coreSchemas;
  "schemas/utilitySchemas": typeof schemas_utilitySchemas;
  security: typeof security;
  "tests/helpers": typeof tests_helpers;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
