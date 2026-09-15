import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/bookmark/home.tsx"),
  route("bookmark/edit", "routes/bookmark/edit.tsx"),
] satisfies RouteConfig;
