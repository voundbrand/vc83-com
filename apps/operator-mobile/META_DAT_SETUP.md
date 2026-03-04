# Meta DAT iOS Setup

This app links Meta DAT iOS via Swift Package Manager (`meta-wearables-dat-ios`, `MWDATCore`, `MWDATCamera`).

## Current required config

`Info.plist -> MWDAT` is configured as:

- `MWDAT.AppLinkURLScheme = l4yercak3://`
- `MWDAT.MetaAppID = $(META_APP_ID)`
- `MWDAT.ClientToken = $(CLIENT_TOKEN)`
- `MWDAT.TeamID = A89SWGVT26`

Universal Link domain for DAT callback flow:

- `https://links.sevenlayers.io/dat-callback`

Associated Domains entitlement:

- `applinks:links.sevenlayers.io`

## Set DAT credentials in Xcode

Open `apps/operator-mobile/ios/L4yercak3.xcworkspace`, then set target build settings for both `Debug` and `Release`:

- `META_APP_ID`
- `CLIENT_TOKEN`

## Validate after install on physical iPhone

Go to `Settings -> Vision Source` and verify:

- `DAT SDK: available`
- bridge connect/disconnect state updates correctly

If config is incomplete, bridge connect returns `dat_configuration_invalid` with specific missing fields.
