// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"src": "/dist",
		"public": "/",
		"node_modules/three/": "/libs/three",
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
		'**/dev/*',
		'**/LICENSE',
		'**/README.md',
		'**/CHANGELOG.md',
		'**/Dockerfile',
		'**/docker-compose.yml',
		'**/declaration.tsconfig.json',
		'**/jsdoc.json'
	]
};

