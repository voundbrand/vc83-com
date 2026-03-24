export type CmsCopyFieldSubtype = "text" | "text_with_links" | (string & {});

export interface CmsCopyFieldDefinition {
  id: string;
  page: string;
  section: string;
  key: string;
  label: string;
  description?: string;
  subtype?: CmsCopyFieldSubtype;
  multilineRows?: number;
}

export interface CmsCopySectionDefinition {
  id: string;
  label: string;
  fields: CmsCopyFieldDefinition[];
}

export interface CmsCopyPageDefinition {
  id: string;
  label: string;
  sections: CmsCopySectionDefinition[];
}

export interface CmsCopyFieldRegistry {
  id: string;
  name: string;
  defaultLocale: string;
  locales: string[];
  pages: CmsCopyPageDefinition[];
}

export interface CmsCopyRegistryApplicationLike {
  _id: string;
  name?: string;
  description?: string;
  customProperties?: Record<string, unknown>;
}

export interface FlattenedCmsCopyField extends CmsCopyFieldDefinition {
  pageLabel: string;
  sectionLabel: string;
}

export const SEGELSCHULE_HOME_CMS_COPY_REGISTRY_ID = "segelschule.home.v1";

const SEGELSCHULE_HOME_REGISTRY: CmsCopyFieldRegistry = {
  id: SEGELSCHULE_HOME_CMS_COPY_REGISTRY_ID,
  name: "Segelschule Altwarp - Home",
  defaultLocale: "de",
  locales: ["de", "en", "nl", "ch"],
  pages: [
    {
      id: "home",
      label: "Home",
      sections: [
        {
          id: "nav",
          label: "Navigation",
          fields: [
            {
              id: "home.nav.about",
              page: "home",
              section: "nav",
              key: "about",
              label: "About Link",
            },
            {
              id: "home.nav.courses",
              page: "home",
              section: "nav",
              key: "courses",
              label: "Courses Link",
            },
            {
              id: "home.nav.pricing",
              page: "home",
              section: "nav",
              key: "pricing",
              label: "Pricing Link",
            },
            {
              id: "home.nav.team",
              page: "home",
              section: "nav",
              key: "team",
              label: "Team Link",
            },
            {
              id: "home.nav.gallery",
              page: "home",
              section: "nav",
              key: "gallery",
              label: "Gallery Link",
            },
            {
              id: "home.nav.contact",
              page: "home",
              section: "nav",
              key: "contact",
              label: "Contact Link",
            },
            {
              id: "home.nav.booking",
              page: "home",
              section: "nav",
              key: "booking",
              label: "Booking Link",
            },
          ],
        },
        {
          id: "hero",
          label: "Hero",
          fields: [
            {
              id: "home.hero.eyebrow",
              page: "home",
              section: "hero",
              key: "eyebrow",
              label: "Eyebrow",
              multilineRows: 2,
            },
            {
              id: "home.hero.title",
              page: "home",
              section: "hero",
              key: "title",
              label: "Title",
              multilineRows: 2,
            },
            {
              id: "home.hero.subtitle",
              page: "home",
              section: "hero",
              key: "subtitle",
              label: "Subtitle",
              multilineRows: 3,
            },
            {
              id: "home.hero.description",
              page: "home",
              section: "hero",
              key: "description",
              label: "Intro Description",
              multilineRows: 5,
            },
            {
              id: "home.hero.cta",
              page: "home",
              section: "hero",
              key: "cta",
              label: "CTA Button",
            },
          ],
        },
        {
          id: "about",
          label: "About",
          fields: [
            {
              id: "home.about.title",
              page: "home",
              section: "about",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.about.text",
              page: "home",
              section: "about",
              key: "text",
              label: "Body Text",
              multilineRows: 8,
            },
          ],
        },
        {
          id: "plattboden",
          label: "Plattboden",
          fields: [
            {
              id: "home.plattboden.title",
              page: "home",
              section: "plattboden",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.plattboden.text",
              page: "home",
              section: "plattboden",
              key: "text",
              label: "Body Text",
              multilineRows: 9,
            },
            {
              id: "home.plattboden.subtitle",
              page: "home",
              section: "plattboden",
              key: "subtitle",
              label: "Subtitle",
              multilineRows: 3,
            },
          ],
        },
        {
          id: "process",
          label: "Process",
          fields: [
            {
              id: "home.process.title",
              page: "home",
              section: "process",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.process.subtitle",
              page: "home",
              section: "process",
              key: "subtitle",
              label: "Section Subtitle",
              multilineRows: 3,
            },
            {
              id: "home.process.step_1_title",
              page: "home",
              section: "process",
              key: "step_1_title",
              label: "Step 1 Title",
            },
            {
              id: "home.process.step_1_description",
              page: "home",
              section: "process",
              key: "step_1_description",
              label: "Step 1 Description",
              multilineRows: 4,
            },
            {
              id: "home.process.step_2_title",
              page: "home",
              section: "process",
              key: "step_2_title",
              label: "Step 2 Title",
            },
            {
              id: "home.process.step_2_description",
              page: "home",
              section: "process",
              key: "step_2_description",
              label: "Step 2 Description",
              multilineRows: 4,
            },
            {
              id: "home.process.step_3_title",
              page: "home",
              section: "process",
              key: "step_3_title",
              label: "Step 3 Title",
            },
            {
              id: "home.process.step_3_description",
              page: "home",
              section: "process",
              key: "step_3_description",
              label: "Step 3 Description",
              multilineRows: 4,
            },
          ],
        },
        {
          id: "courses",
          label: "Courses",
          fields: [
            {
              id: "home.courses.title",
              page: "home",
              section: "courses",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.courses.subtitle",
              page: "home",
              section: "courses",
              key: "subtitle",
              label: "Section Subtitle",
              multilineRows: 3,
            },
            {
              id: "home.courses.button",
              page: "home",
              section: "courses",
              key: "button",
              label: "Primary Button Label",
            },
            {
              id: "home.courses.schnupper_title",
              page: "home",
              section: "courses",
              key: "schnupper_title",
              label: "Schnupper - Title",
            },
            {
              id: "home.courses.schnupper_duration",
              page: "home",
              section: "courses",
              key: "schnupper_duration",
              label: "Schnupper - Duration",
            },
            {
              id: "home.courses.schnupper_price",
              page: "home",
              section: "courses",
              key: "schnupper_price",
              label: "Schnupper - Price",
            },
            {
              id: "home.courses.schnupper_description",
              page: "home",
              section: "courses",
              key: "schnupper_description",
              label: "Schnupper - Description",
              multilineRows: 3,
            },
            {
              id: "home.courses.schnupper_feature_1",
              page: "home",
              section: "courses",
              key: "schnupper_feature_1",
              label: "Schnupper - Feature 1",
            },
            {
              id: "home.courses.schnupper_feature_2",
              page: "home",
              section: "courses",
              key: "schnupper_feature_2",
              label: "Schnupper - Feature 2",
            },
            {
              id: "home.courses.schnupper_feature_3",
              page: "home",
              section: "courses",
              key: "schnupper_feature_3",
              label: "Schnupper - Feature 3",
            },
            {
              id: "home.courses.schnupper_feature_4",
              page: "home",
              section: "courses",
              key: "schnupper_feature_4",
              label: "Schnupper - Feature 4",
            },
            {
              id: "home.courses.wochenende_title",
              page: "home",
              section: "courses",
              key: "wochenende_title",
              label: "Wochenende - Title",
            },
            {
              id: "home.courses.wochenende_duration",
              page: "home",
              section: "courses",
              key: "wochenende_duration",
              label: "Wochenende - Duration",
            },
            {
              id: "home.courses.wochenende_price",
              page: "home",
              section: "courses",
              key: "wochenende_price",
              label: "Wochenende - Price",
            },
            {
              id: "home.courses.wochenende_description",
              page: "home",
              section: "courses",
              key: "wochenende_description",
              label: "Wochenende - Description",
              multilineRows: 3,
            },
            {
              id: "home.courses.wochenende_feature_1",
              page: "home",
              section: "courses",
              key: "wochenende_feature_1",
              label: "Wochenende - Feature 1",
            },
            {
              id: "home.courses.wochenende_feature_2",
              page: "home",
              section: "courses",
              key: "wochenende_feature_2",
              label: "Wochenende - Feature 2",
            },
            {
              id: "home.courses.wochenende_feature_3",
              page: "home",
              section: "courses",
              key: "wochenende_feature_3",
              label: "Wochenende - Feature 3",
            },
            {
              id: "home.courses.wochenende_feature_4",
              page: "home",
              section: "courses",
              key: "wochenende_feature_4",
              label: "Wochenende - Feature 4",
            },
            {
              id: "home.courses.intensiv_title",
              page: "home",
              section: "courses",
              key: "intensiv_title",
              label: "Intensiv - Title",
            },
            {
              id: "home.courses.intensiv_duration",
              page: "home",
              section: "courses",
              key: "intensiv_duration",
              label: "Intensiv - Duration",
            },
            {
              id: "home.courses.intensiv_price",
              page: "home",
              section: "courses",
              key: "intensiv_price",
              label: "Intensiv - Price",
            },
            {
              id: "home.courses.intensiv_description",
              page: "home",
              section: "courses",
              key: "intensiv_description",
              label: "Intensiv - Description",
              multilineRows: 4,
            },
            {
              id: "home.courses.intensiv_feature_1",
              page: "home",
              section: "courses",
              key: "intensiv_feature_1",
              label: "Intensiv - Feature 1",
            },
            {
              id: "home.courses.intensiv_feature_2",
              page: "home",
              section: "courses",
              key: "intensiv_feature_2",
              label: "Intensiv - Feature 2",
            },
            {
              id: "home.courses.intensiv_feature_3",
              page: "home",
              section: "courses",
              key: "intensiv_feature_3",
              label: "Intensiv - Feature 3",
            },
            {
              id: "home.courses.intensiv_feature_4",
              page: "home",
              section: "courses",
              key: "intensiv_feature_4",
              label: "Intensiv - Feature 4",
            },
            {
              id: "home.courses.praxis_title",
              page: "home",
              section: "courses",
              key: "praxis_title",
              label: "Praxis - Title",
            },
            {
              id: "home.courses.praxis_duration",
              page: "home",
              section: "courses",
              key: "praxis_duration",
              label: "Praxis - Duration",
            },
            {
              id: "home.courses.praxis_price",
              page: "home",
              section: "courses",
              key: "praxis_price",
              label: "Praxis - Price",
            },
            {
              id: "home.courses.praxis_description",
              page: "home",
              section: "courses",
              key: "praxis_description",
              label: "Praxis - Description",
              multilineRows: 3,
            },
            {
              id: "home.courses.praxis_feature_1",
              page: "home",
              section: "courses",
              key: "praxis_feature_1",
              label: "Praxis - Feature 1",
            },
            {
              id: "home.courses.praxis_feature_2",
              page: "home",
              section: "courses",
              key: "praxis_feature_2",
              label: "Praxis - Feature 2",
            },
            {
              id: "home.courses.praxis_feature_3",
              page: "home",
              section: "courses",
              key: "praxis_feature_3",
              label: "Praxis - Feature 3",
            },
            {
              id: "home.courses.praxis_feature_4",
              page: "home",
              section: "courses",
              key: "praxis_feature_4",
              label: "Praxis - Feature 4",
            },
          ],
        },
        {
          id: "small-groups",
          label: "Small Groups",
          fields: [
            {
              id: "home.smallGroups.title",
              page: "home",
              section: "smallGroups",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.smallGroups.text",
              page: "home",
              section: "smallGroups",
              key: "text",
              label: "Body Text",
              multilineRows: 5,
            },
          ],
        },
        {
          id: "revier",
          label: "Revier",
          fields: [
            {
              id: "home.revier.title",
              page: "home",
              section: "revier",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.revier.text",
              page: "home",
              section: "revier",
              key: "text",
              label: "Body Text",
              multilineRows: 4,
            },
          ],
        },
        {
          id: "leisure",
          label: "Leisure",
          fields: [
            {
              id: "home.leisure.title",
              page: "home",
              section: "leisure",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.leisure.text",
              page: "home",
              section: "leisure",
              key: "text",
              label: "Body Text",
              multilineRows: 5,
            },
            {
              id: "home.leisure.activity_1_label",
              page: "home",
              section: "leisure",
              key: "activity_1_label",
              label: "Activity 1",
            },
            {
              id: "home.leisure.activity_2_label",
              page: "home",
              section: "leisure",
              key: "activity_2_label",
              label: "Activity 2",
            },
            {
              id: "home.leisure.activity_3_label",
              page: "home",
              section: "leisure",
              key: "activity_3_label",
              label: "Activity 3",
            },
            {
              id: "home.leisure.activity_4_label",
              page: "home",
              section: "leisure",
              key: "activity_4_label",
              label: "Activity 4",
            },
            {
              id: "home.leisure.button",
              page: "home",
              section: "leisure",
              key: "button",
              label: "Button Label",
            },
          ],
        },
        {
          id: "testimonials",
          label: "Testimonials",
          fields: [
            {
              id: "home.testimonials.scriptText",
              page: "home",
              section: "testimonials",
              key: "scriptText",
              label: "Eyebrow",
              multilineRows: 2,
            },
            {
              id: "home.testimonials.title",
              page: "home",
              section: "testimonials",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.testimonials.review_1_name",
              page: "home",
              section: "testimonials",
              key: "review_1_name",
              label: "Review 1 - Name",
            },
            {
              id: "home.testimonials.review_1_text",
              page: "home",
              section: "testimonials",
              key: "review_1_text",
              label: "Review 1 - Text",
              multilineRows: 5,
            },
            {
              id: "home.testimonials.review_2_name",
              page: "home",
              section: "testimonials",
              key: "review_2_name",
              label: "Review 2 - Name",
            },
            {
              id: "home.testimonials.review_2_text",
              page: "home",
              section: "testimonials",
              key: "review_2_text",
              label: "Review 2 - Text",
              multilineRows: 5,
            },
            {
              id: "home.testimonials.review_3_name",
              page: "home",
              section: "testimonials",
              key: "review_3_name",
              label: "Review 3 - Name",
            },
            {
              id: "home.testimonials.review_3_text",
              page: "home",
              section: "testimonials",
              key: "review_3_text",
              label: "Review 3 - Text",
              multilineRows: 5,
            },
          ],
        },
        {
          id: "gallery",
          label: "Gallery",
          fields: [
            {
              id: "home.gallery.title",
              page: "home",
              section: "gallery",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.gallery.subtitle",
              page: "home",
              section: "gallery",
              key: "subtitle",
              label: "Section Subtitle",
              multilineRows: 3,
            },
          ],
        },
        {
          id: "team",
          label: "Team",
          fields: [
            {
              id: "home.team.title",
              page: "home",
              section: "team",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.team.subtitle",
              page: "home",
              section: "team",
              key: "subtitle",
              label: "Section Subtitle",
              multilineRows: 3,
            },
            {
              id: "home.team.member_1_name",
              page: "home",
              section: "team",
              key: "member_1_name",
              label: "Member 1 - Name",
            },
            {
              id: "home.team.member_1_role",
              page: "home",
              section: "team",
              key: "member_1_role",
              label: "Member 1 - Role",
            },
            {
              id: "home.team.member_1_bio",
              page: "home",
              section: "team",
              key: "member_1_bio",
              label: "Member 1 - Bio",
              multilineRows: 6,
            },
            {
              id: "home.team.member_2_name",
              page: "home",
              section: "team",
              key: "member_2_name",
              label: "Member 2 - Name",
            },
            {
              id: "home.team.member_2_role",
              page: "home",
              section: "team",
              key: "member_2_role",
              label: "Member 2 - Role",
            },
            {
              id: "home.team.member_2_bio",
              page: "home",
              section: "team",
              key: "member_2_bio",
              label: "Member 2 - Bio",
              multilineRows: 6,
            },
            {
              id: "home.team.member_3_name",
              page: "home",
              section: "team",
              key: "member_3_name",
              label: "Member 3 - Name",
            },
            {
              id: "home.team.member_3_role",
              page: "home",
              section: "team",
              key: "member_3_role",
              label: "Member 3 - Role",
            },
            {
              id: "home.team.member_3_bio",
              page: "home",
              section: "team",
              key: "member_3_bio",
              label: "Member 3 - Bio",
              multilineRows: 6,
            },
          ],
        },
        {
          id: "faq",
          label: "FAQ",
          fields: [
            {
              id: "home.faq.title",
              page: "home",
              section: "faq",
              key: "title",
              label: "Section Title",
              multilineRows: 2,
            },
            {
              id: "home.faq.subtitle",
              page: "home",
              section: "faq",
              key: "subtitle",
              label: "Section Subtitle",
              multilineRows: 3,
            },
            {
              id: "home.faq.item_1_question",
              page: "home",
              section: "faq",
              key: "item_1_question",
              label: "FAQ 1 - Question",
            },
            {
              id: "home.faq.item_1_answer",
              page: "home",
              section: "faq",
              key: "item_1_answer",
              label: "FAQ 1 - Answer",
              multilineRows: 5,
            },
            {
              id: "home.faq.item_2_question",
              page: "home",
              section: "faq",
              key: "item_2_question",
              label: "FAQ 2 - Question",
            },
            {
              id: "home.faq.item_2_answer",
              page: "home",
              section: "faq",
              key: "item_2_answer",
              label: "FAQ 2 - Answer",
              multilineRows: 5,
            },
            {
              id: "home.faq.item_3_question",
              page: "home",
              section: "faq",
              key: "item_3_question",
              label: "FAQ 3 - Question",
            },
            {
              id: "home.faq.item_3_answer",
              page: "home",
              section: "faq",
              key: "item_3_answer",
              label: "FAQ 3 - Answer",
              multilineRows: 5,
            },
            {
              id: "home.faq.item_4_question",
              page: "home",
              section: "faq",
              key: "item_4_question",
              label: "FAQ 4 - Question",
            },
            {
              id: "home.faq.item_4_answer",
              page: "home",
              section: "faq",
              key: "item_4_answer",
              label: "FAQ 4 - Answer",
              multilineRows: 5,
            },
            {
              id: "home.faq.item_5_question",
              page: "home",
              section: "faq",
              key: "item_5_question",
              label: "FAQ 5 - Question",
            },
            {
              id: "home.faq.item_5_answer",
              page: "home",
              section: "faq",
              key: "item_5_answer",
              label: "FAQ 5 - Answer",
              multilineRows: 5,
            },
          ],
        },
        {
          id: "cta",
          label: "CTA Section",
          fields: [
            {
              id: "home.cta.title",
              page: "home",
              section: "cta",
              key: "title",
              label: "Title",
              multilineRows: 2,
            },
            {
              id: "home.cta.description",
              page: "home",
              section: "cta",
              key: "description",
              label: "Description",
              multilineRows: 5,
            },
            {
              id: "home.cta.button",
              page: "home",
              section: "cta",
              key: "button",
              label: "Button Label",
            },
          ],
        },
        {
          id: "footer",
          label: "Footer",
          fields: [
            {
              id: "home.footer.location",
              page: "home",
              section: "footer",
              key: "location",
              label: "Location Heading",
            },
            {
              id: "home.footer.address",
              page: "home",
              section: "footer",
              key: "address",
              label: "Address",
              multilineRows: 3,
            },
            {
              id: "home.footer.phone",
              page: "home",
              section: "footer",
              key: "phone",
              label: "Phone",
            },
            {
              id: "home.footer.email",
              page: "home",
              section: "footer",
              key: "email",
              label: "Email",
            },
            {
              id: "home.footer.social",
              page: "home",
              section: "footer",
              key: "social",
              label: "Social Heading",
            },
            {
              id: "home.footer.navigation",
              page: "home",
              section: "footer",
              key: "navigation",
              label: "Navigation Heading",
            },
            {
              id: "home.footer.navCourses",
              page: "home",
              section: "footer",
              key: "navCourses",
              label: "Footer Courses Link",
            },
            {
              id: "home.footer.navTeam",
              page: "home",
              section: "footer",
              key: "navTeam",
              label: "Footer Team Link",
            },
            {
              id: "home.footer.navGallery",
              page: "home",
              section: "footer",
              key: "navGallery",
              label: "Footer Gallery Link",
            },
            {
              id: "home.footer.navContact",
              page: "home",
              section: "footer",
              key: "navContact",
              label: "Footer Contact Link",
            },
            {
              id: "home.footer.copyright",
              page: "home",
              section: "footer",
              key: "copyright",
              label: "Copyright",
              multilineRows: 2,
            },
          ],
        },
      ],
    },
  ],
};

