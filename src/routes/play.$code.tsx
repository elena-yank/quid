import { createFileRoute } from "@tanstack/react-router";
import { Room } from "@/components/quidditch/room";

export const Route = createFileRoute("/play/$code")({
  component: function Play() {
    const { code } = Route.useParams();
    return <Room code={code} />;
  },
});
