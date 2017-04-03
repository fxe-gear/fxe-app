# FXE app

#### Prerequisites

The system-wide prerequisites are:

- [NodeJS 6.x with npm](https://nodejs.org/en/download/) - JS runtime and package manager `npm`
- [Ionic framework 1.x](http://ionicframework.com/getting-started/) - hybrid framework
- [Gulp](http://gulpjs.com/) - asset builder

#### Installation

```bash
git clone https://github.com/fxe-gear/fxe-app
cd fxe-app
npm install
bower install
gulp
   
?? cordova plugin add https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin.git
```

## Development

```bash
ionic run android  # run on connected android device
```

If you want a complete guide, please [see Ionic website](http://ionicframework.com/docs/guide/testing.html).

## Release

```bash
ionic build android --release
```

TODO better description
