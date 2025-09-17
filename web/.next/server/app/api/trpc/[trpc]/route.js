/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/trpc/[trpc]/route";
exports.ids = ["app/api/trpc/[trpc]/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&page=%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute.ts&appDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&page=%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute.ts&appDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_naruebet_orgl_Workspace_Labs_line_chat_summarizer_ai_web_src_app_api_trpc_trpc_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/trpc/[trpc]/route.ts */ \"(rsc)/./src/app/api/trpc/[trpc]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/trpc/[trpc]/route\",\n        pathname: \"/api/trpc/[trpc]\",\n        filename: \"route\",\n        bundlePath: \"app/api/trpc/[trpc]/route\"\n    },\n    resolvedPagePath: \"/Users/naruebet.orgl/Workspace/Labs/line_chat_summarizer_ai/web/src/app/api/trpc/[trpc]/route.ts\",\n    nextConfigOutput,\n    userland: _Users_naruebet_orgl_Workspace_Labs_line_chat_summarizer_ai_web_src_app_api_trpc_trpc_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZ0cnBjJTJGJTVCdHJwYyU1RCUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGdHJwYyUyRiU1QnRycGMlNUQlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZ0cnBjJTJGJTVCdHJwYyU1RCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRm5hcnVlYmV0Lm9yZ2wlMkZXb3Jrc3BhY2UlMkZMYWJzJTJGbGluZV9jaGF0X3N1bW1hcml6ZXJfYWklMkZ3ZWIlMkZzcmMlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGbmFydWViZXQub3JnbCUyRldvcmtzcGFjZSUyRkxhYnMlMkZsaW5lX2NoYXRfc3VtbWFyaXplcl9haSUyRndlYiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDZ0Q7QUFDN0g7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9uYXJ1ZWJldC5vcmdsL1dvcmtzcGFjZS9MYWJzL2xpbmVfY2hhdF9zdW1tYXJpemVyX2FpL3dlYi9zcmMvYXBwL2FwaS90cnBjL1t0cnBjXS9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvdHJwYy9bdHJwY10vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS90cnBjL1t0cnBjXVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvdHJwYy9bdHJwY10vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvbmFydWViZXQub3JnbC9Xb3Jrc3BhY2UvTGFicy9saW5lX2NoYXRfc3VtbWFyaXplcl9haS93ZWIvc3JjL2FwcC9hcGkvdHJwYy9bdHJwY10vcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&page=%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute.ts&appDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./src/app/api/trpc/[trpc]/route.ts":
/*!******************************************!*\
  !*** ./src/app/api/trpc/[trpc]/route.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\nasync function GET(request) {\n    return handleTRPCRequest(request);\n}\nasync function POST(request) {\n    return handleTRPCRequest(request);\n}\nasync function handleTRPCRequest(request) {\n    const url = new URL(request.url);\n    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';\n    // Forward the request to backend\n    const backendTRPCUrl = `${backendUrl}/api/trpc${url.pathname.replace('/api/trpc', '')}${url.search}`;\n    try {\n        const backendResponse = await fetch(backendTRPCUrl, {\n            method: request.method,\n            headers: {\n                'Content-Type': 'application/json',\n                'Accept': 'application/json'\n            },\n            body: request.method !== 'GET' ? await request.text() : undefined\n        });\n        const data = await backendResponse.text();\n        return new next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse(data, {\n            status: backendResponse.status,\n            headers: {\n                'Content-Type': 'application/json',\n                'Access-Control-Allow-Origin': '*',\n                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',\n                'Access-Control-Allow-Headers': 'Content-Type, Authorization'\n            }\n        });\n    } catch (error) {\n        console.error('Error proxying to backend:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Failed to connect to backend'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS90cnBjL1t0cnBjXS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBdUQ7QUFFaEQsZUFBZUMsSUFBSUMsT0FBb0I7SUFDNUMsT0FBT0Msa0JBQWtCRDtBQUMzQjtBQUVPLGVBQWVFLEtBQUtGLE9BQW9CO0lBQzdDLE9BQU9DLGtCQUFrQkQ7QUFDM0I7QUFFQSxlQUFlQyxrQkFBa0JELE9BQW9CO0lBQ25ELE1BQU1HLE1BQU0sSUFBSUMsSUFBSUosUUFBUUcsR0FBRztJQUMvQixNQUFNRSxhQUFhQyxRQUFRQyxHQUFHLENBQUNDLFdBQVcsSUFBSTtJQUU5QyxpQ0FBaUM7SUFDakMsTUFBTUMsaUJBQWlCLEdBQUdKLFdBQVcsU0FBUyxFQUFFRixJQUFJTyxRQUFRLENBQUNDLE9BQU8sQ0FBQyxhQUFhLE1BQU1SLElBQUlTLE1BQU0sRUFBRTtJQUVwRyxJQUFJO1FBQ0YsTUFBTUMsa0JBQWtCLE1BQU1DLE1BQU1MLGdCQUFnQjtZQUNsRE0sUUFBUWYsUUFBUWUsTUFBTTtZQUN0QkMsU0FBUztnQkFDUCxnQkFBZ0I7Z0JBQ2hCLFVBQVU7WUFDWjtZQUNBQyxNQUFNakIsUUFBUWUsTUFBTSxLQUFLLFFBQVEsTUFBTWYsUUFBUWtCLElBQUksS0FBS0M7UUFDMUQ7UUFFQSxNQUFNQyxPQUFPLE1BQU1QLGdCQUFnQkssSUFBSTtRQUV2QyxPQUFPLElBQUlwQixxREFBWUEsQ0FBQ3NCLE1BQU07WUFDNUJDLFFBQVFSLGdCQUFnQlEsTUFBTTtZQUM5QkwsU0FBUztnQkFDUCxnQkFBZ0I7Z0JBQ2hCLCtCQUErQjtnQkFDL0IsZ0NBQWdDO2dCQUNoQyxnQ0FBZ0M7WUFDbEM7UUFDRjtJQUNGLEVBQUUsT0FBT00sT0FBTztRQUNkQyxRQUFRRCxLQUFLLENBQUMsOEJBQThCQTtRQUM1QyxPQUFPeEIscURBQVlBLENBQUMwQixJQUFJLENBQ3RCO1lBQUVGLE9BQU87UUFBK0IsR0FDeEM7WUFBRUQsUUFBUTtRQUFJO0lBRWxCO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9uYXJ1ZWJldC5vcmdsL1dvcmtzcGFjZS9MYWJzL2xpbmVfY2hhdF9zdW1tYXJpemVyX2FpL3dlYi9zcmMvYXBwL2FwaS90cnBjL1t0cnBjXS9yb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBHRVQocmVxdWVzdDogTmV4dFJlcXVlc3QpIHtcbiAgcmV0dXJuIGhhbmRsZVRSUENSZXF1ZXN0KHJlcXVlc3QpXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcXVlc3Q6IE5leHRSZXF1ZXN0KSB7XG4gIHJldHVybiBoYW5kbGVUUlBDUmVxdWVzdChyZXF1ZXN0KVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVUUlBDUmVxdWVzdChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcXVlc3QudXJsKVxuICBjb25zdCBiYWNrZW5kVXJsID0gcHJvY2Vzcy5lbnYuQkFDS0VORF9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMSdcblxuICAvLyBGb3J3YXJkIHRoZSByZXF1ZXN0IHRvIGJhY2tlbmRcbiAgY29uc3QgYmFja2VuZFRSUENVcmwgPSBgJHtiYWNrZW5kVXJsfS9hcGkvdHJwYyR7dXJsLnBhdGhuYW1lLnJlcGxhY2UoJy9hcGkvdHJwYycsICcnKX0ke3VybC5zZWFyY2h9YFxuXG4gIHRyeSB7XG4gICAgY29uc3QgYmFja2VuZFJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYmFja2VuZFRSUENVcmwsIHtcbiAgICAgIG1ldGhvZDogcmVxdWVzdC5tZXRob2QsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICB9LFxuICAgICAgYm9keTogcmVxdWVzdC5tZXRob2QgIT09ICdHRVQnID8gYXdhaXQgcmVxdWVzdC50ZXh0KCkgOiB1bmRlZmluZWQsXG4gICAgfSlcblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBiYWNrZW5kUmVzcG9uc2UudGV4dCgpXG5cbiAgICByZXR1cm4gbmV3IE5leHRSZXNwb25zZShkYXRhLCB7XG4gICAgICBzdGF0dXM6IGJhY2tlbmRSZXNwb25zZS5zdGF0dXMsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nLFxuICAgICAgfSxcbiAgICB9KVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHByb3h5aW5nIHRvIGJhY2tlbmQ6JywgZXJyb3IpXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgeyBlcnJvcjogJ0ZhaWxlZCB0byBjb25uZWN0IHRvIGJhY2tlbmQnIH0sXG4gICAgICB7IHN0YXR1czogNTAwIH1cbiAgICApXG4gIH1cbn0iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiR0VUIiwicmVxdWVzdCIsImhhbmRsZVRSUENSZXF1ZXN0IiwiUE9TVCIsInVybCIsIlVSTCIsImJhY2tlbmRVcmwiLCJwcm9jZXNzIiwiZW52IiwiQkFDS0VORF9VUkwiLCJiYWNrZW5kVFJQQ1VybCIsInBhdGhuYW1lIiwicmVwbGFjZSIsInNlYXJjaCIsImJhY2tlbmRSZXNwb25zZSIsImZldGNoIiwibWV0aG9kIiwiaGVhZGVycyIsImJvZHkiLCJ0ZXh0IiwidW5kZWZpbmVkIiwiZGF0YSIsInN0YXR1cyIsImVycm9yIiwiY29uc29sZSIsImpzb24iXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/trpc/[trpc]/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&page=%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftrpc%2F%5Btrpc%5D%2Froute.ts&appDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fnaruebet.orgl%2FWorkspace%2FLabs%2Fline_chat_summarizer_ai%2Fweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();