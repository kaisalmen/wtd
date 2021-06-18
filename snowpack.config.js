// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
	mount: {
		"src": "/src",
		"public": "/",
		"node_modules/three/": "/node_modules/three",
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

