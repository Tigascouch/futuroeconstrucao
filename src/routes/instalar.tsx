import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Apple, Share2, Plus } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/instalar")({
  head: () => ({
    meta: [
      { title: "Instalar Aprender+ no celular" },
      { name: "description", content: "Escaneie o QR Code e instale o Aprender+ na tela inicial do seu celular." },
    ],
  }),
  component: InstallPage,
});

const APP_URL = "https://futuroeconstrucao.lovable.app";

function InstallPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/"><Logo /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Voltar</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Instale o Aprender<span className="text-primary">+</span> no seu celular
          </h1>
          <p className="mt-3 text-muted-foreground">
            Aponte a câmera do celular para o QR Code abaixo e siga as instruções.
          </p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* QR Code */}
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-8">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <QRCodeSVG
                value={APP_URL}
                size={240}
                level="H"
                marginSize={1}
              />
            </div>
            <p className="mt-5 text-sm text-muted-foreground">Escaneie com a câmera</p>
            <a
              href={APP_URL}
              className="mt-1 text-sm font-medium text-primary hover:underline break-all text-center"
            >
              {APP_URL.replace("https://", "")}
            </a>
          </div>

          {/* Instruções */}
          <div className="space-y-5">
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Smartphone size={20} />
                </div>
                <h2 className="font-display text-lg font-semibold">No Android</h2>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>1. Escaneie o QR Code com a câmera</li>
                <li>2. Abra o link no <strong>Chrome</strong></li>
                <li>3. Toque no menu <strong>⋮</strong> → <strong>"Instalar app"</strong></li>
              </ol>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Apple size={20} />
                </div>
                <h2 className="font-display text-lg font-semibold">No iPhone</h2>
              </div>
              <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>1. Escaneie o QR Code com a câmera</li>
                <li>2. Abra o link no <strong>Safari</strong></li>
                <li className="flex flex-wrap items-center gap-1">
                  3. Toque em <Share2 size={14} className="inline" /> <strong>Compartilhar</strong> → <Plus size={14} className="inline" /> <strong>"Adicionar à Tela de Início"</strong>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          O app abre em tela cheia, com ícone próprio, como um aplicativo nativo.
        </p>
      </main>
    </div>
  );
}
