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
import type * as accountManagement from "../accountManagement.js";
import type * as accountManagement_old from "../accountManagement_old.js";
import type * as appAvailability from "../appAvailability.js";
import type * as auth from "../auth.js";
import type * as checkoutOntology from "../checkoutOntology.js";
import type * as checkoutSessions from "../checkoutSessions.js";
import type * as crons from "../crons.js";
import type * as cryptoActions from "../cryptoActions.js";
import type * as emailService from "../emailService.js";
import type * as emailService_plain_text from "../emailService_plain_text.js";
import type * as helpers_appHelpers from "../helpers/appHelpers.js";
import type * as http from "../http.js";
import type * as http_old from "../http_old.js";
import type * as internal_ from "../internal.js";
import type * as invitationOntology from "../invitationOntology.js";
import type * as ontologyAdmin from "../ontologyAdmin.js";
import type * as ontologyHelpers from "../ontologyHelpers.js";
import type * as ontologyTranslations from "../ontologyTranslations.js";
import type * as organizationMedia from "../organizationMedia.js";
import type * as organizationMutations from "../organizationMutations.js";
import type * as organizationOntology from "../organizationOntology.js";
import type * as organizations from "../organizations.js";
import type * as paymentProviders_helpers from "../paymentProviders/helpers.js";
import type * as paymentProviders_index from "../paymentProviders/index.js";
import type * as paymentProviders_manager from "../paymentProviders/manager.js";
import type * as paymentProviders_stripe from "../paymentProviders/stripe.js";
import type * as paymentProviders_types from "../paymentProviders/types.js";
import type * as publishingOntology from "../publishingOntology.js";
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
import type * as seedApps from "../seedApps.js";
import type * as seedCheckoutApp from "../seedCheckoutApp.js";
import type * as seedOntologyData from "../seedOntologyData.js";
import type * as seedTemplates from "../seedTemplates.js";
import type * as stripeConnect from "../stripeConnect.js";
import type * as stripeWebhooks from "../stripeWebhooks.js";
import type * as stripeWebhooks_old from "../stripeWebhooks_old.js";
import type * as templateAvailability from "../templateAvailability.js";
import type * as templateOntology from "../templateOntology.js";
import type * as translationResolver from "../translationResolver.js";
import type * as translations__translationHelpers from "../translations/_translationHelpers.js";
import type * as translations_seedAddressTranslations from "../translations/seedAddressTranslations.js";
import type * as translations_seedControlPanel from "../translations/seedControlPanel.js";
import type * as translations_seedDesktop from "../translations/seedDesktop.js";
import type * as translations_seedLogin from "../translations/seedLogin.js";
import type * as translations_seedLogin_01_BasicAuth from "../translations/seedLogin_01_BasicAuth.js";
import type * as translations_seedLogin_02_Forms from "../translations/seedLogin_02_Forms.js";
import type * as translations_seedLogin_03_Buttons from "../translations/seedLogin_03_Buttons.js";
import type * as translations_seedLogin_03a_Buttons from "../translations/seedLogin_03a_Buttons.js";
import type * as translations_seedLogin_03b_Errors from "../translations/seedLogin_03b_Errors.js";
import type * as translations_seedManage_01_MainWindow from "../translations/seedManage_01_MainWindow.js";
import type * as translations_seedManage_02_Organization from "../translations/seedManage_02_Organization.js";
import type * as translations_seedManage_03_Users from "../translations/seedManage_03_Users.js";
import type * as translations_seedManage_03b_DeleteAccount from "../translations/seedManage_03b_DeleteAccount.js";
import type * as translations_seedManage_04_RolesPermissions from "../translations/seedManage_04_RolesPermissions.js";
import type * as translations_seedNotifications from "../translations/seedNotifications.js";
import type * as translations_seedOrganizations from "../translations/seedOrganizations.js";
import type * as translations_seedProfileTranslations from "../translations/seedProfileTranslations.js";
import type * as translations_seedSettings from "../translations/seedSettings.js";
import type * as translations_seedWelcomeTranslations from "../translations/seedWelcomeTranslations.js";
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
  accountManagement: typeof accountManagement;
  accountManagement_old: typeof accountManagement_old;
  appAvailability: typeof appAvailability;
  auth: typeof auth;
  checkoutOntology: typeof checkoutOntology;
  checkoutSessions: typeof checkoutSessions;
  crons: typeof crons;
  cryptoActions: typeof cryptoActions;
  emailService: typeof emailService;
  emailService_plain_text: typeof emailService_plain_text;
  "helpers/appHelpers": typeof helpers_appHelpers;
  http: typeof http;
  http_old: typeof http_old;
  internal: typeof internal_;
  invitationOntology: typeof invitationOntology;
  ontologyAdmin: typeof ontologyAdmin;
  ontologyHelpers: typeof ontologyHelpers;
  ontologyTranslations: typeof ontologyTranslations;
  organizationMedia: typeof organizationMedia;
  organizationMutations: typeof organizationMutations;
  organizationOntology: typeof organizationOntology;
  organizations: typeof organizations;
  "paymentProviders/helpers": typeof paymentProviders_helpers;
  "paymentProviders/index": typeof paymentProviders_index;
  "paymentProviders/manager": typeof paymentProviders_manager;
  "paymentProviders/stripe": typeof paymentProviders_stripe;
  "paymentProviders/types": typeof paymentProviders_types;
  publishingOntology: typeof publishingOntology;
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
  seedApps: typeof seedApps;
  seedCheckoutApp: typeof seedCheckoutApp;
  seedOntologyData: typeof seedOntologyData;
  seedTemplates: typeof seedTemplates;
  stripeConnect: typeof stripeConnect;
  stripeWebhooks: typeof stripeWebhooks;
  stripeWebhooks_old: typeof stripeWebhooks_old;
  templateAvailability: typeof templateAvailability;
  templateOntology: typeof templateOntology;
  translationResolver: typeof translationResolver;
  "translations/_translationHelpers": typeof translations__translationHelpers;
  "translations/seedAddressTranslations": typeof translations_seedAddressTranslations;
  "translations/seedControlPanel": typeof translations_seedControlPanel;
  "translations/seedDesktop": typeof translations_seedDesktop;
  "translations/seedLogin": typeof translations_seedLogin;
  "translations/seedLogin_01_BasicAuth": typeof translations_seedLogin_01_BasicAuth;
  "translations/seedLogin_02_Forms": typeof translations_seedLogin_02_Forms;
  "translations/seedLogin_03_Buttons": typeof translations_seedLogin_03_Buttons;
  "translations/seedLogin_03a_Buttons": typeof translations_seedLogin_03a_Buttons;
  "translations/seedLogin_03b_Errors": typeof translations_seedLogin_03b_Errors;
  "translations/seedManage_01_MainWindow": typeof translations_seedManage_01_MainWindow;
  "translations/seedManage_02_Organization": typeof translations_seedManage_02_Organization;
  "translations/seedManage_03_Users": typeof translations_seedManage_03_Users;
  "translations/seedManage_03b_DeleteAccount": typeof translations_seedManage_03b_DeleteAccount;
  "translations/seedManage_04_RolesPermissions": typeof translations_seedManage_04_RolesPermissions;
  "translations/seedNotifications": typeof translations_seedNotifications;
  "translations/seedOrganizations": typeof translations_seedOrganizations;
  "translations/seedProfileTranslations": typeof translations_seedProfileTranslations;
  "translations/seedSettings": typeof translations_seedSettings;
  "translations/seedWelcomeTranslations": typeof translations_seedWelcomeTranslations;
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
