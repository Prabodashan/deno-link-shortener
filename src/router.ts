import { handle } from "jsr:@http/route/handle";
import { byPattern } from "jsr:@http/route/by-pattern";
import { byMethod } from "jsr:@http/route/by-method";
import { GitHubUser } from "./db.ts";
import { getCurrentUser } from "./auth.ts";

type Handler = (
  req: Request,
  info: Deno.ServeHandlerInfo,
  params: Record<string, string>
) => Response | Promise<Response>;

export class Router {
  #routes: ReturnType<typeof byPattern>[] = [];

  currentUser?: GitHubUser | null;

  get(path: string, handler: Handler) {
    this.#addRoute("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    this.#addRoute("POST", path, handler);
  }

  put(path: string, handler: Handler) {
    this.#addRoute("PUT", path, handler);
  }

  delete(path: string, handler: Handler) {
    this.#addRoute("DELETE", path, handler);
  }

  #addRoute(method: string, path: string, handler: Handler) {
    const route = byPattern(
      path,
      byMethod({
        [method]: async (req, info) => {
          const match = new URLPattern({ pathname: path }).exec(
            new URL(req.url)
          );
          const params = match?.pathname.groups ?? {};
          try {
            this.currentUser = await getCurrentUser(req);
            return await handler(req, info, params);
          } catch (error) {
            console.error("Error handling request:", error);
            return new Response("Internal Server Error", { status: 500 });
          }
        },
      })
    );
    this.#routes.push(route);
  }

  get handler() {
    return handle(this.#routes);
  }
}
