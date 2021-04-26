// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

// This is bundled with npm package to allow direct usage

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"npm": "/npm",
		"public": "/",
		"../node_modules/three/build": "/libs/three",
	},
	plugins: [
		/* ... */
	],
	packageOptions: {
		source: "local"
	},
	devOptions: {
		open: "none"
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
