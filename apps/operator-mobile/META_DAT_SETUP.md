# Meta DAT iOS Setup


meta dev accout:
remington@voundbrand.com
pw: jiizHx6Br3LwiYt!

<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<!-- <key>MWDAT</key> -->
<dict>
	<key>MetaAppID</key>
	<string>3365896013560772</string>
	<key>ClientToken</key>
	<string>AR|3365896013560772|df43e372c307283a910e83495986aef7</string>
	<!-- Your Apple Developer Team ID - Set this in Xcode under Signing & Capabilities -->
	<key>TeamID</key>
	<string>$(DEVELOPMENT_TEAM)</string>
</dict>
</plist>


This app now links Meta DAT iOS via Swift Package Manager (`meta-wearables-dat-ios`, `MWDATCore`, `MWDATCamera`).

## 1. Set DAT app credentials in Xcode

Open `apps/operator-mobile/ios/L4yercak3.xcworkspace`, then set these target build settings for both `Debug` and `Release`:

- `META_APP_ID`
- `CLIENT_TOKEN`

They are consumed by `Info.plist -> MWDAT`:

- `MWDAT.MetaAppID = $(META_APP_ID)`
- `MWDAT.ClientToken = $(CLIENT_TOKEN)`
- `MWDAT.TeamID = $(DEVELOPMENT_TEAM)`
- `MWDAT.AppLinkURLScheme = l4yercak3://`

## 2. Ensure the URL scheme exists

`Info.plist` includes `l4yercak3` in `CFBundleURLTypes` so DAT callback URLs can return to the app.

## 3. Build on a physical iPhone

Simulator builds can compile, but DAT bridge/device flows require a physical iPhone + glasses.

## 4. Validate in app

Go to `Settings -> Vision Source` and verify:

- `DAT SDK: available`
- `Bridge status` changes correctly after connect/disconnect

If config is incomplete, bridge connect now returns explicit `dat_configuration_invalid` with missing fields.
