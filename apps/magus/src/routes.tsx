import { useEffect, useMemo } from "react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";
import { useRoutes, useServerContext, type RouteInfo } from "./contexts";
import { Layout } from "./layout";
import { createChatsRoute, createModelRoute, Home } from "./pages";
import { createChatRoute } from "./pages/chat/chat";

// Route metadata for descriptions
const routeDescriptions: Record<string, { description: string; hidden?: boolean }> = {
  "/home": { description: "Home screen - welcome and main entry point" },
  "/chats": { description: "Chat overview - view and manage your conversations" },
  "/models": { description: "AI model selection - configure your preferred model" },
};

const useMagusRouter = () => {
  const { client } = useServerContext();
  const routes = useMemo(() => {
    return createMemoryRouter([
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: Home },
          { path: "home", Component: Home },
          {
            path: "chat",
            children: [createChatRoute(client)],
          },
          createChatsRoute(client),
          createModelRoute(client),
        ],
      },
    ]);
  }, [client]);

  return routes;
};

const buildRouteInfos = (routes: RouteObject[], basePath = ""): RouteInfo[] => {
  const routeInfos: RouteInfo[] = [];
  for (const route of routes) {
    let currentPath = basePath;
    if (route.path) {
      currentPath = basePath + route.path;
    } else if (route.index) {
      currentPath = basePath || "/";
    }

    // Not guaranteed to be an end routes
    if (currentPath && !route.children) {
      const routeInfo = routeDescriptions[currentPath];
      if (routeInfo) {
        routeInfos.push({
          path: currentPath,
          description: routeInfo.description,
          hidden: routeInfo.hidden,
        });
      } else {
        routeInfos.push({
          path: currentPath,
          description: undefined,
        });
      }
    }

    if (route.children) {
      routeInfos.push(...buildRouteInfos(route.children, currentPath.endsWith("/") ? currentPath : `${currentPath}/`));
    }
  }

  return routeInfos;
};

export const MagusRouterProvider = () => {
  const router = useMagusRouter();
  const routes = useMemo(() => buildRouteInfos(router.routes), [router.routes]);
  const { setRoutes } = useRoutes();

  useEffect(() => {
    setRoutes(routes);
  }, [routes, setRoutes]);

  return <RouterProvider router={router} />;
};
