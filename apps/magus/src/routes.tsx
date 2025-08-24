import { useEffect, useMemo } from "react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { useRoutes, useServerContext } from "./contexts";
import { Layout } from "./layout";
import { Chat, createModelRoute, Exit, Home } from "./pages";

const useMagusRouter = () => {
  const { server } = useServerContext();
  const serverUrl = server.url;
  const routes = useMemo(() => {
    return createMemoryRouter([
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Home },
          {
            path: "chat",
            children: [{ index: true, Component: Chat }],
          },
          {
            path: "exit",
            Component: Exit,
          },
          createModelRoute(serverUrl),
        ],
      },
    ]);
  }, [serverUrl]);

  return routes;
};

const buildRoutePaths = (routes: RouteObject[], basePath = ""): string[] => {
  const paths: string[] = [];
  for (const route of routes) {
    let currentPath = basePath;
    if (route.path) {
      currentPath = basePath + route.path;
    } else if (route.index) {
      currentPath = basePath || "/";
    }

    // Not guaranteed to be an end route
    if (currentPath && !route.children) {
      paths.push(currentPath);
    }

    if (route.children) {
      paths.push(...buildRoutePaths(route.children, currentPath.endsWith("/") ? currentPath : `${currentPath}/`));
    }
  }

  return paths;
};

export const MagusRouterProvider = () => {
  const router = useMagusRouter();
  const routes = useMemo(() => buildRoutePaths(router.routes), [router.routes]);
  const { setRoutes } = useRoutes();

  useEffect(() => {
    setRoutes(routes);
  }, [routes, setRoutes]);

  return <RouterProvider router={router} />;
};
