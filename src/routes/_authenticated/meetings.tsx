import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "./studies";

export const Route = createFileRoute("/_authenticated/meetings")({
  component: () => <ComingSoon title="Aulas no Google Meet" desc="Em breve: agende videochamadas com professores e acesse seu histórico." />,
});
