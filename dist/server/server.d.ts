import "dotenv/config";
declare const app: import("express-serve-static-core").Express;
declare const server: import("node:http").Server<typeof import("node:http").IncomingMessage, typeof import("node:http").ServerResponse>;
declare const stopKeepAlive: () => void;
export { server, stopKeepAlive };
export default app;
