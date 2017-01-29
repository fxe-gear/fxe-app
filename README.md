# FXE app

## Development setup

#### Prerequisites

1. [nodejs with npm](https://nodejs.org/en/download/) - JS runtime and package manager
- [Ionic framework](http://ionicframework.com/getting-started/) - hybrid framework

#### Installation

```bash
git clone https://github.com/tomasbedrich/fxe-app
cd fxe-app
npm install
bower install
gulp
```

## Running

Most commonly:

```bash
ionic run android -l -c  # run on connected android device
ionic serve -c  # run in browser (warning: no bluetooth etc. plugins!)
```

If you want complete guide, [it is on Ionic website](http://ionicframework.com/docs/guide/testing.html).