const GENERIC_EMPTY_REGISTRY: CmsCopyFieldRegistry = {
  id: "generic.empty.v1",
  name: "No CMS registry configured",
  defaultLocale: "en",
  locales: ["en"],
  pages: [],
};

const CMS_COPY_REGISTRIES: Record<string, CmsCopyFieldRegistry> = {
  [SEGELSCHULE_HOME_REGISTRY.id]: SEGELSCHULE_HOME_REGISTRY,
  [GENERIC_EMPTY_REGISTRY.id]: GENERIC_EMPTY_REGISTRY,
};

function normalizeRegistryId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readCustomRegistryId(customProperties: unknown): string | null {
  const props = asRecord(customProperties);
  if (!props) {
    return null;
  }

  const explicitId =
    normalizeRegistryId(props.cmsCopyRegistryId) ||
    normalizeRegistryId(props.cmsFieldRegistryId);
  if (explicitId) {
    return explicitId;
  }

  const cmsRecord = asRecord(props.cms);
  if (cmsRecord) {
    const cmsRegistryId =
      normalizeRegistryId(cmsRecord.copyRegistryId) ||
      normalizeRegistryId(cmsRecord.fieldRegistryId);
    if (cmsRegistryId) {
      return cmsRegistryId;
    }
  }

  const webPublishingRecord = asRecord(props.webPublishing);
  if (!webPublishingRecord) {
    return null;
  }

  return (
    normalizeRegistryId(webPublishingRecord.cmsCopyRegistryId) ||
    normalizeRegistryId(webPublishingRecord.cmsFieldRegistryId)
  );
}

