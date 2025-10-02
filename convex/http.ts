import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Use the auth library's HTTP routes
auth.addHttpRoutes(http);

export default http;