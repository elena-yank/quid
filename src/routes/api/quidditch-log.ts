import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/quidditch-log")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { downloadLog } = await import("@/lib/quidditch/log-download.server");
        return downloadLog(request);
      },
    },
  },
});
