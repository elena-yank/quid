import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/quidditch/home";

export const Route = createFileRoute("/")({ component: Home });
