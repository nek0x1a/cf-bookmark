import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { cn } from "cn";
import Footer from "./components/frame/Footer";

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hans" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="page-framework">
        {children}
        <Footer className="my-8" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "未知错误";
  let errSource = "未知";
  let details = "发生未知错误。";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = `错误 ${error.status}`;
    errSource = "ReactRouter";
    details =
      error.status === 404 ? "页面未找到。" : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main>
      <h1 className="text-4xl">{message}</h1>
      <p className="my-2 text-sm text-muted-foreground">来源: {errSource}</p>
      <p className="my-4">{details}</p>
      {stack && (
        <pre
          className={cn(
            "my-2 p-2 bg-muted text-muted-foreground",
            "border border-muted-border rounded-md",
            "overflow-x-auto",
          )}
        >
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
