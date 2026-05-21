import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "./studies";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: () => <ComingSoon title="Lembretes de estudo" desc="Em breve: agenda semanal, lembretes diários e controle de rotina." />,
});
