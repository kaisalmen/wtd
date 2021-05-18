// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

// This is bundled with npm package to allow direct usage

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"libs/three-wtm": "/libs/three-wtm",
		"public": "/",
		"libs/three": "/libs/three",
		"src": "/dist"
	},
	plugins: [
		/* ... */
	],
	packageOptions: {
		source: "local"
	},
	devOptions: {
		open: "none",
		port: 8082
	},
	buildOptions: {
		/* ... */
	},
	optimize: {
		/* ... */
	},
	exclude: [
		/* ... */
	]
};