function resolveRegistryFromAppName(application: CmsCopyRegistryApplicationLike): string {
  const text = `${application.name || ""} ${application.description || ""}`.toLowerCase();
  if (text.includes("segelschule") || text.includes("altwarp")) {
    return SEGELSCHULE_HOME_CMS_COPY_REGISTRY_ID;
  }
  return GENERIC_EMPTY_REGISTRY.id;
}

export function getCmsCopyRegistryById(
  registryId: string | null | undefined
): CmsCopyFieldRegistry | null {
  if (!registryId) {
    return null;
  }
  return CMS_COPY_REGISTRIES[registryId] || null;
}

export function resolveCmsCopyRegistry(
  application: CmsCopyRegistryApplicationLike
): CmsCopyFieldRegistry {
  const explicitRegistryId = readCustomRegistryId(application.customProperties);
  if (explicitRegistryId) {
    const explicitRegistry = getCmsCopyRegistryById(explicitRegistryId);
    if (explicitRegistry) {
      return explicitRegistry;
    }
  }

  const resolvedId = resolveRegistryFromAppName(application);
  return CMS_COPY_REGISTRIES[resolvedId] || GENERIC_EMPTY_REGISTRY;
}

export function flattenCmsCopyRegistryFields(
  registry: CmsCopyFieldRegistry
): FlattenedCmsCopyField[] {
  const flattened: FlattenedCmsCopyField[] = [];

  for (const page of registry.pages) {
    for (const section of page.sections) {
      for (const field of section.fields) {
        flattened.push({
          ...field,
          pageLabel: page.label,
          sectionLabel: section.label,
          subtype: field.subtype || "text",
        });
      }
    }
  }

  return flattened;
}

export function getCmsCopyRegistries(): CmsCopyFieldRegistry[] {
  return Object.values(CMS_COPY_REGISTRIES);
}
