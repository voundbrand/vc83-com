We need to translate and make sure the following ui in our app is also using our theme system correctly and not writing styles inline. Here are the instructions for both our translation system and our theme system: /Users/foundbrand_001/Development/vc83-com/docs/THEME_SYSTEM.md and /Users/foundbrand_001/Development/vc83-com/docs/THEME_COMPLIANCE_GUIDE.md and /Users/foundbrand_001/Development/vc83-com/docs/TRANSLATION_SYSTEM.md and this is the section I want you to focus on: our event detail modal that we reach from the event window ui.

Just for the TRANSLATIONS
We need to translate and make sure the following ui in our app. Here are the instructions for our translation system :  /Users/foundbrand_001/Development/vc83-com/docs/TRANSLATION_SYSTEM.md and this is the section I want you to focus on: our certification management backend ui.

Just for the THEME
We need to make sure the following ui in our app is using our theme system correctly  /Users/foundbrand_001/Development/vc83-com/docs/THEME_SYSTEM.md I want you to focus on: 


# SEEDS TO RUN ON PROD
npx convex run seedApps:registerBenefitsApp   
npx convex run translations/seedStartMenu:seed
npx convex run translations/seedBenefitsWindowTranslations:seed

# Register the Booking app in database
npx convex run seedApps:registerBookingApp

# Seed the translations  
npx convex run translations/seedStartMenu:seed

# To seed the new CSV translation keys, run:
npx convex run translations/seedEvents_06_DetailModal:seed


# Projects
vc83-com
vc83-com-ai-feature
vc83-com-benefits-platform
vc83-com-microsaas
vc83-com-mux-video

l4yercak3-boiler-test
l4yercak3-boilerplate
l4yercak3-cli
l4yercak3-landing
l4yercak3-zapier



